const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function inventory() {
  const groups = { jest: [], vitest: [], mocha: [], node: [] };
  function visit(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, item.name);
      if (item.isDirectory()) visit(filename);
      else if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(item.name)) {
        const source = ts.createSourceFile(
          filename,
          fs.readFileSync(filename, "utf8"),
          ts.ScriptTarget.Latest,
        );
        const runners = new Set();
        function inspect(node) {
          let moduleName;
          if (ts.isImportDeclaration(node))
            moduleName = node.moduleSpecifier.text;
          if (
            ts.isCallExpression(node) &&
            node.expression.getText(source) === "require" &&
            node.arguments.length > 0 &&
            ts.isStringLiteral(node.arguments[0])
          )
            moduleName = node.arguments[0].text;
          const runner = {
            mocha: "mocha",
            vitest: "vitest",
            "node:test": "node",
            "@jest/globals": "jest",
          }[moduleName];
          if (runner) runners.add(runner);
          ts.forEachChild(node, inspect);
        }
        inspect(source);
        if (runners.size > 1)
          throw new Error(`Mixed test runners: ${filename}`);
        groups[[...runners][0] ?? "jest"].push(
          path.relative(root, filename).split(path.sep).join("/"),
        );
      }
    }
  }
  visit(path.join(root, "src"));
  for (const [runner, files] of Object.entries(groups)) {
    files.sort();
    if (!files.length) throw new Error(`No ${runner} host tests discovered`);
  }
  return groups;
}

module.exports = inventory;
if (require.main === module)
  process.stdout.write(`${JSON.stringify(inventory(), null, 2)}\n`);
