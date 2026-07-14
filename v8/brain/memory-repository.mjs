import { BRAIN_MEMORY_CATEGORIES } from "./preferences.mjs";

export const BRAIN_MEMORY_TABLE = "ethone_brain_memories";
const CATEGORY_SET = new Set(BRAIN_MEMORY_CATEGORIES);
const SENSITIVE = /(?:password|passcode|pin|token|secret|api.?key|authorization|credential|cookie|private key|refresh token|access token)/i;

function result(ok, status, message, data = null) { return Object.freeze({ ok, status, message, data }); }
function safeText(value, fallback = "", limit = 400) { return (String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() || fallback).slice(0, limit); }
function safeCategory(value) { return CATEGORY_SET.has(value) ? value : "interface"; }
function safeRecord(row = {}) {
  return Object.freeze({ id: safeText(row.id, "", 80), category: safeCategory(row.category), key: safeText(row.memory_key, "", 80), value: safeText(row.memory_value, "", 400), createdAt: safeText(row.created_at, "", 40), updatedAt: safeText(row.updated_at, "", 40), expiresAt: safeText(row.expires_at, "", 40) });
}

export function createBrainMemoryRepository(options = {}) {
  const runtime = options.runtime || globalThis;
  const clientProvider = typeof options.clientProvider === "function" ? options.clientProvider : async () => options.client || null;
  const getPreferences = typeof options.getPreferences === "function" ? options.getPreferences : () => ({ memory: { enabled: true, categories: {} } });
  const ownerId = safeText(options.ownerId, "", 120);
  const table = safeText(options.table, BRAIN_MEMORY_TABLE, 80);
  const timeoutMs = Math.max(1000, Math.min(15000, Number(options.timeoutMs) || 5000));
  const controllers = new Set();
  let requests = 0;
  let lastError = "";

  async function query(factory) {
    if (!ownerId) return result(false, "unauthorized", "Une session Supabase valide est requise.");
    const controller = new AbortController();
    controllers.add(controller);
    let timer = null;
    requests += 1;
    try {
      const client = await clientProvider();
      if (!client?.from) return result(false, "unavailable", "Supabase n'est pas disponible.");
      let builder = factory(client.from(table));
      if (typeof builder?.abortSignal === "function") builder = builder.abortSignal(controller.signal);
      const pending = [Promise.resolve(builder)];
      if (typeof runtime.setTimeout === "function") pending.push(new Promise((_, reject) => {
        timer = runtime.setTimeout(() => { controller.abort(); reject(new Error("La memoire Brain a expire.")); }, timeoutMs);
      }));
      const response = await Promise.race(pending);
      if (response?.error) throw response.error;
      lastError = "";
      return result(true, "completed", "Memoire Brain synchronisee.", response?.data ?? null);
    } catch (error) {
      lastError = safeText(error?.message, "Memoire Brain indisponible.", 200);
      return result(false, controller.signal.aborted ? "timeout" : "failed", lastError, error);
    } finally {
      if (timer !== null) runtime.clearTimeout?.(timer);
      controllers.delete(controller);
    }
  }

  async function purgeExpired() {
    return query((builder) => builder.delete().eq("user_id", ownerId).lte("expires_at", new Date().toISOString()));
  }

  async function list() {
    await purgeExpired();
    const response = await query((builder) => builder.select("id,category,memory_key,memory_value,created_at,updated_at,expires_at").eq("user_id", ownerId).order("updated_at", { ascending: false }).limit(100));
    if (!response.ok) return response;
    return result(true, "completed", "Memoires chargees.", Object.freeze((Array.isArray(response.data) ? response.data : []).map(safeRecord)));
  }

  async function create(input = {}) {
    const category = safeCategory(input.category);
    const memoryPreferences = getPreferences()?.memory || {};
    if (memoryPreferences.enabled === false) return result(false, "disabled", "La memoire Brain est desactivee.");
    if (memoryPreferences.categories?.[category] === false) return result(false, "permission-denied", `La categorie ${category} est desactivee.`);
    const key = safeText(input.key, "preference", 80);
    const value = safeText(input.value, "", 400);
    if (!value) return result(false, "invalid", "La memoire ne peut pas etre vide.");
    if (SENSITIVE.test(`${key} ${value}`)) return result(false, "sensitive", "Cette information est sensible et ne peut pas etre memorisee.");
    const days = [30, 90, 365].includes(Number(input.retentionDays)) ? Number(input.retentionDays) : 90;
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const response = await query((builder) => builder.upsert({ user_id: ownerId, category, memory_key: key, memory_value: value, updated_at: new Date().toISOString(), expires_at: expiresAt }, { onConflict: "user_id,category,memory_key" }).select("id,category,memory_key,memory_value,created_at,updated_at,expires_at").single());
    return response.ok ? result(true, "completed", "Memoire enregistree.", safeRecord(response.data)) : response;
  }

  async function update(id, patch = {}) {
    const memoryId = safeText(id, "", 80);
    const value = safeText(patch.value, "", 400);
    if (!memoryId || !value) return result(false, "invalid", "Memoire invalide.");
    if (SENSITIVE.test(value)) return result(false, "sensitive", "Cette information est sensible et ne peut pas etre memorisee.");
    const response = await query((builder) => builder.update({ memory_value: value, updated_at: new Date().toISOString() }).eq("id", memoryId).eq("user_id", ownerId).select("id,category,memory_key,memory_value,created_at,updated_at,expires_at").single());
    return response.ok ? result(true, "completed", "Memoire mise a jour.", safeRecord(response.data)) : response;
  }

  async function remove(id) {
    const memoryId = safeText(id, "", 80);
    if (!memoryId) return result(false, "invalid", "Memoire invalide.");
    const response = await query((builder) => builder.delete().eq("id", memoryId).eq("user_id", ownerId));
    return response.ok ? result(true, "completed", "Memoire supprimee.", { id: memoryId }) : response;
  }

  async function clear(options = {}) {
    if (options.confirmed !== true) return result(false, "confirmation-required", "Confirmez la suppression de toutes les memoires Brain.");
    const response = await query((builder) => builder.delete().eq("user_id", ownerId));
    return response.ok ? result(true, "completed", "Toutes les memoires Brain ont ete supprimees.", null) : response;
  }

  async function exportAll() {
    const response = await list();
    if (!response.ok) return response;
    return result(true, "completed", "Export Brain pret.", Object.freeze({ format: "ethone-brain-memory", version: 1, exportedAt: new Date().toISOString(), memories: response.data }));
  }

  function destroy() { controllers.forEach((controller) => controller.abort()); controllers.clear(); }
  return Object.freeze({ list, create, update, remove, clear, exportAll, purgeExpired, destroy, diagnostics: () => Object.freeze({ requests, activeRequests: controllers.size, lastError, localPersistence: false, table }) });
}
