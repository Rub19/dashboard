export function formatBytes(bytes, { empty = "0 o" } = {}) {
  const value = Number(bytes) || 0;
  if (value === 0) return empty;
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let index = 0;
  let size = value;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
