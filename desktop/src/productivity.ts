export function itemPreview(body: string): string {
  return body
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function newestItemsFirst<T extends { updatedAt: string | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

export function eventsByStart<T extends { startAt: string | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTime = left.startAt ? Date.parse(left.startAt) : Number.POSITIVE_INFINITY;
    const rightTime = right.startAt ? Date.parse(right.startAt) : Number.POSITIVE_INFINITY;
    return (Number.isNaN(leftTime) ? Number.POSITIVE_INFINITY : leftTime) - (Number.isNaN(rightTime) ? Number.POSITIVE_INFINITY : rightTime);
  });
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}T${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function dateTimeInputToIso(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
