import { actionButton, brandIcon, element, icon } from "./dom.mjs";

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
  return element("div", { className: "v8-spotify-controls" }, [
    actionButton({ actionId: "v8.spotify.previous", className: "v8-icon-button v8-spotify-control v8-spotify-control--secondary", ariaLabel: "Morceau précédent", title: "Morceau précédent" }, [icon("skip-back")]),
    actionButton({ actionId: "v8.spotify.toggle", className: "v8-icon-button v8-spotify-control", ariaLabel: label, title: label }, [icon(playback.playing ? "pause" : "play")]),
    actionButton({ actionId: "v8.spotify.next", className: "v8-icon-button v8-spotify-control v8-spotify-control--secondary", ariaLabel: "Morceau suivant", title: "Morceau suivant" }, [icon("skip-forward")])
  ]);
}

export function spotifyLiveCard(playback = {}, options = {}) {
  if (playback.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const durationMs = Math.max(0, Number(playback.durationMs) || 0);
  const anchorProgressMs = durationMs ? Math.min(durationMs, Math.max(0, Number(playback.progressMs) || 0)) : Math.max(0, Number(playback.progressMs) || 0);
  const anchorAt = Date.now();

  const progressBar = element("span", { className: "v8-spotify-progress__value", attributes: { "aria-hidden": "true" } });
  const progressTrack = element("span", {
    className: "v8-spotify-progress__track",
    attributes: { role: "progressbar", "aria-label": "Progression Spotify", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }
  }, [progressBar]);
  const elapsedTime = element("time", { text: formatTime(anchorProgressMs) });
  const totalTime = durationMs ? element("time", { text: formatTime(durationMs) }) : null;

  let lastSecond = -1;
  function paint(progressMs) {
    const ratio = durationMs ? Math.min(1, progressMs / durationMs) : 0;
    progressBar.style.transform = `scaleX(${ratio})`;
    
    const currentSecond = Math.floor(progressMs / 1000);
    if (currentSecond !== lastSecond) {
      progressTrack.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      elapsedTime.textContent = formatTime(progressMs);
      lastSecond = currentSecond;
    }
  }
  paint(anchorProgressMs);

  const front = element("div", { className: `v8-spotify-live v8-spotify-live--${variant} v8-surface v8-live-card-front ${playback.playing ? "is-playing" : "is-paused"}` }, [
    element("span", { className: "v8-spotify-live__aura", attributes: { "aria-hidden": "true" } }),
    artwork(playback, "v8-spotify-artwork"),
    element("div", { className: "v8-spotify-live__body" }, [
      element("div", { className: "v8-spotify-live__meta" }, [
        element("span", {}, [brandIcon("spotify", "music-2", "v8-live-brand-mark"), element("small", { text: playback.playing ? "Lecture en cours" : "En pause" })]),
        equalizer()
      ]),
      element("strong", { text: playback.title, attributes: { translate: "no" } }),
      element("p", { text: playback.album ? `${playback.artist} - ${playback.album}` : playback.artist, attributes: { translate: "no" } }),
      element("div", { className: "v8-spotify-progress" }, [
        durationMs ? progressTrack : null,
        element("span", { className: "v8-spotify-progress__time", attributes: { "aria-hidden": "true" } }, [elapsedTime, totalTime])
      ])
    ]),
    playbackControl(playback)
  ]);

  const back = element("div", { className: "v8-live-card-back v8-spotify-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("spotify", "music-2", "v8-live-brand-mark"), element("strong", { text: "Spotify", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: playback.title, attributes: { translate: "no" } }),
      element("p", { text: playback.artist, attributes: { translate: "no" } }),
      element("p", { text: playback.album || "", attributes: { translate: "no" } })
    ]),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: `Durée : ${formatTime(durationMs)}` })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-spotify-live v8-spotify-live--${variant} ${playback.playing ? "is-playing" : "is-paused"}`,
    attributes: { "aria-label": "Lecture Spotify" },
    dataset: { liveWidget: "media", liveKind: "media", spotifyPlayback: playback.playing ? "playing" : "paused" }
  }, [
    element("div", { className: "v8-live-card-inner" }, [front, back])
  ]);

  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input")) return;
    card.classList.toggle("is-flipped");
  });

  if (playback.playing) {
    let rAF;
    function tick() {
      if (!card.isConnected) return;
      const elapsed = Math.max(0, Date.now() - anchorAt);
      const nextProgress = durationMs ? Math.min(durationMs, anchorProgressMs + elapsed) : anchorProgressMs + elapsed;
      paint(nextProgress);
      if (durationMs && nextProgress >= durationMs) return;
      rAF = globalThis.requestAnimationFrame?.(tick);
    }
    rAF = globalThis.requestAnimationFrame?.(tick);
  }

  return card;
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
