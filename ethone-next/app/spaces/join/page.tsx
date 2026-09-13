"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Check, X, Loader2 } from "lucide-react";
import { fetchWorker, WorkerError } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import FlatCard from "@/components/FlatCard";
import Button from "@/components/ui/Button";

type ResolveData = {
  spaceName: string;
  invitedEmail: string;
  status: "pending" | "active" | "declined" | "revoked";
  expired: boolean;
};

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { session, loading: authLoading } = useAuth();

  const [resolveData, setResolveData] = useState<ResolveData | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    if (!token) {
      setResolveError("Lien d'invitation invalide.");
      setResolving(false);
      return;
    }
    fetchWorker(`/api/shared-spaces/join?token=${encodeURIComponent(token)}`)
      .then((res) => setResolveData(res.data as ResolveData))
      .catch((err) => setResolveError(err instanceof WorkerError ? err.message : "Impossible de charger cette invitation."))
      .finally(() => setResolving(false));
  }, [token]);

  useEffect(() => {
    if (authLoading || !token) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(`/spaces/join?token=${token}`)}`);
    }
  }, [authLoading, session, token, router]);

  const act = useCallback(
    async (action: "accept" | "decline") => {
      setActing(true);
      setActionError(null);
      try {
        const res = await fetchWorker(`/api/shared-spaces/join/${action}`, {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setResult(action === "accept" ? "accepted" : "declined");
        if (action === "accept") {
          const spaceId = (res.data as { member?: { space_id?: string } })?.member?.space_id;
          setTimeout(() => router.replace(spaceId ? `/spaces/${spaceId}` : "/spaces"), 1200);
        }
      } catch (err) {
        setActionError(err instanceof WorkerError ? err.message : "Une erreur est survenue.");
      } finally {
        setActing(false);
      }
    },
    [token, router]
  );

  if (authLoading || resolving || (!session && token)) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto os-scroll">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto os-scroll">
      <div className="w-full max-w-sm sm:max-w-md">
        <FlatCard>
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              <Users className="h-6 w-6" />
            </span>

            {resolveError && <p className="text-sm text-rose-400">{resolveError}</p>}

            {resolveData && !resolveError && (
              <>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">Invitation à un espace partagé</h1>
                <p className="text-sm text-[var(--text-muted)]">
                  Vous êtes invité(e) à rejoindre <strong className="text-[var(--text-primary)]">{resolveData.spaceName}</strong>, invité en tant que <span className="font-mono">{resolveData.invitedEmail}</span>.
                </p>

                {resolveData.expired && (
                  <p className="text-sm text-amber-400">Cette invitation a expiré. Demandez-en une nouvelle à la personne qui vous a invité(e).</p>
                )}

                {!resolveData.expired && resolveData.status !== "pending" && (
                  <p className="text-sm text-[var(--text-muted)]">
                    {resolveData.status === "active" ? "Cette invitation a déjà été acceptée." : "Cette invitation n'est plus disponible."}
                  </p>
                )}

                {!resolveData.expired && resolveData.status === "pending" && result === null && (
                  <div className="mt-2 flex w-full gap-2">
                    <Button type="button" variant="secondary" size="md" className="flex-1" disabled={acting} onClick={() => act("decline")} leftIcon={<X className="h-4 w-4" />}>
                      Refuser
                    </Button>
                    <Button type="button" variant="primary" size="md" className="flex-1" disabled={acting} onClick={() => act("accept")} leftIcon={<Check className="h-4 w-4" />}>
                      Accepter
                    </Button>
                  </div>
                )}

                {result === "accepted" && <p className="text-sm text-emerald-400">Invitation acceptée — redirection...</p>}
                {result === "declined" && <p className="text-sm text-[var(--text-muted)]">Invitation refusée.</p>}
                {actionError && <p className="text-sm text-rose-400">{actionError}</p>}
              </>
            )}
          </div>
        </FlatCard>
      </div>
    </div>
  );
}

export default function SpaceJoinPage() {
  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden p-4 sm:p-6">
      <Suspense
        fallback={
          <div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto os-scroll">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        }
      >
        <JoinContent />
      </Suspense>
    </div>
  );
}
