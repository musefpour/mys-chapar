/// <reference types="vite/client" />

import type { MyChaparApi } from "@shared/types";

export interface VsCodeHostInit {
  platform: string;
  arch: string;
  osRelease: string;
  vscodeVersion: string;
}

declare global {
  interface Window {
    mychapar: MyChaparApi;
    __MYCHAPAR_INIT__?: VsCodeHostInit;
  }

  function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
  };
}

export {};
