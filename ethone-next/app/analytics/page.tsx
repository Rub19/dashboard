"use client";

import AnalyticsClient from "@/components/AnalyticsClient";

export default function AnalyticsPage() {
  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden p-4 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden">
        <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll pb-6">
          <AnalyticsClient />
        </div>
      </div>
    </div>
  );
}
