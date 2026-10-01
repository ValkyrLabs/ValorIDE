const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vscode = require("vscode");
const puppeteer = require("puppeteer-core");
const {
  reviewedQuoteTestCommand,
} = require("./sagechat-engineering-command-scope.cjs");

// Human UI automation and observation only. SageChat owns discovery, decisions,
// dispatch, following work, memory and explanation. This driver never submits a
// task or modifies the workspace, approvals, command receipts or outcomes.
exports.run = async () => {
  const evidence = process.env.VALORIDE_ENGINEERING_EVIDENCE;
  const workspace = process.env.VALORIDE_ENGINEERING_WORKSPACE;
  const configuration = JSON.parse(
    fs.readFileSync(process.env.VALORIDE_ENGINEERING_CONFIGURATION, "utf8"),
  );
  const hash = (value) =>
    crypto.createHash("sha256").update(value).digest("hex");
  const save = (name, value) => {
    const target = path.join(evidence, name);
    const temporary = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), {
      mode: 0o600,
    });
    fs.renameSync(temporary, target);
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (read, description, timeout = 30000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = await read();
      if (value) return value;
      await sleep(250);
    }
    throw new Error(description);
  };
  assert.equal(vscode.workspace.workspaceFolders?.length, 1);
  assert.equal(vscode.workspace.workspaceFolders[0].uri.fsPath, workspace);
  const extension = vscode.extensions.getExtension(
    "ValkyrLabsInc.valoride-dev",
  );
  assert(extension, "Actual native extension is absent");
  await extension.activate();
  assert.equal(
    typeof extension.exports.engineeringAcceptanceSnapshot,
    "function",
  );
  await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
  await vscode.commands.executeCommand("valoride-dev.SidebarProvider.focus");
  const debugOrigin = `http://127.0.0.1:${process.env.VALORIDE_ENGINEERING_DEBUG_PORT}`;
  const devtools = await until(
    async () => {
      try {
        const response = await fetch(`${debugOrigin}/json/version`, {
          signal: AbortSignal.timeout(2000),
        });
        if (!response.ok) return false;
        const value = await response.json();
        return typeof value.webSocketDebuggerUrl === "string" ? value : false;
      } catch {
        return false;
      }
    },
    "Native DevTools endpoint did not become ready",
    120000,
  );
  const browser = await puppeteer.connect({
    browserWSEndpoint: devtools.webSocketDebuggerUrl,
    protocolTimeout: 120000,
  });
  const decisions = [],
    automaticCommandContinuations = [],
    approved = new Set(),
    observedTasks = {};
  let firstCommandId;
  const visibleElement = async (selector, accept) => {
    for (const page of await browser.pages())
      for (const frame of page.frames()) {
        if (!frame.url().startsWith("vscode-webview://")) continue;
        for (const element of await frame.$$(selector)) {
          const detail = await element.evaluate((node) => ({
            text: node.textContent.trim(),
            visible:
              node.getBoundingClientRect().width > 0 &&
              node.getBoundingClientRect().height > 0,
            disabled: node.hasAttribute("disabled"),
          }));
          if (detail.visible && !detail.disabled && accept(detail))
            return { page, frame, element };
          await element.dispose();
        }
      }
    return false;
  };
  try {
    // Saved UI settings advertise actual provider reachability. The actual
    // coding Task must receive its model exclusively from the reviewed command.
    assert(
      configuration.availableModelIds.includes(configuration.savedModelId),
      "The saved UI model was not actually offered",
    );
    const openLmStudioSettings = async () => {
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          save("native-settings-progress.private.json", { attempt, stage: "opening" });
          const dropdown = await until(
            async () => {
              // The sidebar webview and its message listener become ready
              // asynchronously after focus. Repeating this idempotent UI
              // navigation recovers a command lost during webview startup.
              await vscode.commands.executeCommand(
                "valoride.settingsButtonClicked",
              );
              return visibleElement("#api-provider", () => true);
            },
            "Native provider settings did not render",
            20000,
          );
          // Select the rendered option through the custom dropdown's own
          // click handling, which updates its selected index and emits the
          // change event consumed by React. Setting value while the menu is
          // open can leave the component and React with different selections.
          save("native-settings-progress.private.json", { attempt, stage: "selecting-provider" });
          await dropdown.element.evaluate((node) => node.click());
          const lmStudioOption = await dropdown.frame.$(
            '#api-provider vscode-option[value="lmstudio"]',
          );
          assert(lmStudioOption, "Rendered LM Studio provider option is absent");
          await lmStudioOption.evaluate((node) => node.click());
          save("native-settings-progress.private.json", { attempt, stage: "checking-fields" });
          // Require the committed selection and both dependent fields at the
          // same time. A momentary value before React rerenders is not ready.
          return await until(
            async () => {
              const rendered = await visibleElement(
                "#api-provider",
                () => true,
              );
              if (
                !rendered ||
                (await rendered.element.evaluate((node) => node.value)) !==
                  "lmstudio"
              )
                return false;
              const endpoint = await visibleElement(
                'vscode-text-field[placeholder="Default: http://localhost:1234"]',
                () => true,
              );
              const model = await visibleElement(
                'vscode-text-field[placeholder="e.g. meta-llama-3.1-8b-instruct"]',
                () => true,
              );
              return endpoint && model ? rendered : false;
            },
            "LM Studio provider fields did not settle in the rendered UI",
            15000,
          );
        } catch (error) {
          lastError = error;
          await sleep(500);
        }
      }
      const frames = [];
      for (const page of await browser.pages()) {
        for (const frame of page.frames()) {
          if (!frame.url().startsWith("vscode-webview://")) continue;
          try {
            frames.push(await frame.evaluate(() => {
              const provider = document.querySelector("#api-provider");
              return {
                frameUrl: location.href,
                providerValue: provider?.value ?? null,
                selectedIndex: provider?.selectedIndex ?? null,
                optionCount: provider?.querySelectorAll("vscode-option").length ?? 0,
                endpointRendered: !!document.querySelector('vscode-text-field[placeholder="Default: http://localhost:1234"]'),
                modelRendered: !!document.querySelector('vscode-text-field[placeholder="e.g. meta-llama-3.1-8b-instruct"]'),
              };
            }));
          } catch { /* A closing webview is diagnostic-only. */ }
        }
      }
      save("native-settings-failure.private.json", { frames });
      throw new Error(
        `LM Studio provider settings did not stabilize after bounded rendered-UI retries: ${lastError}`,
      );
    };
    await openLmStudioSettings();
    const field = async (placeholder, value) => {
      const selector = `vscode-text-field[placeholder="${placeholder}"]`;
      let input = await until(
        () => visibleElement(selector, () => true),
        `Native settings field ${placeholder} did not render`,
      );
      await input.element.evaluate((node) => node.click());
      // LM Studio model discovery can rerender this controlled web component
      // between individual key events. Apply one ordinary bubbling input event
      // to the rendered field, then reacquire it and verify React committed it.
      await input.element.evaluate((node, nextValue) => {
        node.value = nextValue;
        node.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            composed: true,
            data: nextValue,
            inputType: "insertText",
          }),
        );
        return new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      }, value);
      input = await until(async () => {
        const rendered = await visibleElement(selector, () => true);
        const provider = await visibleElement("#api-provider", () => true);
        return rendered &&
          provider &&
          (await provider.element.evaluate((node) => node.value)) === "lmstudio" &&
          (await rendered.element.evaluate((node) => node.value)) === value
          ? rendered
          : false;
      }, `Native settings field ${placeholder} did not commit its rendered value`);
      assert.equal(await input.element.evaluate((node) => node.value), value);
    };
    await field("Default: http://localhost:1234", configuration.origin);
    await field("e.g. meta-llama-3.1-8b-instruct", configuration.savedModelId);
    await until(async () => {
      const rendered = await visibleElement("#api-provider", () => true);
      if (!rendered) return false;
      const values = await rendered.frame.evaluate(() => ({
        provider: document.querySelector("#api-provider")?.value,
        origin: document.querySelector('vscode-text-field[placeholder="Default: http://localhost:1234"]')?.value,
        model: document.querySelector('vscode-text-field[placeholder="e.g. meta-llama-3.1-8b-instruct"]')?.value,
      }));
      return values.provider === "lmstudio" &&
        values.origin === configuration.origin &&
        values.model === configuration.savedModelId;
    }, "Rendered native provider, origin and model did not remain consistent before Save");
    const saveControl = await until(
      () => visibleElement("vscode-button", (detail) => detail.text === "Save"),
      "Native settings Save control did not render",
    );
    await saveControl.element.evaluate((node) => node.click());
    const savedConfiguration = () => {
        const snapshot = extension.exports.engineeringAcceptanceSnapshot();
        assert.deepEqual(
          snapshot.admissionObserverErrors,
          [],
          "Native admission observation failed",
        );
        return (
          snapshot.provider === "lmstudio" &&
          snapshot.model === configuration.savedModelId &&
          snapshot.origin === configuration.origin &&
          snapshot
        );
    };
    let selected = await until(savedConfiguration,
      "First rendered native Save did not persist all settings", 5000).catch(() => false);
    if (!selected) {
      // A rapid first save can persist the typed endpoint/model while a stale
      // provider update arrives last. Reopen the actual settings UI and save
      // the already persisted fields with the provider selected again.
      const first = extension.exports.engineeringAcceptanceSnapshot();
      save("native-settings-save-retry.private.json", {
        provider: first.provider ?? null,
        origin: first.origin ?? null,
        model: first.model ?? null,
        action: "reopen-and-save-rendered-provider",
      });
      const reopened = await openLmStudioSettings();
      const retained = await reopened.frame.evaluate(() => ({
        origin: document.querySelector('vscode-text-field[placeholder="Default: http://localhost:1234"]')?.value,
        model: document.querySelector('vscode-text-field[placeholder="e.g. meta-llama-3.1-8b-instruct"]')?.value,
      }));
      if (retained.origin !== configuration.origin)
        await field("Default: http://localhost:1234", configuration.origin);
      if (retained.model !== configuration.savedModelId)
        await field("e.g. meta-llama-3.1-8b-instruct", configuration.savedModelId);
      const retrySave = await until(
        () => visibleElement("vscode-button", (detail) => detail.text === "Save"),
        "Native retry Save control did not render",
      );
      await retrySave.element.evaluate((node) => node.click());
    }
    try {
      selected ||= await until(savedConfiguration,
        "Rendered native settings were not durably saved");
    } catch (error) {
      const snapshot = extension.exports.engineeringAcceptanceSnapshot();
      save("native-save-failure.private.json", {
        provider: snapshot.provider ?? null,
        origin: snapshot.origin ?? null,
        model: snapshot.model ?? null,
        expectedProvider: "lmstudio",
        expectedOrigin: configuration.origin,
        expectedModel: configuration.savedModelId,
      });
      throw error;
    }
    assert(
      !selected.autoApproval?.enabled,
      "Initial native file/command approvals must remain enabled",
    );
    // Save closes the settings view. Reopen it through the extension command,
    // then select the rendered backend tab where SWARM readiness is exposed.
    const backendTab = await until(async () => {
      await vscode.commands.executeCommand("valoride.settingsButtonClicked");
      return visibleElement(
        "button",
        (detail) => detail.text === "ValkyrAI Backend",
      );
    }, "Native ValkyrAI Backend settings tab did not render");
    await backendTab.element.evaluate((node) => node.click());
    await until(
      () => visibleElement("#valkyrai-backend-section", () => true),
      "Native ValkyrAI Backend settings section did not render",
    );
    const registrationRetry = await until(
      () =>
        visibleElement(
          "vscode-button",
          (detail) => detail.text === "Retry SWARM",
        ),
      "Native SWARM retry control did not render",
    );
    await registrationRetry.element.evaluate((node) => node.click());
    const instanceId = await until(
      async () => {
        const rendered = await visibleElement(
          '[data-cy="valkyrai-swarm-detail"]',
          (detail) => /^valoride-[A-Za-z0-9-]+$/.test(detail.text),
        );
        return rendered
          ? rendered.element.evaluate((node) => node.textContent.trim())
          : false;
      },
      "Rendered native SWARM status did not expose its registered identity",
      120000,
    );
    save("native-registration-ui.json", {
      action: "Retry SWARM",
      instanceId,
      identitySource: "rendered-native-swarm-status",
      boundary:
        "Actual rendered native UI readiness action and identity; no task, command, approval, plan or effect supplied",
    });
    await vscode.commands.executeCommand("valoride.plusButtonClicked");
    if (process.env.VALORIDE_ENGINEERING_TRANSPORT_FIXTURE) {
      const fixture = await until(
        () => {
          const candidate =
            extension.exports.engineeringAcceptanceSnapshot().transportFixture;
          return (
            candidate?.ownedSocketCount >= 1 &&
            candidate.activeOwnedSocketCount === 1 &&
            candidate.maxConcurrentOwnedSocketCount === 1 &&
            candidate.socketSendCount > 0 &&
            candidate
          );
        },
        "Named native transport fixture did not observe the actual registered STOMP socket",
        30000,
      );
      assert.equal(fixture.reasoningFixture, false);
      assert.equal(fixture.dispatchInjected, false);
      assert.equal(fixture.approvalsInjected, false);
      assert.equal(fixture.effectsInjected, false);
    }
    save("native-ready.json", {
      instanceId,
      workspace,
      configuration: {
        provider: selected.provider,
        savedModelId: selected.model,
        canonicalModelId: configuration.canonicalModelId,
        origin: selected.origin,
        source: "rendered-native-settings-ui",
        purpose: "provider-reachability-only",
        savedModelMismatch: selected.model !== configuration.canonicalModelId,
        modelMode: configuration.mode,
        availableModelIds: configuration.availableModelIds,
        workflowCodingBindingProved: false,
      },
    });
    const validatePath = (requested, permitDirectory = false) => {
      assert.equal(typeof requested, "string");
      const target = path.resolve(workspace, requested);
      assert(
        target === path.join(workspace, "quote-total.cjs") ||
          target === path.join(workspace, "quote-total.test.cjs") ||
          (permitDirectory && target === workspace),
        "Native decision is outside the reviewed local workspace scope",
      );
      return target;
    };
    while (!fs.existsSync(path.join(evidence, "native-stop.json"))) {
      const snapshot = extension.exports.engineeringAcceptanceSnapshot();
      const active = Object.entries(snapshot.handoffs?.active ?? {});
      const outcomes = Object.entries(snapshot.handoffs?.outcomes ?? {});
      assert(
        active.length <= 1,
        "This bounded company lineage cannot run simultaneous native tasks",
      );
      assert(
        new Set([...active, ...outcomes].map(([id]) => id)).size <= 2,
        "This company lineage permits the initial fix and one legitimate verification request",
      );
      save("native-observation.private.json", snapshot);
      for (const [commandId, assignment] of [...outcomes, ...active]) {
        const taskId =
          assignment?.localTaskId ?? assignment?.metadata?.localTaskId;
        if (taskId) {
          firstCommandId ||= commandId;
          if (observedTasks[commandId])
            assert.equal(
              observedTasks[commandId].localTaskId,
              taskId,
              "A retry of the same approved command created another native task",
            );
          const taskDir = path.join(
            snapshot.globalStoragePath,
            "tasks",
            taskId,
          );
          const messagesPath = path.join(taskDir, "ui_messages.json");
          if (fs.existsSync(messagesPath)) {
            let messages;
            try {
              messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
            } catch {
              await sleep(250);
              continue;
            }
            const last = messages.at(-1);
            if (
              last?.type === "ask" &&
              !last.partial &&
              !approved.has(last.ts)
            ) {
              const governed = snapshot.codingBindings.find(
                (item) => item.localTaskId === taskId,
              );
              assert(
                governed,
                "Actual native Task history has no governed canonical binding",
              );
              assert.equal(governed.binding.commandId, commandId);
              assert.equal(governed.binding.runnerInstanceId, instanceId);
              assert.equal(
                governed.binding.model,
                configuration.canonicalModelId,
              );
              assert.equal(
                governed.binding.llmDetailsId,
                configuration.llmDetailsId,
              );
              assert.equal(
                governed.binding.integrationAccountId,
                configuration.integrationAccountId,
              );
              assert(
                governed.opaqueApprovalProofPresent,
                "Actual native Task history has no approved command proof",
              );
              assert.deepEqual(
                governed.forbiddenCredentialFields,
                [],
                "Native history contains credential fields",
              );
              let detail, labels;
              if (last.ask === "tool") {
                detail = JSON.parse(last.text);
                const reads = [
                  "readFile",
                  "listFilesTopLevel",
                  "listFilesRecursive",
                  "listCodeDefinitionNames",
                  "searchFiles",
                ];
                const edits = [
                  "editedExistingFile",
                  "precisionSearchAndReplace",
                ];
                assert(
                  reads.includes(detail.tool) || edits.includes(detail.tool),
                  "Native worker requested an unsupported tool decision",
                );
                const target = validatePath(
                  detail.path,
                  detail.tool !== "readFile" && reads.includes(detail.tool),
                );
                assert(detail.operationIsLocatedInWorkspace !== false);
                if (edits.includes(detail.tool)) {
                  assert.equal(
                    commandId,
                    firstCommandId,
                    "The legitimate verification request must preserve both files",
                  );
                  assert.equal(
                    target,
                    path.join(workspace, "quote-total.cjs"),
                    "Focused tests must remain unchanged",
                  );
                }
                labels = reads.includes(detail.tool)
                  ? ["Approve", "Read", "Allow"]
                  : ["Approve", "Save"];
                detail = {
                  tool: detail.tool,
                  path: detail.path,
                  requestSha256: hash(last.text),
                };
              } else if (last.ask === "command") {
                detail = reviewedQuoteTestCommand(last.text, workspace);
                labels = ["Run Command"];
              } else if (last.ask === "command_output") {
                assert(
                  decisions.some((decision) => decision.ask === "command"),
                );
                detail = { outputSha256: hash(last.text ?? "") };
                labels = [
                  "Proceed While Running",
                  "Proceed (Output Unavailable)",
                ];
              } else if (last.ask === "completion_result") {
                await sleep(250);
                continue;
              } else
                throw new Error(
                  `Native worker requested an unsupported decision: ${last.ask}`,
                );
              const completedCommandResult = () => {
                if (last.ask !== "command_output") return false;
                const command = decisions.filter((decision) => decision.ask === "command").at(-1);
                if (!command) return false;
                let current;
                try {
                  current = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
                } catch {
                  return false;
                }
                for (const message of current) {
                  if (message.ts <= last.ts || message.type !== "say" || message.say !== "api_req_started") continue;
                  let request;
                  try {
                    request = JSON.parse(message.text).request;
                  } catch {
                    continue;
                  }
                  if (typeof request === "string"
                    && request.startsWith(`[execute_command for '${command.detail.requestedCommand}'] Result:`)
                    && request.includes("Command completed with exit code 0.")) {
                    return { resultMessageTs: message.ts, requestSha256: hash(request) };
                  }
                }
                return false;
              };
              const selection = await until(
                async () => {
                  const automatic = completedCommandResult();
                  if (automatic) return { automatic };
                  const rendered = await visibleElement("vscode-button", (item) =>
                    labels.includes(item.text),
                  );
                  return rendered ? { rendered } : false;
                },
                "Exact native decision control did not render",
                15000,
              );
              approved.add(last.ts);
              if (selection.automatic) {
                // Fast completed commands can advance without rendering a
                // further control. The persisted model request proves that
                // ValorIDE already consumed this exact command's output.
                automaticCommandContinuations.push({
                  commandId,
                  localTaskId: taskId,
                  askTs: last.ts,
                  outputSha256: detail.outputSha256,
                  ...selection.automatic,
                  interaction: "native-auto-continued",
                });
                save("native-automatic-command-continuations.json", automaticCommandContinuations);
              } else {
                const control = selection.rendered;
                decisions.push({
                  commandId,
                  localTaskId: taskId,
                  ts: last.ts,
                  ask: last.ask,
                  detail,
                  control: await control.element.evaluate((node) =>
                    node.textContent.trim(),
                  ),
                  interaction: "rendered-button-click",
                });
                save("native-ui-decisions.json", decisions);
                // The control was found in the rendered native webview and its
                // enabled/visible state was verified above. Dispatch through the
                // rendered element itself: Puppeteer's ElementHandle.click()
                // performs an additional scroll-to-viewport round trip which can
                // block behind a busy extension renderer before it ever delivers
                // the click.
                await control.element.evaluate((node) => node.click());
              }
            }
            observedTasks[commandId] = {
              commandId,
              localTaskId: taskId,
              taskDir,
            };
            save("native-tasks.json", observedTasks);
          }
        }
      }
      await sleep(500);
    }
    for (const page of await browser.pages()) {
      await page.screenshot({ path: path.join(evidence, "native-final.png") });
      break;
    }
  } catch (error) {
    save("native-driver-failure.json", {
      error: error.stack ?? String(error),
      decisions,
    });
    throw error;
  } finally {
    await browser.disconnect();
  }
};
