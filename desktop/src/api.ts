import { Channel, invoke } from "@tauri-apps/api/core";
import { cached, clearCache } from "./cache";

export type Action =
  | "open"
  | "openWeb"
  | "install"
  | "update"
  | "closeToUpdate"
  | "openToUpdate"
  | "releasePage"
  | "needsEthoneUpdate"
  | "unavailable";

export type Policy = "delegated" | "autonomous" | "manual" | "web";

export interface ModuleStatus {
  module: {
    id: string;
    name: string;
    summary: Record<string, string>;
    repo: string;
    updatePolicy: Policy;
    platforms: Record<string, "full" | "partial" | "none">;
  };
  installed: string | null;
  latest: { version: string; notes: string | null } | null;
  feedError: string | null;
  running: boolean;
  action: Action;
}

export type Progress =
  | { stage: "downloading"; received: number; total: number | null }
  | { stage: "verifying" | "installing" | "checking" };

export interface JournalEntry {
  time: number;
  module: string;
  operation: string;
  ok: boolean;
  detail: string;
}

export interface Profile {
  email: string;
  name: string;
  avatar: string | null;
}

export type ItemKind = "notes" | "tasks" | "events";

export interface EthoneItem {
  id: string;
  title: string;
  body: string;
  done: boolean;
  startAt: string | null;
  endAt: string | null;
  data: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EthoneItemInput {
  title: string;
  body: string;
  done: boolean;
  startAt: string | null;
  endAt: string | null;
  data: Record<string, unknown>;
}

export type Stage =
  | { stage: "signedOut" }
  | { stage: "mfaRequired"; profile: Profile }
  | { stage: "signedIn"; profile: Profile; offline: boolean };

export type Provider = "google" | "github" | "discord";
export type SitePage = "register" | "recovery" | "terms" | "privacy" | "cookies" | "legal" | "account";

export const authState = () => invoke<Stage>("auth_state");
export const authPassword = (email: string, password: string, remember: boolean) => invoke<Stage>("auth_password", { email, password, remember });
export const authOtpSend = (email: string) => invoke<void>("auth_otp_send", { email });
export const authOtpVerify = (email: string, code: string, remember: boolean) => invoke<Stage>("auth_otp_verify", { email, code, remember });
export const authOauthStart = (provider: Provider) => invoke<void>("auth_oauth_start", { provider });
export const authOauthCancel = () => invoke<void>("auth_oauth_cancel");
export const authMfa = (code: string | null, backupCode: string | null) => invoke<Stage>("auth_mfa", { code, backupCode });
export const authSignOut = () => {
  clearCache();
  return invoke<void>("auth_sign_out");
};
export const profileAvatar = () => invoke<string | null>("profile_avatar");
export const openSite = (page: SitePage) => invoke<void>("open_site", { page });

export const modulesLocal = () => invoke<ModuleStatus[]>("modules_local");
export const modulesRemote = () => invoke<ModuleStatus[]>("modules_remote");
export const itemsList = (kind: ItemKind) => invoke<EthoneItem[]>("items_list", { kind });
export const itemsCreate = (kind: ItemKind, input: EthoneItemInput) => invoke<string>("items_create", { kind, input });
export const itemsUpdate = (kind: ItemKind, id: string, input: EthoneItemInput) => invoke<void>("items_update", { kind, id, input });
export const itemsDelete = (kind: ItemKind, id: string) => invoke<void>("items_delete", { kind, id });
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export const apiCall = <T,>(path: string, method: Method = "GET", body?: unknown) => invoke<T>("api_call", { method, path, body: body ?? null });
export const apiData = async <T,>(path: string, method: Method = "GET", body?: unknown) => {
  const response = await apiCall<{ data?: T } | T>(path, method, body);
  return (response && typeof response === "object" && "data" in response ? response.data : response) as T;
};
export const restCall = <T,>(path: string, method: Method = "GET", body?: unknown, prefer?: string) => invoke<T>("rest_call", { method, path, body: body ?? null, prefer: prefer ?? null });
export const catalogGet = <T,>(path: string) => cached<T>(`catalog:${path}`, 24 * 60 * 60 * 1000, () => invoke<{ data: T }>("catalog_get", { path }).then(({ data }) => data), true);
export type { FriendRow as RiotFriend } from "./friends";
export const riotFriends = () => invoke<import("./friends").FriendRow[]>("riot_friends");
export const lineupsGet = <T,>() => invoke<T>("lineups_get");
export const riotCall = <T,>(path: string, options: { host?: "pd" | "glz" | "prefs"; method?: Method; body?: unknown; fresh?: boolean } = {}) => {
  const send = () => invoke<T>("riot_call", { host: options.host ?? "pd", path, method: options.method ?? "GET", body: options.body ?? null });
  if ((options.host ?? "pd") !== "pd" || options.fresh) return send();
  if ((options.method ?? "GET") === "GET") return cached<T>(`riot:${path}`, 5 * 60 * 1000, send);
  clearCache("riot:");
  return send();
};
export const openExternal = (url: string) => invoke<void>("open_external", { url });
export const botStatus = () => invoke<boolean>("bot_status");
export const botLogin = () => invoke<void>("bot_login");
export const botLogout = () => {
  clearCache("bot:");
  return invoke<void>("bot_logout");
};
export const botCached = <T,>(path: string) => cached<T>(`bot:${path}`, 5 * 60 * 1000, () => botCall<T>(path));
export const botCall = <T,>(path: string, method: Method = "GET", body?: unknown) => invoke<T>("bot_call", { method, path, body: body ?? null });
export interface RiotIdentity {
  puuid: string;
  name: string;
  tag: string;
  region: string;
}
export const riotStatus = () => invoke<RiotIdentity | null>("riot_status");
export const riotLogin = () => invoke<void>("riot_login");
export const riotOpenBrowser = () => invoke<void>("riot_open_browser");
export const riotLinkUrl = (url: string) => invoke<RiotIdentity>("riot_link_url", { url });
export const riotLogout = () => {
  clearCache("riot:");
  clearCache("eval-snapshot");
  return invoke<void>("riot_logout");
};
export const riotRank = <T,>() => invoke<T>("riot_rank");
export const trackerIdentity = () => invoke<{ name: string; tag: string } | null>("tracker_identity");
export const trackerSync = <T,>(name: string, tag: string) => invoke<T>("tracker_sync", { name, tag });
export const trackerMatches = <T,>(puuid: string, limit: number) => invoke<T[]>("tracker_matches", { puuid, limit });
export const openModule = (id: string) => invoke<void>("open_module", { id });
export const openReleases = (id: string) => invoke<void>("open_releases", { id });
export const readJournal = () => invoke<JournalEntry[]>("read_journal");
export const about = () => invoke<{ version: string; catalogSchema: number }>("about");

export function installModule(id: string, onProgress: (progress: Progress) => void) {
  const on = new Channel<Progress>();
  on.onmessage = onProgress;
  return invoke<{ from: string | null; to: string }>("install_module", { id, on });
}

export const ethoneUpdateCheck = () => invoke<{ version: string; notes: string | null } | null>("ethone_update_check");

export function ethoneUpdateInstall(onProgress: (value: number) => void) {
  const on = new Channel<number>();
  on.onmessage = onProgress;
  return invoke<void>("ethone_update_install", { on });
}
