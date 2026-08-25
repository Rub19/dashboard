const DEBUG = process.env.NODE_ENV === "development";

export function authLog(step: string, detail = "") {
  if (!DEBUG) return;
  const suffix = detail ? ` : ${detail}` : "";
  console.log(`[AUTH] ${step}${suffix}`);
}
