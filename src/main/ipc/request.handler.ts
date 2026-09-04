import { ipcMain } from "electron";
import { IPC, type SendRequestPayload, type SendRequestResponse } from "@shared/types";
import { sendHttpRequest } from "../engine/http-client";

const controllers = new Map<string, AbortController>();

export function registerRequestIpc(): void {
  ipcMain.handle(
    IPC.SEND_REQUEST,
    async (_event, payload: SendRequestPayload): Promise<SendRequestResponse> => {
      const requestId = payload.request.id;
      const controller = new AbortController();
      controllers.set(requestId, controller);

      try {
        const response = await sendHttpRequest(payload.request, controller.signal);
        return { ok: true, response };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown request error";
        return { ok: false, error: message };
      } finally {
        controllers.delete(requestId);
      }
    },
  );

  ipcMain.on(IPC.CANCEL_REQUEST, (_event, requestId: string) => {
    const controller = controllers.get(requestId);
    if (controller) {
      controller.abort();
      controllers.delete(requestId);
    }
  });
}
