function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function sortFiles(files = [], order = "recent") {
  return files.slice().sort((left, right) => {
    if (order === "name") return String(left.name || "").localeCompare(String(right.name || ""), "fr", { sensitivity: "base" });
    if (order === "type") return String(left.type || "").localeCompare(String(right.type || "")) || String(left.name || "").localeCompare(String(right.name || ""));
    return String(right.date || "").localeCompare(String(left.date || ""));
  });
}

export function filterFiles(files = [], filters = {}) {
  const query = normalize(filters.query).trim();
  return files.filter((file) => {
    if (filters.favorites && !file.favorite) return false;
    if (filters.type && filters.type !== "all" && file.type !== filters.type) return false;
    if (!query) return true;
    return normalize([file.name, file.type, file.tag, file.url].join(" ")).includes(query);
  });
}
