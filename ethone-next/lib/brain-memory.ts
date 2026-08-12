"use client";

import { type BrainMemoryItem, memoryLooksSensitive, SENSITIVE_KEY_RE } from "./brain-context";

const STORE_KEY = "ethone-brain-memory-v1";
const MAX_ITEMS = 50;

let memory: BrainMemoryItem[] = [];
let loaded = false;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function load() {
  if (loaded || !isClient()) return;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      if (Array.isArray(parsed)) {
        memory = parsed
          .map((item) => migrate(item))
          .filter((item): item is BrainMemoryItem => item !== null);
      }
    }
  } catch {
    // ignore corrupt cache
  }
  loaded = true;
}

function save() {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(memory));
  } catch {
    // ignore quota errors
  }
}

function migrate(item: unknown): BrainMemoryItem | null {
  if (!item || typeof item !== "object") return null;
  const source = item as Record<string, unknown>;
  const id = String(source.id || "");
  if (!id) return null;
  const createdAt = Number(source.createdAt);
  if (!Number.isFinite(createdAt)) return null;
  return {
    id,
    category: String(source.category || "general"),
    content: source.content,
    createdAt,
    expiresAt: Number.isFinite(Number(source.expiresAt)) ? Number(source.expiresAt) : undefined,
    ttl: Number.isFinite(Number(source.ttl)) ? Number(source.ttl) : undefined,
  };
}

function isExpired(item: BrainMemoryItem): boolean {
  return item.expiresAt !== undefined && item.expiresAt <= Date.now();
}

function trim() {
  if (memory.length > MAX_ITEMS) {
    memory = memory
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_ITEMS);
  }
}

export function remember<T>(id: string, content: T, ttl?: number): BrainMemoryItem<T> {
  load();
  pruneExpired();

  const now = Date.now();
  const expiresAt = typeof ttl === "number" && Number.isFinite(ttl) && ttl > 0 ? now + ttl : undefined;
  const existing = memory.find((m) => m.id === id);

  if (existing) {
    existing.category = String(existing.category);
    existing.content = content as unknown;
    existing.createdAt = now;
    existing.expiresAt = expiresAt;
    existing.ttl = ttl;
  } else {
    const item: BrainMemoryItem = {
      id,
      category: "general",
      content: content as unknown,
      createdAt: now,
      expiresAt,
      ttl,
    };
    memory.unshift(item);
  }

  trim();
  save();

  return existing
    ? (existing as BrainMemoryItem<T>)
    : (memory.find((m) => m.id === id) as BrainMemoryItem<T>);
}

export function recall<T>(id: string): BrainMemoryItem<T> | null {
  load();
  pruneExpired();
  const item = memory.find((m) => m.id === id && !isExpired(m));
  return item ? (item as BrainMemoryItem<T>) : null;
}

export function recallByCategory<T>(category: string): BrainMemoryItem<T>[] {
  load();
  pruneExpired();
  return memory
    .filter((m) => m.category === category && !isExpired(m))
    .sort((a, b) => b.createdAt - a.createdAt) as BrainMemoryItem<T>[];
}

export function forget(id: string): boolean {
  load();
  const before = memory.length;
  memory = memory.filter((m) => m.id !== id);
  if (memory.length !== before) {
    save();
    return true;
  }
  return false;
}

export function pruneExpired(): number {
  load();
  const before = memory.length;
  const now = Date.now();
  memory = memory.filter((m) => m.expiresAt === undefined || m.expiresAt > now);
  if (memory.length !== before) {
    save();
  }
  return before - memory.length;
}

export function clearSensitive(): number {
  load();
  const before = memory.length;
  memory = memory.filter((m) => !memoryLooksSensitive(m) && !SENSITIVE_KEY_RE.test(m.id + " " + m.category));
  if (memory.length !== before) {
    save();
  }
  return before - memory.length;
}

export function listRecent(limit = 50): BrainMemoryItem[] {
  load();
  pruneExpired();
  return memory
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
