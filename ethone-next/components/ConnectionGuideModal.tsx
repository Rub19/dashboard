"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, ExternalLink, X, Compass, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getConnectionGuide, type ConnectionGuide } from "@/config/connectionsGuide";
import { getIntegrationConfig, type IntegrationConfig } from "@/lib/integrations.config";
import { hapticLightImpact } from "@/lib/haptics";
import ServiceIcon from "@/components/ServiceIcon";

function GuideSteps({
  integrationId,
  config,
  guide,
  origin,
  copied,
  onCopy,
}: {
  integrationId: string;
  config?: IntegrationConfig;
  guide?: ConnectionGuide;
  origin: string;
  copied: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  const configSteps = config?.steps;
  const guideSteps = guide?.keyGuide.steps;
  const dashboardUrl = config?.developerUrl || guide?.keyGuide.dashboardUrl;
  const dashboardText = config?.developerButtonLabel || guide?.keyGuide.linkText;

  // Compute default callback / redirect URI for this service
  const redirectUri = `${origin}${config?.callbackPath || `/api/auth/callback/${integrationId}`}`;

  return (
    <div className="space-y-4">
      {/* Direct Portal Link */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 p-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            Accès direct au portail développeur
          </span>
        </div>
        {dashboardUrl ? (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 transition-all shadow-sm shrink-0"
          >
            <span>{dashboardText || "Ouvrir la console"}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-[11px] text-[var(--text-muted)]">Configuration locale</span>
        )}
      </div>

      {/* Redirect URI Box (if applicable) */}
      {config?.callbackPath && (
        <div className="space-y-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              URL de redirection (Redirect URI)
            </span>
            <button
              type="button"
              onClick={() => onCopy(redirectUri, `uri-${integrationId}`)}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-raised)] border border-[var(--panel-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
            >
              {copied === `uri-${integrationId}` ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copier l&apos;URI</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            Collez cette URL exacte dans le champ &quot;Redirect URIs&quot; de votre console développeur :
          </p>
          <code className="block w-full truncate rounded-lg border border-[var(--panel-border)] bg-black/60 px-2.5 py-1.5 font-mono text-[11px] text-[var(--accent-primary)] select-all">
            {redirectUri}
          </code>
        </div>
      )}

      {/* Step-by-Step Instructions */}
      <div className="space-y-2.5">
        <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Étapes de configuration
        </h5>

        {configSteps && configSteps.length > 0 ? (
          <ol className="space-y-2.5">
            {configSteps.map((step, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-[var(--accent-contrast)]">
                  {idx + 1}
                </span>
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{step.title}</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{step.description}</p>
                  {step.copyValueType === "callback" && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-[var(--panel-border)] bg-black/50 p-2">
                      <code className="text-[11px] font-mono text-[var(--accent-primary)] truncate">
                        {redirectUri}
                      </code>
                      <button
                        type="button"
                        onClick={() => onCopy(redirectUri, `code-${idx}`)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        title="Copier"
                      >
                        {copied === `code-${idx}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : guideSteps && guideSteps.length > 0 ? (
          <ol className="space-y-2.5">
            {guideSteps.map((step, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-xs"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-[var(--accent-contrast)]">
                  {index + 1}
                </span>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-4 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Entrez simplement vos identifiants ou clé API dans le formulaire pour activer le service.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export type ConnectionGuideModalProps = {
  isOpen: boolean;
  onClose: () => void;
  integrationId: string;
  origin?: string;
  copied: string | null;
  onCopy: (value: string, key: string) => void;
};

export default function ConnectionGuideModal({
  isOpen,
  onClose,
  integrationId,
  origin,
  copied,
  onCopy,
}: ConnectionGuideModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const config = getIntegrationConfig(integrationId);
  const guide = getConnectionGuide(integrationId);

  if (!mounted || typeof document === "undefined" || !document.body) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] overflow-y-auto" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Centered Container */}
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#090d14] shadow-2xl backdrop-blur-2xl z-[1000000]"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] p-4 sm:p-5 bg-black/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] shadow-sm">
                    <ServiceIcon id={integrationId} icon="plug" className="h-5 w-5" colored />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                      Guide : {config?.name || guide?.title || integrationId}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      Instructions détaillées & URLs de redirection
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    hapticLightImpact();
                    onClose();
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 os-scroll">
                <GuideSteps
                  integrationId={integrationId}
                  config={config}
                  guide={guide}
                  origin={origin || (typeof window !== "undefined" ? window.location.origin : "https://ethone.app")}
                  copied={copied}
                  onCopy={onCopy}
                />
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--panel-border)] p-4 bg-black/50 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:opacity-90 transition-all cursor-pointer"
                >
                  J&apos;ai configuré mes accès
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
