import { supabase } from "@/lib/supabase";
import { type BrainMemoryCategory } from "./preferences";

export const BRAIN_MEMORY_TABLE = "ethone_brain_memories";
const SENSITIVE = /(?:password|passcode|pin|token|secret|api.?key|authorization|credential|cookie|private key|refresh token|access token)/i;

export type BrainMemory = {
  id: string;
  category: BrainMemoryCategory;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

function safeText(value: unknown, fallback = "", limit = 400): string {
  const clean = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (clean || fallback).slice(0, limit);
}

export async function listBrainMemories(): Promise<BrainMemory[]> {
  const { data, error } = await supabase
    .from(BRAIN_MEMORY_TABLE)
    .select("id,category,memory_key,memory_value,created_at,updated_at,expires_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return Array.isArray(data)
    ? data.map((row) => ({
        id: row.id,
        category: row.category,
        key: safeText(row.memory_key, "", 80),
        value: safeText(row.memory_value, "", 400),
        created_at: row.created_at,
        updated_at: row.updated_at,
        expires_at: row.expires_at,
      }))
    : [];
}

export async function createBrainMemory(input: { category: BrainMemoryCategory; key: string; value: string; retentionDays?: number }) {
  const category = input.category;
  const key = safeText(input.key, "préférence", 80);
  const value = safeText(input.value, "", 400);
  if (!value) throw new Error("La mémoire ne peut pas être vide.");
  if (SENSITIVE.test(`${key} ${value}`)) throw new Error("Cette information est sensible et ne peut pas être mémorisée.");
  const days = [30, 90, 365].includes(Number(input.retentionDays)) ? Number(input.retentionDays) : 90;
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const { data, error } = await supabase
    .from(BRAIN_MEMORY_TABLE)
    .upsert({
      category,
      memory_key: key,
      memory_value: value,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "user_id,category,memory_key" })
    .select("id,category,memory_key,memory_value,created_at,updated_at,expires_at")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Aucune donnée retournée.");
  return {
    id: data.id,
    category: data.category,
    key: safeText(data.memory_key, "", 80),
    value: safeText(data.memory_value, "", 400),
    created_at: data.created_at,
    updated_at: data.updated_at,
    expires_at: data.expires_at,
  };
}

export async function updateBrainMemory(id: string, value: string) {
  const clean = safeText(value, "", 400);
  if (!clean) throw new Error("La mémoire ne peut pas être vide.");
  if (SENSITIVE.test(clean)) throw new Error("Cette information est sensible et ne peut pas être mémorisée.");
  const { data, error } = await supabase
    .from(BRAIN_MEMORY_TABLE)
    .update({ memory_value: clean, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,category,memory_key,memory_value,created_at,updated_at,expires_at")
    .single();
  if (error) throw error;
  return data;
}

export async function removeBrainMemory(id: string) {
  const { error } = await supabase.from(BRAIN_MEMORY_TABLE).delete().eq("id", id);
  if (error) throw error;
  return { id };
}

export async function clearBrainMemories() {
  const { error } = await supabase.from(BRAIN_MEMORY_TABLE).delete().neq("id", "");
  if (error) throw error;
  return { cleared: true };
}
