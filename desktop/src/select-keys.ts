interface KeyOption { label: string; disabled?: boolean }

export function nextOption(options: KeyOption[], active: number, key: string): number | null {
  const usable = options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0);
  if (usable.length === 0) return null;
  if (key === "Home") return usable[0];
  if (key === "End") return usable[usable.length - 1];
  if (key === "ArrowDown") return usable.find((index) => index > active) ?? usable[usable.length - 1];
  if (key === "ArrowUp") return [...usable].reverse().find((index) => index < active) ?? usable[0];
  return null;
}

export function typeAhead(options: KeyOption[], active: number, letter: string): number | null {
  const wanted = letter.toLocaleLowerCase();
  for (let step = 1; step <= options.length; step++) {
    const index = (active + step) % options.length;
    if (!options[index].disabled && options[index].label.toLocaleLowerCase().startsWith(wanted)) return index;
  }
  return null;
}
