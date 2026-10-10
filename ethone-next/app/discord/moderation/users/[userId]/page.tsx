import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ userId: "demo" }];
}

/** Ancienne sous-page : son contenu est maintenant dans le module « moderation » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="moderation" />;
}
