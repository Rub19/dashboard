function reasonText(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === "object") {
    const value = reason as { code?: unknown; message?: unknown };
    if (typeof value.code === "string") return value.code;
    if (typeof value.message === "string") return value.message;
  }
  return "";
}

export function riotReconnectRequired(reason: unknown): boolean {
  const text = reasonText(reason);
  return text.includes("riotExpired") || text.includes("riotRequired");
}

export async function openRiotLoginInBrowser(open: () => Promise<void>): Promise<void> {
  await open();
}
