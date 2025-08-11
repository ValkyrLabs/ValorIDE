import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"

const baseConfig = tseslint.config(
	{ ignores: ["build"] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			// "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"no-case-declarations": "off",
			"react-hooks/exhaustive-deps": "off",
			"prefer-const": "off",
		},
	},
)

export default [
	...baseConfig,
	{
		files: ["src/api/providers/**/*.ts", "src/api/transform/**/*.ts", "src/integrations/misc/extract-text.ts", "src/services/browser/*.ts"],
		rules: {
			"@typescript-eslint/ban-ts-comment": "off"
		}
	},
	{
		files: ["**/*.test.ts", "**/*.test.tsx", "src/core/context/context-tracking/*.test.ts", "src/core/context/context-tracking/*.test.tsx", "src/core/assistant-message/diff.ts"],
		rules: {
			"require-yield": "off",
			"@typescript-eslint/no-unused-expressions": "off"
		}
	},
	{
		files: ["src/commands/appCommands.ts"],
		rules: {
			"@typescript-eslint/no-require-imports": "off"
		}
	},
	{
		files: ["src/api/providers/vscode-lm.ts", "src/integrations/terminal/TerminalProcess.ts"],
		rules: {
			"no-control-regex": "off"
		}
	},
	{
		files: ["src/core/prompts/loadMcpDocumentation.ts", "src/core/prompts/system.ts", "src/core/task/index.ts"],
		rules: {
			"no-useless-escape": "off"
		}
	},
	{
		files: ["src/integrations/misc/open-file.ts"],
		rules: {
			"no-empty": "off"
		}
	},
	{
		files: ["src/core/task/index.ts"],
		rules: {
			"no-ex-assign": "off",
			"no-empty": "off"
		}
	},
	{
		files: ["src/services/auth/valkyrai-config.ts"],
		rules: {
			"@typescript-eslint/no-unsafe-declaration-merging": "off"
		}
	},
	{
		files: ["src/test/services/search/file-search.test.ts"],
		rules: {
			"@typescript-eslint/no-unsafe-function-type": "off"
		}
	},
	{
		files: ["src/api/providers/vscode-lm.ts"],
		rules: {
			"@typescript-eslint/no-namespace": "off"
		}
	},
	{
		files: ["src/services/logging/Logger.ts"],
		rules: {
			"@typescript-eslint/no-unused-expressions": "off"
		}
	},
	{
		files: ["src/shared/proto/file.ts"],
		rules: {
			"eslint-comments/no-unused-disable": "off"
		}
	}
]
