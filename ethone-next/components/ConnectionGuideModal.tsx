"use client";

import { Check, Copy, ExternalLink, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { getConnectionGuide, type ConnectionGuide } from "@/config/connectionsGuide";
import { getIntegrationConfig, type IntegrationConfig } from "@/lib/integrations.config";
import { hapticLightImpact } from "@/lib/haptics";

function GuideSteps({
  config,
  guide,
  origin,
  copied,
  onCopy,
}: {
  config?: IntegrationConfig;
  guide?: ConnectionGuide;
  origin: string;
  copied: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  const i18n = useI18n();
  const configSteps = config?.steps;
  const guideSteps = guide?.keyGuide.steps;
  const title = config ? i18n("setupGuide", "Guide pas-à-pas") : i18n("howToGetKey", "Comment obtenir cette clé ?");
  const dashboardUrl = guide?.keyGuide.dashboardUrl;
  const dashboardText = guide?.keyGuide.linkText;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
        {dashboardUrl && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/20"
          >
            {dashboardText || i18n("openDashboard", "Ouvrir le portail")}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {configSteps && configSteps.length > 0 && (
        <ol className="list-decimal space-y-3 pl-4">
          {configSteps.map((step, idx) => {
            const copyValue =
              step.copyValueType === "callback"
                ? `${origin}${config.callbackPath}`
                : step.copyValueType === "homepage"
                  ? `${origin}/`
                  : "";
            const copyKey = `${config.id}-${step.copyValueType ?? "step"}-${idx}`;
            return (
              <li key={idx} className="text-xs leading-relaxed text-[var(--text-primary)]">
                <p className="font-medium text-[var(--text-primary)]">{step.title}</p>
                <p className="text-[var(--text-muted)]">{step.description}</p>
                {copyValue && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-2 py-1 text-[10px] text-[var(--text-muted)]">
                      {copyValue}
                    </code>
                    <button
                      type="button"
                      onClick={() => onCopy(copyValue, copyKey)}
                      className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                      aria-label={i18n("copy", "Copier")}
                    >
                      {copied === copyKey ? <Check className="h-3.5 w-3.5 text-[var(--accent-primary)]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {guideSteps && guideSteps.length > 0 && (
        <ol className="list-decimal space-y-2 pl-4">
          {guideSteps.map((step, idx) => (
            <li key={idx} className="text-xs leading-relaxed text-[var(--text-muted)]">
              {step}
            </li>
          ))}
        </ol>
      )}
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

export default function ConnectionGuideModal({ isOpen, onClose, integrationId, origin, copied, onCopy }: ConnectionGuideModalProps) {
  const i18n = useI18n();
  const config = getIntegrationConfig(integrationId);
  const guide = getConnectionGuide(integrationId);
  const hasGuide = !!(config?.steps?.length || guide?.keyGuide.steps?.length);

  if (!hasGuide) return null;

  const title = config ? i18n("connectConfigure", "Configurer") : i18n("howToGetKey", "Comment obtenir");
  const description = config ? i18n("setupGuideDescription", "Suivez les étapes pour connecter ce service.") : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-[var(--background)]/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-t-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-2xl backdrop-blur-[var(--panel-blur)] sm:rounded-2xl"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--accent-primary)]/5 blur-3xl" aria-hidden="true" />

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
                {description && <p className="text-xs text-[var(--text-muted)]">{description}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  hapticLightImpact();
                  onClose();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)]"
                aria-label={i18n("close", "Fermer")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {config && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <a
                  href={config.developerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/20"
                >
                  {config.developerButtonLabel}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {config.docsUrl && (
                  <a
                    href={config.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]/40"
                  >
                    {i18n("documentation", "Documentation")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            <GuideSteps config={config} guide={guide} origin={origin} copied={copied} onCopy={onCopy} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
