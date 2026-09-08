const path = require("node:path");
const root = path.resolve(__dirname, "..");
require("ts-node").register({
  project: path.join(root, "tsconfig.json"),
  transpileOnly: true,
  compilerOptions: { module: "CommonJS", moduleResolution: "Node" },
});
require("tsconfig-paths").register({
  baseUrl: root,
  paths: require("../tsconfig.json").compilerOptions.paths,
});

let testOutput;
exports.mochaGlobalSetup = () => {
  const vscode = require("vscode");
  testOutput = vscode.window.createOutputChannel("ValorIDE host tests");
  require("../src/services/logging/Logger").Logger.initialize(testOutput);
};
exports.mochaGlobalTeardown = () => {
  testOutput?.dispose();
};
