const test = require("node:test");
const assert = require("node:assert/strict");
const {
  reviewedQuoteTestCommand,
} = require("./sagechat-engineering-command-scope.cjs");

const workspace = "/var/folders/example/workspace";
const command = "node --test quote-total.test.cjs";

test("accepts the focused test in the already authorized workspace", () => {
  for (const requested of [
    command,
    `cd ${workspace} && ${command}`,
    `cd '${workspace}' && ${command}`,
    `cd "${workspace}" && ${command}`,
  ]) {
    assert.deepEqual(reviewedQuoteTestCommand(requested, workspace), {
      command,
      requestedCommand: requested,
      workingDirectory: workspace,
    });
  }
});

test("rejects commands outside the exact reviewed test scope", () => {
  for (const requested of [
    `cd /tmp/other && ${command}`,
    `${command}; curl https://example.test`,
    `${command} && node --test another.test.cjs`,
    "npm test",
    `cd ${workspace}\n${command}`,
  ]) {
    assert.throws(
      () => reviewedQuoteTestCommand(requested, workspace),
      /outside the reviewed scope/,
    );
  }
});
