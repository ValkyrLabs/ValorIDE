import * as assert from "node:assert/strict";
import { describe, it } from "mocha";
import {
  revealValorideSidebar,
  VALORIDE_ACTIVITYBAR_COMMAND,
  valorideSidebarFocusCommand,
} from "./startupReveal";

describe("startup reveal policy", () => {
  it("keeps ValorIDE reveal behind an explicit command helper", async () => {
    const commands: string[] = [];

    await revealValorideSidebar("valoride-dev.SidebarProvider", (command) => {
      commands.push(command);
      return Promise.resolve(undefined);
    });

    assert.deepEqual(commands, [
      VALORIDE_ACTIVITYBAR_COMMAND,
      valorideSidebarFocusCommand("valoride-dev.SidebarProvider"),
    ]);
  });
});
