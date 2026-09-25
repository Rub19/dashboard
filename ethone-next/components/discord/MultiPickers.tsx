"use client";

import { useEffect, useState } from "react";
import RolePicker, { fetchGuildRoles } from "./RolePicker";
import ChannelPicker, { fetchGuildChannels } from "./ChannelPicker";
import { X } from "@/components/icons/ph";

interface Props {
  guildId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

function Chips({ ids, names, prefix, onRemove, disabled }: { ids: string[]; names: Record<string, string>; prefix: string; onRemove: (id: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span key={id} className="inline-flex items-center gap-1 rounded-md bg-[#5865F2]/20 px-2 py-1 text-xs text-[#c9cdfb]">
          {prefix}
          {names[id] ?? id}
          <button type="button" disabled={disabled} onClick={() => onRemove(id)} aria-label="Retirer" className="cursor-pointer rounded p-0.5 text-[#c9cdfb]/70 hover:bg-white/10 hover:text-white">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

/** Liste de rôles : les rôles choisis s'affichent en pastilles, le sélecteur ajoute un rôle de plus. */
export function MultiRolePicker({ guildId, value, onChange, disabled, placeholder }: Props) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    void fetchGuildRoles(guildId).then((roles) => alive && setNames(Object.fromEntries(roles.map((r) => [r.id, r.name]))));
    return () => {
      alive = false;
    };
  }, [guildId]);
  return (
    <div className="space-y-2">
      <Chips ids={value} names={names} prefix="@" disabled={disabled} onRemove={(id) => onChange(value.filter((v) => v !== id))} />
      <RolePicker value={null} guildId={guildId} disabled={disabled} placeholder={placeholder ?? "Ajouter un rôle"} onChange={(id) => id && !value.includes(id) && onChange([...value, id])} />
    </div>
  );
}

/** Liste de salons, même principe que MultiRolePicker. */
export function MultiChannelPicker({ guildId, value, onChange, disabled, placeholder }: Props) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    void fetchGuildChannels(guildId).then((chs) => alive && setNames(Object.fromEntries(chs.map((c) => [c.id, c.name]))));
    return () => {
      alive = false;
    };
  }, [guildId]);
  return (
    <div className="space-y-2">
      <Chips ids={value} names={names} prefix="#" disabled={disabled} onRemove={(id) => onChange(value.filter((v) => v !== id))} />
      <ChannelPicker value={null} guildId={guildId} disabled={disabled} placeholder={placeholder ?? "Ajouter un salon"} onChange={(id) => id && !value.includes(id) && onChange([...value, id])} />
    </div>
  );
}

/** Liste de textes libres (mots, domaines…) : Entrée ou virgule pour ajouter. */
export function TagInput({ value, onChange, placeholder, disabled, max = 200 }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; disabled?: boolean; max?: number }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    onChange([...new Set([...value, ...parts])].slice(0, max));
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200">
            {t}
            <button type="button" disabled={disabled} onClick={() => onChange(value.filter((v) => v !== t))} aria-label="Retirer" className="cursor-pointer rounded p-0.5 text-zinc-400 hover:bg-white/10 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        className="h-10 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)] px-3 text-sm text-white outline-none focus:border-[#5865F2]/70"
      />
    </div>
  );
}
