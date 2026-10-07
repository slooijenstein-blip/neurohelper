/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_CLERK_SIGN_IN_URL?: string;
  readonly VITE_CLERK_SIGN_UP_URL?: string;
  /** Comma-separated reviewer emails. Unset uses the built-in allowlist. */
  readonly VITE_PRO_REQUEST_ADMIN_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
