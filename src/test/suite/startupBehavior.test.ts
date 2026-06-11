import { readFile } from "fs/promises";
import { describe, it } from "mocha";
import * as path from "path";
import "should";

const repoRoot = path.join(__dirname, "..", "..", "..");

describe("ValorIDE startup behavior", () => {
  it("does not activate on every VS Code startup", async () => {
    const packageJSON = JSON.parse(
      await readFile(path.join(repoRoot, "package.json"), "utf8"),
    );

    packageJSON.activationEvents.should.not.containEql("onStartupFinished");
    packageJSON.activationEvents.should.containEql(
      "onViewContainer:valoride-activitybar",
    );
  });

  it("uses one opt-in startup reveal setting", async () => {
    const packageJSON = JSON.parse(
      await readFile(path.join(repoRoot, "package.json"), "utf8"),
    );
    const properties = packageJSON.contributes.configuration.properties;

    Object.keys(properties).should.containEql("valoride.startup.revealSidebar");
    Object.keys(properties).should.not.containEql("valoride.startupReveal");
    properties["valoride.startup.revealSidebar"].default.should.equal("manual");
  });

  it("does not force the activity bar or sidebar focus during activation", async () => {
    const source = await readFile(
      path.join(repoRoot, "src", "extension.ts"),
      "utf8",
    );
    const startupActivationBody = source.slice(
      source.indexOf("export function activate"),
      source.indexOf("context.subscriptions.push("),
    );

    startupActivationBody.should.not.containEql(
      "workbench.view.extension.valoride-activitybar",
    );
    startupActivationBody.should.not.containEql(
      "WebviewProvider.sideBarId}.focus",
    );
    startupActivationBody.should.not.containEql(
      "maybeRevealValorIDESidebarOnStartup",
    );
  });
});
