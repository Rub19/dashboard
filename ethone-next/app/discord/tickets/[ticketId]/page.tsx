import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ ticketId: "1" }];
}

/** Ancienne sous-page : son contenu est maintenant dans le module « tickets » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="tickets" />;
}
