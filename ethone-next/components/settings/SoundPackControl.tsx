"use client";

import { useSound } from "@/lib/sound";
import Select from "@/components/ui/Select";
import { Icon } from "@/lib/icons";

type SoundPackControlProps = {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
};

export default function SoundPackControl({ value, onChange, options }: SoundPackControlProps) {
  const { play } = useSound();

  const handleChange = (next: string) => {
    onChange(next);
    play("click", next);
  };

  const handlePreview = () => {
    play("click", value);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onChange={handleChange}
        options={options}
        className="min-w-[9rem]"
      />
      <button
        type="button"
        onClick={handlePreview}
        title="Play preview"
        aria-label="Play preview"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--foreground)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
      >
        <Icon name="play" className="h-4 w-4" />
      </button>
    </div>
  );
}
