import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { eventId: "evt-gaming-night" },
    { eventId: "evt-rocket-tournament" },
    { eventId: "evt-staff-sync" },
    { eventId: "evt-watch-party" },
    { eventId: "demo" },
  ];
}

/** Ancienne sous-page : son contenu est maintenant dans le module « events » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="events" />;
}
