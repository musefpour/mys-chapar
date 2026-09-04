/// <reference types="chrome" />
/// <reference types="vite/client" />

import type { MyChaparApi } from "@shared/types";

declare global {
  interface Window {
    mychapar: MyChaparApi;
  }
}

export {};
