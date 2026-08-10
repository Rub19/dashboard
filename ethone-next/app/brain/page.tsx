"use client";

import { useState, useRef, useEffect } from "react";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";

type Message = { role: "user" | "assistant"; content: string };

export default function BrainPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit() {
    const text = prompt.trim();
    if (!text || loading) return;

    setError(null);
    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt("");
    setLoading(true);

    try {
      const res = await fetchWorker("/api/brain/complete", {
        method: "POST",
        body: JSON.stringify({
          provider: "groq",
          messages: nextMessages,
        }),
      });
      const content =
        res?.data?.content || res?.data?.text || i18n("emptyResponse");
      setMessages((prev) => [...prev, { role: "assistant", content }]);
      success(i18n("sent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      showError(i18n("error"));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleClear() {
    setMessages([]);
    setError(null);
    success(i18n("deleted"));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("brainTitle")}</h1>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
          >
            <Icon name="trash-2" className="h-4 w-4" />
            {i18n("clear")}
          </button>
        )}
      </div>

      <Card3D>
        <div className="flex h-[60vh] flex-col gap-4">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                {i18n("noBrainMessages")}
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex max-w-[80%] items-start gap-2 rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-raised)] text-[var(--foreground)]"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <Icon name="brain" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-raised)] px-4 py-2.5 text-sm text-[var(--muted)]">
                  <Icon name="loader-2" className="h-4 w-4 animate-spin" />
                  <Icon name="brain" className="h-4 w-4 text-[var(--accent)]" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 border-t border-[var(--border)] pt-4"
          >
            <textarea
              id="brain-prompt"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label={i18n("askQuestion")}
              className="min-h-[2.75rem] w-full flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
              placeholder={i18n("placeholder")}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Icon name="loader-2" className="h-4 w-4 animate-spin" />
              ) : (
                <Icon name="send" className="h-4 w-4" />
              )}
              {i18n("send")}
            </button>
          </form>
        </div>
      </Card3D>
    </div>
  );
}
