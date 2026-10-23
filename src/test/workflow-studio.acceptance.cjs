const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");
const puppeteer = require("puppeteer-core");

const until = async (read, message, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await read();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(message);
};

exports.run = async () => {
  const report = JSON.parse(
    fs.readFileSync(process.env.VALORIDE_NATIVE_REPORT, "utf8"),
  );
  const evidence = process.env.VALORIDE_NATIVE_EVIDENCE;
  const frontend = new URL(process.env.VALORIDE_NATIVE_FRONTEND_URL);
  const extension = vscode.extensions.getExtension(
    "ValkyrLabsInc.valoride-dev",
  );
  assert(
    extension,
    "Actual development extension must be installed in the isolated host",
  );
  await extension.activate();
  await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
  await until(
    async () =>
      (await vscode.commands.getCommands(true)).includes(
        "valoride.workflows.openStudio",
      ),
    "Studio command was not registered",
  );
  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${process.env.VALORIDE_NATIVE_DEBUG_PORT}`,
  });
  const results = [];
  try {
    for (const withRun of [false, true]) {
      const target = {
        id: report.workflow.id,
        name: "CEO operations acceptance",
        workflowVersionId: report.workflow.versionId,
        backend: `${process.env.VALORIDE_NATIVE_BASE_URL}/v1`,
        ...(withRun ? { executionId: report.executions[0].id } : {}),
      };
      await vscode.commands.executeCommand(
        "valoride.workflows.openStudio",
        target,
      );
      const frame = await until(
        async () => {
          for (const page of await browser.pages()) {
            for (const candidate of page.frames()) {
              const raw = candidate.url();
              if (raw.startsWith(frontend.origin + "/studio?"))
                return candidate;
            }
          }
        },
        "Native iframe never reached the real Studio destination",
        45000,
      );
      const destination = new URL(frame.url());
      assert.equal(destination.searchParams.get("workflowId"), target.id);
      assert.equal(
        destination.searchParams.get("workflowVersionId"),
        target.workflowVersionId,
      );
      assert.equal(destination.searchParams.has("ticket"), false);
      await frame.waitForSelector('input[placeholder="Workflow name"]', {
        timeout: 30000,
      });
      if (!withRun) {
        await frame.waitForFunction(
          (id) =>
            document.querySelector(
              '[aria-label="Selected immutable workflow version"]',
            )?.value === id,
          { timeout: 30000 },
          target.workflowVersionId,
        );
      }
      if (withRun) {
        assert.equal(
          destination.searchParams.get("executionId"),
          target.executionId,
        );
        await frame.waitForSelector(
          `[aria-label="Run inspector ${target.executionId}"]`,
          { timeout: 30000 },
        );
        await frame.waitForFunction(
          (id) =>
            document
              .querySelector(`[aria-label="Run inspector ${id}"]`)
              ?.textContent.includes("Full snapshots remain"),
          { timeout: 30000 },
          target.executionId,
        );
      }
      const wrapper = frame.parentFrame();
      assert(wrapper, "Studio must render inside the actual VS Code webview");
      await wrapper.waitForFunction(
        () => document.body.dataset.state === "ready",
        { timeout: 20000 },
      );
      const name = await frame.$eval(
        'input[placeholder="Workflow name"]',
        (element) => element.value,
      );
      assert.equal(name, report.workflow.name);
      const geometry = await frame.evaluate(() => {
        const root = document.querySelector(".ws-root.is-embedded");
        const rect = root?.getBoundingClientRect();
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          editor: rect
            ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            : null,
          duplicateChrome: Boolean(
            document.querySelector(
              '[data-tour-id="mini-nav"], [aria-label="Designer views"], [data-tour-id="dashboard-sagechat"]',
            ),
          ),
        };
      });
      assert(
        geometry.viewportWidth >= 400,
        "Native acceptance needs a usable editor pane",
      );
      assert(
        !geometry.duplicateChrome,
        "Native Studio must not nest website and builder navigation",
      );
      assert(
        geometry.editor &&
          geometry.editor.y < 8 &&
          geometry.editor.x < 8 &&
          geometry.editor.width >= geometry.viewportWidth - 16,
        "Native editor must use its host viewport",
      );
      const visibleEvidence = withRun
        ? `[aria-label="Run inspector ${target.executionId}"] header`
        : '[aria-label="Selected immutable workflow version"]';
      await frame.$eval(visibleEvidence, (element) =>
        element.scrollIntoView({ block: "center" }),
      );
      assert(
        await frame.$eval(visibleEvidence, (element) => {
          const rect = element.getBoundingClientRect();
          const hit = document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          );
          return (
            rect.width > 100 &&
            rect.height > 10 &&
            rect.y >= 0 &&
            rect.bottom <= window.innerHeight &&
            (element === hit || element.contains(hit))
          );
        }),
        "Exact release/run evidence must be visible and unobscured",
      );
      await frame.page().screenshot({
        path: path.join(
          evidence,
          withRun ? "native-exact-run.png" : "native-exact-version.png",
        ),
      });
      results.push({
        workflowId: target.id,
        workflowVersionId: target.workflowVersionId,
        executionId: target.executionId,
        renderedEditor: true,
        exactVersionSelected: !withRun,
        wrapperReady: true,
        exactRunInspected: withRun,
        geometry,
        visibleEvidence: true,
      });
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor",
      );
    }
    const engineering = process.env.VALORIDE_NATIVE_ENGINEERING_WORKSPACE
      ? await require("./workflow-engineering.acceptance.cjs").run({ extension, report, evidence, browser })
      : undefined;
    fs.writeFileSync(
      path.join(evidence, "verification.json"),
      JSON.stringify(
        { status: "passed", preauthenticated: true, handoffs: results, engineering },
        null,
        2,
      ),
    );
  } catch (error) {
    // Preserve the original failure before optional CDP or screenshot diagnostics.
    fs.writeFileSync(path.join(evidence, "native-test-error.json"),
      JSON.stringify({ error: error.stack ?? String(error) }, null, 2), { mode: 0o600 });
    console.error("Native acceptance failed:", error);
    // Save content-free frame locations and a screenshot; tickets/cookies stay out of diagnostics.
    const pages = await browser.pages();
    fs.writeFileSync(
      path.join(evidence, "failure-frames.json"),
      JSON.stringify(
        pages.map((page) =>
          page.frames().map((frame) => {
            try {
              const url = new URL(frame.url());
              return {
                protocol: url.protocol,
                hostname: url.hostname,
                pathname: url.pathname,
              };
            } catch {
              return { protocol: "unavailable" };
            }
          }),
        ),
        null,
        2,
      ),
    );
    await pages[0]?.screenshot({
      path: path.join(evidence, "native-failure.png"),
    });
    throw error;
  } finally {
    await browser.disconnect();
  }
};
