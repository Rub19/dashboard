import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { pollId: "community-game-night" },
    { pollId: "staff-decision-01" },
    { pollId: "feedback-event-01" },
    { pollId: "demo" },
  ];
}

/** Ancienne sous-page : son contenu est maintenant dans le module « polls » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="polls" />;
}
