"use client";

export default function Equalizer({ bars = 5, className = "" }: { bars?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-0.5 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-1 animate-eq rounded-lg bg-[var(--accent-primary)]"
          style={{
            height: "40%",
            animationDelay: `${i * 120}ms`,
            animationDuration: `${600 + (i % 3) * 200}ms`,
          }}
        />
      ))}
    </div>
  );
}
