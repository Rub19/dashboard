"use client";

import { supabase } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXTENSION_BY_TYPE: Record<string, string> = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp"
});
const BUCKET = "profile-media";

export interface MediaUploadResult {
  ok: boolean;
  status: string;
  message: string;
  data?: { url: string; path: string } | null;
}

export interface MediaUploadOptions {
  file: File;
  kind?: "avatar" | "banner";
  ownerId?: string;
}

export function validateMediaFile(file: File): MediaUploadResult {
  if (!file) return { ok: false, status: "missing", message: "Aucun fichier sélectionné.", data: null };
  if (!ALLOWED_TYPES.has(file.type)) return { ok: false, status: "invalid-type", message: "Formats acceptés : PNG, JPEG ou WebP.", data: null };
  if (file.size > MAX_BYTES) return { ok: false, status: "too-large", message: "L'image doit faire moins de 5 Mo.", data: null };
  return { ok: true, status: "valid", message: "Fichier valide.", data: null };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
    reader.readAsDataURL(file);
  });
}

export async function uploadProfileMedia({ file, kind = "avatar", ownerId }: MediaUploadOptions = {} as MediaUploadOptions): Promise<MediaUploadResult> {
  const validation = validateMediaFile(file);
  if (!validation.ok) return validation;

  let localDataUrl = "";
  try {
    localDataUrl = await readFileAsDataUrl(file);
  } catch {}

  // If no ownerId, smoothly return the local data URL
  if (!ownerId) {
    if (localDataUrl) {
      return { ok: true, status: "completed", message: "Image appliquée avec succès.", data: { url: localDataUrl, path: "local" } };
    }
    return { ok: false, status: "failed", message: "Impossible de lire le fichier.", data: null };
  }

  const extension = EXTENSION_BY_TYPE[file.type] || "jpg";
  const folder = kind === "banner" ? "banner" : "avatar";
  const path = `${ownerId}/${folder}-${Date.now()}.${extension}`;

  try {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });
    if (error) {
      // Fallback to local Data URL
      if (localDataUrl) {
        return { ok: true, status: "completed", message: "Image appliquée en local.", data: { url: localDataUrl, path: "local" } };
      }
      return { ok: false, status: "failed", message: error.message || "Le téléversement a échoué.", data: null };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = typeof data?.publicUrl === "string" ? data.publicUrl : "";
    if (!url) {
      if (localDataUrl) {
        return { ok: true, status: "completed", message: "Image appliquée en local.", data: { url: localDataUrl, path: "local" } };
      }
      return { ok: false, status: "failed", message: "URL publique indisponible.", data: null };
    }

    return { ok: true, status: "completed", message: "Image envoyée.", data: { url, path } };
  } catch (error) {
    if (localDataUrl) {
      return { ok: true, status: "completed", message: "Image appliquée en local.", data: { url: localDataUrl, path: "local" } };
    }
    const message = error instanceof Error ? error.message : "Le téléversement a échoué.";
    return { ok: false, status: "failed", message, data: null };
  }
}
