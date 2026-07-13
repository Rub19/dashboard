function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function sortNotes(notes = []) {
  return notes.slice().sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
  });
}

export function filterNotes(notes = [], query = "") {
  const search = normalize(query).trim();
  const ordered = sortNotes(notes);
  if (!search) return ordered;
  return ordered.filter((note) => normalize([
    note.title,
    note.content,
    ...(Array.isArray(note.tags) ? note.tags : [])
  ].join(" ")).includes(search));
}

export function wordCount(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
