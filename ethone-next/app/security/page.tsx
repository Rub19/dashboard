"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /security used to be a separate, fully-parallel security surface
 * (passkeys, devices, security events) that nothing in the app actually
 * linked to — the command palette's security entry already points at
 * /settings/security (see lib/commands.tsx), and Sidebar/CommandPalette
 * never referenced this route. Rather than maintain two independently
 * drifting implementations of the same device/passkey/2FA data, everything
 * that used to live here now lives in /settings/security (SecurityAuthManager
 * for 2FA + passkeys, SessionsManager for devices/sessions). This route just
 * forwards old links/bookmarks there.
 */
export default function SecurityPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/security");
  }, [router]);

  return null;
}
