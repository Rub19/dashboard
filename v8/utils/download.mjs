export function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = String(filename || "export.json");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
