module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "<rootDir>/jest.esbuild-transform.cjs",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@thorapi/model$": [
      "<rootDir>/webview-ui/src/thorapi/model/index.ts",
      "<rootDir>/src/thorapi/model/index.ts",
    ],
    "^@thorapi/api$": [
      "<rootDir>/webview-ui/src/thorapi/api/index.ts",
      "<rootDir>/src/thorapi/api/index.ts",
      "<rootDir>/webview-ui/src/api/index.ts",
      "<rootDir>/src/api/index.ts",
    ],
    "^@thorapi/src$": [
      "<rootDir>/webview-ui/src/thorapi/src/index.ts",
      "<rootDir>/src/thorapi/src/index.ts",
    ],
    "^@thorapi/(.*)$": [
      "<rootDir>/webview-ui/src/$1",
      "<rootDir>/src/$1",
    ],
    "^@api/(.*)$": "<rootDir>/src/api/$1",
    "^@websocket/(.*)$": "<rootDir>/webview-ui/src/websocket/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@integrations/(.*)$": "<rootDir>/src/integrations/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@valkyr/component-library/(.*)$":
      "<rootDir>/webview-ui/src/components/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@utils/(.*)$": [
      "<rootDir>/src/utils/$1",
      "<rootDir>/webview-ui/src/utils/$1",
    ],
    "^vscode$": "<rootDir>/__mocks__/vscode.ts",
  },
  transformIgnorePatterns: ["/node_modules/"],
};
