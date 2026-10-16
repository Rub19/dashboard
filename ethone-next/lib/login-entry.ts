import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const ENTRY_KEY = "ethone:entry";
const NEW_ACCOUNT_MS = 10 * 60_000;

/** Pages qu'un compte venu uniquement par le site du bot peut ouvrir. */
export const BOT_ONLY_ROUTES = ["/discord", "/bot", "/docs", "/documentation", "/terms", "/privacy", "/cookies", "/legal"];

/** Note d'où part la connexion (site du bot ou ETHONE OS), relue au retour de Discord dans le même onglet. */
export function markLoginEntry(entry: "bot" | "os") {
  try {
    sessionStorage.setItem(ENTRY_KEY, entry);
  } catch {}
}

/** Compte créé depuis le site du bot, sans compte ETHONE OS : seul le dashboard Etho lui est ouvert. */
export function isBotOnly(user: User | null | undefined): boolean {
  return user?.user_metadata?.bot_only === true;
}

/** Au retour de connexion : un nouveau compte venu du bot devient « bot seulement », une connexion à ETHONE OS lève la restriction. */
export async function applyLoginEntry(user: User) {
  let entry: string | null = null;
  try {
    entry = sessionStorage.getItem(ENTRY_KEY);
    sessionStorage.removeItem(ENTRY_KEY);
  } catch {}
  const meta = user.user_metadata ?? {};
  if (entry === "bot" && meta.bot_only === undefined && Date.now() - Date.parse(user.created_at) < NEW_ACCOUNT_MS) {
    await supabase.auth.updateUser({ data: { bot_only: true } });
  } else if (entry === "os" && meta.bot_only === true) {
    await supabase.auth.updateUser({ data: { bot_only: false } });
  }
}
