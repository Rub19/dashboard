"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BillsPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/calendar/");
  }, [router]);
  return null;
}
