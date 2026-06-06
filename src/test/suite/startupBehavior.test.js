"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const mocha_1 = require("mocha");
const path = require("path");
require("should");
const repoRoot = path.join(__dirname, "..", "..", "..");
(0, mocha_1.describe)("ValorIDE startup behavior", () => {
    (0, mocha_1.it)("does not activate on every VS Code startup", async () => {
        const packageJSON = JSON.parse(await (0, promises_1.readFile)(path.join(repoRoot, "package.json"), "utf8"));
        packageJSON.activationEvents.should.not.containEql("onStartupFinished");
        packageJSON.activationEvents.should.containEql("onViewContainer:valoride-activitybar");
    });
    (0, mocha_1.it)("does not force the activity bar or sidebar focus during activation", async () => {
        const source = await (0, promises_1.readFile)(path.join(repoRoot, "src", "extension.ts"), "utf8");
        const startupActivationBody = source.slice(source.indexOf("export function activate"), source.indexOf("context.subscriptions.push("));
        startupActivationBody.should.not.containEql("workbench.view.extension.valoride-activitybar");
        startupActivationBody.should.not.containEql("WebviewProvider.sideBarId}.focus");
    });
});
//# sourceMappingURL=startupBehavior.test.js.map
