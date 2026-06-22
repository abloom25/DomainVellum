/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BARK_TOKEN: string
  readonly VITE_CORS_PROXY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
