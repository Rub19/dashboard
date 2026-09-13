import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";

function projectOrigin(env) {
  let url;
  try {
    url = new URL(String(env.SUPABASE_URL || ""));
  } catch {
    return "";
  }
  return url.protocol === "https:" ? url.origin : "";
}

function serviceHeaders(secret) {
  return { apikey: secret, "content-type": "application/json", Authorization: `Bearer ${secret}` };
}

function supabaseRequest(env, path, options = {}) {
  const origin = projectOrigin(env);
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  return requestExternal(new URL(path, origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    method: options.method || "GET",
    headers: { ...serviceHeaders(secret), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    retries: options.retries ?? 0,
    maxBytes: options.maxBytes ?? 8192
  });
}

function firstRow(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

function rows(response) {
  return Array.isArray(response?.data) ? response.data : [];
}

export async function listOwnedSpaces(env, userId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_spaces?owner_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&select=*`);
  return rows(response);
}

export async function listMemberSpaceIds(env, userId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_space_members?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=space_id`);
  return rows(response).map((r) => r.space_id);
}

export async function getSpacesByIds(env, ids) {
  if (!ids.length) return [];
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_spaces?id=in.(${ids.map(encodeURIComponent).join(",")})&select=*`);
  return rows(response);
}

export async function getSpaceById(env, spaceId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_spaces?id=eq.${encodeURIComponent(spaceId)}&select=*`);
  return firstRow(response);
}

export async function isSpaceOwner(env, spaceId, userId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_spaces?id=eq.${encodeURIComponent(spaceId)}&owner_id=eq.${encodeURIComponent(userId)}&select=id`);
  return Boolean(firstRow(response));
}

export async function isActiveSpaceMember(env, spaceId, userId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_space_members?space_id=eq.${encodeURIComponent(spaceId)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=id`);
  return Boolean(firstRow(response));
}

export async function createSpace(env, ownerId, name) {
  const response = await supabaseRequest(env, "/rest/v1/ethone_shared_spaces", {
    method: "POST",
    body: { owner_id: ownerId, name: safeText(name, 120) },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function deleteSpace(env, spaceId, ownerId) {
  await supabaseRequest(env, `/rest/v1/ethone_shared_spaces?id=eq.${encodeURIComponent(spaceId)}&owner_id=eq.${encodeURIComponent(ownerId)}`, { method: "DELETE" });
  return true;
}

export async function listSpaceMembers(env, spaceId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_space_members?space_id=eq.${encodeURIComponent(spaceId)}&order=invited_at.desc&select=*`);
  return rows(response);
}

export async function insertMemberInvite(env, { spaceId, invitedEmail, invitedBy, inviteToken }) {
  const response = await supabaseRequest(env, "/rest/v1/ethone_shared_space_members", {
    method: "POST",
    body: {
      space_id: spaceId,
      invited_email: invitedEmail,
      invited_by: invitedBy,
      invite_token: inviteToken,
      status: "pending"
    },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function getMemberByToken(env, token) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_space_members?invite_token=eq.${encodeURIComponent(token)}&select=*`);
  return firstRow(response);
}

export async function getMemberById(env, memberId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_space_members?id=eq.${encodeURIComponent(memberId)}&select=*`);
  return firstRow(response);
}

export async function claimMemberInvite(env, memberId, userId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_space_members?id=eq.${encodeURIComponent(memberId)}&status=eq.pending`, {
    method: "PATCH",
    body: { user_id: userId, status: "active", accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function declineMemberInvite(env, memberId) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_space_members?id=eq.${encodeURIComponent(memberId)}&status=eq.pending`, {
    method: "PATCH",
    body: { status: "declined", updated_at: new Date().toISOString() },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

// Caller must already have verified (via isSpaceOwner on the member's own
// space_id) that the requesting user owns the space this member belongs to —
// PostgREST query params can't express a "space_id in (select ... where
// owner_id = X)" subquery, so ownership is checked at the route layer before
// this runs a plain by-id update against the service-role connection.
export async function updateMemberStatus(env, memberId, status) {
  const response = await supabaseRequest(env, `/rest/v1/ethone_shared_space_members?id=eq.${encodeURIComponent(memberId)}`, {
    method: "PATCH",
    body: { status, updated_at: new Date().toISOString() },
    headers: { Prefer: "return=representation" }
  });
  return firstRow(response);
}

export async function removeMember(env, memberId) {
  await supabaseRequest(env, `/rest/v1/ethone_shared_space_members?id=eq.${encodeURIComponent(memberId)}`, { method: "DELETE" });
  return true;
}
