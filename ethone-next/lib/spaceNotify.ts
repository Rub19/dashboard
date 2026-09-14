import { fetchWorker } from "@/lib/api";

// Fire-and-forget: called right after a shared-space write already
// succeeded in Supabase. The Worker no-ops if the space isn't linked to a
// Discord channel, and never throws even if the bot is unreachable — this
// call must never turn an already-successful write into a visible error.
export function notifySpaceActivity(
  spaceId: string,
  kind: "task" | "event" | "note",
  action: "created" | "completed",
  title: string,
): void {
  void fetchWorker("/api/shared-spaces/notify", {
    method: "POST",
    body: JSON.stringify({ space_id: spaceId, kind, action, title }),
  }).catch(() => {});
}
