import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { errorText, tr } from "./i18n";
import { Button } from "./ui";

export const EMBED_EVENT = "ethone-embed";
export interface EmbedTarget { id: string; name: string }

export default function EmbeddedApp({ target, onBack }: { target: EmbedTarget; onBack: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = () => {
    const rect = box.current?.getBoundingClientRect();
    const scale = window.devicePixelRatio;
    return rect ? { x: Math.round(rect.left * scale), y: Math.round(rect.top * scale), width: Math.round(rect.width * scale), height: Math.round(rect.height * scale) } : { x: 0, y: 0, width: 0, height: 0 };
  };
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useLayoutEffect(() => {
    let active = true;
    setReady(false);
    setError(null);
    invoke("embed_open", { id: target.id, ...area() }).then(() => active && setReady(true), (reason) => active && setError(errorText(reason)));
    return () => {
      active = false;
      void invoke("embed_hide", { id: target.id }).catch(() => undefined);
    };
  }, [target.id]);

  useEffect(() => {
    if (!ready || !box.current) return;
    const place = () => void invoke("embed_resize", { id: target.id, ...area() }).catch(() => undefined);
    const observer = new ResizeObserver(place);
    observer.observe(box.current);
    window.addEventListener("resize", place);
    const watch = setInterval(() => {
      void invoke<boolean>("embed_alive", { id: target.id }).then((alive) => {
        if (!alive) onBackRef.current();
      }).catch(() => undefined);
    }, 1500);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      clearInterval(watch);
    };
  }, [ready, target.id]);

  const apart = () => {
    void invoke("embed_detach", { id: target.id }).finally(() => onBackRef.current());
  };

  return (
    <div className="embed-view">
      <header className="embed-bar">
        <Button onClick={onBack}><ArrowLeft size={14} />{tr("Revenir à Ethone", "Back to Ethone")}</Button>
        <b>{target.name}</b>
        <Button disabled={!ready} onClick={apart}><ExternalLink size={14} />{tr("Ouvrir à part", "Open separately")}</Button>
      </header>
      <div className="embed-body" ref={box}>
        {error ? <p role="alert" className="bad">{error}</p> : !ready && <p className="muted" role="status">{tr(`Ouverture de ${target.name}…`, `Opening ${target.name}…`)}</p>}
      </div>
    </div>
  );
}
