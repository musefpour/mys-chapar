import { nanoid } from "nanoid";
import type { FormDataItem, HttpRequestDraft, KeyValue, RequestBody } from "@shared/types";
import { ensureHttpUrl } from "@shared/ensure-http-url";

const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function defaultCollectionVariables(): KeyValue[] {
  return [
    {
      id: nanoid(8),
      key: "baseUrl",
      value: "https://httpbin.org",
      enabled: true,
    },
    {
      id: nanoid(8),
      key: "",
      value: "",
      enabled: true,
    },
  ];
}

/** Collect unique `{{name}}` references from a request. */
export function extractUsedVariableNames(request: HttpRequestDraft): string[] {
  const names = new Set<string>();
  const scan = (input: string | undefined | null) => {
    if (!input) return;
    VAR_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = VAR_PATTERN.exec(input)) != null) {
      const name = match[1]?.trim();
      if (name) names.add(name);
    }
  };

  scan(request.url);
  scan(request.name);
  for (const item of request.params ?? []) {
    scan(item.key);
    scan(item.value);
  }
  for (const item of request.headers ?? []) {
    scan(item.key);
    scan(item.value);
  }
  const body = request.body;
  if (body) {
    scan(body.raw);
    scan(body.binaryPath);
    scan(body.binaryFileName);
    for (const item of body.urlencoded ?? []) {
      scan(item.key);
      scan(item.value);
    }
    for (const item of body.formdata ?? []) {
      scan(item.key);
      scan(item.value);
      scan(item.fileName);
      scan(item.filePath);
    }
    scan(body.graphql?.query);
    scan(body.graphql?.variables);
  }

  return [...names];
}

export function variablesToMap(variables: KeyValue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of variables) {
    if (!item.enabled) continue;
    const key = item.key.trim();
    if (!key) continue;
    map[key] = item.value;
  }
  return map;
}

export function resolveVariables(input: string, variables: KeyValue[]): string {
  const map = variablesToMap(variables);
  if (!input || !Object.keys(map).length) return input;
  return input.replace(VAR_PATTERN, (full, name: string) => {
    if (Object.prototype.hasOwnProperty.call(map, name)) {
      return map[name];
    }
    return full;
  });
}

function resolveKeyValues(items: KeyValue[] | undefined, variables: KeyValue[]): KeyValue[] {
  return (items ?? []).map((item) => ({
    ...item,
    key: resolveVariables(item.key, variables),
    value: resolveVariables(item.value, variables),
  }));
}

function resolveFormdata(items: FormDataItem[] | undefined, variables: KeyValue[]): FormDataItem[] {
  return (items ?? []).map((item) => ({
    ...item,
    key: resolveVariables(item.key, variables),
    value: resolveVariables(item.value, variables),
    fileName: item.fileName ? resolveVariables(item.fileName, variables) : item.fileName,
    filePath: item.filePath ? resolveVariables(item.filePath, variables) : item.filePath,
  }));
}

function resolveBody(body: RequestBody, variables: KeyValue[]): RequestBody {
  return {
    ...body,
    raw: body.raw != null ? resolveVariables(body.raw, variables) : body.raw,
    urlencoded: resolveKeyValues(body.urlencoded, variables),
    formdata: resolveFormdata(body.formdata, variables),
    binaryPath: body.binaryPath
      ? resolveVariables(body.binaryPath, variables)
      : body.binaryPath,
    binaryFileName: body.binaryFileName
      ? resolveVariables(body.binaryFileName, variables)
      : body.binaryFileName,
    graphql: body.graphql
      ? {
          query: resolveVariables(body.graphql.query, variables),
          variables: resolveVariables(body.graphql.variables, variables),
        }
      : body.graphql,
  };
}

/** Apply collection variables to a request copy used for sending / export. */
export function applyCollectionVariables(
  request: HttpRequestDraft,
  variables: KeyValue[],
): HttpRequestDraft {
  return {
    ...request,
    url: ensureHttpUrl(resolveVariables(request.url, variables)),
    params: resolveKeyValues(request.params, variables),
    headers: resolveKeyValues(request.headers, variables),
    body: resolveBody(request.body, variables),
  };
}
