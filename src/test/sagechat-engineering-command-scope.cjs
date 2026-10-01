const assert = require("node:assert/strict");
const path = require("node:path");

const command = "node --test quote-total.test.cjs";

const reviewedQuoteTestCommand = (requested, workspace) => {
  assert.equal(typeof requested, "string");
  assert.equal(typeof workspace, "string");
  const workingDirectory = path.resolve(workspace);
  assert.match(
    workingDirectory,
    /^\/[A-Za-z0-9_./-]+$/,
    "Reviewed workspace contains unsupported shell characters",
  );
  const requestedCommand = requested.trim();
  const allowed = new Set([
    command,
    `${command}REQ_APP`,
    `cd ${workingDirectory} && ${command}`,
    `cd '${workingDirectory}' && ${command}`,
    `cd "${workingDirectory}" && ${command}`,
  ]);
  assert(
    allowed.has(requestedCommand),
    "Native worker requested a command outside the reviewed scope",
  );
  return { command, requestedCommand, workingDirectory };
};

module.exports = { reviewedQuoteTestCommand };
