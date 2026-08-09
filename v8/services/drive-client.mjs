import { formatBytes } from "../utils/format.mjs";

const MIME_TYPE_MAP = Object.freeze({
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "doc",
  "application/vnd.google-apps.presentation": "doc",
  "application/vnd.google-apps.form": "doc",
  "application/pdf": "doc",
  "text/plain": "doc",
  "text/markdown": "doc",
  "text/html": "code",
  "application/json": "code",
  "application/javascript": "code",
  "text/css": "code",
  "text/javascript": "code",
  "image/": "image",
  "video/": "video",
  "audio/": "video"
});

function inferType(mimeType = "") {
  if (mimeType === "application/vnd.google-apps.folder") return "folder";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/") || mimeType.startsWith("audio/")) return "video";
  if (mimeType === "application/pdf" || mimeType.startsWith("text/") || mimeType.includes("document") || mimeType.includes("spreadsheet") || mimeType.includes("presentation")) return "doc";
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("xml") || mimeType.includes("html") || mimeType.includes("css")) return "code";
  return "file";
}



function normalizeDriveFile(item) {
  const type = inferType(item.mimeType);
  return Object.freeze({
    id: item.id,
    driveId: item.id,
    name: item.name,
    type,
    mimeType: item.mimeType,
    size: Number(item.size) || 0,
    sizeLabel: type === "folder" ? "" : formatBytes(item.size, { empty: "" }),
    date: item.modifiedTime || item.createdTime || "",
    createdAt: item.createdTime || "",
    parentId: Array.isArray(item.parents) ? item.parents[0] || null : null,
    parents: Object.freeze(Array.isArray(item.parents) ? item.parents : []),
    webViewLink: item.webViewLink || "",
    thumbnailLink: item.thumbnailLink || "",
    iconUrl: item.iconUrl || "",
    md5Checksum: item.md5Checksum || "",
    trashed: item.trashed === true,
    favorite: item.favorite === true,
    tags: Array.isArray(item.tags) ? item.tags : [],
    url: "",
    tag: ""
  });
}

export function createDriveClient(options = {}) {
  const externalServices = options.externalServices;
  const getClientId = typeof options.getClientId === "function" ? options.getClientId : () => "";
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const cloudCache = options.cloudCache;

  function client() {
    const clientId = getClientId();
    const api = externalServices?.googleDriveOAuth;
    return { clientId, api };
  }

  async function withApi(fn) {
    const { clientId, api } = client();
    if (!clientId || !api) throw new Error("Google Drive n'est pas connecté.");
    return fn(clientId, api);
  }

  async function list(parentId = null, { pageSize = 50, pageToken = "", orderBy = "folder,name", query = "" } = {}) {
    return withApi((clientId, api) => api.files(clientId, { parentId, pageSize, pageToken, orderBy, q: query }));
  }

  async function search(query) {
    return withApi((clientId, api) => api.files(clientId, { q: query }));
  }

  async function get(fileId) {
    return withApi((clientId, api) => api.get(clientId, fileId));
  }

  async function createFolder(name, parentId = null) {
    return withApi((clientId, api) => api.createFolder(clientId, name, parentId));
  }

  async function rename(fileId, name) {
    return withApi((clientId, api) => api.update(clientId, fileId, { name }));
  }

  async function move(fileId, newParentId, oldParentId = null) {
    const addParents = newParentId ? [newParentId] : [];
    const removeParents = oldParentId ? [oldParentId] : [];
    return withApi((clientId, api) => api.update(clientId, fileId, { addParents, removeParents }));
  }

  async function trash(fileId) {
    return withApi((clientId, api) => api.trash(clientId, fileId));
  }

  async function remove(fileId) {
    return withApi((clientId, api) => api.delete(clientId, fileId));
  }

  async function quota() {
    return withApi((clientId, api) => api.quota(clientId));
  }

  async function upload(file, { name, parentId, onProgress } = {}) {
    return withApi((clientId, api) => api.upload(clientId, file, { name, parentId, onProgress }));
  }

  async function download(fileId) {
    return withApi((clientId, api) => api.download(clientId, fileId));
  }

  function isConnected() {
    return Boolean(getClientId() && externalServices?.googleDriveOAuth);
  }

  function normalizeResponse(response) {
    const data = response?.data || {};
    if (Array.isArray(data.files)) {
      return Object.freeze({
        files: Object.freeze(data.files.map(normalizeDriveFile)),
        nextPageToken: data.nextPageToken || ""
      });
    }
    if (data.file) return Object.freeze({ file: normalizeDriveFile(data.file) });
    if (data.folder) return Object.freeze({ file: normalizeDriveFile(data.folder) });
    if (data.files) return Object.freeze({ files: Object.freeze(data.files.map(normalizeDriveFile)), nextPageToken: "" });
    return Object.freeze(data);
  }

  async function sync(files) {
    if (cloudCache) await cloudCache.setFiles(files);
    if (!externalServices?.cloudFiles?.sync) return { synced: 0 };
    const clientId = getClientId();
    const payload = await externalServices.cloudFiles.sync(files.map((file) => ({
      id: file.id,
      parentId: file.parentId,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      type: file.type,
      webViewLink: file.webViewLink,
      thumbnailLink: file.thumbnailLink,
      iconUrl: file.iconUrl,
      md5Checksum: file.md5Checksum,
      trashed: file.trashed,
      date: file.date,
      createdAt: file.createdAt
    })), clientId);
    return payload?.data || { synced: 0 };
  }

  async function getCloudFile(driveFileId) {
    if (!externalServices?.cloudFiles?.get) return null;
    const payload = await externalServices.cloudFiles.get(driveFileId);
    return payload?.data?.file ? normalizeDriveFile(payload.data.file) : null;
  }

  async function searchCloudFiles(query) {
    if (!externalServices?.cloudFiles?.list) return { files: [] };
    const payload = await externalServices.cloudFiles.list({ search: query, trashed: false, limit: 200 });
    const files = Array.isArray(payload?.data?.files) ? payload.data.files.map((file) => normalizeDriveFile({
      ...file,
      id: file.driveFileId || file.id,
      parents: file.parentId ? [file.parentId] : [],
      modifiedTime: file.driveModifiedAt || file.updatedAt,
      createdTime: file.driveCreatedAt || file.createdAt,
      favorite: file.isFavorite,
      tags: file.tags
    })) : [];
    return { files };
  }

  async function updateTags(driveFileId, tags) {
    if (!externalServices?.cloudFiles?.update) return null;
    const payload = await externalServices.cloudFiles.update(driveFileId, { tags });
    return payload?.data?.file ? normalizeDriveFile(payload.data.file) : null;
  }

  async function toggleFavorite(driveFileId, favorite = true) {
    if (!externalServices?.cloudFiles?.favorite) return false;
    const payload = await externalServices.cloudFiles.favorite(driveFileId, favorite);
    return payload?.data?.favorite === true;
  }

  async function listFavorites() {
    if (!externalServices?.cloudFiles?.favorites) {
      return cloudCache ? cloudCache.getFavorites() : [];
    }
    try {
      const payload = await externalServices.cloudFiles.favorites();
      const files = Array.isArray(payload?.data?.files) ? payload.data.files.map(normalizeDriveFile) : [];
      if (cloudCache) await cloudCache.setFavorites(files);
      return files;
    } catch (err) {
      if (cloudCache && !navigator?.onLine) return cloudCache.getFavorites();
      throw err;
    }
  }

  return Object.freeze({
    isConnected,
    getClientId,
    list: async (...args) => normalizeResponse(await list(...args)),
    search: async (...args) => normalizeResponse(await search(...args)),
    get: async (...args) => normalizeResponse(await get(...args)),
    createFolder: async (...args) => normalizeResponse(await createFolder(...args)),
    rename: async (...args) => normalizeResponse(await rename(...args)),
    move: async (...args) => normalizeResponse(await move(...args)),
    trash: async (...args) => normalizeResponse(await trash(...args)),
    delete: async (...args) => normalizeResponse(await remove(...args)),
    quota: async () => {
      const response = await quota();
      return response?.data || { usage: 0, limit: 0, usageInDrive: 0, usageInDriveTrash: 0 };
    },
    upload: async (...args) => normalizeResponse(await upload(...args)),
    download,
    sync,
    getCloudFile,
    updateTags,
    toggleFavorite,
    listFavorites,
    getCachedFiles: () => cloudCache?.getFiles() || Promise.resolve([]),
    getCachedFavorites: () => cloudCache?.getFavorites() || Promise.resolve([]),
    brain: (driveFileId, folders = []) => externalServices?.cloudFiles?.brain ? externalServices.cloudFiles.brain(driveFileId, folders) : Promise.resolve(null),
    search: searchCloudFiles,
    normalizeFile: normalizeDriveFile
  });
}
