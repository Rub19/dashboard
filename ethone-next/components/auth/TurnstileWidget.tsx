"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  action: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(script);
  });
  return scriptLoadingPromise;
}

// Widget rendu explicitement (pas via data-attributes auto-render) pour garder
// le widgetId et pouvoir le reset() après chaque tentative de soumission — un
// token Turnstile est single-use, donc un formulaire qui reste monté après un
// échec (email déjà pris, mauvais mot de passe...) a besoin d'un nouveau token
// avant de pouvoir réessayer.
const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  ({ siteKey, action, onToken, onExpire, className }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      let cancelled = false;
      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action,
            callback: onToken,
            "expired-callback": onExpire,
          });
        })
        .catch(() => {
          // Script blocked/offline: the form's own submit-time validation
          // (no token captured) is what surfaces this to the user.
        });
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteKey, action]);

    return <div ref={containerRef} className={className} />;
  }
);

TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
