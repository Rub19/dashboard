export function togglePinned(pinned: string[], id: string): string[] {
  return pinned.includes(id) ? pinned.filter((item) => item !== id) : [...pinned, id];
}

export function resolvePinned<T extends { module: { id: string } }>(pinned: string[], modules: T[]): T[] {
  return pinned.flatMap((id) => modules.filter((status) => status.module.id === id));
}
