"use client";

import { useState } from "react";
import { uploadProfileMedia, validateMediaFile, type MediaUploadResult } from "@/lib/media-upload";

export function useMediaUpload(ownerId?: string) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<MediaUploadResult | null>(null);

  function validate(file?: File | null) {
    if (!file) return { ok: false, status: "missing", message: "Aucun fichier sélectionné.", data: null } as MediaUploadResult;
    return validateMediaFile(file);
  }

  async function upload(file: File, kind: "avatar" | "banner" = "avatar") {
    if (!ownerId) {
      const res = { ok: false, status: "unavailable", message: "Profil non authentifié.", data: null } as MediaUploadResult;
      setResult(res);
      return res;
    }
    setUploading(true);
    setResult(null);
    const res = await uploadProfileMedia({ file, kind, ownerId });
    setUploading(false);
    setResult(res);
    return res;
  }

  return { upload, validate, uploading, result };
}
