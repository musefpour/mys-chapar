import type {
  FetchTextPayload,
  FetchTextResponse,
  MyChaparApi,
  SendRequestPayload,
  SendRequestResponse,
} from "@shared/types";
import { EXT } from "@shared/types";

function installExtensionBridge(): void {
  const api: MyChaparApi = {
    sendRequest: (payload: SendRequestPayload): Promise<SendRequestResponse> =>
      chrome.runtime.sendMessage({ type: EXT.SEND_REQUEST, payload }),
    cancelRequest: (requestId: string): void => {
      void chrome.runtime.sendMessage({ type: EXT.CANCEL_REQUEST, requestId });
    },
    fetchText: (payload: FetchTextPayload): Promise<FetchTextResponse> =>
      chrome.runtime.sendMessage({ type: EXT.FETCH_TEXT, payload }),
  };

  window.mychapar = api;
}

installExtensionBridge();
