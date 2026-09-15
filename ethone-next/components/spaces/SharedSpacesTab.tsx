"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Users, Plus, Crown, Trash2 } from "lucide-react";
import { useSharedSpaces } from "@/lib/hooks/useSharedSpaces";
import FlatCard from "@/components/FlatCard";
import Input from "@/components/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";
import { EASE_OUT } from "@/lib/ease";

export default function SharedSpacesTab() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { spaces, loading, error, createSpace, deleteSpace } = useSharedSpaces();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const { settings } = useSettings();
  const osReducedMotion = useReducedMotion();
  const skipEntranceAnimation = Boolean(settings.reducedMotion) || Boolean(osReducedMotion);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await createSpace(trimmed);
      setName("");
      success("Espace créé");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Échec de la création.");
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteSpace(id);
      success("Espace supprimé");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Échec de la suppression.");
    }
  }

  return (
    <div className="space-y-4">
      <FlatCard>
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold">Espaces partagés</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Partage une liste de tâches avec un proche ou ton entourage — une liste de courses, un projet commun, un calendrier familial de tâches.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Nom de l'espace (ex: Courses de la famille)"
              inputSize="compact"
              className="min-w-0 flex-1"
            />
            <Button type="button" variant="primary" size="md" onClick={add} disabled={creating} leftIcon={<Plus className="h-4 w-4" />} />
          </div>
        </div>
      </FlatCard>

      {error && <FlatCard><p className="text-sm text-[var(--danger)]">{error.message}</p></FlatCard>}

      {!loading && spaces.length === 0 && (
        <FlatCard>
          <p className="py-6 text-center text-sm text-[var(--muted)]">Aucun espace partagé pour l'instant. Crée-en un ci-dessus.</p>
        </FlatCard>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {spaces.map((space, index) => (
          <motion.div
            key={space.id}
            initial={skipEntranceAnimation ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              skipEntranceAnimation
                ? { duration: 0 }
                : { duration: 0.2, delay: Math.min(index * 0.03, 0.3), ease: EASE_OUT }
            }
          >
            <FlatCard className="cursor-pointer" onClick={() => router.push(`/spaces/${space.id}`)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{space.name}</p>
                    <p className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      {space.role === "owner" ? (
                        <>
                          <Crown className="h-3 w-3" /> Propriétaire
                        </>
                      ) : (
                        "Membre"
                      )}
                    </p>
                  </div>
                </div>
                {space.role === "owner" && (
                  <button
                    type="button"
                    aria-label="Supprimer"
                    onClick={(e) => remove(space.id, e)}
                    className="text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </FlatCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
