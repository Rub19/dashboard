const ROLES = ["owner", "admin", "senior", "junior", "assistant", "viewer"];
const STATUSES = ["pending", "active", "declined", "revoked"];

function cleanText(value, limit = 240) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit);
}

function validEmail(value) {
  const email = cleanText(value, 320).toLowerCase();
  return email.length >= 5 && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeRole(role) {
  const lower = String(role || "").toLowerCase();
  return ROLES.includes(lower) ? lower : "viewer";
}

function normalizeStatus(status) {
  const lower = String(status || "").toLowerCase();
  return STATUSES.includes(lower) ? lower : "pending";
}

function generateAvatarSeed(email, displayName) {
  return String(email || displayName || "?").trim().toLowerCase();
}

function initialsFrom(name, email) {
  const source = String(name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || first.toUpperCase() || "?";
}

export function createTeamManager(options = {}) {
  const storage = options.storage || globalThis.localStorage;
  const ownerId = options.ownerId || "";
  const storageKey = `ethone:v8:team:${ownerId || "local"}`;
  const listeners = new Set();
  let members = [];
  let loading = false;

  function key() {
    return storageKey;
  }

  function load() {
    try {
      const raw = storage?.getItem?.(key());
      if (!raw) {
        members = [];
        return members;
      }
      const parsed = JSON.parse(raw);
      members = Array.isArray(parsed) ? parsed.map(normalizeMember) : [];
    } catch {
      members = [];
    }
    return members;
  }

  function save() {
    try { storage?.setItem?.(key(), JSON.stringify(members)); } catch {}
  }

  function notify() {
    listeners.forEach((fn) => {
      try { fn({ members: [...members], loading }); } catch {}
    });
  }

  function newId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function normalizeMember(member) {
    const email = validEmail(member.email);
    const displayName = cleanText(member.displayName || member.display_name || "", 80);
    const avatarUrl = cleanText(member.avatarUrl || member.avatar_url || "", 1200);
    const seed = generateAvatarSeed(email, displayName);
    return {
      id: String(member.id || newId()),
      email,
      displayName,
      role: normalizeRole(member.role),
      status: normalizeStatus(member.status),
      avatarUrl,
      initials: initialsFrom(displayName, email),
      seed,
      invitedAt: member.invitedAt || member.invited_at || new Date().toISOString(),
      acceptedAt: member.acceptedAt || member.accepted_at || null,
      updatedAt: member.updatedAt || member.updated_at || new Date().toISOString()
    };
  }

  function listMembers() {
    if (!members.length) load();
    return [...members];
  }

  function invite({ email, role = "viewer", displayName = "" }) {
    const safeEmail = validEmail(email);
    if (!safeEmail) return { ok: false, status: "invalid", message: "Adresse e-mail invalide." };
    if (!members.length) load();
    const existing = members.find((m) => m.email === safeEmail);
    if (existing) return { ok: false, status: "duplicate", message: "Cet e-mail a déjà été invité." };

    const member = normalizeMember({
      email: safeEmail,
      role,
      displayName: cleanText(displayName, 80),
      status: "pending",
      invitedAt: new Date().toISOString()
    });

    members.push(member);
    save();
    notify();
    return { ok: true, status: "invited", member };
  }

  function updateRole(id, role) {
    const safeRole = normalizeRole(role);
    const member = members.find((m) => m.id === id);
    if (!member) return { ok: false, status: "not-found", message: "Membre introuvable." };
    member.role = safeRole;
    member.updatedAt = new Date().toISOString();
    save();
    notify();
    return { ok: true, member };
  }

  function accept(id) {
    const member = members.find((m) => m.id === id);
    if (!member) return { ok: false, status: "not-found", message: "Membre introuvable." };
    member.status = "active";
    member.acceptedAt = new Date().toISOString();
    member.updatedAt = new Date().toISOString();
    save();
    notify();
    return { ok: true, member };
  }

  function revoke(id) {
    const member = members.find((m) => m.id === id);
    if (!member) return { ok: false, status: "not-found", message: "Membre introuvable." };
    member.status = "revoked";
    member.updatedAt = new Date().toISOString();
    save();
    notify();
    return { ok: true, member };
  }

  function remove(id) {
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, status: "not-found", message: "Membre introuvable." };
    members.splice(index, 1);
    save();
    notify();
    return { ok: true };
  }

  function setLoading(value) {
    loading = Boolean(value);
    notify();
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    if (!members.length) load();
    listeners.add(fn);
    try { fn({ members: [...members], loading }); } catch {}
    return () => listeners.delete(fn);
  }

  function destroy() {
    listeners.clear();
    members = [];
  }

  load();
  return Object.freeze({
    listMembers,
    invite,
    updateRole,
    accept,
    revoke,
    remove,
    setLoading,
    subscribe,
    destroy,
    ROLES,
    STATUSES,
    normalizeRole
  });
}
