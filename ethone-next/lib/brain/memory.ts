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

const LOCAL_MEMORIES_KEY = "ethone:brain:local_memories";

function getLocalMemories(): BrainMemory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_MEMORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMemories(memories: BrainMemory[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_MEMORIES_KEY, JSON.stringify(memories));
  } catch {}
}

export async function listBrainMemories(): Promise<BrainMemory[]> {
  try {
    const { data, error } = await supabase
      .from(BRAIN_MEMORY_TABLE)
      .select("id,category,memory_key,memory_value,created_at,updated_at,expires_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data.map((row) => ({
        id: row.id,
        category: row.category,
        key: safeText(row.memory_key, "", 80),
        value: safeText(row.memory_value, "", 400),
        created_at: row.created_at,
        updated_at: row.updated_at,
        expires_at: row.expires_at,
      }));
      saveLocalMemories(mapped);
      return mapped;
    }
  } catch {}

  // Fallback local memories
  return getLocalMemories();
}

export async function createBrainMemory(input: { category: BrainMemoryCategory; key: string; value: string; retentionDays?: number }) {
  const category = input.category;
  const key = safeText(input.key, "préférence", 80);
  const value = safeText(input.value, "", 400);
  if (!value) throw new Error("La mémoire ne peut pas être vide.");
  if (SENSITIVE.test(`${key} ${value}`)) throw new Error("Cette information est sensible et ne peut pas être mémorisée.");
  const days = [30, 90, 365].includes(Number(input.retentionDays)) ? Number(input.retentionDays) : 90;
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const now = new Date().toISOString();

  const newMemory: BrainMemory = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    key,
    value,
    created_at: now,
    updated_at: now,
    expires_at: expiresAt,
  };

  try {
    const { data, error } = await supabase
      .from(BRAIN_MEMORY_TABLE)
      .upsert({
        category,
        memory_key: key,
        memory_value: value,
        expires_at: expiresAt,
        updated_at: now,
      } as never, { onConflict: "user_id,category,memory_key" })
      .select("id,category,memory_key,memory_value,created_at,updated_at,expires_at")
      .single();
    if (!error && data) {
      newMemory.id = data.id;
    }
  } catch {}

  const current = getLocalMemories().filter((m) => !(m.category === category && m.key === key));
  current.unshift(newMemory);
  saveLocalMemories(current);

  return newMemory;
}

export async function updateBrainMemory(id: string, value: string) {
  const clean = safeText(value, "", 400);
  if (!clean) throw new Error("La mémoire ne peut pas être vide.");
  if (SENSITIVE.test(clean)) throw new Error("Cette information est sensible et ne peut pas être mémorisée.");
  const now = new Date().toISOString();

  try {
    await supabase
      .from(BRAIN_MEMORY_TABLE)
      .update({ memory_value: clean, updated_at: now })
      .eq("id", id);
  } catch {}

  const current = getLocalMemories().map((m) => (m.id === id ? { ...m, value: clean, updated_at: now } : m));
  saveLocalMemories(current);
  return { id, value: clean };
}

export async function removeBrainMemory(id: string) {
  try {
    await supabase.from(BRAIN_MEMORY_TABLE).delete().eq("id", id);
  } catch {}

  const current = getLocalMemories().filter((m) => m.id !== id);
  saveLocalMemories(current);
  return { id };
}

export async function clearBrainMemories() {
  try {
    await supabase.from(BRAIN_MEMORY_TABLE).delete().neq("id", "");
  } catch {}

  saveLocalMemories([]);
  return { cleared: true };
}
