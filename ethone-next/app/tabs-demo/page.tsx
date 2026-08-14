"use client";

import { useState } from "react";
import Tabs, { type TabItem } from "@/components/tabs/Tabs";

const DEMO_TABS: TabItem[] = [
  { id: "overview", label: "Overview", content: <p className="p-4 text-sm text-[var(--foreground)]">Overview content with quick stats and summary.</p> },
  { id: "calendar", label: "Calendar", content: <p className="p-4 text-sm text-[var(--foreground)]">Calendar view with events and reminders.</p> },
  { id: "bills", label: "Bills", content: <p className="p-4 text-sm text-[var(--foreground)]">Recurring bills and upcoming payments.</p> },
  { id: "team", label: "Team", content: <p className="p-4 text-sm text-[var(--foreground)]">Team members, invitations and permissions.</p> },
  { id: "settings", label: "Settings", content: <p className="p-4 text-sm text-[var(--foreground)]">Account and application settings.</p> },
];

const MANY_TABS: TabItem[] = [
  ...DEMO_TABS,
  { id: "mail", label: "Mail", content: <p className="p-4 text-sm text-[var(--foreground)]">Unified mail inbox.</p> },
  { id: "files", label: "Files", content: <p className="p-4 text-sm text-[var(--foreground)]">Cloud files and drops.</p> },
];

export default function TabsDemoPage() {
  const [active, setActive] = useState("overview");

  return (
    <div className="min-h-screen w-full space-y-8 bg-[var(--background)] p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="mb-6 text-lg font-semibold text-[var(--foreground)]">Tabs Demo (5 tabs)</h1>
        <Tabs tabs={DEMO_TABS} value={active} onChange={setActive} />
      </div>

      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="mb-6 text-lg font-semibold text-[var(--foreground)]">Tabs Demo (overflow)</h1>
        <Tabs tabs={MANY_TABS} defaultTab="overview" layoutId="activeTabOverflow" />
      </div>
    </div>
  );
}
