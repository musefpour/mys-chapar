import { nanoid } from "nanoid";
import { load as yamlLoad } from "js-yaml";
import type {
  CollectionFolderNode,
  CollectionNode,
  CollectionRequestNode,
  FormDataItem,
  HttpMethod,
  HttpRequestDraft,
  KeyValue,
  RequestBody,
} from "@shared/types";

const HTTP_METHODS = new Set<string>([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);

export interface OpenApiImportDraft {
  name: string;
  variables: KeyValue[];
  children: CollectionNode[];
  stats: { folders: number; requests: number };
}

export type ParseOpenApiResult =
  | { ok: true; draft: OpenApiImportDraft }
  | { ok: false; error: string };

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function nowIso(): string {
  return new Date().toISOString();
}

function kv(key = "", value = "", enabled = true): KeyValue {
  return { id: nanoid(8), key, value, enabled };
}

function formItem(key = "", value = ""): FormDataItem {
  return {
    id: nanoid(8),
    key,
    value,
    enabled: true,
    type: "text",
  };
}

function emptyBody(): RequestBody {
  return {
    mode: "none",
    raw: "",
    rawLanguage: "json",
    urlencoded: [kv()],
    formdata: [formItem()],
    binaryPath: undefined,
    binaryFileName: undefined,
    graphql: { query: "", variables: "" },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "") || url;
}

function joinUrl(base: string, path: string): string {
  const b = stripTrailingSlash(base);
  if (!path) return b;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function resolveDocumentUrl(docUrl: string | undefined): URL | null {
  if (!docUrl) return null;
  try {
    return new URL(docUrl);
  } catch {
    return null;
  }
}

function resolveServerBase(spec: Record<string, unknown>, docUrl?: string): string {
  const doc = resolveDocumentUrl(docUrl);

  // OpenAPI 3
  if (Array.isArray(spec.servers) && spec.servers.length) {
    const first = spec.servers[0];
    if (isRecord(first) && typeof first.url === "string" && first.url.trim()) {
      let serverUrl = first.url.trim();
      // Replace {variables} with default values when present
      if (isRecord(first.variables)) {
        for (const [name, variable] of Object.entries(first.variables)) {
          const def =
            isRecord(variable) && typeof variable.default === "string"
              ? variable.default
              : "";
          serverUrl = serverUrl.replaceAll(`{${name}}`, def);
        }
      }
      if (serverUrl.startsWith("/")) {
        if (doc) return stripTrailingSlash(`${doc.origin}${serverUrl}`);
        return stripTrailingSlash(serverUrl);
      }
      if (!/^https?:\/\//i.test(serverUrl) && doc) {
        return stripTrailingSlash(new URL(serverUrl, doc.origin).toString());
      }
      // Prefer https when the OpenAPI doc itself was fetched over https (common Spring http server url).
      if (doc?.protocol === "https:" && /^http:\/\//i.test(serverUrl)) {
        try {
          const server = new URL(serverUrl);
          if (server.hostname === doc.hostname) {
            server.protocol = "https:";
            return stripTrailingSlash(server.toString());
          }
        } catch {
          // ignore
        }
      }
      return stripTrailingSlash(serverUrl);
    }
  }

  // Swagger 2
  if (typeof spec.swagger === "string") {
    const host = asString(spec.host);
    const basePath = asString(spec.basePath, "/");
    const schemes = Array.isArray(spec.schemes)
      ? spec.schemes.filter((item): item is string => typeof item === "string")
      : [];
    const scheme = schemes[0] || doc?.protocol.replace(":", "") || "https";
    if (host) {
      return stripTrailingSlash(`${scheme}://${host}${basePath.startsWith("/") ? basePath : `/${basePath}`}`);
    }
    if (doc) {
      return stripTrailingSlash(`${doc.origin}${basePath.startsWith("/") ? basePath : `/${basePath}`}`);
    }
  }

  if (doc) return doc.origin;
  return "https://api.example.com";
}

function deref(
  schema: unknown,
  components: Record<string, unknown> | undefined,
  depth = 0,
): unknown {
  if (!isRecord(schema) || depth > 8) return schema;
  const ref = schema.$ref;
  if (typeof ref !== "string") return schema;

  // #/components/schemas/Foo or #/definitions/Foo
  const match = ref.match(/^#\/(components\/schemas|definitions)\/(.+)$/);
  if (!match || !components) return schema;
  const name = decodeURIComponent(match[2]);
  const bucket =
    match[1] === "definitions"
      ? isRecord(components.definitions)
        ? (components.definitions as Record<string, unknown>)
        : undefined
      : isRecord(components.schemas)
        ? (components.schemas as Record<string, unknown>)
        : undefined;
  if (!bucket || !(name in bucket)) return schema;
  return deref(bucket[name], components, depth + 1);
}

function exampleFromSchema(
  schema: unknown,
  components: Record<string, unknown> | undefined,
  depth = 0,
): Json {
  if (depth > 6) return null;
  const resolved = deref(schema, components, 0);
  if (!isRecord(resolved)) return null;

  if (resolved.example !== undefined) return resolved.example as Json;
  if (resolved.default !== undefined) return resolved.default as Json;

  if (Array.isArray(resolved.enum) && resolved.enum.length) {
    return resolved.enum[0] as Json;
  }

  const type = asString(resolved.type);

  if (type === "object" || isRecord(resolved.properties)) {
    const props = isRecord(resolved.properties) ? resolved.properties : {};
    const obj: Record<string, Json> = {};
    for (const [key, value] of Object.entries(props)) {
      obj[key] = exampleFromSchema(value, components, depth + 1);
    }
    return obj;
  }

  if (type === "array") {
    const item = exampleFromSchema(resolved.items, components, depth + 1);
    return [item];
  }

  switch (type) {
    case "string":
      if (resolved.format === "date-time") return "2024-01-01T00:00:00Z";
      if (resolved.format === "date") return "2024-01-01";
      if (resolved.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      if (resolved.format === "email") return "user@example.com";
      if (resolved.format === "uri") return "https://example.com";
      return "string";
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return true;
    case "null":
      return null;
    default:
      return null;
  }
}

function parameterExample(param: Record<string, unknown>, components?: Record<string, unknown>): string {
  if (param.example !== undefined && param.example !== null) return String(param.example);
  if (isRecord(param.schema)) {
    const ex = exampleFromSchema(param.schema, components);
    if (ex !== null && typeof ex !== "object") return String(ex);
  }
  return "";
}

function createRequestDraft(input: {
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body: RequestBody;
}): HttpRequestDraft {
  return {
    id: nanoid(10),
    name: input.name,
    method: input.method,
    url: input.url,
    params: input.params.length ? input.params : [kv()],
    headers: input.headers.length ? input.headers : [kv("Accept", "application/json")],
    body: input.body,
  };
}

function createRequestNode(request: HttpRequestDraft): CollectionRequestNode {
  return {
    id: nanoid(10),
    type: "request",
    name: request.name,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    request,
  };
}

function createFolderNode(name: string, children: CollectionNode[]): CollectionFolderNode {
  return {
    id: nanoid(10),
    type: "folder",
    name,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    children,
  };
}

function operationName(
  method: string,
  path: string,
  operation: Record<string, unknown>,
): string {
  const summary = asString(operation.summary).trim();
  if (summary) return summary;
  const opId = asString(operation.operationId).trim();
  if (opId) return opId;
  return `${method.toUpperCase()} ${path}`;
}

function collectParameters(
  pathItem: Record<string, unknown>,
  operation: Record<string, unknown>,
  components?: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const list: Array<Record<string, unknown>> = [];
  const pushAll = (raw: unknown) => {
    if (!Array.isArray(raw)) return;
    for (const item of raw) {
      if (!isRecord(item)) continue;
      if (typeof item.$ref === "string" && components && isRecord(components.parameters)) {
        const name = item.$ref.split("/").pop();
        const resolved = name ? components.parameters[decodeURIComponent(name)] : null;
        if (isRecord(resolved)) list.push(resolved);
        continue;
      }
      list.push(item);
    }
  };
  pushAll(pathItem.parameters);
  pushAll(operation.parameters);
  return list;
}

function buildBody(
  operation: Record<string, unknown>,
  components: Record<string, unknown> | undefined,
  isSwagger2: boolean,
  allParameters: Array<Record<string, unknown>>,
): { body: RequestBody; contentTypeHeader?: string } {
  const body = emptyBody();

  if (isSwagger2) {
    const consumes = Array.isArray(operation.consumes)
      ? operation.consumes.filter((item): item is string => typeof item === "string")
      : [];
    const bodyParam = allParameters.find((item) => asString(item.in) === "body");
    const formParams = allParameters.filter((item) => asString(item.in) === "formData");

    if (formParams.length) {
      const isMultipart = consumes.some((item) => item.includes("multipart"));
      if (isMultipart) {
        body.mode = "formdata";
        body.formdata = formParams.map((item) =>
          formItem(asString(item.name), parameterExample(item, components)),
        );
        if (!body.formdata.length) body.formdata = [formItem()];
      } else {
        body.mode = "urlencoded";
        body.urlencoded = formParams.map((item) =>
          kv(asString(item.name), parameterExample(item, components)),
        );
        if (!body.urlencoded.length) body.urlencoded = [kv()];
      }
      return {
        body,
        contentTypeHeader: isMultipart
          ? undefined
          : "application/x-www-form-urlencoded",
      };
    }

    if (bodyParam) {
      body.mode = "raw";
      body.rawLanguage = "json";
      const sample = exampleFromSchema(bodyParam.schema, components);
      body.raw = JSON.stringify(sample ?? {}, null, 2);
      return { body, contentTypeHeader: "application/json" };
    }

    return { body };
  }

  // OpenAPI 3
  const requestBody = isRecord(operation.requestBody) ? operation.requestBody : null;
  if (!requestBody) return { body };

  let rb = requestBody;
  if (typeof requestBody.$ref === "string" && components && isRecord(components.requestBodies)) {
    const name = requestBody.$ref.split("/").pop();
    const resolved = name ? components.requestBodies[decodeURIComponent(name)] : null;
    if (isRecord(resolved)) rb = resolved;
  }

  const content = isRecord(rb.content) ? rb.content : null;
  if (!content) return { body };

  const preferred: string | undefined = content["application/json"]
    ? "application/json"
    : content["application/x-www-form-urlencoded"]
      ? "application/x-www-form-urlencoded"
      : content["multipart/form-data"]
        ? "multipart/form-data"
        : Object.keys(content)[0];

  if (!preferred || !isRecord(content[preferred])) return { body };

  const media = content[preferred] as Record<string, unknown>;
  const schema = media.schema;
  const example =
    media.example !== undefined
      ? media.example
      : isRecord(media.examples)
        ? Object.values(media.examples).find(isRecord)?.value
        : undefined;

  if (preferred.includes("multipart")) {
    body.mode = "formdata";
    const props =
      isRecord(schema) && isRecord((deref(schema, components) as Record<string, unknown>).properties)
        ? ((deref(schema, components) as Record<string, unknown>).properties as Record<
            string,
            unknown
          >)
        : {};
    body.formdata = Object.keys(props).length
      ? Object.entries(props).map(([key, value]) =>
          formItem(key, String(exampleFromSchema(value, components) ?? "")),
        )
      : [formItem()];
    return { body };
  }

  if (preferred.includes("x-www-form-urlencoded")) {
    body.mode = "urlencoded";
    const props =
      isRecord(schema) && isRecord((deref(schema, components) as Record<string, unknown>).properties)
        ? ((deref(schema, components) as Record<string, unknown>).properties as Record<
            string,
            unknown
          >)
        : {};
    body.urlencoded = Object.keys(props).length
      ? Object.entries(props).map(([key, value]) =>
          kv(key, String(exampleFromSchema(value, components) ?? "")),
        )
      : [kv()];
    return { body, contentTypeHeader: "application/x-www-form-urlencoded" };
  }

  body.mode = "raw";
  body.rawLanguage = preferred.includes("json")
    ? "json"
    : preferred.includes("xml")
      ? "xml"
      : "text";
  const sample =
    example !== undefined ? example : exampleFromSchema(schema, components);
  body.raw =
    body.rawLanguage === "json"
      ? JSON.stringify(sample ?? {}, null, 2)
      : sample == null
        ? ""
        : typeof sample === "string"
          ? sample
          : JSON.stringify(sample, null, 2);

  return {
    body,
    contentTypeHeader: preferred.includes("json") ? "application/json" : preferred,
  };
}

function parseSpecObject(
  spec: Record<string, unknown>,
  docUrl?: string,
): ParseOpenApiResult {
  const isOpenApi3 = typeof spec.openapi === "string";
  const isSwagger2 = typeof spec.swagger === "string";
  if (!isOpenApi3 && !isSwagger2) {
    return {
      ok: false,
      error: "Not a valid OpenAPI/Swagger document (missing openapi or swagger field)",
    };
  }

  const info = isRecord(spec.info) ? spec.info : {};
  const title = asString(info.title, "OpenAPI Collection").trim() || "OpenAPI Collection";
  const baseUrl = resolveServerBase(spec, docUrl);
  const paths = isRecord(spec.paths) ? spec.paths : null;
  if (!paths || !Object.keys(paths).length) {
    return { ok: false, error: "OpenAPI document has no paths" };
  }

  const components: Record<string, unknown> | undefined = isOpenApi3
    ? isRecord(spec.components)
      ? (spec.components as Record<string, unknown>)
      : undefined
    : {
        ...(isRecord(spec.definitions) ? { definitions: spec.definitions } : {}),
        ...(isRecord(spec.parameters) ? { parameters: spec.parameters } : {}),
      };

  const groups = new Map<string, CollectionRequestNode[]>();

  for (const [path, pathItemRaw] of Object.entries(paths)) {
    if (!isRecord(pathItemRaw)) continue;
    const pathItem = pathItemRaw;

    for (const [methodKey, operationRaw] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(methodKey.toLowerCase())) continue;
      if (!isRecord(operationRaw)) continue;
      const operation = operationRaw;
      const method = methodKey.toUpperCase() as HttpMethod;
      const tags = Array.isArray(operation.tags)
        ? operation.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        : [];
      const moduleName = tags[0]?.trim() || "Default";

      const paramsList = collectParameters(pathItem, operation, components);
      const queryParams: KeyValue[] = [];
      const headers: KeyValue[] = [kv("Accept", "application/json")];

      for (const param of paramsList) {
        const location = asString(param.in);
        const name = asString(param.name);
        if (!name) continue;
        const value = parameterExample(param, components);
        if (location === "query") {
          queryParams.push(kv(name, value));
        } else if (location === "header") {
          if (name.toLowerCase() === "accept") continue;
          headers.push(kv(name, value));
        }
        // path / cookie: keep path template as-is ({id})
      }

      const { body, contentTypeHeader } = buildBody(
        operation,
        components,
        isSwagger2,
        paramsList,
      );
      if (
        contentTypeHeader &&
        !headers.some((item) => item.key.toLowerCase() === "content-type")
      ) {
        headers.push(kv("Content-Type", contentTypeHeader));
      }

      const request = createRequestDraft({
        name: operationName(method, path, operation),
        method,
        url: joinUrl("{{baseUrl}}", path),
        params: queryParams,
        headers,
        body,
      });

      const list = groups.get(moduleName) ?? [];
      list.push(createRequestNode(request));
      groups.set(moduleName, list);
    }
  }

  if (!groups.size) {
    return { ok: false, error: "No HTTP operations found in the document" };
  }

  const sortedModules = [...groups.keys()].sort((a, b) => {
    if (a === "Default") return 1;
    if (b === "Default") return -1;
    return a.localeCompare(b);
  });

  const children: CollectionNode[] = sortedModules.map((moduleName) => {
    const requests = groups.get(moduleName) ?? [];
    requests.sort((a, b) => a.name.localeCompare(b.name));
    return createFolderNode(moduleName, requests);
  });

  return {
    ok: true,
    draft: {
      name: title,
      variables: [kv("baseUrl", baseUrl), kv()],
      children,
      stats: {
        folders: children.length,
        requests: [...groups.values()].reduce((sum, list) => sum + list.length, 0),
      },
    },
  };
}

/**
 * Some gateways (e.g. ParsYar /api/openapi) emit JSON with raw newlines inside
 * string values — invalid JSON, common in HTML descriptions. Escape those so
 * JSON.parse can succeed.
 */
export function repairJsonStringControlChars(source: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 32) {
      if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else out += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }
    out += ch;
  }
  return out;
}

function parseJsonOrYaml(trimmed: string): unknown {
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (looksJson) {
    try {
      return JSON.parse(trimmed);
    } catch {
      try {
        return JSON.parse(repairJsonStringControlChars(trimmed));
      } catch {
        // Some "JSON" docs are actually YAML with a leading brace-less mix — try YAML last.
      }
    }
  }
  return yamlLoad(trimmed);
}

export function parseOpenApiDocument(
  raw: string,
  options?: { docUrl?: string },
): ParseOpenApiResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Empty document" };
  }

  let parsed: unknown;
  try {
    parsed = parseJsonOrYaml(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parse error";
    return { ok: false, error: `Failed to parse OpenAPI document: ${message}` };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "OpenAPI document must be a JSON/YAML object" };
  }

  return parseSpecObject(parsed, options?.docUrl);
}

/** Common alternate paths when user pastes a Swagger UI page URL. */
export const OPENAPI_FALLBACK_PATHS = [
  "/v3/api-docs",
  "/api-docs",
  "/v2/api-docs",
  "/swagger.json",
  "/openapi.json",
  "/openapi.yaml",
  "/swagger.yaml",
  "/openapi",
  "/api/openapi",
  "/api/v3/openapi.json",
  "/swagger/v1/swagger.json",
  "/v3/api-docs/swagger-config",
] as const;
