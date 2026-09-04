import { BrowserWindow, dialog, ipcMain } from "electron";
import { writeFile } from "node:fs/promises";
import {
  IPC,
  type SaveTextFilePayload,
  type SaveTextFileResult,
} from "@shared/types";

export function registerSaveFileIpc(): void {
  ipcMain.handle(
    IPC.SAVE_TEXT_FILE,
    async (event, payload: SaveTextFilePayload): Promise<SaveTextFileResult> => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const options = {
        defaultPath: payload.defaultName,
        filters: payload.filters?.length
          ? payload.filters
          : [{ name: "All Files", extensions: ["*"] }],
      };
      const picked = win
        ? await dialog.showSaveDialog(win, options)
        : await dialog.showSaveDialog(options);
      if (picked.canceled || !picked.filePath) {
        return { ok: false, cancelled: true };
      }
      try {
        await writeFile(picked.filePath, payload.content, "utf8");
        return { ok: true, path: picked.filePath };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Could not write file",
        };
      }
    },
  );
}
