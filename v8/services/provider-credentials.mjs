const TABLE = "user_provider_credentials";

function result(ok, message, data = null) {
  return Object.freeze({ ok, message, data });
}

export async function listConfiguredProviders({ client, ownerId } = {}) {
  if (!client || !ownerId) return Object.freeze({});
  try {
    const { data, error } = await client.from(TABLE).select("provider,updated_at").eq("owner_id", ownerId);
    if (error || !Array.isArray(data)) return Object.freeze({});
    const map = {};
    data.forEach((row) => {
      if (row?.provider) map[row.provider] = Object.freeze({ updatedAt: row.updated_at || null });
    });
    return Object.freeze(map);
  } catch {
    return Object.freeze({});
  }
}

export async function saveProviderCredential({ client, ownerId, provider, fields, values } = {}) {
  if (!client || !ownerId) return result(false, "Vous devez être connecté pour enregistrer une clé.");
  if (!provider) return result(false, "Fournisseur inconnu.");
  const credential = {};
  for (const field of Array.isArray(fields) ? fields : []) {
    const value = String(values?.[field.key] || "").trim();
    if (!value) return result(false, `${field.label} est requis.`);
    credential[field.key] = value;
  }
  try {
    const { error } = await client.from(TABLE).upsert(
      { owner_id: ownerId, provider, credential, updated_at: new Date().toISOString() },
      { onConflict: "owner_id,provider" }
    );
    if (error) return result(false, error.message || "Enregistrement impossible.");
    return result(true, "Clé personnelle enregistree.");
  } catch (error) {
    return result(false, error?.message || "Enregistrement impossible.");
  }
}

export async function removeProviderCredential({ client, ownerId, provider } = {}) {
  if (!client || !ownerId) return result(false, "Vous devez être connecté pour retirer une clé.");
  try {
    const { error } = await client.from(TABLE).delete().eq("owner_id", ownerId).eq("provider", provider);
    if (error) return result(false, error.message || "Suppression impossible.");
    return result(true, "Clé personnelle retiree. ETHONE utilisé de nouveau la clé partagee.");
  } catch (error) {
    return result(false, error?.message || "Suppression impossible.");
  }
}
