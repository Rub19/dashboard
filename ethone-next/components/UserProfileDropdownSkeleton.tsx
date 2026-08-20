"use client";

export default function UserProfileDropdownSkeleton() {
  return (
    <div
      className="group relative flex h-9 items-center gap-2.5 rounded-full border border-white/[0.08] bg-zinc-900/80 pl-1.5 pr-3 text-white"
      aria-hidden="true"
    >
      <div className="h-7 w-7 rounded-full bg-white/[0.06]" />
      <div className="hidden h-3.5 w-16 rounded bg-white/[0.06] sm:block" />
      <div className="h-4 w-4 rounded-full bg-white/[0.06]" />
    </div>
  );
}
