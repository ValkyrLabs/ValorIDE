import assert from "node:assert/strict";
import test from "node:test";

import { decideStartupReveal } from "./startupRevealPolicy";

test("decideStartupReveal reveals on first activation", () => {
  assert.deepEqual(
    decideStartupReveal({
      revealOnStartupSetting: false,
      firstActivationRevealCompleted: false,
    }),
    { shouldReveal: true, reason: "first_activation" },
  );
});

test("decideStartupReveal stays quiet for returning users by default", () => {
  assert.deepEqual(
    decideStartupReveal({
      revealOnStartupSetting: false,
      firstActivationRevealCompleted: true,
    }),
    { shouldReveal: false, reason: "returning_user" },
  );
});

test("decideStartupReveal honors explicit startup reveal setting", () => {
  assert.deepEqual(
    decideStartupReveal({
      revealOnStartupSetting: true,
      firstActivationRevealCompleted: true,
    }),
    { shouldReveal: true, reason: "explicit_setting" },
  );
});
