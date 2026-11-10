// Render the actual production bundle with an offline VS Code bridge, not a reimplementation of the UI.
// npm run build:webview && node scripts/webview-appearance-smoke.mjs [screenshot-directory]
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { transform } from "esbuild";

const build = fileURLToPath(new URL("../webview-ui/build/", import.meta.url));
const fixture = await fs.readFile(
  new URL(
    "../webview-ui/src/components/build-mode/buildModeFixtures.ts",
    import.meta.url,
  ),
  "utf8",
);
const { code } = await transform(fixture, { loader: "ts", format: "esm" });
const { digitalProductProBuildModePayload } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
const out =
  process.argv[2] ||
  (await fs.mkdtemp(path.join(os.tmpdir(), "valoride-appearance-")));
await fs.mkdir(out, { recursive: true });
const candidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
];
const executablePath = (
  await Promise.all(
    candidates.filter(Boolean).map(
      async (p) =>
        await fs.access(p).then(
          () => p,
          () => null,
        ),
    ),
  )
).find(Boolean);
assert(
  executablePath,
  "Set CHROME_PATH to an installed Chromium-based browser",
);
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: [
    "--disable-background-networking",
    "--disable-extensions",
    "--no-first-run",
  ],
});
try {
  const mount = "/extension/dist/webview/";
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.protocol === "data:" || url.protocol === "blob:")
      return void request.continue();
    if (url.origin !== "http://webview.test" || !url.pathname.startsWith(mount))
      return void request.abort();
    const local = path.resolve(
      build,
      url.pathname.slice(mount.length) || "index.html",
    );
    if (!local.startsWith(path.resolve(build) + path.sep))
      return void request.abort();
    const body = await fs.readFile(local).catch(() => undefined);
    if (!body) return void request.abort();
    await request.respond({
      status: 200,
      contentType:
        {
          ".js": "text/javascript",
          ".css": "text/css",
          ".html": "text/html",
          ".svg": "image/svg+xml",
        }[path.extname(local)] || "application/octet-stream",
      body,
    });
  });
  await page.evaluateOnNewDocument(() => {
    window.acquireVsCodeApi = () => ({
      getState: () => undefined,
      setState: () => {},
      postMessage: (msg) => {
        if (msg.type === "thorapiRequest") {
          const req = msg.thorapiRequest,
            route = String(req.url || req.path || "");
          (window.fixtureRoutes ||= []).push(route);
          const values = /(^|\/)Application(\?|$)/.test(route)
            ? [
                {
                  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                  ownerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                  name: "Studio notes",
                  description:
                    "A workspace for collecting and publishing field notes.",
                  status: "ACTIVE",
                  version: "1.0.0",
                },
              ]
            : /permission/i.test(route)
              ? { permissions: ["READ", "WRITE"] }
              : /balance/i.test(route)
                ? { currentBalance: 100 }
                : [];
          setTimeout(
            () =>
              window.postMessage(
                {
                  type: "thorapiResponse",
                  thorapiResponse: {
                    requestId: req.requestId,
                    ok: true,
                    status: 200,
                    data: values,
                  },
                },
                "*",
              ),
            0,
          );
        }
        if (msg.type === "webviewDidLaunch")
          setTimeout(
            () =>
              window.postMessage(
                {
                  type: "state",
                  state: (window.appearanceState = {
                    version: "fixture",
                    apiConfiguration: {
                      apiProvider: "openai-native",
                      valkyraiHost: "https://appearance-fixture.invalid/v1",
                    },
                    valorideMessages: [],
                    taskHistory: [],
                    platform: "darwin",
                    chatSettings: { mode: "act" },
                    browserSettings: { viewport: { width: 900, height: 600 } },
                    planActSeparateModelsSetting: true,
                    autoApprovalSettings: {
                      version: 1,
                      enabled: false,
                      actions: {},
                      maxRequests: 20,
                    },
                    localValorIDERulesToggles: {},
                    globalValorIDERulesToggles: {},
                  }),
                },
                "*",
              ),
            0,
          );
      },
    });
    // Browser-only acceptance must not open any real websocket.
    window.WebSocket = class {
      static CLOSED = 3;
      readyState = 3;
      close() {}
      addEventListener() {}
      removeEventListener() {}
    };
  });
  await page.goto("http://webview.test" + mount, { waitUntil: "load" });
  for (const [kind, width, background, ink, muted, focus] of [
    ["dark", 360, "#1d2024", "#e5e5e5", "#b1b5bc", "#8ab4e8"],
    ["light", 560, "#ffffff", "#282c31", "#545c68", "#164f91"],
    ["high-contrast", 320, "#000000", "#ffffff", "#ffffff", "#ffff00"],
    ["high-contrast-light", 360, "#ffffff", "#000000", "#171717", "#001bb0"],
  ]) {
    await page.setViewport({ width, height: 760, deviceScaleFactor: 1 });
    await page.evaluate(
      ({ kind, background, ink, muted, focus }) => {
        const body = document.body;
        body.dataset.vscodeThemeKind = "vscode-" + kind;
        body.className = "valoride-calm vscode-" + kind;
        const colors = {
          "sideBar-background": background,
          "editor-background": background,
          foreground: ink,
          "editor-foreground": ink,
          descriptionForeground: muted,
          focusBorder: focus,
          "input-background": background,
          "input-foreground": ink,
          "button-background": focus,
          "button-foreground": background,
          "button-secondaryBackground": background,
          "button-secondaryForeground": ink,
          "textLink-foreground": focus,
          "panel-border": muted,
          contrastBorder: kind.includes("contrast") ? ink : null,
        };
        for (const [key, value] of Object.entries(colors))
          body.style.setProperty("--vscode-" + key, value);
        body.style.setProperty("--vscode-font-family", "system-ui");
        body.style.setProperty("--vscode-font-size", "13px");
      },
      { kind, background, ink, muted, focus },
    );
    if (await page.evaluate(() => Boolean(window.appearanceState)))
      await page.evaluate(() =>
        window.postMessage(
          { type: "state", state: window.appearanceState },
          "*",
        ),
      );
    for (const [action, heading] of [
      ["settings", "Settings"],
      ["history", "History"],
      ["mcp", "MCP Servers"],
      ["account", "Account"],
      ["chat", null],
    ]) {
      await page.evaluate(
        (action) =>
          window.postMessage(
            { type: "action", action: action + "ButtonClicked" },
            "*",
          ),
        action,
      );
      try {
        await page.waitForFunction(
          (title) =>
            title
              ? [
                  ...document.querySelectorAll(".valoride-screen-header h2"),
                ].some((h) => h.textContent === title && h.offsetWidth > 0)
              : Boolean(
                  document
                    .querySelector('[data-testid="chat-input"]')
                    ?.getBoundingClientRect().width,
                ),
          { timeout: 8000 },
          heading,
        );
      } catch (error) {
        throw new Error(
          kind +
            "/" +
            action +
            ": " +
            (await page.evaluate(() => document.body.innerText.slice(0, 640))),
          { cause: error },
        );
      }
      const metrics = await page.evaluate(() => {
        const header = document.querySelector(".valoride-screen-header"),
          bounds = header?.getBoundingClientRect();
        return {
          scheme: document.documentElement.dataset.bsTheme,
          overflow: document.documentElement.scrollWidth - innerWidth,
          clipped: bounds && (bounds.x < 0 || bounds.right > innerWidth + 1),
          error: !!document.querySelector("#__webview-global-error"),
        };
      });
      assert.equal(metrics.scheme, kind.includes("light") ? "light" : "dark");
      assert(
        metrics.overflow <= 1 && !metrics.clipped && !metrics.error,
        JSON.stringify(metrics),
      );
      if (action === "settings") {
        await page.waitForFunction(
          () =>
            document.getElementById("valkyr-theme-overrides")?.sheet?.cssRules
              .length > 0,
        );
        assert(
          await page.$$eval(".valoride-tab", (tabs) =>
            tabs.every((t) => t.scrollWidth <= t.clientWidth + 1),
          ),
          "Tab labels overflow their buttons",
        );
      }
      if (action === "chat")
        await page.waitForSelector(".valoride-wordmark svg");
      await page.screenshot({
        path: path.join(out, kind + "-" + action + ".png"),
      });
      if (action === "chat") {
        assert.equal(
          await page.$eval(".valoride-connections", (el) => el.open),
          false,
        );
        await page.focus(".valoride-connections summary");
        await page.keyboard.press("Enter");
        assert(await page.$eval(".valoride-connections", (el) => el.open), "Connection details must open from the keyboard");
        assert(await page.$eval(".valoride-connections summary", (el) => getComputedStyle(el).outlineStyle !== "none"), "Keyboard focus must remain visible");
        await page.keyboard.press("Enter");
        await page.evaluate(() =>
          window.postMessage(
            {
              type: "state",
              state: {
                ...window.appearanceState,
                valorideMessages: [
                  {
                    ts: 1,
                    type: "say",
                    say: "text",
                    text: "Check the workflow form wiring.",
                  },
                  {
                    ts: 2,
                    type: "say",
                    say: "reasoning",
                    partial: true,
                    text:
                      "Checking the event handler and the generated form.\n\n" +
                      "The fixture includes a required boolean, a numeric field, and a reusable action. ".repeat(
                        25,
                      ),
                  },
                ],
              },
            },
            "*",
          ),
        );
        const toggle = await page.waitForSelector(
          'button[aria-label="Collapse reasoning"]',
          { visible: true, timeout: 8000 },
        );
        assert(
          await page.$eval(
            ".valoride-reasoning-card",
            (el) => el.scrollWidth <= el.clientWidth + 1,
          ),
          "Long provider summary overflows",
        );
        await page.screenshot({
          path: path.join(out, kind + "-narrative.png"),
        });
        await toggle.click();
        await page.waitForSelector('button[aria-label="Expand reasoning"]');
        await page.evaluate(() =>
          window.postMessage(
            { type: "state", state: window.appearanceState },
            "*",
          ),
        );
      }
    }
    await page.evaluate(
      (payload) =>
        window.postMessage({ type: "valorBuildModeTask", payload }, "*"),
      digitalProductProBuildModePayload,
    );
    await page.waitForSelector(".build-mode__title", { visible: true });
    await page.screenshot({ path: path.join(out, kind + "-build.png") });
    await page.evaluate(() => {
      window.postMessage(
        {
          type: "state",
          state: {
            ...window.appearanceState,
            jwtToken: "synthetic-not-an-account-credential",
            credentialOrigin: "https://appearance-fixture.invalid",
            isLoggedIn: true,
            authenticatedPrincipal: {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              username: "fixture",
            },
          },
        },
        "*",
      );
      window.postMessage(
        {
          type: "action",
          action: "accountButtonClicked",
          accountTab: "applications",
        },
        "*",
      );
    });
    await page
      .waitForSelector(".application-name", { visible: true, timeout: 6000 })
      .catch(async (err) => {
        throw new Error(
          "Apps: " +
            (await page.evaluate(() =>
              JSON.stringify({
                text: document.body.innerText.slice(0, 1100),
                routes: window.fixtureRoutes?.slice(-12),
              }),
            )),
          { cause: err },
        );
      });
    assert.equal(
      await page.$eval(".application-name", (el) => el.textContent),
      "Studio notes",
    );
    assert(
      await page.$eval(
        ".application-buttons",
        (el) => el.getBoundingClientRect().right <= innerWidth,
      ),
      "App toolbar outside viewport",
    );
    await page.screenshot({ path: path.join(out, kind + "-apps.png") });
  }
  console.log("Verified 32 actual sidebar renders:", out);
} finally {
  await browser.close();
}
