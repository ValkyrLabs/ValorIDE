const { transformSync } = require("esbuild");
const babel = require("@babel/core");
const crypto = require("node:crypto");
const fs = require("node:fs");
const transformerSource = fs.readFileSync(__filename);

module.exports = {
  getCacheKey(source, filename, options) {
    return crypto
      .createHash("sha256")
      .update(source)
      .update(filename)
      .update(options.configString)
      .update(transformerSource)
      .digest("hex");
  },
  process(source, filename) {
    const isTs = filename.endsWith(".ts");
    const isTsx = filename.endsWith(".tsx");
    const loader = isTs ? "ts" : isTsx ? "tsx" : "js";

    const result = transformSync(source, {
      loader,
      format: "cjs",
      target: "es2020",
      sourcemap: "inline",
      jsx: "automatic",
      sourcefile: filename,
      // Match tsconfig.json: providers use TypeScript's legacy decorators.
      tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
      supported: { "dynamic-import": false },
    });

    // Jest's mock factories must register before the compiled require calls.
    const hoisted = babel.transformSync(result.code, {
      filename,
      configFile: false,
      babelrc: false,
      plugins: [require.resolve("babel-plugin-jest-hoist")],
      sourceMaps: "inline",
    });

    return {
      code: hoisted.code,
    };
  },
};
