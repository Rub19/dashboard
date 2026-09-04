import CaseDetailClient from "./CaseDetailClient";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ caseId: "1" }];
}

export default function CaseDetailsPage() {
  return <CaseDetailClient />;
}
