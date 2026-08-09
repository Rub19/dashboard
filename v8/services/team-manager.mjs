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

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newToken() {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function memberFromRow(row) {
  const email = validEmail(row.email);
  const displayName = cleanText(row.display_name || "", 80);
  const avatarUrl = cleanText(row.avatar_url || "", 1200);
  return {
    id: String(row.id || newId()),
    email,
    displayName,
    display_name: displayName,
    role: normalizeRole(row.role),
    status: normalizeStatus(row.status),
    avatarUrl,
    avatar_url: avatarUrl,
    initials: initialsFrom(displayName, email),
    seed: generateAvatarSeed(email, displayName),
    inviteToken: cleanText(row.invite_token || "", 128),
    invite_token: cleanText(row.invite_token || "", 128),
    invitedAt: row.invited_at || new Date().toISOString(),
    invited_at: row.invited_at || new Date().toISOString(),
    acceptedAt: row.accepted_at || null,
    accepted_at: row.accepted_at || null,
    updatedAt: row.updated_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

function rowFromMember(member, ownerId) {
  return {
    id: member.id,
    owner_id: ownerId,
    email: member.email,
    role: member.role,
    status: member.status,
    display_name: member.displayName,
    avatar_url: member.avatarUrl,
    invite_token: member.inviteToken,
    invited_at: member.invitedAt,
    accepted_at: member.acceptedAt,
    updated_at: member.updatedAt
  };
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
    display_name: displayName,
    role: normalizeRole(member.role),
    status: normalizeStatus(member.status),
    avatarUrl,
    avatar_url: avatarUrl,
    initials: initialsFrom(displayName, email),
    seed,
    inviteToken: cleanText(member.inviteToken || member.invite_token || "", 128),
    invite_token: cleanText(member.inviteToken || member.invite_token || "", 128),
    invitedAt: member.invitedAt || member.invited_at || new Date().toISOString(),
    invited_at: member.invitedAt || member.invited_at || new Date().toISOString(),
    acceptedAt: member.acceptedAt || member.accepted_at || null,
    accepted_at: member.acceptedAt || member.accepted_at || null,
    updatedAt: member.updatedAt || member.updated_at || new Date().toISOString(),
    updated_at: member.updatedAt || member.updated_at || new Date().toISOString()
  };
}

function inviteUrl(token, baseUrl = "") {
  const origin = baseUrl || (typeof location !== "undefined" ? location.origin : "https://ethone.dev");
  return `${origin}/join?team-invite=${encodeURIComponent(token)}`;
}

export function createTeamManager(options = {}) {
  const storage = options.storage || globalThis.localStorage;
  const ownerId = options.ownerId || "";
  const clientProvider = typeof options.clientProvider === "function" ? options.clientProvider : null;
  const sendEmail = typeof options.sendEmail === "function" ? options.sendEmail : null;
  const storageKey = `ethone:v8:team:${ownerId || "local"}`;
  const listeners = new Set();
  let members = [];
  let loading = false;
  let syncError = "";

  function key() {
    return storageKey;
  }

  function loadLocal() {
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

  function saveLocal(list) {
    try { storage?.setItem?.(key(), JSON.stringify(list)); } catch {}
  }

  function notify() {
    listeners.forEach((fn) => {
      try { fn({ members: [...members], loading, error: syncError }); } catch {}
    });
  }

  async function client() {
    if (!clientProvider) return null;
    try { return await clientProvider(); } catch { return null; }
  }

  async function loadRemote() {
    const supabase = await client();
    if (!supabase?.from) return false;
    const { data, error } = await supabase.from("ethone_team_members").select("*").eq("owner_id", ownerId).order("invited_at", { ascending: false });
    if (error) throw error;
    members = (Array.isArray(data) ? data : []).map(memberFromRow);
    saveLocal(members);
    return true;
  }

  async function listMembers() {
    if (!members.length) loadLocal();
    if (clientProvider) {
      loading = true;
      syncError = "";
      notify();
      try {
        await loadRemote();
      } catch (err) {
        syncError = err.message || "Impossible de synchroniser l'équipe.";
      } finally {
        loading = false;
        notify();
      }
    }
    return [...members];
  }

  async function invite({ email, role = "viewer", displayName = "" }) {
    const safeEmail = validEmail(email);
    if (!safeEmail) return { ok: false, status: "invalid", message: "Adresse e-mail invalide." };

    const existing = members.find((m) => m.email === safeEmail);
    if (existing) return { ok: false, status: "duplicate", message: "Cet e-mail a déjà été invité." };

    const token = newToken();
    const nowIso = new Date().toISOString();
    const member = normalizeMember({
      id: newId(),
      email: safeEmail,
      role,
      displayName: cleanText(displayName, 80),
      status: "pending",
      inviteToken: token,
      invitedAt: nowIso,
      updatedAt: nowIso
    });

    const supabase = await client();
    if (supabase?.from) {
      try {
        const { error } = await supabase.from("ethone_team_members").insert(rowFromMember(member, ownerId));
        if (error) {
          if (error.code === "23505") return { ok: false, status: "duplicate", message: "Cet e-mail a déjà été invité." };
          throw error;
        }
        members.push(member);
        saveLocal(members);
        notify();
        const url = inviteUrl(token);
        if (sendEmail) {
          sendEmail({ email: safeEmail, displayName: member.displayName, url, token }).catch(() => {});
        }
        return { ok: true, status: "invited", member, url, token };
      } catch (err) {
        syncError = err.message || "Échec de l'invitation.";
        notify();
        return { ok: false, status: "failed", message: syncError };
      }
    }

    members.push(member);
    saveLocal(members);
    notify();
    return { ok: true, status: "invited", member, url: inviteUrl(token) };
  }

  async function updateRole(id, role) {
    const safeRole = normalizeRole(role);
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, status: "not-found", message: "Membre introuvable." };
    const member = members[index];
    member.role = safeRole;
    member.updatedAt = new Date().toISOString();

    const supabase = await client();
    if (supabase?.from) {
      try {
        const { error } = await supabase.from("ethone_team_members").update({ role: safeRole, updated_at: member.updatedAt }).eq("id", id).eq("owner_id", ownerId);
        if (error) throw error;
      } catch (err) {
        syncError = err.message || "Échec de la mise à jour.";
      }
    }
    saveLocal(members);
    notify();
    return { ok: true, member };
  }

  async function accept(id) {
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, status: "not-found", message: "Membre introuvable." };
    const member = members[index];
    member.status = "active";
    member.acceptedAt = new Date().toISOString();
    member.updatedAt = new Date().toISOString();

    const supabase = await client();
    if (supabase?.from) {
      try {
        const { error } = await supabase.from("ethone_team_members").update({ status: "active", accepted_at: member.acceptedAt, updated_at: member.updatedAt }).eq("id", id).eq("owner_id", ownerId);
        if (error) throw error;
      } catch (err) {
        syncError = err.message || "Échec de l'acceptation.";
      }
    }
    saveLocal(members);
    notify();
    return { ok: true, member };
  }

  async function revoke(id) {
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, status: "not-found", message: "Membre introuvable." };
    const member = members[index];
    member.status = "revoked";
    member.updatedAt = new Date().toISOString();

    const supabase = await client();
    if (supabase?.from) {
      try {
        const { error } = await supabase.from("ethone_team_members").update({ status: "revoked", updated_at: member.updatedAt }).eq("id", id).eq("owner_id", ownerId);
        if (error) throw error;
      } catch (err) {
        syncError = err.message || "Échec de la révocation.";
      }
    }
    saveLocal(members);
    notify();
    return { ok: true, member };
  }

  async function remove(id) {
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, status: "not-found", message: "Membre introuvable." };

    const supabase = await client();
    if (supabase?.from) {
      try {
        const { error } = await supabase.from("ethone_team_members").delete().eq("id", id).eq("owner_id", ownerId);
        if (error) throw error;
      } catch (err) {
        syncError = err.message || "Échec de la suppression.";
      }
    }
    members.splice(index, 1);
    saveLocal(members);
    notify();
    return { ok: true };
  }

  function setLoading(value) {
    loading = Boolean(value);
    notify();
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    if (!members.length) loadLocal();
    listeners.add(fn);
    if (clientProvider) listMembers();
    else try { fn({ members: [...members], loading, error: syncError }); } catch {}
    return () => listeners.delete(fn);
  }

  function destroy() {
    listeners.clear();
    members = [];
  }

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
    normalizeRole,
    inviteUrl
  });
}
