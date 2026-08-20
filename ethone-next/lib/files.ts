import type { CloudFile } from "@/lib/hooks/useCloudFiles";

export function sortFiles(files: CloudFile[], sort: "name" | "size" | "date" | "type"): CloudFile[] {
  const list = [...files];
  list.sort((a, b) => {
    if (sort === "size") return (b.size || 0) - (a.size || 0);
    if (sort === "date") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    if (sort === "type") {
      const typeA = a.isFolder ? "_folder" : a.mimeType || "";
      const typeB = b.isFolder ? "_folder" : b.mimeType || "";
      return typeA.localeCompare(typeB, undefined, { sensitivity: "base" });
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return list;
}

export function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function mimeIcon(mimeType: string, isFolder: boolean) {
  if (isFolder) return "folder";
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("audio/")) return "music";
  if (mimeType?.includes("pdf")) return "file-text";
  if (mimeType?.includes("json") || mimeType?.includes("javascript") || mimeType?.includes("html")) return "file-code-2";
  return "file";
}
