interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  /** Couleur de la case cochée : indigo (par défaut) ou rose pour une confirmation destructive. */
  tone?: 'accent' | 'danger';
  className?: string;
  title?: string;
}

const TONE_CLASSES: Record<'accent' | 'danger', string> = {
  accent: 'border-ethone-accent bg-ethone-accent shadow-glow-sm',
  danger: 'border-rose-500 bg-rose-500 shadow-[0_0_15px_-3px_rgba(244,63,94,0.35)]',
};

/**
 * Case à cocher stylisée (le panneau du bot n'a pas de framer-motion : transitions en CSS pur).
 * Remplace les `<input type="checkbox">` par défaut, qui rendaient un carré blanc hors thème.
 */
export default function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  tone = 'accent',
  className = '',
  title,
}: CheckboxProps) {
  const box = (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      className={[
        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150 ease-out outline-none',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ethone-surface focus-visible:ring-ethone-accent/60',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-90',
        checked ? TONE_CLASSES[tone] : 'border-white/20 bg-white/5 hover:border-white/35 hover:bg-white/10',
      ].join(' ')}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-white transition-all duration-150 ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    </button>
  );

  if (!label && !description) return box;

  return (
    <label
      className={`flex items-center gap-2.5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) onChange(!checked);
      }}
    >
      {box}
      {(label || description) && (
        <span className={disabled ? 'opacity-50' : ''}>
          {label && <span className="block text-slate-300">{label}</span>}
          {description && <span className="block text-[11px] text-slate-500">{description}</span>}
        </span>
      )}
    </label>
  );
}
