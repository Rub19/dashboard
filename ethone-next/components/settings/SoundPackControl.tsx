"use client";

import { useSound } from "@/lib/sound";
import { useI18n } from "@/lib/hooks/useI18n";
import Select from "@/components/ui/Select";
import { Icon } from "@/lib/icons";

type SoundPackControlProps = {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
};

export default function SoundPackControl({ value, onChange, options }: SoundPackControlProps) {
  const i18n = useI18n();
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
        title={i18n("playPreview", "Aperçu")}
        aria-label={i18n("playPreview", "Aperçu")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:text-[var(--accent-primary)]"
      >
        <Icon name="play" className="h-4 w-4" />
      </button>
    </div>
  );
}
