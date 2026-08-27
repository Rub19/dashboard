"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Paperclip,
  Sparkles,
  Send,
  Loader2,
  Shuffle,
  Maximize2,
  Minimize2,
  Trash2,
  Check,
  FileText,
  Clock,
  Plus,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Button from "@/components/ui/Button";
import Select, { type SelectOption } from "@/components/ui/Select";
import Input from "@/components/Input";
import TextArea from "@/components/Textarea";
import type { MailAlias } from "@/lib/hooks/useMail";
import { cn } from "@/lib/utils";

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

function formatFileSize(bytes: number) {
  if (!bytes || bytes === 0) return "0 Ko";
  const k = 1024;
  const sizes = ["Octets", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function ComposeMailModal({
  open,
  onClose,
  initial,
  onSend,
  onSave,
  onAiAssist,
  loading = false,
  aliases = [],
  createAlias,
}: ComposeMailModalProps) {
  const i18n = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [to, setTo] = useState<string[]>(initial?.to ?? []);
  const [toInput, setToInput] = useState("");
  const [cc, setCc] = useState<string[]>(initial?.cc ?? []);
  const [ccInput, setCcInput] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [bcc, setBcc] = useState<string[]>(initial?.bcc ?? []);
  const [bccInput, setBccInput] = useState("");
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [attachments, setAttachments] = useState(initial?.attachments ?? []);
  const [aiLoading, setAiLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [fromAliasId, setFromAliasId] = useState<string>(initial?.aliasId ?? "");
  const [newAliasInput, setNewAliasInput] = useState("");
  const [showAliasCreate, setShowAliasCreate] = useState(false);
  const [aliasLoading, setAliasLoading] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);

  // Sync initial state on open
  useEffect(() => {
    if (open) {
      setTo(initial?.to ?? []);
      setCc(initial?.cc ?? []);
      setBcc(initial?.bcc ?? []);
      setShowCc(!!(initial?.cc && initial.cc.length > 0));
      setShowBcc(!!(initial?.bcc && initial.bcc.length > 0));
      setSubject(initial?.subject ?? "");
      setBody(initial?.body ?? "");
      setAttachments(initial?.attachments ?? []);
      const primary = aliases.find((a) => a.is_primary) ?? aliases[0];
      setFromAliasId(initial?.aliasId || primary?.id || "");
    }
  }, [open, initial, aliases]);

  // Alias Options
  const aliasOptions = useMemo<SelectOption[]>(() => {
    const list = aliases.map((a) => ({
      id: a.id,
      label: `${a.alias}${a.display_name ? ` (${a.display_name})` : ""}`,
    }));
    if (createAlias) {
      list.push({
        id: "new",
        label: `+ Créer un nouvel alias...`,
      });
    }
    return list;
  }, [aliases, createAlias]);

  // Auto-save drafts every 30 seconds if modified
  useEffect(() => {
    if (!open || !onSave || (!subject && !body && to.length === 0)) return;
    const interval = setInterval(() => {
      onSave({ to, cc, bcc, subject, body, attachments, aliasId: fromAliasId });
      setLastSaved(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [open, onSave, to, cc, bcc, subject, body, attachments, fromAliasId]);

  function addTag(list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) {
    const value = input.trim().replace(/,$/, "");
    if (!value) return;
    if (!list.includes(value)) {
      setList([...list, value]);
    }
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
    setInput: (v: string) => void
  ) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (input.trim()) {
        e.preventDefault();
        addTag(list, setList, input, setInput);
      }
    } else if (e.key === "Backspace" && !input && list.length > 0) {
      setList(list.slice(0, -1));
    }
  }

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = String(reader.result || "").split(",")[1] || "";
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            size: file.size,
            mime_type: file.type || "application/octet-stream",
            content: base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

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
        setAliasError("Cet alias n'est pas disponible.");
      }
    } catch (err) {
      setAliasError(String(err));
    } finally {
      setAliasLoading(false);
    }
  }

  async function handleSend() {
    // Add any remaining text in inputs
    const finalTo = [...to];
    if (toInput.trim() && !finalTo.includes(toInput.trim())) finalTo.push(toInput.trim());

    if (finalTo.length === 0 && cc.length === 0 && bcc.length === 0) return;
    if (!fromAliasId) return;

    await onSend({
      to: finalTo,
      cc,
      bcc,
      subject: subject.trim() || "(Sans objet)",
      body,
      attachments,
      aliasId: fromAliasId,
    });
  }

  // Global Ctrl+Enter to send
  function handleFormKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[var(--z-modal)] pointer-events-none flex items-end justify-end p-4 sm:p-6"
        onKeyDown={handleFormKeyDown}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className={cn(
            "pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)]/[0.2] bg-[var(--bg-main)]/[0.95] shadow-2xl backdrop-blur-2xl transition-all duration-200",
            isFullscreen
              ? "fixed inset-4 z-50 rounded-3xl"
              : "h-[min(650px,85vh)] w-[min(600px,94vw)]"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.4] px-4 py-3 select-none">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold text-xs">
                @
              </span>
              <h2 className="text-xs font-bold text-[var(--text-primary)]">
                {subject ? subject : "Nouveau message"}
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsFullscreen((f) => !f)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)] transition-colors"
                title={isFullscreen ? "Réduire" : "Plein écran"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)] transition-colors"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="shrink-0 space-y-1.5 border-b border-[var(--panel-border)]/[0.1] p-3 text-xs">
            {/* From (Alias) */}
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 font-semibold text-[var(--text-muted)]">De :</span>
              {aliases.length > 0 ? (
                <div className="flex-1">
                  <Select
                    value={fromAliasId || (showAliasCreate ? "new" : "")}
                    onChange={(val) => {
                      if (val === "new") {
                        setShowAliasCreate(true);
                      } else {
                        setFromAliasId(val);
                        setShowAliasCreate(false);
                      }
                    }}
                    options={aliasOptions}
                    className="w-full text-xs"
                  />
                </div>
              ) : (
                <span className="text-[var(--text-muted)]">Aucun alias configuré</span>
              )}
            </div>

            {/* Inline Alias Creation */}
            {showAliasCreate && (
              <div className="ml-14 flex items-center gap-2 pt-1">
                <Input
                  type="text"
                  value={newAliasInput}
                  onChange={(e) => setNewAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                  placeholder="nouvel-alias"
                  inputSize="compact"
                  className="flex-1 text-xs"
                />
                <span className="text-[var(--text-muted)]">@ethone.dev</span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateAlias}
                  disabled={!newAliasInput.trim() || aliasLoading}
                  isLoading={aliasLoading}
                >
                  Créer
                </Button>
              </div>
            )}

            {/* To Field */}
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 font-semibold text-[var(--text-muted)]">À :</span>
              <div className="flex flex-1 flex-wrap items-center gap-1.5 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--input-bg-focus)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_18%,transparent),0_0_16px_-4px_var(--glow-color)] transition-all duration-180">
                {to.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="flex items-center gap-1 rounded-lg bg-[var(--accent-primary)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent-primary)]"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(to, setTo, i)}
                      className="hover:text-[var(--text-primary)]"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, to, setTo, toInput, setToInput)}
                  onBlur={() => addTag(to, setTo, toInput, setToInput)}
                  placeholder={to.length === 0 ? "destinataire@exemple.com" : ""}
                  className="flex-1 min-w-[120px] bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none border-0 p-0"
                />
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="hover:text-[var(--text-primary)] px-1"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="hover:text-[var(--text-primary)] px-1"
                    >
                      Cci
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* CC Field */}
            {showCc && (
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 font-semibold text-[var(--text-muted)]">Cc :</span>
                <div className="flex flex-1 flex-wrap items-center gap-1.5 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--input-bg-focus)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_18%,transparent),0_0_16px_-4px_var(--glow-color)] transition-all duration-180">
                  {cc.map((c, i) => (
                    <span
                      key={`${c}-${i}`}
                      className="flex items-center gap-1 rounded-lg bg-[var(--panel-border)]/[0.2] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => removeTag(cc, setCc, i)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, cc, setCc, ccInput, setCcInput)}
                    onBlur={() => addTag(cc, setCc, ccInput, setCcInput)}
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none border-0 p-0"
                  />
                </div>
              </div>
            )}

            {/* BCC Field */}
            {showBcc && (
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 font-semibold text-[var(--text-muted)]">Cci :</span>
                <div className="flex flex-1 flex-wrap items-center gap-1.5 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--input-bg-focus)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_18%,transparent),0_0_16px_-4px_var(--glow-color)] transition-all duration-180">
                  {bcc.map((b, i) => (
                    <span
                      key={`${b}-${i}`}
                      className="flex items-center gap-1 rounded-lg bg-[var(--panel-border)]/[0.2] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]"
                    >
                      {b}
                      <button
                        type="button"
                        onClick={() => removeTag(bcc, setBcc, i)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, bcc, setBcc, bccInput, setBccInput)}
                    onBlur={() => addTag(bcc, setBcc, bccInput, setBccInput)}
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none border-0 p-0"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 font-semibold text-[var(--text-muted)]">Objet :</span>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet du message"
                inputSize="compact"
                className="flex-1 text-xs"
              />
            </div>
          </div>

          {/* Editor Body */}
          <div className="relative flex min-h-0 flex-1 p-3">
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Rédigez votre message ici..."
              className="h-full w-full"
              inputClassName="resize-none font-sans text-xs leading-relaxed text-[var(--text-primary)] [scrollbar-width:thin]"
            />

            {/* Drag & drop overlay indicator */}
            {isDragOver && (
              <div className="absolute inset-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--accent-primary)] bg-[var(--bg-main)]/90 backdrop-blur-sm">
                <p className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-primary)]">
                  <Paperclip className="h-5 w-5" />
                  Déposez les pièces jointes ici
                </p>
              </div>
            )}
          </div>

          {/* Attachments Pills */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.2] p-2.5">
              {attachments.map((a, i) => (
                <div
                  key={`${a.filename}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.6] px-2.5 py-1 text-xs text-[var(--text-primary)]"
                >
                  <Paperclip className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                  <span className="truncate max-w-[150px] font-medium">{a.filename}</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    ({formatFileSize(a.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                    className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Bar */}
          <div className="flex items-center justify-between border-t border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.4] px-4 py-3 select-none">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Paperclip className="h-4 w-4" />}
                className="text-xs"
                title="Ajouter des fichiers"
              >
                Joindre
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {onAiAssist && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAi}
                  disabled={aiLoading || !body.trim()}
                  leftIcon={aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-purple-400" />}
                  className="text-xs text-purple-300 hover:text-purple-200"
                  title="Améliorer le message avec l'IA"
                >
                  IA Assistant
                </Button>
              )}

              {lastSaved && (
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)]">
                  <Clock className="h-3 w-3" />
                  Enregistré à {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onSave && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSave({ to, cc, bcc, subject, body, attachments, aliasId: fromAliasId })}
                  disabled={loading}
                  className="text-xs"
                >
                  Brouillon
                </Button>
              )}

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSend}
                disabled={loading || (!to.length && !toInput.trim()) || !fromAliasId}
                isLoading={loading}
                leftIcon={<Send className="h-3.5 w-3.5" />}
                className="shadow-md shadow-[var(--accent-primary)]/20"
              >
                <span>Envoyer</span>
                <kbd className="hidden sm:inline-block ml-1 rounded bg-white/20 px-1 py-0.2 font-mono text-[9px] text-white">
                  Ctrl+Enter
                </kbd>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
