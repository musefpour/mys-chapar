import { ipcMain } from "electron";
import { IPC, type FetchTextPayload, type FetchTextResponse } from "@shared/types";
import { fetchTextResource } from "@shared/fetch-text";

export function registerFetchTextIpc(): void {
  ipcMain.handle(
    IPC.FETCH_TEXT,
    async (_event, payload: FetchTextPayload): Promise<FetchTextResponse> =>
      fetchTextResource(payload),
  );
}
