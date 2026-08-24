"use client";

import { useEffect, useId, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import Select from "@/components/ui/Select";
import Input from "@/components/Input";
import FormField from "@/components/FormField";

function SettingsTextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <FormField className="min-w-0" label={label}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]">
            {icon}
          </span>
        )}
        <Input
          type={type}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => onChange(local)}
          placeholder={placeholder}
          inputSize="compact"
          className={icon ? "w-full pl-9" : "w-full"}
        />
      </div>
    </FormField>
  );
}

const SOURCE_OPTIONS = [
  { id: "lanyard", label: "Lanyard (Discord)" },
  { id: "lastfm", label: "Last.fm" },
  { id: "spotify", label: "Spotify" },
];

export default function LiveSettings() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const selectId = useId();

  return (
    <div className="space-y-4" data-section-match>
      <p className="text-xs text-[var(--muted)]">{i18n("configureToEnable")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={selectId} className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            {i18n("liveNowPlayingSource")}
          </label>
          <Select
            id={selectId}
            value={settings.liveNowPlayingSource}
            onChange={(value) => update({ liveNowPlayingSource: value as "lanyard" | "lastfm" | "spotify" })}
            options={SOURCE_OPTIONS}
            className="w-full"
          />
        </div>

        {settings.liveNowPlayingSource !== "spotify" && (
          <SettingsTextInput
            label={i18n("liveNowPlayingIdentity")}
            value={settings.liveNowPlayingIdentity}
            onChange={(v) => update({ liveNowPlayingIdentity: v })}
            placeholder={settings.liveNowPlayingSource === "lanyard" ? "Discord user ID" : "Last.fm username"}
            icon={<Icon name="music" className="h-3.5 w-3.5" />}
          />
        )}

        <SettingsTextInput
          label={i18n("liveLanyardUserId")}
          value={settings.liveLanyardUserId}
          onChange={(v) => update({ liveLanyardUserId: v })}
          placeholder="Discord user ID"
          icon={<Icon name="message-square" className="h-3.5 w-3.5" />}
        />

        <SettingsTextInput
          label={i18n("liveSpotifyClientId")}
          value={settings.liveSpotifyClientId}
          onChange={(v) => update({ liveSpotifyClientId: v })}
          placeholder="Client ID"
          icon={<Icon name="music" className="h-3.5 w-3.5" />}
        />

        <SettingsTextInput
          label={i18n("liveYoutubeClientId")}
          value={settings.liveYoutubeClientId}
          onChange={(v) => update({ liveYoutubeClientId: v })}
          placeholder="Client ID"
          icon={<Icon name="youtube" className="h-3.5 w-3.5" />}
        />

        <SettingsTextInput
          label={i18n("liveRedditClientId")}
          value={settings.liveRedditClientId}
          onChange={(v) => update({ liveRedditClientId: v })}
          placeholder="Client ID"
          icon={<Icon name="app-window" className="h-3.5 w-3.5" />}
        />

        <SettingsTextInput
          label={i18n("liveTrackerRiotName")}
          value={settings.liveTrackerRiotName}
          onChange={(v) => update({ liveTrackerRiotName: v })}
          placeholder="Riot name"
          icon={<Icon name="swords" className="h-3.5 w-3.5" />}
        />

        <SettingsTextInput
          label={i18n("liveTrackerRiotTag")}
          value={settings.liveTrackerRiotTag}
          onChange={(v) => update({ liveTrackerRiotTag: v })}
          placeholder="#1234"
          icon={<Icon name="swords" className="h-3.5 w-3.5" />}
        />

        <SettingsTextInput
          label={i18n("liveWeatherCity")}
          value={settings.liveWeatherCity}
          onChange={(v) => update({ liveWeatherCity: v })}
          placeholder="Paris"
          icon={<Icon name="cloud-sun" className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
}
