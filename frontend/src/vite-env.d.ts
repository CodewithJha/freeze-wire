/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CC3_CHAIN_ID?: string;
  readonly VITE_CC3_RPC_URL?: string;
  readonly VITE_CC3_EXPLORER_URL?: string;
  readonly VITE_CREDIT_LINE_ADDRESS?: string;
  readonly VITE_LEDGER_ADDRESS?: string;
  /** Opt-in UI simulation only. Without this, missing addresses are NOT_DEPLOYED. */
  readonly VITE_ALLOW_SIMULATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
