"use client";

import Link from "next/link";
import { useSettings } from "@/components/SettingsProvider";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

interface LegalCopy {
  backLink: string;
  title: string;
  lastUpdated: string;
  s1Title: string;
  s1Body: string;
  s2Title: string;
  s2Body: string;
  s3Title: string;
  s3Body: string;
  s4Title: string;
  s4Body: string;
  s5Title: string;
  s5Body: string;
  s6Title: string;
  s6Body: string;
  seeAlso: string;
}

const COPY: Record<string, LegalCopy> = {
  fr: {
    backLink: "← Retour à l'accueil",
    title: "Mentions légales",
    lastUpdated: "Dernière mise à jour : 12 octobre 2026",
    s1Title: "1. Éditeur du site",
    s1Body: "Le site ethone.dev, la vitrine du bot Discord et l'ensemble de l'écosystème ETHONE sont édités par Rub19 en tant que projet personnel, indépendant et non commercial. Directeur de la publication : Rub19. Pour toute question ou demande légale : ",
    s2Title: "2. Hébergement",
    s2Body: "L'infrastructure d'hébergement web, la distribution CDN et le pare-feu réseau sont assurés par Cloudflare Inc., 101 Townsend St, San Francisco, CA 94107, USA (téléphone : +1 (888) 993-5273). La base de données et l'authentification sont fournies par Supabase Inc., 77 Geary St, San Francisco, CA 94108, USA. Le bot Discord Etho est exécuté sur un serveur privé dédié sécurisé.",
    s3Title: "3. Propriété intellectuelle",
    s3Body: "L'ensemble des éléments graphiques, du code source, de l'interface utilisateur et de l'identité visuelle d'ETHONE sont protégés par le droit d'auteur et la propriété intellectuelle. Toute reproduction ou utilisation non autorisée est strictement interdite. Les marques et logos tiers cités (Discord, Spotify, Last.fm, Riot Games, Google, Notion) demeurent la propriété exclusive de leurs détenteurs respectifs.",
    s4Title: "4. Données personnelles et RGPD",
    s4Body: "Conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679) et à la Loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de portabilité, de limitation et d'effacement de vos données personnelles. Vous pouvez faire valoir ces droits en nous écrivant par courriel. Vous disposez également du droit de déposer une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés - www.cnil.fr).",
    s5Title: "5. Cookies et traceurs",
    s5Body: "L'utilisation des cookies et des technologies de stockage local sur nos services est strictement encadrée et détaillée dans notre Politique de cookies. Vous pouvez modifier ou révoquer vos consentements à tout moment.",
    s6Title: "6. Responsabilité",
    s6Body: "Le Service est fourni à titre gracieux « en l'état », sans garantie de disponibilité ininterrompue. Rub19 ne saurait être tenu responsable des dommages directs ou indirects pouvant résulter de l'accès au site, de coupures techniques, ou de l'utilisation d'outils tiers connectés.",
    seeAlso: "Voir aussi :",
  },
  en: {
    backLink: "← Back to home",
    title: "Legal Notice",
    lastUpdated: "Last updated: October 12, 2026",
    s1Title: "1. Publisher",
    s1Body: "The ethone.dev website, Discord bot showcase, and ETHONE ecosystem are published by Rub19 as an independent, personal project. Editorial director: Rub19. For contact or legal inquiries: ",
    s2Title: "2. Hosting Providers",
    s2Body: "Web hosting, CDN edge delivery, and network security are provided by Cloudflare Inc., 101 Townsend St, San Francisco, CA 94107, USA (phone: +1 (888) 993-5273). Database and authentication infrastructure are supplied by Supabase Inc., 77 Geary St, San Francisco, CA 94108, USA. The Discord bot runs on dedicated European servers.",
    s3Title: "3. Intellectual Property",
    s3Body: "All user interface designs, logos, software source code, and assets of ETHONE are protected by copyright laws. Unauthorized reproduction is strictly prohibited. Third-party brand names (Discord, Spotify, Last.fm, Riot Games, Google, Notion) belong to their respective owners.",
    s4Title: "4. Personal Data & GDPR Compliance",
    s4Body: "In accordance with the EU General Data Protection Regulation (GDPR - Regulation EU 2016/679), you hold rights of access, rectification, erasure, data portability, and restriction of processing. Contact us by email to exercise these rights, or submit an inquiry to your local Data Protection Authority.",
    s5Title: "5. Cookies and Trackers",
    s5Body: "Our use of cookies and local storage is transparently described in our Cookies Policy. You can adjust or revoke consent preferences anytime.",
    s6Title: "6. Limitation of Liability",
    s6Body: "The Service is made available 'as is' without warranties of uninterrupted service. The publisher shall not be liable for direct or indirect losses arising from service unavailability or connected third-party platforms.",
    seeAlso: "See also:",
  },
  es: {
    backLink: "← Volver al inicio",
    title: "Aviso Legal",
    lastUpdated: "Última actualización: 12 de octubre de 2026",
    s1Title: "1. Titular del sitio",
    s1Body: "El sitio ethone.dev y el ecosistema ETHONE están editados por Rub19 como proyecto personal e independiente. Director de publicación: Rub19. Para consultas legales: ",
    s2Title: "2. Alojamiento",
    s2Body: "Alojamiento web y CDN por Cloudflare Inc., 101 Townsend St, San Francisco, CA 94107, EE. UU. Base de datos por Supabase Inc., 77 Geary St, San Francisco, CA 94108, EE. UU.",
    s3Title: "3. Propiedad Intelectual",
    s3Body: "El diseño y software de ETHONE están protegidos por derechos de autor. Las marcas comerciales de terceros pertenecen a sus titulares.",
    s4Title: "4. Protección de Datos (RGPD)",
    s4Body: "Conforme al RGPD (Reglamento UE 2016/679), dispone de derechos de acceso, rectificación, supresión y portabilidad. Puede ejercerlos por correo electrónico o acudir a la autoridad de control correspondiente.",
    s5Title: "5. Cookies",
    s5Body: "El uso de cookies se detalla en nuestra Política de Cookies, donde puede gestionar sus preferencias.",
    s6Title: "6. Responsabilidad",
    s6Body: "El servicio se ofrece tal cual, sin garantías explícitas de funcionamiento ininterrumpido.",
    seeAlso: "Ver también:",
  },
  de: {
    backLink: "← Zurück zur Startseite",
    title: "Impressum und rechtliche Hinweise",
    lastUpdated: "Zuletzt aktualisiert: 12. Oktober 2026",
    s1Title: "1. Herausgeber",
    s1Body: "Die Website ethone.dev und der Discord-Bot werden von Rub19 als unabhängiges persönliches Projekt betrieben. Verantwortlich für den Inhalt: Rub19. Kontakt: ",
    s2Title: "2. Hosting und Infrastruktur",
    s2Body: "Webhosting und Sicherheitsinfrastruktur durch Cloudflare Inc., 101 Townsend St, San Francisco, CA 94107, USA. Datenbank und Authentifizierung durch Supabase Inc., 77 Geary St, San Francisco, CA 94108, USA.",
    s3Title: "3. Urheberrecht",
    s3Body: "Alle Inhalte, Designs und Quellcodes von ETHONE unterliegen dem Urheberrecht. Drittanbieter-Marken gehören den jeweiligen Eigentümern.",
    s4Title: "4. Datenschutz (DSGVO)",
    s4Body: "Gemäß der Datenschutz-Grundverordnung (DSGVO - Verordnung EU 2016/679) stehen Ihnen die Rechte auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit zu.",
    s5Title: "5. Cookies",
    s5Body: "Die Speichernutzung ist in unserer Cookie-Richtlinie dargelegt und kann jederzeit angepasst werden.",
    s6Title: "6. Haftungsausschluss",
    s6Body: "Die Bereitstellung erfolgt ohne Gewähr für ständige Verfügbarkeit.",
    seeAlso: "Siehe auch:",
  },
};

export default function LegalNoticeContent() {
  const { settings } = useSettings();
  const langKey = settings.language && COPY[settings.language] ? settings.language : "fr";
  const c = COPY[langKey] || COPY.fr;

  return (
    <div className="h-full w-full overflow-y-auto os-scroll bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {c.backLink}
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-[var(--text-primary)]">{c.title}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{c.lastUpdated}</p>

        <div className="stagger-children mt-10 space-y-8 text-[15px] leading-relaxed text-[var(--text-primary)]/85">
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{c.s1Title}</h2>
            <p className="mt-2">
              {c.s1Body}
              <a href={SUPPORT_MAILTO} className="underline underline-offset-2 text-[var(--accent-primary)]">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{c.s2Title}</h2>
            <p className="mt-2">{c.s2Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{c.s3Title}</h2>
            <p className="mt-2">{c.s3Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{c.s4Title}</h2>
            <p className="mt-2">{c.s4Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{c.s5Title}</h2>
            <p className="mt-2">{c.s5Body}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{c.s6Title}</h2>
            <p className="mt-2">{c.s6Body}</p>
          </section>

          <div className="pt-4 text-sm text-[var(--text-muted)] flex flex-wrap gap-4 border-t border-[var(--panel-border)]/60">
            <span>{c.seeAlso}</span>
            <Link href="/cookies" className="underline underline-offset-2 hover:text-[var(--text-primary)]">
              Politique de cookies
            </Link>
            <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--text-primary)]">
              Politique de confidentialité
            </Link>
            <Link href="/terms" className="underline underline-offset-2 hover:text-[var(--text-primary)]">
              Conditions d&apos;utilisation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
