const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXTENSION_BY_TYPE = Object.freeze({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" });
const BUCKET = "profile-media";

function result(ok, status, message, data = null) {
  return Object.freeze({ ok, status, message, data });
}

export function validateMediaFile(file) {
  if (!file) return result(false, "missing", "Aucun fichier sélectionné.");
  if (!ALLOWED_TYPES.has(file.type)) return result(false, "invalid-type", "Formats acceptés : PNG, JPEG ou WebP.");
  if (file.size > MAX_BYTES) return result(false, "too-large", "L'image doit faire moins de 5 Mo.");
  return result(true, "valid", "Fichier valide.");
}

export async function uploadProfileMedia({ file, kind, ownerId, client } = {}) {
  const validation = validateMediaFile(file);
  if (!validation.ok) return validation;
  if (!ownerId) return result(false, "unavailable", "Profil non authentifié.");
  if (!client?.storage) return result(false, "unavailable", "Le stockage n'est pas disponible.");
  const extension = EXTENSION_BY_TYPE[file.type] || "jpg";
  const folder = kind === "banner" ? "banner" : "avatar";
  const path = `${ownerId}/${folder}-${Date.now()}.${extension}`;
  try {
    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });
    if (error) return result(false, "failed", error.message || "Le téléversement a échoué.");
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    const url = typeof data?.publicUrl === "string" ? data.publicUrl : "";
    if (!url) return result(false, "failed", "URL publique indisponible.");
    return result(true, "completed", "Image envoyée.", { url, path });
  } catch (error) {
    return result(false, "failed", error?.message || "Le téléversement a échoué.");
  }
}
