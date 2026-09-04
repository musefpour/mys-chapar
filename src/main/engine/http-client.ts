import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import type { FormDataItem, HttpRequestDraft, ResponseSnapshot } from "@shared/types";
import { sendHttpRequest as sendHttpRequestCore } from "@shared/send-http-request";

function toBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

async function hydrateFormdata(items: FormDataItem[] | undefined): Promise<FormDataItem[] | undefined> {
  if (!items) return items;
  return Promise.all(
    items.map(async (item) => {
      if (item.type !== "file") return item;
      if (item.fileBase64) return item;
      if (!item.filePath) return item;
      const buffer = await readFile(item.filePath);
      return {
        ...item,
        fileBase64: toBase64(buffer),
        fileName: item.fileName || basename(item.filePath),
      };
    }),
  );
}

/** Resolve desktop filesystem paths into base64 so the shared client can run. */
async function hydrateRequestFiles(request: HttpRequestDraft): Promise<HttpRequestDraft> {
  const body = { ...request.body };

  if (body.mode === "formdata") {
    body.formdata = await hydrateFormdata(body.formdata);
  }

  if (body.mode === "binary" && !body.binaryBase64) {
    if (!body.binaryPath) {
      throw new Error("Select a binary file first");
    }
    const fileStat = await stat(body.binaryPath);
    if (!fileStat.isFile()) {
      throw new Error("Binary path is not a file");
    }
    const buffer = await readFile(body.binaryPath);
    body.binaryBase64 = toBase64(buffer);
    body.binaryFileName = body.binaryFileName || basename(body.binaryPath);
  }

  return { ...request, body };
}

export async function sendHttpRequest(
  request: HttpRequestDraft,
  signal?: AbortSignal,
): Promise<ResponseSnapshot> {
  const hydrated = await hydrateRequestFiles(request);
  return sendHttpRequestCore(hydrated, signal);
}
