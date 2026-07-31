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
    if (Object.hasOwn(filters, "parentId") && (file.parentId || null) !== filters.parentId) return false;
    if (!query) return true;
    return normalize([file.name, file.type, file.tag, file.url].join(" ")).includes(query);
  });
}

export function folderPath(files = [], folderId) {
  const path = [];
  const seen = new Set();
  let cursorId = folderId;
  while (cursorId) {
    if (seen.has(cursorId)) break;
    seen.add(cursorId);
    const folder = files.find((entry) => String(entry.id) === String(cursorId) && entry.type === "folder");
    if (!folder) break;
    path.unshift(folder);
    cursorId = folder.parentId;
  }
  return path;
}

export function descendantFolderIds(files = [], folderId) {
  const ids = new Set();
  const queue = [String(folderId)];
  while (queue.length) {
    const current = queue.shift();
    files.forEach((entry) => {
      if (entry.type === "folder" && String(entry.parentId || "") === current && !ids.has(entry.id)) {
        ids.add(entry.id);
        queue.push(entry.id);
      }
    });
  }
  return ids;
}
