import { Suspense } from "react";
import SpaceDetailClient from "@/components/spaces/SpaceDetailClient";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ spaceId: "1" }];
}

export default function SpaceDetailPage() {
  return (
    <Suspense fallback={null}>
      <SpaceDetailClient />
    </Suspense>
  );
}
