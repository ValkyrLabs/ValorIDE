const { transformSync } = require("esbuild");
const babel = require("@babel/core");

module.exports = {
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
