"use client";

import Link from "next/link";
import { SlidersHorizontal, ShieldCheck, CheckCircle2 } from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { openCookieSettings } from "@/lib/cookie-consent";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

interface ContentCopy {
  backLink: string;
  title: string;
  lastUpdated: string;
  introText: string;
  btnManage: string;
  s1Title: string;
  s1P1: string;
  s1P2: string;
  s2Title: string;
  s2P1: string;
  s3Title: string;
  s3Intro: string;
  colName: string;
  colProvider: string;
  colPurpose: string;
  colDuration: string;
  colCategory: string;
  catNecessary: string;
  catPreferences: string;
  catAnalytics: string;
  s4Title: string;
  s4P1: string;
  s5Title: string;
  s5P1: string;
  s6Title: string;
  s6P1: string;
  s7Title: string;
  s7P1: string;
  seeAlso: string;
}

const DICT: Record<string, ContentCopy> = {
  fr: {
    backLink: "← Retour à l'accueil",
    title: "Politique relative aux cookies et traceurs",
    lastUpdated: "Dernière mise à jour : 12 octobre 2026",
    introText: "La présente Politique relative aux cookies et traceurs s'applique au tableau de bord ethone.dev, à la vitrine du bot Discord et à l'ensemble des services associés exploités par Rub19. Elle a pour objet de vous informer de manière transparente sur l'utilisation des traceurs, cookies HTTP et technologies de stockage local du navigateur (localStorage, sessionStorage), conformément à la Directive européenne ePrivacy (2002/58/CE révisée) et au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679).",
    btnManage: "Modifier mes préférences de cookies",
    s1Title: "1. Qu'est-ce qu'un cookie ou un traceur local ?",
    s1P1: "Un cookie ou traceur est un petit fichier de données ou une valeur textuelle déposée et lue par votre navigateur lors de votre visite sur un service web. Ces éléments permettent notamment de sécuriser votre navigation, de vous maintenir connecté ou de mémoriser vos réglages d'interface.",
    s1P2: "Sur ETHONE, nous utilisons principalement le stockage local moderne du navigateur (localStorage et sessionStorage) ainsi que des cookies sécurisés nécessaires aux protocoles d'authentification et de protection contre les cyberattaques.",
    s2Title: "2. Notre engagement éthique : Zéro publicité, zéro revente",
    s2P1: "ETHONE est un projet indépendant conçu pour le respect de la vie privée. Nous ne déposons AUCUN cookie publicitaire, nous n'effectuons aucun profilage commercial, nous n'intégrons aucun pixel de tracking publicitaire (aucun script Google Ads, Meta Pixel ou TikTok) et nous ne vendons ni ne louons vos données à aucun courtier ou réseau tiers.",
    s3Title: "3. Inventaire des cookies et données locales",
    s3Intro: "Voici la liste exhaustive des traceurs et clés de stockage susceptibles d'être utilisés sur nos services :",
    colName: "Nom / Clé",
    colProvider: "Émetteur",
    colPurpose: "Finalité",
    colDuration: "Durée",
    colCategory: "Catégorie",
    catNecessary: "Nécessaire",
    catPreferences: "Préférence",
    catAnalytics: "Diagnostic",
    s4Title: "4. Gestion de votre consentement",
    s4P1: "Conformément aux recommandations de la CNIL et du Comité Européen de la Protection des Données (CEPD), les traceurs strictement nécessaires au fonctionnement du service ne requièrent pas de consentement préalable. Les traceurs de préférences et de diagnostics ne sont activés qu'avec votre accord explicite. Vous pouvez retirer ou modifier votre consentement à tout moment en cliquant sur le bouton ci-dessus ou via le lien « Gérer les cookies » présent en bas de page.",
    s5Title: "5. Paramétrage direct de votre navigateur",
    s5P1: "Vous pouvez également configurer votre navigateur pour bloquer ou supprimer les cookies et données locales. Notez que la désactivation des cookies nécessaires peut empêcher l'accès aux fonctionnalités d'authentification et à la console du bot.",
    s6Title: "6. Bases légales européennes",
    s6P1: "Le traitement des traceurs strictement nécessaires repose sur l'article 5, paragraphe 3, de la directive 2002/58/CE (ePrivacy) ainsi que sur l'intérêt légitime d'assurer la sécurité et la fourniture du service (art. 6, par. 1, point f du RGPD). Le dépôt des traceurs de préférences et de diagnostics repose sur votre consentement libre et éclairé (art. 6, par. 1, point a du RGPD).",
    s7Title: "7. Contact et réclamations",
    s7P1: "Pour toute question relative à cette politique ou pour exercer vos droits d'accès, d'opposition ou d'effacement, vous pouvez contacter l'administrateur à l'adresse suivante :",
    seeAlso: "Voir aussi :",
  },
  en: {
    backLink: "← Back to home",
    title: "Cookies and Tracking Technologies Policy",
    lastUpdated: "Last updated: October 12, 2026",
    introText: "This Cookies and Tracking Technologies Policy applies to the ethone.dev dashboard, the Discord bot showcase, and all associated services operated by Rub19. It explains transparently how cookies, local storage (localStorage, sessionStorage), and tracking technologies are handled, in accordance with the European ePrivacy Directive (2002/58/EC) and the General Data Protection Regulation (GDPR - EU Regulation 2016/679).",
    btnManage: "Manage cookie preferences",
    s1Title: "1. What are cookies and local storage trackers?",
    s1P1: "A cookie or tracker is a small data file or key stored in your web browser during visits to a web service. These tools secure your session, keep you authenticated, and remember user interface preferences.",
    s1P2: "On ETHONE, we primarily rely on modern browser storage (localStorage and sessionStorage) alongside secure authentication tokens and anti-attack security filters.",
    s2Title: "2. Our ethical commitment: Zero advertising, zero data resale",
    s2P1: "ETHONE is an independent project dedicated to user privacy. We do NOT use any advertising cookies, commercial tracking pixels (no Google Ads, Meta Pixel, or TikTok trackers), and we never sell, rent, or transfer your data to advertisers or data brokers.",
    s3Title: "3. Comprehensive tracker inventory",
    s3Intro: "Below is the complete list of trackers and storage keys used across our services:",
    colName: "Name / Key",
    colProvider: "Provider",
    colPurpose: "Purpose",
    colDuration: "Duration",
    colCategory: "Category",
    catNecessary: "Necessary",
    catPreferences: "Preference",
    catAnalytics: "Diagnostic",
    s4Title: "4. Managing your consent",
    s4P1: "According to European regulatory standards (EDPB & CNIL), strictly necessary trackers do not require prior consent. Optional preference and diagnostic storage are only activated upon your explicit choice. You can adjust or revoke your consent anytime using the button above or the 'Manage cookies' link in the footer.",
    s5Title: "5. Browser configuration",
    s5P1: "You can configure your browser to block or clear cookies and local storage. Disabling essential storage may prevent authentication and bot console operations from functioning correctly.",
    s6Title: "6. Legal bases under EU law",
    s6P1: "The processing of strictly necessary trackers is grounded in Article 5(3) of Directive 2002/58/EC (ePrivacy) and legitimate interest in maintaining system integrity (GDPR Art. 6(1)(f)). Optional preferences and diagnostics rely on your free, informed consent (GDPR Art. 6(1)(a)).",
    s7Title: "7. Contact and supervisory authority",
    s7P1: "For questions regarding this policy or to exercise your GDPR rights, contact the administrator at:",
    seeAlso: "See also:",
  },
  es: {
    backLink: "← Volver al inicio",
    title: "Política de cookies y tecnologías de seguimiento",
    lastUpdated: "Última actualización: 12 de octubre de 2026",
    introText: "Esta Política de cookies se aplica al panel de control ethone.dev, al sitio del bot de Discord y a los servicios relacionados operados por Rub19, de conformidad con la Directiva ePrivacy (2002/58/CE) y el Reglamento General de Protección de Datos (RGPD - Reglamento UE 2016/679).",
    btnManage: "Modificar preferencias de cookies",
    s1Title: "1. ¿Qué son las cookies y el almacenamiento local?",
    s1P1: "Un rastreador o cookie es un archivo de datos que el navegador almacena al acceder a un servicio en línea. Sirve para mantener la sesión abierta y asegurar la estabilidad de la plataforma.",
    s1P2: "En ETHONE usamos almacenamiento local moderno (localStorage y sessionStorage) y cookies técnicas de seguridad.",
    s2Title: "2. Cero publicidad y cero venta de datos",
    s2P1: "ETHONE no utiliza cookies publicitarias, no realiza perfiles comerciales y no comparte datos con redes publicitarias de terceros.",
    s3Title: "3. Inventario de rastreadores",
    s3Intro: "Relación detallada de claves de almacenamiento y cookies utilizadas:",
    colName: "Nombre / Clave",
    colProvider: "Proveedor",
    colPurpose: "Finalidad",
    colDuration: "Duración",
    colCategory: "Categoría",
    catNecessary: "Necesario",
    catPreferences: "Preferencia",
    catAnalytics: "Diagnóstico",
    s4Title: "4. Gestión del consentimiento",
    s4P1: "Los rastreadores necesarios no requieren consentimiento previo según la normativa europea. Las preferencias funcionales se pueden activar o revocar en cualquier momento.",
    s5Title: "5. Configuración del navegador",
    s5P1: "Puede configurar su navegador para bloquear cookies. Desactivar elementos esenciales puede inhabilitar el inicio de sesión.",
    s6Title: "6. Bases jurídicas",
    s6P1: "Conforme al Art. 5(3) de la Directiva ePrivacy y los Arts. 6(1)(a) y 6(1)(f) del RGPD.",
    s7Title: "7. Contacto",
    s7P1: "Para dudas o ejercicio de derechos, contacte al administrador:",
    seeAlso: "Ver también:",
  },
  de: {
    backLink: "← Zurück zur Startseite",
    title: "Cookie- und Tracking-Richtlinie",
    lastUpdated: "Zuletzt aktualisiert: 12. Oktober 2026",
    introText: "Diese Richtlinie gilt für ethone.dev, die Discord-Bot-Präsenz und die von Rub19 betriebenen Dienste gemäß der europäischen ePrivacy-Richtlinie (2002/58/EG) und der DSGVO (Verordnung EU 2016/679).",
    btnManage: "Cookie-Einstellungen anpassen",
    s1Title: "1. Was sind Cookies und lokaler Speicher?",
    s1P1: "Cookies und lokale Speicherwerte (localStorage) dienen der Authentifizierung, der Sicherheit und dem Erhalt Ihrer Anzeigeeinstellungen.",
    s1P2: "ETHONE setzt primär auf lokalen Browserspeicher und kryptografisch geschützte Tokens für Bot- und Sitzungssicherheit.",
    s2Title: "2. Keine Werbung, kein Datenverkauf",
    s2P1: "ETHONE verwendet KEINE Werbe-Cookies, keine Marketing-Pixel von Drittanbietern und verkauft keinerlei Daten.",
    s3Title: "3. Übersicht der eingesetzten Speicherwerte",
    s3Intro: "Vollständige Liste der verwendeten Cookies und Speicherschlüssel:",
    colName: "Name / Schlüssel",
    colProvider: "Anbieter",
    colPurpose: "Zweck",
    colDuration: "Dauer",
    colCategory: "Kategorie",
    catNecessary: "Notwendig",
    catPreferences: "Präferenz",
    catAnalytics: "Diagnose",
    s4Title: "4. Verwaltung Ihrer Einwilligung",
    s4P1: "Technisch erforderliche Speicherwerte bedürfen keiner vorherigen Einwilligung. Optionale Einstellungen können jederzeit angepasst oder widerrufen werden.",
    s5Title: "5. Browser-Einstellungen",
    s5P1: "Sie können Cookies im Browser blockieren. Dies kann jedoch die Funktionalität der Anmeldung einschränken.",
    s6Title: "6. Europäische Rechtsgrundlagen",
    s6P1: "Art. 5 Abs. 3 ePrivacy-Richtlinie sowie Art. 6 Abs. 1 lit. a und f DSGVO.",
    s7Title: "7. Kontakt",
    s7P1: "Bei Fragen wenden Sie sich an die Administration:",
    seeAlso: "Siehe auch:",
  },
};

const TRACKERS_TABLE = [
  {
    name: "sb-*-auth-token",
    provider: "Supabase Inc.",
    purpose: "Jeton de session chiffré pour l'authentification de compte utilisateur.",
    duration: "Session / Persistant",
    category: "necessary",
  },
  {
    name: "etho_bot_session",
    provider: "ETHONE Bot",
    purpose: "Jeton d'autorisation sécurisé pour l'accès à la console de gestion du bot Discord.",
    duration: "7 jours",
    category: "necessary",
  },
  {
    name: "cf_clearance, __cf_bm",
    provider: "Cloudflare Inc.",
    purpose: "Protection anti-DDoS, filtrage des bots automatisés malveillants et intégrité réseau.",
    duration: "Jusqu'à 30 jours",
    category: "necessary",
  },
  {
    name: "ethone:cookie-consent",
    provider: "ETHONE",
    purpose: "Enregistrement du choix de consentement aux traceurs (conformité CNIL/CEPD).",
    duration: "6 mois",
    category: "necessary",
  },
  {
    name: "ethone:pending-update",
    provider: "ETHONE",
    purpose: "Mémorisation de la détection de mise à jour logicielle lors de la navigation.",
    duration: "Session",
    category: "necessary",
  },
  {
    name: "ethone_settings_v8",
    provider: "ETHONE",
    purpose: "Préférences d'affichage locales : thème graphique, dispositions, langue, volume.",
    duration: "Persistant local",
    category: "preferences",
  },
  {
    name: "ethone_client_diagnostics",
    provider: "ETHONE",
    purpose: "Télémétrie d'erreur technique et métriques de latence anonymes (aucun tiers).",
    duration: "Session",
    category: "analytics",
  },
];

export default function CookiesContent() {
  const { settings } = useSettings();
  const langKey = settings.language && DICT[settings.language] ? settings.language : "fr";
  const c = DICT[langKey] || DICT.fr;

  return (
    <div className="h-full w-full overflow-y-auto os-scroll bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {c.backLink}
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-[var(--text-primary)]">{c.title}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{c.lastUpdated}</p>

        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/70 p-5 backdrop-blur-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
            <ShieldCheck size={28} />
          </div>
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{c.s4Title}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Gérez votre consentement par finalité à tout moment.
            </p>
          </div>
          <button
            type="button"
            onClick={openCookieSettings}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <SlidersHorizontal size={16} />
            {c.btnManage}
          </button>
        </div>

        <div className="stagger-children mt-10 space-y-10 text-[15px] leading-relaxed text-[var(--text-primary)]/85">
          <section>
            <p>{c.introText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{c.s1Title}</h2>
            <p className="mt-2">{c.s1P1}</p>
            <p className="mt-2">{c.s1P2}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{c.s2Title}</h2>
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-400 mt-0.5" />
              <p>{c.s2P1}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{c.s3Title}</h2>
            <p className="mt-2">{c.s3Intro}</p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/80 text-[var(--text-muted)]">
                    <th className="px-4 py-3 font-semibold">{c.colName}</th>
                    <th className="px-4 py-3 font-semibold">{c.colProvider}</th>
                    <th className="px-4 py-3 font-semibold">{c.colPurpose}</th>
                    <th className="px-4 py-3 font-semibold">{c.colDuration}</th>
                    <th className="px-4 py-3 font-semibold">{c.colCategory}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--panel-border)]/60">
                  {TRACKERS_TABLE.map((row) => (
                    <tr key={row.name} className="hover:bg-[var(--surface-hover)]/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-[var(--accent-primary)] font-medium whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)]">{row.provider}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{row.purpose}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{row.duration}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            row.category === "necessary"
                              ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                              : row.category === "preferences"
                              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {row.category === "necessary"
                            ? c.catNecessary
                            : row.category === "preferences"
                            ? c.catPreferences
                            : c.catAnalytics}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{c.s4Title}</h2>
            <p className="mt-2">{c.s4P1}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{c.s5Title}</h2>
            <p className="mt-2">{c.s5P1}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{c.s6Title}</h2>
            <p className="mt-2">{c.s6P1}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{c.s7Title}</h2>
            <p className="mt-2">
              {c.s7P1}{" "}
              <a href={SUPPORT_MAILTO} className="underline underline-offset-2 text-[var(--accent-primary)]">
                {SUPPORT_EMAIL}
              </a>
              . Vous disposez également du droit d&apos;introduire une réclamation auprès de la CNIL (Commission Nationale de l&apos;Informatique et des Libertés - cnil.fr).
            </p>
          </section>

          <div className="pt-4 text-sm text-[var(--text-muted)] flex flex-wrap gap-4 border-t border-[var(--panel-border)]/60">
            <span>{c.seeAlso}</span>
            <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--text-primary)]">
              Politique de confidentialité
            </Link>
            <Link href="/terms" className="underline underline-offset-2 hover:text-[var(--text-primary)]">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/legal" className="underline underline-offset-2 hover:text-[var(--text-primary)]">
              Mentions légales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
