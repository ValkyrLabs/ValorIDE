const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

async function run() {
  const buildIndex = path.resolve(__dirname, "../webview-ui/build/index.html");
  if (!fs.existsSync(buildIndex)) {
    console.error("Built index.html not found at", buildIndex);
    process.exit(2);
  }
  const html = fs.readFileSync(buildIndex, "utf8");
  const jsdomOptions = {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  };
  if (process.env.FORCE_CHAT_ERROR === "1") {
    jsdomOptions.url = "http://localhost/?forceChatError=1";
  }
  const dom = new JSDOM(html, jsdomOptions);

  dom.window.addEventListener("error", (e) => {
    console.error(
      "PAGE ERROR",
      e.error && e.error.stack ? e.error.stack : e.message
    );
    // try to POST to capture server
    try {
      globalThis.fetch &&
        fetch("http://localhost:3001/webview-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "webviewError",
            text: e.message,
            stack: e.error && e.error.stack,
          }),
        }).catch(() => {});
    } catch (ex) {}
  });

  dom.window.addEventListener("unhandledrejection", (e) => {
    console.error(
      "UNHANDLED REJECTION",
      e.reason && (e.reason.stack || e.reason)
    );
    try {
      globalThis.fetch &&
        fetch("http://localhost:3001/webview-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "webviewError",
            text: String((e.reason && e.reason.message) || e.reason),
            stack: e.reason && e.reason.stack,
          }),
        }).catch(() => {});
    } catch (ex) {}
  });

  // wait for scripts to load
  await new Promise((resolve) => {
    dom.window.addEventListener("load", () => {
      setTimeout(resolve, 2000);
    });
    // fallback timeout
    setTimeout(resolve, 5000);
  });

  console.log("JSDOM run complete");
  dom.window.close();
}

run().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
