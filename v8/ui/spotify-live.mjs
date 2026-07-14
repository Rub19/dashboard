import { actionButton, element, icon } from "./dom.mjs";

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value || 0) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function equalizer() {
  return element("span", { className: "v8-spotify-equalizer", attributes: { "aria-hidden": "true" } }, [
    element("i"), element("i"), element("i"), element("i")
  ]);
}

function artwork(playback, className) {
  if (!playback.artwork) return element("span", { className: `${className} is-fallback` }, [icon("music-2")]);
  return element("span", { className }, [element("img", {
    attributes: {
      src: playback.artwork,
      alt: "",
      loading: "lazy",
      decoding: "async",
      referrerpolicy: "no-referrer"
    }
  })]);
}

function playbackControl(playback) {
  const label = playback.playing ? "Mettre Spotify en pause" : "Reprendre Spotify";
  if (!playback.controllable) {
    return element("span", {
      className: "v8-spotify-external-state",
      attributes: { "aria-label": playback.playing ? "Lecture Spotify en cours" : "Spotify en pause" }
    }, [icon(playback.playing ? "radio" : "pause"), element("span", { text: "Lecture externe" })]);
  }
  return actionButton({
    actionId: "v8.spotify.toggle",
    className: "v8-icon-button v8-spotify-control",
    ariaLabel: label
  }, [icon(playback.playing ? "pause" : "play")]);
}

export function spotifyLiveCard(playback = {}, options = {}) {
  if (playback.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const progress = Math.min(1, Math.max(0, Number(playback.progress) || 0));
  const progressBar = element("span", { className: "v8-spotify-progress__value", attributes: { "aria-hidden": "true" } });
  progressBar.style.transform = `scaleX(${progress})`;
  return element(options.tagName || "article", {
    className: `v8-spotify-live v8-spotify-live--${variant} v8-surface ${playback.playing ? "is-playing" : "is-paused"}`,
    attributes: { "aria-label": "Lecture Spotify" },
    dataset: { liveWidget: "media", liveKind: "media", spotifyPlayback: playback.playing ? "playing" : "paused" }
  }, [
    element("span", { className: "v8-spotify-live__aura", attributes: { "aria-hidden": "true" } }),
    artwork(playback, "v8-spotify-artwork"),
    element("div", { className: "v8-spotify-live__body" }, [
      element("div", { className: "v8-spotify-live__meta" }, [
        element("span", {}, [icon("music-2"), element("small", { text: playback.playing ? "Lecture en cours" : "En pause" })]),
        equalizer()
      ]),
      element("strong", { text: playback.title, attributes: { translate: "no" } }),
      element("p", { text: playback.album ? `${playback.artist} - ${playback.album}` : playback.artist, attributes: { translate: "no" } }),
      element("div", { className: "v8-spotify-progress" }, [
        element("span", {
          className: "v8-spotify-progress__track",
          attributes: { role: "progressbar", "aria-label": "Progression Spotify", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(progress * 100)) }
        }, [progressBar]),
        element("span", { className: "v8-spotify-progress__time", attributes: { "aria-hidden": "true" } }, [
          element("time", { text: formatTime(playback.progressMs) }),
          element("time", { text: formatTime(playback.durationMs) })
        ])
      ])
    ]),
    playbackControl(playback)
  ]);
}

export function spotifyDockIndicator(playback = {}) {
  if (playback.available !== true) return null;
  const className = `v8-spotify-dock ${playback.playing ? "is-playing" : "is-paused"}`;
  const label = playback.playing ? "Lecture Spotify en cours" : "Spotify en pause";
  const tooltip = `${playback.title} - ${playback.artist}`;
  const children = [artwork(playback, "v8-spotify-dock__artwork"), equalizer()];
  if (playback.controllable) {
    const control = actionButton({ actionId: "v8.spotify.toggle", className, ariaLabel: playback.playing ? "Mettre Spotify en pause" : "Reprendre Spotify" }, children);
    control.dataset.tooltip = tooltip;
    return control;
  }
  return element("span", { className, attributes: { "aria-label": label }, dataset: { tooltip } }, children);
}
