/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_basePath: string
  readonly VITE_wssBasePath: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
