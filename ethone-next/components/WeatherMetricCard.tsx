"use client";

import { Icon } from "@/lib/icons";

export type WeatherMetricCardProps = {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
};

export default function WeatherMetricCard({ icon, iconColor, label, value, sub }: WeatherMetricCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[var(--text-primary)]/[0.06] p-4 transition-colors hover:border-white/12">
      <Icon pack="phosphor" name={icon} className={`mb-1 h-4 w-4 ${iconColor}`} />
      <div className="mt-2">
        <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-[10px] font-medium text-[var(--text-muted)]">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{sub}</p>}
      </div>
    </div>
  );
}
