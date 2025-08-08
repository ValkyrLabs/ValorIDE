/// <reference types="vite/types/importMeta.d.ts" />

import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	define: {
		"process.env": process.env,
	},
	// assetsInclude: ["**/*.yaml"],
})
