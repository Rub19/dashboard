import { Channel, invoke } from "@tauri-apps/api/core";

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
export const authSignOut = () => invoke<void>("auth_sign_out");
export const openSite = (page: SitePage) => invoke<void>("open_site", { page });

export const modulesLocal = () => invoke<ModuleStatus[]>("modules_local");
export const modulesRemote = () => invoke<ModuleStatus[]>("modules_remote");
export const openModule = (id: string) => invoke<void>("open_module", { id });
export const openReleases = (id: string) => invoke<void>("open_releases", { id });
export const readJournal = () => invoke<JournalEntry[]>("read_journal");
export const about = () => invoke<{ version: string; catalogSchema: number }>("about");

export function installModule(id: string, onProgress: (progress: Progress) => void) {
  const on = new Channel<Progress>();
  on.onmessage = onProgress;
  return invoke<{ from: string | null; to: string }>("install_module", { id, on });
}
