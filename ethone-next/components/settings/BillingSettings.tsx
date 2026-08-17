"use client";

import BillingTab from "./BillingTab";
import InvoicesHistory from "./InvoicesHistory";

export default function BillingSettings() {
  return (
    <div className="space-y-4">
      <BillingTab />
      <InvoicesHistory />
    </div>
  );
}
