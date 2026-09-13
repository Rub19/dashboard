"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";

export default function InviteMemberDialog({
  isOpen,
  onClose,
  onInvite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string) => Promise<{ member: unknown; sent: boolean } | null>;
}) {
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showError("Adresse e-mail invalide.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await onInvite(trimmed);
      if (result?.sent) {
        success("Invitation envoyée", `Un e-mail a été envoyé à ${trimmed}.`);
      } else {
        success("Invitation créée", "Le lien a été généré (l'envoi d'e-mail n'est pas configuré).");
      }
      setEmail("");
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Échec de l'invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inviter quelqu'un">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          La personne recevra un e-mail avec un lien pour rejoindre cet espace. Elle devra se connecter (ou créer un compte) avec cette adresse pour accepter.
        </p>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="ami@exemple.com"
          icon="mail"
          aria-label="Adresse e-mail"
        />
        <Button type="button" variant="primary" size="md" className="w-full" disabled={submitting} onClick={submit} leftIcon={<Mail className="h-4 w-4" />}>
          Envoyer l'invitation
        </Button>
      </div>
    </Modal>
  );
}
