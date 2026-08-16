"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Paperclip, Sparkles, Send, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";

export type ComposeState = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  attachments: { filename: string; size: number; mime_type: string; content: string }[];
  scheduledAt?: string;
};

type ComposeMailModalProps = {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ComposeState>;
  onSend: (state: ComposeState) => Promise<void> | void;
  onSave?: (state: ComposeState) => Promise<void> | void;
  onAiAssist?: (body: string) => Promise<string> | void;
  loading?: boolean;
};

export default function ComposeMailModal({
  open,
  onClose,
  initial,
  onSend,
  onSave,
  onAiAssist,
  loading,
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
    setInput: (v: string) => void
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
    Array.from(files).slice(0, 10).forEach((file) => {
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

  async function handleSend() {
    if (!to.length && !cc.length && !bcc.length) return;
    await onSend({ to, cc, bcc, subject, body, attachments });
    if (!loading) onClose();
  }

  function handleClose() {
    onClose();
  }

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
            className="fixed bottom-4 right-4 z-50 w-[min(560px,96vw)] overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/95 shadow-2xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h2 className="text-sm font-semibold text-white">{i18n("newMessage") || "Nouveau message"}</h2>
              <button
                type="button"
                onClick={handleClose}
                className="rounded p-1 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-1 border-b border-white/[0.06] px-4 py-2">
              <div className="flex items-center gap-2 py-1.5">
                <span className="shrink-0 text-[11px] font-medium text-zinc-500">{i18n("to") || "À"}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {to.map((t, i) => (
                    <span key={`${t}-${i}`} className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-300">
                      {t}
                      <button type="button" onClick={() => removeTag(to, setTo, i)} className="text-emerald-400 hover:text-emerald-200">&times;</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, to, setTo, toInput, setToInput)}
                    placeholder={to.length ? "" : i18n("emailPlaceholder")}
                    className="min-w-[4rem] flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1.5">
                <span className="shrink-0 text-[11px] font-medium text-zinc-500">{i18n("cc") || "Cc"}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {cc.map((c, i) => (
                    <span key={`${c}-${i}`} className="flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-zinc-300">
                      {c}
                      <button type="button" onClick={() => removeTag(cc, setCc, i)} className="text-zinc-400 hover:text-white">&times;</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, cc, setCc, ccInput, setCcInput)}
                    className="min-w-[4rem] flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1.5">
                <span className="shrink-0 text-[11px] font-medium text-zinc-500">{i18n("bcc") || "Cci"}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {bcc.map((b, i) => (
                    <span key={`${b}-${i}`} className="flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-zinc-300">
                      {b}
                      <button type="button" onClick={() => removeTag(bcc, setBcc, i)} className="text-zinc-400 hover:text-white">&times;</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, bcc, setBcc, bccInput, setBccInput)}
                    className="min-w-[4rem] flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1.5">
                <span className="shrink-0 text-[11px] font-medium text-zinc-500">{i18n("subject") || "Objet"}</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 outline-none"
                />
              </div>
            </div>

            {/* Editor */}
            <div className="p-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={i18n("composePlaceholder") || "Écrivez votre message..."}
                className="h-40 w-full resize-none bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
              />
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {attachments.map((a, i) => (
                  <span key={`${a.filename}-${i}`} className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-zinc-300">
                    {a.filename}
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                      className="text-zinc-500 hover:text-white"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileChange(e.target.files)} />

                {onAiAssist && (
                  <button
                    type="button"
                    onClick={handleAi}
                    disabled={aiLoading}
                    className="rounded p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-purple-400"
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </button>
                )}

                {onSave && (
                  <button
                    type="button"
                    onClick={() => onSave({ to, cc, bcc, subject, body, attachments })}
                    disabled={loading}
                    className="rounded px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    {i18n("saveDraft") || "Brouillon"}
                  </button>
                )}
              </div>

              <motion.button
                type="button"
                onClick={handleSend}
                disabled={loading || (!to.length && !cc.length && !bcc.length)}
                whileTap={{ scale: 0.97 }}
                style={{ background: "var(--accent-color, #a855f7)", color: "#ffffff" }}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {i18n("send") || "Envoyer"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
