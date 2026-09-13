import { httpError } from "../middleware/errors.js";
import { applyAuthRateLimit } from "../middleware/rate-limit.js";
import { requestExternal } from "../utils/external-request.js";
import {
  listOwnedSpaces,
  listMemberSpaceIds,
  getSpacesByIds,
  getSpaceById,
  isSpaceOwner,
  isActiveSpaceMember,
  createSpace,
  deleteSpace,
  listSpaceMembers,
  insertMemberInvite,
  getMemberByToken,
  getMemberById,
  claimMemberInvite,
  declineMemberInvite,
  updateMemberStatus,
  removeMember
} from "../services/shared-spaces-client.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[0-9a-f]{48}$/;

async function readJsonBody(request, maxFields) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    throw httpError("INVALID_REQUEST", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) {
    throw httpError("INVALID_REQUEST", 400);
  }
  return body;
}

function requireField(body, key, pattern, maxLength) {
  const value = String(body[key] || "");
  if (!pattern.test(value) || (maxLength && value.length > maxLength)) throw httpError("INVALID_PARAMETER", 400, { detail: key });
  return value;
}

function safeEmail(value) {
  const email = String(value || "").toLowerCase().trim();
  return EMAIL_RE.test(email) && email.length <= 320 ? email : "";
}

function generateInviteToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendSpaceInviteEmail(env, email, spaceName, inviteUrl) {
  const resendKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM || env.SMTP_FROM;
  if (!resendKey || !from) return false;
  try {
    await requestExternal("https://api.resend.com/emails", {
      env,
      method: "POST",
      expectedOrigin: "https://api.resend.com",
      headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: `Invitation a rejoindre l'espace "${spaceName}" sur ETHONE`,
        text: `Bonjour,\n\nVous etes invite(e) a rejoindre l'espace partage "${spaceName}" sur ETHONE.\n\nLien : ${inviteUrl}\n\nCe lien est personnel et expire dans 7 jours.\n-- ETHONE`,
        html: `<p>Bonjour,</p><p>Vous etes invite(e) a rejoindre l'espace partage <strong>${spaceName}</strong> sur ETHONE.</p><p><a href="${inviteUrl}" style="padding:10px 16px;background:#C1234F;color:#fff;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Rejoindre l'espace</a></p><p>Ce lien est personnel et expire dans 7 jours.</p><p>-- ETHONE</p>`
      })
    });
    return true;
  } catch {
    return false;
  }
}

async function assertOwnerOrMember(env, spaceId, userId) {
  if (await isSpaceOwner(env, spaceId, userId)) return "owner";
  if (await isActiveSpaceMember(env, spaceId, userId)) return "member";
  throw httpError("SPACE_NOT_FOUND", 404);
}

export async function sharedSpacesRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const method = String(request.method || "GET").toUpperCase();

  if (method === "GET") {
    const owned = await listOwnedSpaces(env, auth.userId);
    const memberSpaceIds = await listMemberSpaceIds(env, auth.userId);
    const memberSpaces = await getSpacesByIds(env, memberSpaceIds.filter((id) => !owned.some((s) => s.id === id)));
    return {
      data: [
        ...owned.map((s) => ({ ...s, role: "owner" })),
        ...memberSpaces.map((s) => ({ ...s, role: "member" }))
      ]
    };
  }

  if (method === "POST") {
    const body = await readJsonBody(request, 1);
    const name = requireField(body, "name", /^.{1,120}$/s, 120);
    const space = await createSpace(env, auth.userId, name);
    return { data: space };
  }

  if (method === "DELETE") {
    const body = await readJsonBody(request, 1);
    const id = requireField(body, "id", UUID_RE, 36);
    await deleteSpace(env, id, auth.userId);
    return { data: { deleted: true } };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}

export async function sharedSpaceMembersRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const method = String(request.method || "GET").toUpperCase();

  if (method === "GET") {
    const url = new URL(request.url);
    const spaceId = url.searchParams.get("space_id") || "";
    if (!UUID_RE.test(spaceId)) throw httpError("INVALID_PARAMETER", 400, { detail: "space_id" });
    await assertOwnerOrMember(env, spaceId, auth.userId);
    const members = await listSpaceMembers(env, spaceId);
    // Never leak invite_token to anyone but the owner -- a member only needs
    // to know who else is in the space, not the raw bearer token for someone
    // else's still-pending invite.
    const isOwner = await isSpaceOwner(env, spaceId, auth.userId);
    return { data: members.map((m) => (isOwner ? m : { ...m, invite_token: undefined })) };
  }

  if (method === "POST") {
    await applyAuthRateLimit({ request, env, route: { id: "shared-spaces.members.invite" } }, auth.userId);
    const body = await readJsonBody(request, 2);
    const spaceId = requireField(body, "space_id", UUID_RE, 36);
    const email = safeEmail(body.email);
    if (!email) throw httpError("INVALID_PARAMETER", 400, { detail: "email" });
    if (!(await isSpaceOwner(env, spaceId, auth.userId))) throw httpError("SPACE_NOT_FOUND", 404);

    const space = await getSpaceById(env, spaceId);
    const token = generateInviteToken();
    const member = await insertMemberInvite(env, { spaceId, invitedEmail: email, invitedBy: auth.userId, inviteToken: token });
    const inviteUrl = `${env.DASHBOARD_ORIGIN || "https://ethone.dev"}/spaces/join?token=${token}`;
    const sent = await sendSpaceInviteEmail(env, email, space?.name || "Espace partage", inviteUrl);
    return { data: { member, sent } };
  }

  if (method === "PATCH") {
    await applyAuthRateLimit({ request, env, route: { id: "shared-spaces.members.revoke" } }, auth.userId);
    const body = await readJsonBody(request, 2);
    const id = requireField(body, "id", UUID_RE, 36);
    const status = requireField(body, "status", /^(revoked|active)$/, 20);
    const member = await getMemberById(env, id);
    if (!member) throw httpError("PROVIDER_NOT_FOUND", 404);
    if (!(await isSpaceOwner(env, member.space_id, auth.userId))) throw httpError("SPACE_NOT_FOUND", 404);
    const updated = await updateMemberStatus(env, id, status);
    return { data: { updated: true, member: updated } };
  }

  if (method === "DELETE") {
    const body = await readJsonBody(request, 1);
    const id = requireField(body, "id", UUID_RE, 36);
    const member = await getMemberById(env, id);
    if (!member) throw httpError("PROVIDER_NOT_FOUND", 404);
    if (!(await isSpaceOwner(env, member.space_id, auth.userId))) throw httpError("SPACE_NOT_FOUND", 404);
    await removeMember(env, id);
    return { data: { removed: true } };
  }

  throw httpError("METHOD_NOT_ALLOWED", 405);
}

// Public: display-only lookup so an invitee who hasn't logged in yet can see
// what they're being invited to. Never returns the full row (no user_id,
// no invited_by) -- just enough to render the acceptance screen.
export async function sharedSpaceJoinResolveRoute({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!TOKEN_RE.test(token)) throw httpError("SPACE_INVITE_INVALID", 400);

  const member = await getMemberByToken(env, token);
  if (!member) throw httpError("SPACE_INVITE_INVALID", 404);

  const space = await getSpaceById(env, member.space_id);
  const expired = new Date(member.invite_token_expires_at) < new Date();

  return {
    data: {
      spaceName: space?.name || "Espace partage",
      invitedEmail: member.invited_email,
      status: member.status,
      expired
    }
  };
}

async function resolveAndValidateInvite(env, token, auth) {
  if (!TOKEN_RE.test(token)) throw httpError("SPACE_INVITE_INVALID", 400);
  const member = await getMemberByToken(env, token);
  if (!member) throw httpError("SPACE_INVITE_INVALID", 404);
  if (member.status !== "pending") throw httpError("SPACE_INVITE_INVALID", 409);
  if (new Date(member.invite_token_expires_at) < new Date()) throw httpError("SPACE_INVITE_EXPIRED", 410);
  const callerEmail = String(auth.email || "").toLowerCase().trim();
  if (!callerEmail || callerEmail !== member.invited_email.toLowerCase()) {
    throw httpError("SPACE_INVITE_EMAIL_MISMATCH", 403, { detail: { invitedEmail: member.invited_email } });
  }
  return member;
}

export async function sharedSpaceJoinAcceptRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  await applyAuthRateLimit({ request, env, route: { id: "shared-spaces.join.accept" } }, auth.userId);
  const body = await readJsonBody(request, 1);
  const token = requireField(body, "token", TOKEN_RE, 48);
  const member = await resolveAndValidateInvite(env, token, auth);
  const updated = await claimMemberInvite(env, member.id, auth.userId);
  return { data: { accepted: true, member: updated } };
}

export async function sharedSpaceJoinDeclineRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 1);
  const token = requireField(body, "token", TOKEN_RE, 48);
  const member = await resolveAndValidateInvite(env, token, auth);
  const updated = await declineMemberInvite(env, member.id);
  return { data: { declined: true, member: updated } };
}
