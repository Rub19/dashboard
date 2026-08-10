"use client";

import { useState } from "react";
import { fetchWorker } from "@/lib/api";
import Card3D from "@/components/Card3D";
import { Brain, Send, Loader2 } from "lucide-react";

export default function BrainPage() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker("/api/brain/complete", {
        method: "POST",
        body: JSON.stringify({
          provider: "groq",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      setAnswer(res?.data?.content || res?.data?.text || "Réponse vide");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Brain</h1>
      <Card3D>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium" htmlFor="brain-prompt">
            Poser une question
          </label>
          <textarea
            id="brain-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            placeholder="Demandez quelque chose à Brain..."
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer
          </button>
        </form>
      </Card3D>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error}</p>
        </Card3D>
      )}

      {answer && (
        <Card3D>
          <div className="flex items-start gap-3">
            <Brain className="mt-1 h-5 w-5 text-[var(--accent)]" />
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
          </div>
        </Card3D>
      )}
    </div>
  );
}
