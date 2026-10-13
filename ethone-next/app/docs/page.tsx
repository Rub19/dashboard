import DocumentationView from "@/components/docs/DocumentationView";

export const metadata = {
  title: "Documentation — Etho Protect",
  description:
    "Guides pas à pas, scénarios de crise anti-raid et référence complète des modules de sécurité pour votre serveur Discord.",
  openGraph: {
    title: "Documentation — Etho Protect",
    description:
      "Guides pas à pas, scénarios de crise anti-raid et référence complète des modules de sécurité pour votre serveur Discord.",
  },
};

export default function DocsPage() {
  return <DocumentationView />;
}
