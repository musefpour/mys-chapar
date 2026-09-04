import type { AppMenuCommand, AppPrefs, MenuLabels } from "./app-menu";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type BodyMode =
  | "none"
  | "formdata"
  | "urlencoded"
  | "raw"
  | "binary"
  | "graphql";

export type FormDataFieldType = "text" | "file";

export interface FormDataItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  type: FormDataFieldType;
  fileName?: string;
  /** Absolute filesystem path (desktop app). */
  filePath?: string;
  /** Browser / Chrome extension payload (not persisted to collections). */
  fileBase64?: string;
}

export interface GraphQlBody {
  query: string;
  variables: string;
}

export interface RequestBody {
  mode: BodyMode;
  raw?: string;
  rawLanguage?: "json" | "text" | "xml" | "html" | "javascript";
  urlencoded?: KeyValue[];
  formdata?: FormDataItem[];
  binaryPath?: string;
  binaryFileName?: string;
  /** Browser / Chrome extension payload (not persisted to collections). */
  binaryBase64?: string;
  graphql?: GraphQlBody;
}

export interface HttpRequestDraft {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body: RequestBody;
}

export interface ResponseSnapshot {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType: string | null;
  timeMs: number;
  sizeBytes: number;
}

/** @deprecated kept for migration from older localStorage */
export interface CollectionItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  request: HttpRequestDraft;
}

export interface CollectionFolderNode {
  id: string;
  type: "folder";
  name: string;
  createdAt: string;
  updatedAt: string;
  children: CollectionNode[];
}

export interface CollectionRequestNode {
  id: string;
  type: "request";
  name: string;
  createdAt: string;
  updatedAt: string;
  request: HttpRequestDraft;
  /** Last received response, restored when the request is opened again. */
  lastResponse?: ResponseSnapshot | null;
}

export type CollectionNode = CollectionFolderNode | CollectionRequestNode;

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  children: CollectionNode[];
  /** Collection-scoped variables, e.g. baseUrl — use as {{baseUrl}} in requests */
  variables: KeyValue[];
  /** Starred / favorite collection */
  favorite?: boolean;
  /** legacy field — migrated on load */
  items?: CollectionItem[];
}

export type WorkspaceKind = "personal" | "team";

export interface Workspace {
  id: string;
  name: string;
  kind: WorkspaceKind;
  createdAt: string;
  updatedAt: string;
  collections: Collection[];
  /** Last selected collection inside this workspace */
  activeCollectionId: string | null;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  request: HttpRequestDraft;
  response?: Pick<
    ResponseSnapshot,
    "status" | "statusText" | "timeMs" | "sizeBytes"
  >;
  /** Full response, stored when the user clicks Save. Restored from History. */
  savedResponse?: ResponseSnapshot | null;
  error?: string;
  workspaceId?: string;
  collectionId?: string | null;
  requestNodeId?: string | null;
}

export interface SendRequestPayload {
  request: HttpRequestDraft;
}

export interface SendRequestResult {
  ok: true;
  response: ResponseSnapshot;
}

export interface SendRequestError {
  ok: false;
  error: string;
}

export type SendRequestResponse = SendRequestResult | SendRequestError;

export const IPC = {
  SEND_REQUEST: "mychapar:send-request",
  CANCEL_REQUEST: "mychapar:cancel-request",
  FETCH_TEXT: "mychapar:fetch-text",
  SHELL_INFO: "mychapar:shell-info",
  SHELL_RUN: "mychapar:shell-run",
  CLOSE_ACTIVE_TAB: "mychapar:close-active-tab",
  MENU_COMMAND: "mychapar:menu-command",
  MENU_INVOKE: "mychapar:menu-invoke",
  MENU_SET_LABELS: "mychapar:menu-set-labels",
  GET_PREFS: "mychapar:get-prefs",
  SET_PREFS: "mychapar:set-prefs",
  PREFS_CHANGED: "mychapar:prefs-changed",
  SAVE_TEXT_FILE: "mychapar:save-text-file",
  AUTH_OAUTH_START: "mychapar:auth-oauth-start",
  AUTH_EMAIL: "mychapar:auth-email",
  CLOUD_FETCH: "mychapar:cloud-fetch",
} as const;

export type AuthProvider = "google" | "email";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: AuthProvider;
}

export interface AuthOAuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthOAuthStartPayload {
  provider: Exclude<AuthProvider, "email">;
}

export type AuthEmailAction = "login" | "register" | "logout";

export interface AuthEmailPayload {
  action: AuthEmailAction;
  name?: string;
  email?: string;
  password?: string;
  refreshToken?: string;
}

export interface CloudFetchPayload {
  method: string;
  path: string;
  accessToken: string;
  body?: unknown;
}

export interface CloudFetchResult {
  ok: boolean;
  status: number;
  json: unknown;
}

export interface ShellInfo {
  user: string;
  host: string;
  cwd: string;
  home: string;
  promptChar: string;
}

export interface ShellRunPayload {
  command: string;
}

export interface ShellRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd: string;
  error?: string;
}

export interface FetchTextPayload {
  url: string;
  /** Override default 30s timeout (ms). */
  timeoutMs?: number;
}

export interface FetchTextResult {
  ok: true;
  body: string;
  contentType: string | null;
  finalUrl: string;
}

export interface FetchTextError {
  ok: false;
  error: string;
}

export type FetchTextResponse = FetchTextResult | FetchTextError;

export interface SaveTextFilePayload {
  defaultName: string;
  content: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface SaveTextFileSaved {
  ok: true;
  path: string;
}

export interface SaveTextFileError {
  ok: false;
  cancelled?: boolean;
  error?: string;
}

export type SaveTextFileResult = SaveTextFileSaved | SaveTextFileError;

/** Chrome extension runtime message types (mirrors IPC). */
export const EXT = {
  SEND_REQUEST: "mychapar:send-request",
  CANCEL_REQUEST: "mychapar:cancel-request",
  FETCH_TEXT: "mychapar:fetch-text",
} as const;

export interface MyChaparApi {
  sendRequest: (payload: SendRequestPayload) => Promise<SendRequestResponse>;
  cancelRequest: (requestId: string) => void;
  fetchText: (payload: FetchTextPayload) => Promise<FetchTextResponse>;
  /** Present in the desktop app and VS Code extension; absent in the Chrome extension. */
  platform?: "darwin" | "win32" | "linux" | string;
  arch?: string;
  osRelease?: string;
  electronVersion?: string;
  vscodeVersion?: string;
  getShellInfo?: () => Promise<ShellInfo>;
  runShell?: (payload: ShellRunPayload) => Promise<ShellRunResult>;
  onCloseActiveTab?: (callback: () => void) => () => void;
  invokeMenu?: (command: AppMenuCommand) => Promise<void>;
  onMenuCommand?: (callback: (command: AppMenuCommand) => void) => () => void;
  setMenuLabels?: (labels: MenuLabels) => void;
  getPrefs?: () => Promise<AppPrefs>;
  setPrefs?: (patch: Partial<AppPrefs>) => Promise<AppPrefs>;
  onPrefsChanged?: (callback: (prefs: AppPrefs) => void) => () => void;
  saveTextFile?: (payload: SaveTextFilePayload) => Promise<SaveTextFileResult>;
  startOAuth?: (payload: AuthOAuthStartPayload) => Promise<AuthOAuthResult>;
  authEmail?: (payload: AuthEmailPayload) => Promise<AuthOAuthResult>;
  cloudFetch?: (payload: CloudFetchPayload) => Promise<CloudFetchResult>;
}

export const BODY_MODE_OPTIONS: Array<{ value: BodyMode; label: string }> = [
  { value: "none", label: "none" },
  { value: "formdata", label: "form-data" },
  { value: "urlencoded", label: "x-www-form-urlencoded" },
  { value: "raw", label: "raw" },
  { value: "binary", label: "binary" },
  { value: "graphql", label: "GraphQL" },
];
