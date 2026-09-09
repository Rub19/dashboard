import { getDeviceBySession, insertSecurityEvent } from "../services/security-identity-client.js";
import { revokeDevice } from "../services/device-service.js";

// Previously a 9-line no-op: it returned `signedOut: true` and a
// `Clear-Site-Data` header, but never revoked anything server-side, and the
// header itself did nothing useful — `Clear-Site-Data` applies to the
// response's OWN origin, which for a Worker response is
// `*.workers.dev`/the API host, not `ethone.dev` where the actual session
// storage lives. A client could keep using its access token (and, once
// refreshed, a token that would otherwise carry the same session_id) for
// the rest of its natural lifetime after "signing out".
//
// Real server-side sign-out for a stateless-JWT architecture means marking
// this session_id revoked in the app's own session table (ethone_devices)
// so middleware/auth.js's per-request revocation check (see
// middleware/auth.js's isSessionRevoked) rejects every future request that
// carries it — including a refreshed token, since Supabase keeps the same
// session_id across a refresh within one login.
export async function signOutRoute({ auth, env }) {
  if (!auth?.userId) {
    return { status: 401, data: { signedOut: false } };
  }

  let deviceId = null;
  if (auth.sessionId) {
    const device = await getDeviceBySession(env, auth.userId, auth.sessionId);
    if (device && !device.revoked_at) {
      await revokeDevice(env, auth.userId, device.id);
      deviceId = device.id;
    }
  }

  // Distinct from the "device_revoked" event revokeDevice() already logs —
  // this one specifically records a deliberate sign-out (as opposed to
  // revoking some other session from the security center), for a readable
  // login/logout history.
  await insertSecurityEvent(env, { userId: auth.userId, kind: "signed_out", deviceId, metadata: {} });

  return { data: { signedOut: true } };
}
