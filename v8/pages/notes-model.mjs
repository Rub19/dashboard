function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function sortNotes(notes = [], order = "recent") {
  return notes.slice().sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    if (order === "title") return String(left.title || "").localeCompare(String(right.title || ""), "fr", { sensitivity: "base" });
    if (order === "oldest") return String(left.updatedAt || "").localeCompare(String(right.updatedAt || ""));
    return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
  });
}

export function filterNotes(notes = [], query = "", order = "recent") {
  const search = normalize(query).trim();
  const ordered = sortNotes(notes, order);
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
