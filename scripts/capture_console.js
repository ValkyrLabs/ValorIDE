const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`PAGE_CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    console.log("PAGE_ERROR:", err.stack || err.message || err);
  });

  await page.goto("http://localhost:4173/", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  // wait a bit for any async runtime errors
  await page.waitForTimeout(2000);
  await browser.close();
})();
