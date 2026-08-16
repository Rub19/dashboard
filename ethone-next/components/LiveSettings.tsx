"use client";

import { useEffect, useId, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import Select from "@/components/ui/Select";

function SettingsTextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const [local, setLocal] = useState(value);
  const inputId = useId();

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className="min-w-0">
      <label htmlFor={inputId} className="mb-1 block text-xs text-[var(--muted)]">{label}</label>
      <input
        id={inputId}
        type={type}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onChange(local)}
        placeholder={placeholder}
        className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
      />
    </div>
  );
}

export default function LiveSettings() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const selectId = useId();

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--muted)]">{i18n("configureToEnable")}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor={selectId} className="mb-1 block text-xs text-[var(--muted)]">{i18n("liveNowPlayingSource")}</label>
          <Select
            id={selectId}
            value={settings.liveNowPlayingSource}
            onChange={(value) => update({ liveNowPlayingSource: value as "lanyard" | "lastfm" })}
            options={[
              { id: "lanyard", label: "Lanyard (Discord)" },
              { id: "lastfm", label: "Last.fm" },
            ]}
            className="w-full"
          />
        </div>

        <SettingsTextInput
          label={i18n("liveNowPlayingIdentity")}
          value={settings.liveNowPlayingIdentity}
          onChange={(v) => update({ liveNowPlayingIdentity: v })}
          placeholder={settings.liveNowPlayingSource === "lanyard" ? "Discord user ID" : "Last.fm username"}
        />
      </div>

      <SettingsTextInput
        label={i18n("liveLanyardUserId")}
        value={settings.liveLanyardUserId}
        onChange={(v) => update({ liveLanyardUserId: v })}
        placeholder="Discord user ID"
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <SettingsTextInput
          label={i18n("liveSpotifyClientId")}
          value={settings.liveSpotifyClientId}
          onChange={(v) => update({ liveSpotifyClientId: v })}
          placeholder="Client ID"
        />
        <SettingsTextInput
          label={i18n("liveYoutubeClientId")}
          value={settings.liveYoutubeClientId}
          onChange={(v) => update({ liveYoutubeClientId: v })}
          placeholder="Client ID"
        />
        <SettingsTextInput
          label={i18n("liveRedditClientId")}
          value={settings.liveRedditClientId}
          onChange={(v) => update({ liveRedditClientId: v })}
          placeholder="Client ID"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SettingsTextInput
          label={i18n("liveTrackerRiotName")}
          value={settings.liveTrackerRiotName}
          onChange={(v) => update({ liveTrackerRiotName: v })}
          placeholder="Riot name"
        />
        <SettingsTextInput
          label={i18n("liveTrackerRiotTag")}
          value={settings.liveTrackerRiotTag}
          onChange={(v) => update({ liveTrackerRiotTag: v })}
          placeholder="#1234"
        />
      </div>

      <SettingsTextInput
        label={i18n("liveWeatherCity")}
        value={settings.liveWeatherCity}
        onChange={(v) => update({ liveWeatherCity: v })}
        placeholder="Paris"
      />
    </div>
  );
}
