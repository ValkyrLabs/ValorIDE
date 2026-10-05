import assert from "node:assert/strict";
import test from "node:test";

import {
  decideStartupReveal,
  getExplicitStartupSetting,
} from "./startupRevealPolicy";

test("decideStartupReveal reveals on first activation", () => {
  assert.deepEqual(
    decideStartupReveal({
      firstActivationRevealCompleted: false,
    }),
    { shouldReveal: true, reason: "first_activation" },
  );
});

test("decideStartupReveal stays quiet for returning users by default", () => {
  assert.deepEqual(
    decideStartupReveal({
      firstActivationRevealCompleted: true,
    }),
    { shouldReveal: false, reason: "returning_user" },
  );
});

test("explicit false keeps even a first activation quiet", () => {
  assert.deepEqual(
    decideStartupReveal({
      revealOnStartupSetting: false,
      firstActivationRevealCompleted: false,
    }),
    { shouldReveal: false, reason: "explicit_setting" },
  );
});

test("existing manual and always preferences still work", () => {
  assert.deepEqual(decideStartupReveal({ legacyRevealMode: "manual" }), {
    shouldReveal: false,
    reason: "legacy_setting",
  });
  assert.deepEqual(
    decideStartupReveal({
      legacyRevealMode: "always",
      firstActivationRevealCompleted: true,
    }),
    { shouldReveal: true, reason: "legacy_setting" },
  );
});

test("the current explicit boolean takes precedence over the legacy mode", () => {
  assert.equal(
    decideStartupReveal({
      revealOnStartupSetting: false,
      legacyRevealMode: "always",
    }).shouldReveal,
    false,
  );
  assert.equal(
    decideStartupReveal({
      revealOnStartupSetting: true,
      legacyRevealMode: "manual",
    }).shouldReveal,
    true,
  );
});

test("firstInstall respects either generation of the completed marker", () => {
  assert.equal(
    decideStartupReveal({
      legacyRevealMode: "firstInstall",
      legacyRevealCompleted: true,
    }).shouldReveal,
    false,
  );
  assert.equal(
    decideStartupReveal({
      legacyRevealMode: "firstInstall",
      firstActivationRevealCompleted: true,
    }).shouldReveal,
    false,
  );
  assert.equal(
    decideStartupReveal({ legacyRevealMode: "firstInstall" }).shouldReveal,
    true,
  );
});

test("configuration defaults do not override onboarding or explicit scoped preferences", () => {
  const defaults = { defaultValue: false };
  assert.equal(
    getExplicitStartupSetting(defaults as { globalValue?: boolean }),
    undefined,
  );
  assert.equal(
    getExplicitStartupSetting({ globalValue: true, workspaceValue: false }),
    false,
  );
  assert.equal(
    getExplicitStartupSetting({
      globalValue: false,
      workspaceValue: false,
      workspaceFolderValue: true,
    }),
    true,
  );
  assert.equal(
    decideStartupReveal({
      revealOnStartupSetting: getExplicitStartupSetting(
        defaults as { globalValue?: boolean },
      ),
    }).shouldReveal,
    true,
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
