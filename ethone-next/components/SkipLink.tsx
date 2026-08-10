"use client";

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-4 z-[100] -translate-y-40 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0"
    >
      Aller au contenu
    </a>
  );
}
