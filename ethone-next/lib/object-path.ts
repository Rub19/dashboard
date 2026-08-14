export function getValueByPath<T = unknown>(obj: Record<string, unknown>, path: string): T | undefined {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj) as T | undefined;
}

export function setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const root = { ...obj };
  let target: Record<string, unknown> = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    target[key] = target[key] && typeof target[key] === "object" ? { ...target[key] as Record<string, unknown> } : {};
    target = target[key] as Record<string, unknown>;
  }
  target[keys[keys.length - 1]] = value;
  return root;
}
