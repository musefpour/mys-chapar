import {
  EXT,
  type FetchTextPayload,
  type FetchTextResponse,
  type SendRequestPayload,
  type SendRequestResponse,
} from "@shared/types";
import { fetchTextResource } from "@shared/fetch-text";
import { sendHttpRequest } from "@shared/send-http-request";

const controllers = new Map<string, AbortController>();

chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === EXT.CANCEL_REQUEST) {
    const requestId = String(message.requestId ?? "");
    const controller = controllers.get(requestId);
    if (controller) {
      controller.abort();
      controllers.delete(requestId);
    }
    return;
  }

  if (message.type === EXT.FETCH_TEXT) {
    const payload = message.payload as FetchTextPayload;
    void fetchTextResource(payload).then((result: FetchTextResponse) => {
      sendResponse(result);
    });
    return true;
  }

  if (message.type === EXT.SEND_REQUEST) {
    const payload = message.payload as SendRequestPayload;
    const requestId = payload.request.id;
    const controller = new AbortController();
    controllers.set(requestId, controller);

    void (async () => {
      let result: SendRequestResponse;
      try {
        const response = await sendHttpRequest(payload.request, controller.signal);
        result = { ok: true, response };
      } catch (error) {
        const errMessage =
          error instanceof Error ? error.message : "Unknown request error";
        const cancelled =
          errMessage.toLowerCase().includes("abort") ||
          (error instanceof DOMException && error.name === "AbortError");
        result = {
          ok: false,
          error: cancelled ? "Request cancelled" : errMessage,
        };
      } finally {
        controllers.delete(requestId);
      }
      sendResponse(result);
    })();

    return true;
  }

  return undefined;
});
