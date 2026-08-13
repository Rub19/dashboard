"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createDocumentMetadataManager } from "@/lib/document-metadata";

function routeFromPathname(pathname: string): string {
  if (pathname === "/") return "home";
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] || "home";
}

export default function DocumentMetadata() {
  const pathname = usePathname();
  const managerRef = useRef<ReturnType<typeof createDocumentMetadataManager> | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!managerRef.current) managerRef.current = createDocumentMetadataManager(document);
    managerRef.current.setRoute(routeFromPathname(pathname));
  }, [pathname]);

  return null;
}
