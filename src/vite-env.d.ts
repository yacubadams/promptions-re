/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PROXY_URL?: string;
    readonly VITE_ANTHROPIC_API_KEY?: string;
    readonly VITE_ANTHROPIC_MODEL?: string;
}
interface ImportMeta {
    readonly env: ImportMetaEnv;
}
