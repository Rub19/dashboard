"use client";

import { Check, Copy, ExternalLink, X, BookOpen, Compass, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
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
  const i18n = useI18n();
  const configSteps = config?.steps;
  const guideSteps = guide?.keyGuide.steps;
  const title = config ? "Guide de configuration pas-à-pas" : "Comment obtenir vos accès & clés API ?";
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
        {dashboardUrl && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-bold text-[var(--accent-contrast)] shadow-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <span>{dashboardText || "Ouvrir le portail"}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Redirect URI Box (if applicable) */}
      {(config?.requiresRedirectUri || config?.category === "oauth" || guide?.badge === "OAUTH") && (
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-sunken)] p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              URI de redirection (Redirect / Callback URI)
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
                  <span>Copier l'URI</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            Collez cette URL exacte dans le champ "Redirect URIs" de votre console développeur :
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
          <div className="space-y-2">
            {configSteps.map((step, idx) => {
              const copyValue =
                step.copyValueType === "callback"
                  ? `${origin}${config.callbackPath}`
                  : step.copyValueType === "homepage"
                  ? `${origin}/`
                  : "";
              const copyKey = `${config.id}-${step.copyValueType ?? "step"}-${idx}`;
              return (
                <div
                  key={idx}
                  className="flex gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-xs"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 font-mono text-xs font-bold text-[var(--accent-primary)]">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-[var(--text-primary)]">{step.title}</p>
                    <p className="text-[var(--text-muted)] leading-relaxed">{step.description}</p>
                    {copyValue && (
                      <div className="mt-2 flex items-center gap-2">
                        <code className="flex-1 truncate rounded-lg border border-[var(--panel-border)] bg-black/50 px-2.5 py-1 font-mono text-[10px] text-[var(--accent-primary)]">
                          {copyValue}
                        </code>
                        <button
                          type="button"
                          onClick={() => onCopy(copyValue, copyKey)}
                          className="flex items-center gap-1 rounded-md bg-[var(--surface-raised)] border border-[var(--panel-border)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                        >
                          {copied === copyKey ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copied === copyKey ? "Copié" : "Copier"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : guideSteps && guideSteps.length > 0 ? (
          <div className="space-y-2">
            {guideSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 font-mono text-xs font-bold text-[var(--accent-primary)]">
                  {idx + 1}
                </span>
                <p className="text-[var(--text-primary)] leading-relaxed self-center">{step}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ConnectionGuideModalProps = {
  isOpen: boolean;
  onClose: () => void;
  integrationId: string;
  origin: string;
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
  const i18n = useI18n();
  const config = getIntegrationConfig(integrationId);
  const guide = getConnectionGuide(integrationId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Centered Container */}
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/98 shadow-2xl backdrop-blur-2xl"
            >
              {/* Header */}
              <div className="flex shrink-0 items-start justify-between border-b border-[var(--panel-border)] p-4 sm:p-5 bg-black/20">
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
              <div className="border-t border-[var(--panel-border)] p-4 bg-black/40 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:opacity-90 transition-all cursor-pointer"
                >
                  J'ai configuré mes accès
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
