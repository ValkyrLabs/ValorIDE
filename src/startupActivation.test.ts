import { expect } from "chai";
import {
  normalizeStartupRevealMode,
  revealValorIDESidebar,
  shouldRevealValorIDESidebarOnStartup,
} from "./startupActivation";

describe("startupActivation", () => {
  describe("normalizeStartupRevealMode", () => {
    it("defaults unknown values to never", () => {
      expect(normalizeStartupRevealMode(undefined)).to.equal("never");
      expect(normalizeStartupRevealMode("sometimes")).to.equal("never");
    });

    it("keeps supported reveal modes", () => {
      expect(normalizeStartupRevealMode("never")).to.equal("never");
      expect(normalizeStartupRevealMode("firstInstall")).to.equal(
        "firstInstall",
      );
      expect(normalizeStartupRevealMode("always")).to.equal("always");
    });
  });

  describe("shouldRevealValorIDESidebarOnStartup", () => {
    it("does not reveal for returning firstInstall sessions", () => {
      expect(shouldRevealValorIDESidebarOnStartup("firstInstall", true)).to.equal(
        false,
      );
    });

    it("reveals for firstInstall sessions that have not completed reveal", () => {
      expect(
        shouldRevealValorIDESidebarOnStartup("firstInstall", false),
      ).to.equal(true);
    });

    it("honors never and always modes", () => {
      expect(shouldRevealValorIDESidebarOnStartup("never", false)).to.equal(
        false,
      );
      expect(shouldRevealValorIDESidebarOnStartup("always", true)).to.equal(
        true,
      );
    });
  });

  describe("revealValorIDESidebar", () => {
    it("reveals the activity bar before focusing the sidebar provider", async () => {
      const calls: string[] = [];
      const commands = {
        executeCommand: async (command: string) => {
          calls.push(command);
        },
      };

      await revealValorIDESidebar(commands, "valoride-dev.SidebarProvider");

      expect(calls).to.deep.equal([
        "workbench.view.extension.valoride-activitybar",
        "valoride-dev.SidebarProvider.focus",
      ]);
    });
  });
});
