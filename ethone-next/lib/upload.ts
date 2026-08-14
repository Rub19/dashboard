export type UploadStatus = "pending" | "uploading" | "success" | "error";

export type UploadTask = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  loaded: number;
  total: number;
  speed: number;
  secondsLeft: number;
  error?: string;
  startTime: number;
  xhr?: XMLHttpRequest;
};

export function formatSpeed(bytesPerSecond: number): string {
  if (!bytesPerSecond || !Number.isFinite(bytesPerSecond)) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytesPerSecond) / Math.log(k)));
  return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatTimeLeft(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return "∞";
  if (seconds < 1) return "<1s";
  return `${Math.ceil(seconds)}s`;
}

export function fileExtension(file: File): string {
  const name = file.name;
  const dot = name.lastIndexOf(".");
  if (dot > 0 && dot < name.length - 1) return name.slice(dot + 1).toUpperCase();
  const parts = file.type.split("/");
  return (parts[parts.length - 1] || "FILE").toUpperCase();
}
