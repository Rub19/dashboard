import { httpError } from "../middleware/errors.js";
import { applyAuthRateLimit } from "../middleware/rate-limit.js";
import { requestExternal } from "../utils/external-request.js";
import { PATTERNS, requireSecret } from "../middleware/validation.js";
import { getDiscordProfile } from "../services/discord-oauth-client.js";
import {
  listOwnedSpaces,
  listMemberSpaceIds,
  getSpacesByIds,
  getSpaceById,
  isSpaceOwner,
  isActiveSpaceMember,
  createSpace,
  deleteSpace,
  updateSpaceDiscordLink,
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
const NOTIFY_KIND_RE = /^(task|event|note)$/;
const NOTIFY_ACTION_RE = /^(created|completed)$/;

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

// Reads the guild list already stored by the dashboard's Discord OAuth
// connect flow (worker/src/services/discord-oauth-client.js) instead of
// making a fresh live Discord API call from the Worker. This snapshot can be
// stale (permissions revoked since connecting) -- accepted here because
// linking a space only chooses WHERE its own activity gets posted, never
// grants data access; a stale link just fails silently at post time.
async function assertGuildAdmin(env, userId, guildId) {
  const profile = await getDiscordProfile(env, userId);
  const guild = Array.isArray(profile?.guilds) ? profile.guilds.find((g) => g?.id === guildId) : null;
  if (!guild) throw httpError("FORBIDDEN", 403);
  if (guild.owner === true) return;
  let perms = 0n;
  try {
    perms = BigInt(guild.permissions || "0");
  } catch {
    perms = BigInt(Number(guild.permissions) || 0);
  }
  if ((perms & 8n) === 8n || (perms & 32n) === 32n) return;
  throw httpError("FORBIDDEN", 403);
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

  if (method === "PATCH") {
    await applyAuthRateLimit({ request, env, route: { id: "shared-spaces.discord-link" } }, auth.userId);
    const body = await readJsonBody(request, 3);
    const id = requireField(body, "id", UUID_RE, 36);
    if (!(await isSpaceOwner(env, id, auth.userId))) throw httpError("SPACE_NOT_FOUND", 404);

    const guildId = body.discord_guild_id === null || body.discord_guild_id === undefined ? null : String(body.discord_guild_id);
    const channelId = body.discord_channel_id === null || body.discord_channel_id === undefined ? null : String(body.discord_channel_id);
    if (guildId !== null && !PATTERNS.discordId.test(guildId)) throw httpError("INVALID_PARAMETER", 400, { detail: "discord_guild_id" });
    if (channelId !== null && !PATTERNS.discordId.test(channelId)) throw httpError("INVALID_PARAMETER", 400, { detail: "discord_channel_id" });
    if ((guildId === null) !== (channelId === null)) throw httpError("INVALID_PARAMETER", 400, { detail: "discord_link" });

    if (guildId !== null) await assertGuildAdmin(env, auth.userId, guildId);

    const space = await updateSpaceDiscordLink(env, id, auth.userId, { guildId, channelId });
    return { data: space };
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

// Best-effort relay to the discord-bot's internal notify endpoint. Every
// failure mode (space not linked, bot unreachable, secret not configured)
// returns {notified:false} rather than throwing -- a client just fired this
// after an already-successful Supabase write, and a bot outage must never
// surface as a visible error for that write.
export async function sharedSpaceNotifyRoute({ request, env, auth }) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  const body = await readJsonBody(request, 4);
  const spaceId = requireField(body, "space_id", UUID_RE, 36);
  const kind = requireField(body, "kind", NOTIFY_KIND_RE, 10);
  const action = requireField(body, "action", NOTIFY_ACTION_RE, 12);
  const title = String(body.title || "").slice(0, 300);

  await assertOwnerOrMember(env, spaceId, auth.userId);

  try {
    const space = await getSpaceById(env, spaceId);
    if (!space?.discord_guild_id || !space?.discord_channel_id) return { data: { notified: false } };

    const origin = String(env.DISCORD_BOT_ORIGIN || "");
    if (!origin) return { data: { notified: false } };
    const key = requireSecret(env, "SHARED_SPACES_BOT_KEY");

    await requestExternal(new URL("/api/internal/shared-spaces/notify", origin), {
      env,
      expectedOrigin: origin,
      service: "discord-bot",
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-key": key },
      body: JSON.stringify({
        guildId: space.discord_guild_id,
        channelId: space.discord_channel_id,
        spaceName: space.name,
        kind,
        action,
        title,
        actorName: auth.displayName || auth.email || "Quelqu'un"
      }),
      retries: 0,
      maxBytes: 2048
    });
    return { data: { notified: true } };
  } catch {
    return { data: { notified: false } };
  }
}
