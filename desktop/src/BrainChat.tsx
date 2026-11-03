import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Check, Copy, RotateCcw, Trash2 } from "lucide-react";
import { apiData } from "./api";
import { errorText, tr } from "./i18n";
import { stepEnter } from "./motion";
import { copyText } from "./qol";
import { readJson, write } from "./settings";
import { Button } from "./ui";

interface ChatMessage { role: "user" | "assistant"; content: string }
type OrbState = "idle" | "thinking" | "speaking";

const CHAT_KEY = "ethone-brain-chat";
const REVEAL_TICK = 28;
const REVEAL_TICKS = 150;

const SUGGESTIONS = [
  () => tr("Écris un mail pour décaler un rendez-vous", "Write an email to move a meeting"),
  () => tr("Aide-moi à organiser ma semaine", "Help me plan my week"),
  () => tr("Explique-moi un sujet simplement", "Explain a topic simply"),
  () => tr("Traduis un texte en anglais", "Translate a text into English"),
];

function Orb({ state, size }: { state: OrbState; size: number }) {
  return <span className="brain-orb" data-state={state} style={{ width: size, height: size }} aria-hidden="true"><i /><i /><i /></span>;
}

function Answer({ text, reveal, onTick, onDone }: { text: string; reveal: boolean; onTick: () => void; onDone: () => void }) {
  const reduced = useReducedMotion();
  const tokens = useRef(text.split(/(\s+)/));
  const [count, setCount] = useState(reveal && !reduced ? 0 : tokens.current.length);
  useEffect(() => {
    if (!reveal) return;
    const total = tokens.current.length;
    if (reduced) {
      setCount(total);
      onDone();
      return;
    }
    const step = Math.max(1, Math.ceil(total / REVEAL_TICKS));
    const timer = setInterval(() => {
      setCount((current) => Math.min(total, current + step));
      onTick();
    }, REVEAL_TICK);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, reduced]);
  const done = count >= tokens.current.length;
  useEffect(() => {
    if (reveal && done) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, done]);
  return <p onClick={() => setCount(tokens.current.length)}>{done ? text : tokens.current.slice(0, count).join("")}{!done && <span className="brain-caret" />}</p>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="brain-copy" aria-label={tr("Copier la réponse", "Copy the answer")} title={tr("Copier", "Copy")} onClick={() => {
      void copyText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }}>{copied ? <Check size={13} /> : <Copy size={13} />}</button>
  );
}

export default function BrainChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readJson<ChatMessage[]>(CHAT_KEY) ?? []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealing, setRevealing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const state: OrbState = busy ? "thinking" : revealing !== null ? "speaking" : "idle";
  const last = messages.at(-1);

  const toEnd = () => {
    const box = thread.current;
    if (box) box.scrollTop = box.scrollHeight;
  };
  useEffect(toEnd, [messages.length, busy]);

  const ask = async (history: ChatMessage[]) => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiData<{ content?: string; text?: string; message?: string; output?: string }>("api/brain/complete", "POST", { messages: history.slice(-20) });
      const answer = result.content ?? result.text ?? result.message ?? result.output ?? "";
      const stored = [...history, { role: "assistant" as const, content: answer }];
      setMessages(stored);
      setRevealing(stored.length - 1);
      write(CHAT_KEY, JSON.stringify(stored.slice(-100)));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const say = (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    write(CHAT_KEY, JSON.stringify(next.slice(-100)));
    void ask(next);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    say(input);
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      say(input);
    }
  };
  const clear = () => {
    setMessages([]);
    setRevealing(null);
    setError(null);
    write(CHAT_KEY, "[]");
  };

  return (
    <div className="brain">
      <header className="brain-top">
        <Orb state={state} size={26} />
        <span><b>Brain</b><small role="status">{state === "thinking" ? tr("Réfléchit…", "Thinking…") : state === "speaking" ? tr("Répond…", "Answering…") : tr("La conversation reste sur ce PC", "The conversation stays on this PC")}</small></span>
        {messages.length > 0 && <Button onClick={clear}><Trash2 size={14} />{tr("Effacer", "Clear")}</Button>}
      </header>

      <div className="brain-thread" ref={thread}>
        {messages.length === 0 && !busy ? (
          <div className="brain-welcome">
            <Orb state="idle" size={92} />
            <h1>{tr("Que veux-tu faire ?", "What do you want to do?")}</h1>
            <div className="brain-suggestions">{SUGGESTIONS.map((label) => <button type="button" key={label()} onClick={() => say(label())}>{label()}</button>)}</div>
          </div>
        ) : (
          <div className="brain-messages">
            {messages.map((message, index) => message.role === "user" ? (
              <motion.div key={index} className="brain-msg user" variants={stepEnter} initial="initial" animate="animate"><p>{message.content}</p></motion.div>
            ) : (
              <motion.div key={index} className="brain-msg assistant" variants={stepEnter} initial={revealing === index ? "initial" : false} animate="animate">
                <Orb state={revealing === index ? "speaking" : "idle"} size={24} />
                <Answer text={message.content} reveal={revealing === index} onTick={toEnd} onDone={() => setRevealing((current) => (current === index ? null : current))} />
                {revealing !== index && <CopyButton text={message.content} />}
              </motion.div>
            ))}
            {busy && <motion.div className="brain-msg assistant" variants={stepEnter} initial="initial" animate="animate"><Orb state="thinking" size={24} /><span className="brain-dots" role="status" aria-label={tr("Brain réfléchit", "Brain is thinking")}><i /><i /><i /></span></motion.div>}
            {error && (
              <div className="brain-failed" role="alert">
                <span>{error}</span>
                {last?.role === "user" && <Button onClick={() => void ask(messages)}><RotateCcw size={14} />{tr("Réessayer", "Retry")}</Button>}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="brain-live" aria-live="polite">{revealing === null && last?.role === "assistant" ? last.content : ""}</p>

      <form className="brain-composer" onSubmit={submit}>
        <textarea rows={1} value={input} maxLength={8000} placeholder={tr("Écris à Brain", "Message Brain")} aria-label={tr("Message pour Brain", "Message for Brain")} onChange={(event) => setInput(event.target.value)} onKeyDown={onKey} />
        <button type="submit" aria-label={tr("Envoyer", "Send")} title={tr("Envoyer (Entrée)", "Send (Enter)")} disabled={busy || !input.trim()}><ArrowUp size={16} /></button>
      </form>
    </div>
  );
}
