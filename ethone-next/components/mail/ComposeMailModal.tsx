"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Paperclip, Sparkles, Send, Loader2, Shuffle } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Button from "@/components/ui/Button";
import Select, { type SelectOption } from "@/components/ui/Select";
import Input from "@/components/Input";
import TextArea from "@/components/Textarea";
import { type MailAlias } from "@/lib/hooks/useMail";

export type ComposeState = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  attachments: { filename: string; size: number; mime_type: string; content: string }[];
  scheduledAt?: string;
  aliasId?: string;
};

type ComposeMailModalProps = {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ComposeState>;
  onSend: (state: ComposeState) => Promise<void> | void;
  onSave?: (state: ComposeState) => Promise<void> | void;
  onAiAssist?: (body: string) => Promise<string> | void;
  loading?: boolean;
  aliases?: MailAlias[];
  createAlias?: (input: string | { alias?: string; display_name?: string; random?: boolean }) => Promise<MailAlias | null | undefined>;
};

export default function ComposeMailModal({
  open,
  onClose,
  initial,
  onSend,
  onSave,
  onAiAssist,
  loading,
  aliases = [],
  createAlias,
}: ComposeMailModalProps) {
  const i18n = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [to, setTo] = useState<string[]>(initial?.to ?? []);
  const [toInput, setToInput] = useState("");
  const [cc, setCc] = useState<string[]>(initial?.cc ?? []);
  const [ccInput, setCcInput] = useState("");
  const [bcc, setBcc] = useState<string[]>(initial?.bcc ?? []);
  const [bccInput, setBccInput] = useState("");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [attachments, setAttachments] = useState(initial?.attachments ?? []);
  const [aiLoading, setAiLoading] = useState(false);

  const [fromAliasId, setFromAliasId] = useState<string>(initial?.aliasId ?? "");
  const [newAliasInput, setNewAliasInput] = useState("");
  const [showAliasCreate, setShowAliasCreate] = useState(false);
  const [aliasLoading, setAliasLoading] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const aliasInitRef = useRef(false);

  const aliasOptions = useMemo<SelectOption[]>(() => {
    const list = aliases.map((a) => ({
      id: a.id,
      label: `${a.alias}${a.display_name ? ` · ${a.display_name}` : ""}`,
    }));
    if (createAlias) {
      list.push({
        id: "new",
        label: `+ ${i18n("newAlias") || "Nouvelle adresse"}`,
      });
    }
    return list;
  }, [aliases, createAlias, i18n]);

  useEffect(() => {
    if (!open) {
      aliasInitRef.current = false;
      return;
    }
    if (aliasInitRef.current) return;
    aliasInitRef.current = true;

    if (aliases.length && !fromAliasId) {
      const primary = aliases.find((a) => a.is_primary) ?? aliases[0];
      setFromAliasId(primary.id);
      setShowAliasCreate(false);
    } else if (!aliases.length) {
      setShowAliasCreate(true);
    }
  }, [open, aliases, fromAliasId]);

  useEffect(() => {
    if (!open) {
      setFromAliasId(initial?.aliasId ?? "");
      setNewAliasInput("");
      setShowAliasCreate(false);
      setAliasError(null);
      setAliasLoading(false);
      aliasInitRef.current = false;
    }
  }, [open, initial?.aliasId]);

  function addTag(list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) {
    const value = input.trim();
    if (!value) return;
    setList([...list, value]);
    setInput("");
  }

  function removeTag(list: string[], setList: (v: string[]) => void, index: number) {
    setList(list.filter((_, i) => i !== index));
  }

  function handleKeyDown(
    e: React.KeyboardEvent,
    list: string[],
    setList: (v: string[]) => void,
    input: string,
    setInput: (v: string) => void,
  ) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(list, setList, input, setInput);
    } else if (e.key === "Backspace" && !input && list.length) {
      setList(list.slice(0, -1));
    }
  }

  function handleFileChange(files: FileList | null) {
    if (!files) return;
    Array.from(files)
      .slice(0, 10)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = String(reader.result || "").split(",")[1] || "";
          setAttachments((prev) => [
            ...prev,
            { filename: file.name, size: file.size, mime_type: file.type || "application/octet-stream", content: base64 },
          ]);
        };
        reader.readAsDataURL(file);
      });
  }

  async function handleAi() {
    if (!onAiAssist || !body.trim()) return;
    setAiLoading(true);
    try {
      const improved = await onAiAssist(body);
      if (improved) setBody(improved);
    } finally {
      setAiLoading(false);
    }
  }

  function handleGenerateRandom() {
    const local = `u-${Math.random().toString(36).slice(2, 8)}`;
    setNewAliasInput(local);
    setAliasError(null);
  }

  async function handleCreateAlias() {
    if (!createAlias || !newAliasInput.trim()) return;
    setAliasLoading(true);
    setAliasError(null);
    try {
      const raw = newAliasInput.trim().toLowerCase();
      const full = raw.includes("@") ? raw : `${raw}@ethone.dev`;
      const created = await createAlias(full);
      if (created?.id) {
        setFromAliasId(created.id);
        setShowAliasCreate(false);
        setNewAliasInput("");
      } else {
        setAliasError(i18n("aliasUnavailable") || "Cet alias n'est pas disponible.");
      }
    } catch (err) {
      setAliasError(String(err));
    } finally {
      setAliasLoading(false);
    }
  }

  async function handleCreateRandomAlias() {
    if (!createAlias) return;
    setAliasLoading(true);
    setAliasError(null);
    try {
      const created = await createAlias({ random: true });
      if (created?.id) {
        setFromAliasId(created.id);
        setShowAliasCreate(false);
        setNewAliasInput("");
      } else {
        setAliasError(i18n("aliasCreationFailed") || "Impossible de créer un alias aléatoire.");
      }
    } catch (err) {
      setAliasError(String(err));
    } finally {
      setAliasLoading(false);
    }
  }

  async function handleSend() {
    if (!to.length && !cc.length && !bcc.length) return;
    if (!fromAliasId) return;
    await onSend({ to, cc, bcc, subject, body, attachments, aliasId: fromAliasId });
    if (!loading) onClose();
  }

  function handleClose() {
    onClose();
  }

  const hasAliases = aliases.length > 0;
  const canSend = (to.length || cc.length || bcc.length) && fromAliasId;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed bottom-4 right-4 z-50 flex h-[min(640px,90vh)] max-h-[90vh] w-[min(560px,96vw)] flex-col overflow-hidden rounded-2xl border border-[var(--text-primary)]/[0.08] bg-zinc-950/95 shadow-2xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--text-primary)]/[0.06] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{i18n("newMessage") || "Nouveau message"}</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Fields */}
            <div className="shrink-0 space-y-1 border-b border-[var(--text-primary)]/[0.06] px-4 py-2">
              {/* From / alias */}
              <div className="flex flex-col gap-1 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm font-medium text-[var(--text-muted)]">{i18n("from") || "De"}</span>
                  {hasAliases ? (
                    <Select
                      value={fromAliasId || (showAliasCreate ? "new" : "")}
                      onChange={(value) => {
                        if (value === "new") {
                          setFromAliasId("");
                          setShowAliasCreate(true);
                          setAliasError(null);
                        } else {
                          setFromAliasId(value);
                          setShowAliasCreate(false);
                        }
                      }}
                      options={aliasOptions}
                      placeholder={i18n("selectAlias") || "Choisir une adresse"}
                      aria-label={i18n("from") || "De"}
                      className="min-w-0 flex-1"
                    />
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">{i18n("noAlias") || "Aucune adresse"}</span>
                  )}
                </div>

                {showAliasCreate && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Input
                      type="text"
                      value={newAliasInput}
                      onChange={(e) => setNewAliasInput(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateAlias();
                        }
                      }}
                      placeholder={i18n("aliasPlaceholder") || "votre-nom"}
                      disabled={aliasLoading}
                      inputSize="compact"
                      className="min-w-0 flex-1"
                    />
                    <span className="text-sm text-[var(--text-muted)]">@ethone.dev</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateRandom}
                      disabled={aliasLoading}
                      leftIcon={<Shuffle className="h-3 w-3" />}
                      className="rounded-md px-2 py-1 text-[var(--text-primary)]"
                    >
                      {i18n("random") || "Aléatoire"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCreateRandomAlias}
                      disabled={aliasLoading}
                      className="rounded-md px-2 py-1 text-[var(--text-primary)]"
                    >
                      {i18n("randomFull") || "Tout aléatoire"}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleCreateAlias}
                      disabled={aliasLoading || !newAliasInput.trim()}
                      isLoading={aliasLoading}
                      className="rounded-md px-2 py-1"
                    >
                      {i18n("create") || "Créer"}
                    </Button>
                  </div>
                )}

                {aliasError && <p className="text-sm text-rose-400">{aliasError}</p>}
              </div>

              <div className="flex items-center gap-2 py-2.5">
                <span className="shrink-0 text-sm font-medium text-[var(--text-muted)]">{i18n("to") || "À"}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {to.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="flex items-center gap-1 rounded-md bg-[--accent-primary] px-2 py-1 text-sm text-[--accent-primary]"
                    >
                      {t}
                      <button type="button" onClick={() => removeTag(to, setTo, i)} className="text-[var(--accent-primary)] hover:text-[var(--text-primary)]">
                        &times;
                      </button>
                    </span>
                  ))}
                  <Input
                    type="text"
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, to, setTo, toInput, setToInput)}
                    placeholder={to.length ? "" : i18n("emailPlaceholder")}
                    inputSize="compact"
                    className="min-w-0 flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2.5">
                <span className="shrink-0 text-sm font-medium text-[var(--text-muted)]">{i18n("cc") || "Cc"}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {cc.map((c, i) => (
                    <span
                      key={`${c}-${i}`}
                      className="flex items-center gap-1 rounded-md bg-[var(--text-primary)]/[0.06] px-2 py-1 text-sm text-[var(--text-primary)]"
                    >
                      {c}
                      <button type="button" onClick={() => removeTag(cc, setCc, i)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        &times;
                      </button>
                    </span>
                  ))}
                  <Input
                    type="text"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, cc, setCc, ccInput, setCcInput)}
                    inputSize="compact"
                    className="min-w-0 flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2.5">
                <span className="shrink-0 text-sm font-medium text-[var(--text-muted)]">{i18n("bcc") || "Cci"}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {bcc.map((b, i) => (
                    <span
                      key={`${b}-${i}`}
                      className="flex items-center gap-1 rounded-md bg-[var(--text-primary)]/[0.06] px-2 py-1 text-sm text-[var(--text-primary)]"
                    >
                      {b}
                      <button type="button" onClick={() => removeTag(bcc, setBcc, i)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        &times;
                      </button>
                    </span>
                  ))}
                  <Input
                    type="text"
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, bcc, setBcc, bccInput, setBccInput)}
                    inputSize="compact"
                    className="min-w-0 flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2.5">
                <span className="shrink-0 text-sm font-medium text-[var(--text-muted)]">{i18n("subject") || "Objet"}</span>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="min-w-0 flex-1"
                />
              </div>
            </div>

            {/* Editor */}
            <div className="flex min-h-0 flex-1 p-4">
              <TextArea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={i18n("composePlaceholder") || "Écrivez votre message..."}
                className="h-full w-full"
                inputClassName="resize-none overflow-y-auto"
              />
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {attachments.map((a, i) => (
                  <span
                    key={`${a.filename}-${i}`}
                    className="flex items-center gap-1 rounded-md border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] px-2 py-1 text-xs text-[var(--text-primary)]"
                  >
                    {a.filename}
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--text-primary)]/[0.06] px-4 py-3">
              <div className="flex items-center gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileChange(e.target.files)} />

                {onAiAssist && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAi}
                    disabled={aiLoading}
                    className="h-9 w-9 p-0 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                )}

                {onSave && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSave({ to, cc, bcc, subject, body, attachments, aliasId: fromAliasId })}
                    disabled={loading || !fromAliasId}
                    className="rounded px-2 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {i18n("saveDraft") || "Brouillon"}
                  </Button>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSend}
                disabled={loading || !canSend}
                isLoading={loading}
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                {i18n("send") || "Envoyer"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
