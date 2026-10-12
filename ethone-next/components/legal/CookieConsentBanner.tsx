"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, SlidersHorizontal, Check, X, ChevronRight } from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { getCookieConsent, saveCookieConsent } from "@/lib/cookie-consent";
import { SPRING_PANEL } from "@/lib/ease";

interface BannerCopy {
  title: string;
  desc: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
  saveChoices: string;
  learnMore: string;
  customTitle: string;
  customDesc: string;
  necessaryTitle: string;
  necessaryBadge: string;
  necessaryDesc: string;
  preferencesTitle: string;
  preferencesDesc: string;
  analyticsTitle: string;
  analyticsDesc: string;
  back: string;
}

const COPY: Record<string, BannerCopy> = {
  fr: {
    title: "Respect de votre vie privée et gestion des cookies",
    desc: "ETHONE utilise des traceurs et du stockage local strictement nécessaires pour l'authentification sécurisée, la synchronisation du bot et l'intégrité de la plateforme. Aucun cookie publicitaire ni traceur commercial tiers n'est utilisé.",
    acceptAll: "Tout accepter",
    rejectAll: "Tout refuser",
    customize: "Personnaliser",
    saveChoices: "Enregistrer mes choix",
    learnMore: "Politique de cookies",
    customTitle: "Préférences des cookies et stockage local",
    customDesc: "Choisissez les catégories de données locales que vous autorisez. Conformément au RGPD et à la directive ePrivacy, vous pouvez modifier ces préférences à tout moment.",
    necessaryTitle: "Traceurs strictement nécessaires",
    necessaryBadge: "Toujours actif",
    necessaryDesc: "Indispensables au fonctionnement du service (authentification Supabase, session sécurisée du bot Discord, sécurité anti-DDoS Cloudflare et synchronisation des versions).",
    preferencesTitle: "Préférences et personnalisation",
    preferencesDesc: "Mémorise vos réglages d'interface (thème visuel, disposition de l'espace de travail, volume audio du dock et langue choisie).",
    analyticsTitle: "Diagnostics et stabilité",
    analyticsDesc: "Mesures techniques anonymisées permettant de détecter les anomalies et d'optimiser les temps de réponse du service.",
    back: "Retour",
  },
  en: {
    title: "Privacy protection and cookie management",
    desc: "ETHONE uses strictly necessary trackers and local storage for secure authentication, bot synchronization, and system reliability. We do not use advertising cookies or third-party marketing trackers.",
    acceptAll: "Accept all",
    rejectAll: "Reject all",
    customize: "Customize",
    saveChoices: "Save preferences",
    learnMore: "Cookie Policy",
    customTitle: "Cookie and local storage preferences",
    customDesc: "Select the categories of local storage you authorize. In accordance with GDPR and the ePrivacy directive, you can update these choices anytime.",
    necessaryTitle: "Strictly necessary trackers",
    necessaryBadge: "Always active",
    necessaryDesc: "Essential for core platform operations (Supabase authentication, Discord bot session, Cloudflare security, and build version check).",
    preferencesTitle: "Preferences and personalization",
    preferencesDesc: "Stores interface preferences (theme styling, workspace layout, audio volume, and selected language).",
    analyticsTitle: "Diagnostics and stability",
    analyticsDesc: "Anonymous technical metrics helping detect application errors and optimize system latency.",
    back: "Back",
  },
  es: {
    title: "Protección de privacidad y cookies",
    desc: "ETHONE utiliza almacenamiento local y rastreadores estrictamente necesarios para autenticación, sincronización del bot y fiabilidad. No utilizamos cookies publicitarias ni rastreadores comerciales de terceros.",
    acceptAll: "Aceptar todo",
    rejectAll: "Rechazar todo",
    customize: "Personalizar",
    saveChoices: "Guardar preferencias",
    learnMore: "Política de cookies",
    customTitle: "Preferencias de cookies y almacenamiento",
    customDesc: "Seleccione las categorías de almacenamiento local que autoriza. Puede modificar estas preferencias en cualquier momento de acuerdo con el RGPD.",
    necessaryTitle: "Rastreadores estrictamente necesarios",
    necessaryBadge: "Siempre activo",
    necessaryDesc: "Imprescindibles para el servicio (autenticación Supabase, sesión del bot de Discord, protección Cloudflare y sincronización de versiones).",
    preferencesTitle: "Preferencias y personalización",
    preferencesDesc: "Almacena los ajustes de interfaz (tema visual, disposición del panel, volumen de sonido e idioma).",
    analyticsTitle: "Diagnóstico y estabilidad",
    analyticsDesc: "Métricas técnicas anónimas para registrar fallos técnicos y mejorar los tiempos de respuesta.",
    back: "Volver",
  },
  de: {
    title: "Datenschutz und Cookie-Verwaltung",
    desc: "ETHONE verwendet technisch notwendige Tracker und lokalen Speicher für sichere Authentifizierung, Bot-Synchronisierung und Plattformstabilität. Es werden keine Werbe-Cookies oder kommerzielle Tracker eingesetzt.",
    acceptAll: "Alle akzeptieren",
    rejectAll: "Alle ablehnen",
    customize: "Anpassen",
    saveChoices: "Auswahl speichern",
    learnMore: "Cookie-Richtlinie",
    customTitle: "Cookie- und Speichereinstellungen",
    customDesc: "Wählen Sie die Kategorien lokaler Daten aus, die Sie zulassen. Gemäß DSGVO und ePrivacy-Richtlinie können Sie diese Einstellungen jederzeit anpassen.",
    necessaryTitle: "Technisch notwendige Tracker",
    necessaryBadge: "Immer aktiv",
    necessaryDesc: "Unerlässlich für den Betrieb (Supabase-Authentifizierung, Discord-Bot-Sitzung, Cloudflare-Sicherheit und Versionsabgleich).",
    preferencesTitle: "Präferenzen und Anpassung",
    preferencesDesc: "Speichert Ihre Oberflächen-Einstellungen (Farbschema, Workspace-Layout, Tonlautstärke und Sprache).",
    analyticsTitle: "Diagnose und Stabilität",
    analyticsDesc: "Anonymisierte technische Metriken zur Erkennung von Systemfehlern und Optimierung der Latenz.",
    back: "Zurück",
  },
};

export default function CookieConsentBanner() {
  const { settings } = useSettings();
  const langKey = settings.language && COPY[settings.language] ? settings.language : "fr";
  const c = COPY[langKey] || COPY.fr;

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [prefToggles, setPrefToggles] = useState({
    preferences: true,
    analytics: false,
  });

  useEffect(() => {
    setMounted(true);
    const existing = getCookieConsent();
    if (!existing) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setPrefToggles({
        preferences: existing.preferences,
        analytics: existing.analytics,
      });
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => {
      const existing = getCookieConsent();
      if (existing) {
        setPrefToggles({
          preferences: existing.preferences,
          analytics: existing.analytics,
        });
      }
      setIsCustomizing(true);
      setIsOpen(true);
    };

    window.addEventListener("ethone:open-cookie-settings", handleOpen);
    return () => window.removeEventListener("ethone:open-cookie-settings", handleOpen);
  }, []);

  const handleAcceptAll = () => {
    saveCookieConsent({ preferences: true, analytics: true });
    setIsOpen(false);
    setIsCustomizing(false);
  };

  const handleRejectAll = () => {
    saveCookieConsent({ preferences: false, analytics: false });
    setIsOpen(false);
    setIsCustomizing(false);
  };

  const handleSaveCustom = () => {
    saveCookieConsent({
      preferences: prefToggles.preferences,
      analytics: prefToggles.analytics,
    });
    setIsOpen(false);
    setIsCustomizing(false);
  };

  if (!mounted || !isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none flex items-end sm:items-end justify-center p-3 sm:p-6">
        {isCustomizing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={SPRING_PANEL}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-title"
          className="pointer-events-auto relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/95 p-5 sm:p-6 text-[var(--text-primary)] shadow-2xl backdrop-blur-xl"
        >
          {!isCustomizing ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                  <ShieldCheck size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 id="cookie-title" className="text-base font-semibold leading-tight text-[var(--text-primary)]">
                    {c.title}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-[var(--text-muted)]">
                    {c.desc}{" "}
                    <Link
                      href="/cookies"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-1 font-medium text-[var(--accent-primary)] hover:underline"
                    >
                      {c.learnMore}
                      <ChevronRight size={12} />
                    </Link>
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomizing(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-hover)]/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
                >
                  <SlidersHorizontal size={14} />
                  {c.customize}
                </button>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="flex items-center justify-center rounded-xl border border-[var(--panel-border)]/70 bg-transparent px-4 py-2.5 text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/40 transition-all cursor-pointer"
                >
                  {c.rejectAll}
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
                >
                  {c.acceptAll}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 max-h-[80vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                    <SlidersHorizontal size={18} />
                  </div>
                  <div>
                    <h2 id="cookie-title" className="text-base font-semibold text-[var(--text-primary)]">
                      {c.customTitle}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">{c.customDesc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fermer"
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-hover)]/30 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{c.necessaryTitle}</span>
                    <span className="rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2 py-0.5 text-[11px] font-medium text-[var(--accent-primary)]">
                      {c.necessaryBadge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{c.necessaryDesc}</p>
                </div>

                <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-hover)]/30 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{c.preferencesTitle}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefToggles.preferences}
                      onClick={() => setPrefToggles((prev) => ({ ...prev, preferences: !prev.preferences }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        prefToggles.preferences ? "bg-[var(--accent-primary)]" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          prefToggles.preferences ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{c.preferencesDesc}</p>
                </div>

                <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-hover)]/30 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{c.analyticsTitle}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefToggles.analytics}
                      onClick={() => setPrefToggles((prev) => ({ ...prev, analytics: !prev.analytics }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        prefToggles.analytics ? "bg-[var(--accent-primary)]" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          prefToggles.analytics ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{c.analyticsDesc}</p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[var(--panel-border)]/60">
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-center sm:text-left"
                >
                  {c.back}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="flex-1 sm:flex-initial rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-hover)]/60 px-4 py-2 text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
                  >
                    {c.acceptAll}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <Check size={14} />
                    {c.saveChoices}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
