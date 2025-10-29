module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "<rootDir>/jest.esbuild-transform.cjs",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@api/(.*)$": "<rootDir>/src/api/$1",
    "^@thor/(.*)$": "<rootDir>/webview-ui/src/thor/$1",
    "^@websocket/(.*)$": "<rootDir>/webview-ui/src/websocket/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@integrations/(.*)$": "<rootDir>/src/integrations/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },
  transformIgnorePatterns: ["/node_modules/"],
};
