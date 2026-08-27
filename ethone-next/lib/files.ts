import type { CloudFile } from "@/lib/hooks/useCloudFiles";

export type FileCategory = "all" | "images" | "documents" | "videos" | "audio" | "code" | "archives" | "links";

export interface FileCategoryInfo {
  id: FileCategory;
  label: string;
  icon: string;
  description: string;
}

export const FILE_CATEGORIES: FileCategoryInfo[] = [
  { id: "all", label: "Tous", icon: "layers", description: "Tous les fichiers" },
  { id: "images", label: "Images", icon: "image", description: "Photos, visuels, PNG, SVG" },
  { id: "documents", label: "Documents", icon: "file-text", description: "PDF, Word, feuilles, TXT" },
  { id: "videos", label: "Vidéos", icon: "video", description: "Clips, MP4, enregistrements" },
  { id: "audio", label: "Audio", icon: "music", description: "Musiques, vocaux, MP3, WAV" },
  { id: "code", label: "Code", icon: "code", description: "Scripts, TS/JS, JSON, styles" },
  { id: "archives", label: "Archives", icon: "archive", description: "ZIP, RAR, 7Z, TAR" },
  { id: "links", label: "Liens", icon: "link", description: "Raccourcis web et docs cloud" },
];

export function getFileExtension(filename: string): string {
  if (!filename || !filename.includes(".")) return "";
  const parts = filename.split(".");
  return parts[parts.length - 1].toLowerCase();
}

export function getFileCategory(file: Pick<CloudFile, "mimeType" | "name" | "isFolder" | "webViewLink">): FileCategory {
  if (file.isFolder) return "all";
  
  const mime = (file.mimeType || "").toLowerCase();
  const ext = getFileExtension(file.name);

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif", "ico"].includes(ext)) {
    return "images";
  }
  if (
    mime.startsWith("video/") ||
    ["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv", "m4v"].includes(ext)
  ) {
    return "videos";
  }
  if (
    mime.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "flac", "m4a", "aac", "wma"].includes(ext)
  ) {
    return "audio";
  }
  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    mime.includes("document") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation") ||
    mime.includes("csv") ||
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "odt", "ods", "odp"].includes(ext)
  ) {
    return "documents";
  }
  if (
    mime.includes("javascript") ||
    mime.includes("json") ||
    mime.includes("html") ||
    mime.includes("css") ||
    mime.includes("xml") ||
    mime.includes("yaml") ||
    mime.includes("markdown") ||
    mime.includes("python") ||
    mime.includes("typescript") ||
    ["js", "jsx", "ts", "tsx", "json", "html", "css", "scss", "py", "sh", "sql", "md", "mdx", "yml", "yaml", "xml", "rs", "go", "c", "cpp", "h"].includes(ext)
  ) {
    return "code";
  }
  if (
    mime.includes("zip") ||
    mime.includes("tar") ||
    mime.includes("rar") ||
    mime.includes("7z") ||
    mime.includes("compressed") ||
    ["zip", "tar", "gz", "rar", "7z", "bz2", "xz"].includes(ext)
  ) {
    return "archives";
  }
  if (mime.includes("shortcut") || mime.includes("url") || (file.webViewLink && !file.mimeType)) {
    return "links";
  }

  return "documents";
}

export function sortFiles(
  files: CloudFile[],
  sort: "name" | "size" | "date" | "type",
  direction: "asc" | "desc" = "asc"
): CloudFile[] {
  const list = [...files];
  const factor = direction === "desc" ? -1 : 1;

  list.sort((a, b) => {
    // Keep folders on top in normal listings if not sorting purely by size
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;

    if (sort === "size") {
      const sizeA = a.size || 0;
      const sizeB = b.size || 0;
      return (sizeA - sizeB) * factor;
    }
    if (sort === "date") {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return (timeA - timeB) * factor;
    }
    if (sort === "type") {
      const typeA = a.isFolder ? "_folder" : a.mimeType || getFileExtension(a.name);
      const typeB = b.isFolder ? "_folder" : b.mimeType || getFileExtension(b.name);
      return typeA.localeCompare(typeB, undefined, { sensitivity: "base" }) * factor;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * factor;
  });

  return list;
}

export function formatBytes(bytes = 0) {
  if (bytes === 0 || Number.isNaN(bytes)) return "0 B";
  const k = 1024;
  const sizes = ["B", "Ko", "Mo", "Go", "To"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function mimeIcon(mimeType: string = "", isFolder: boolean = false, filename: string = ""): string {
  if (isFolder) return "folder";
  const ext = getFileExtension(filename);
  const mime = (mimeType || "").toLowerCase();

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif", "ico"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mkv", "avi", "mov", "m4v"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(ext)) {
    return "music";
  }
  if (mime.includes("pdf") || ext === "pdf") {
    return "file-text";
  }
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("csv") ||
    ["xls", "xlsx", "csv", "ods"].includes(ext)
  ) {
    return "receipt";
  }
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    ["doc", "docx", "odt", "rtf"].includes(ext)
  ) {
    return "file-text";
  }
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    ["ppt", "pptx", "odp"].includes(ext)
  ) {
    return "monitor";
  }
  if (
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("json") ||
    mime.includes("html") ||
    mime.includes("css") ||
    mime.includes("xml") ||
    mime.includes("python") ||
    ["js", "jsx", "ts", "tsx", "json", "html", "css", "py", "sql", "sh", "rs", "go"].includes(ext)
  ) {
    return "code";
  }
  if (
    mime.includes("markdown") ||
    ["md", "mdx", "txt"].includes(ext)
  ) {
    return "sticky-note";
  }
  if (
    mime.includes("zip") ||
    mime.includes("tar") ||
    mime.includes("rar") ||
    mime.includes("7z") ||
    ["zip", "tar", "gz", "rar", "7z"].includes(ext)
  ) {
    return "archive";
  }
  if (mime.includes("url") || ext === "url" || mime.includes("shortcut")) {
    return "link";
  }

  return "file";
}
