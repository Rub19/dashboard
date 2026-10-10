import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const dynamic = "force-static";

/** Ancienne sous-page : son contenu est maintenant dans le module « forms » de la console. */
export default function LegacySubPage() {
  return <LegacyModuleRedirect module="forms" />;
}
