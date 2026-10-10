import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ userId: "demo" }, { userId: "top" }];
}

/** Ancienne sous-page : son contenu est maintenant dans le module « invites » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="invites" />;
}
