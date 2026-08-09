const TILT_MAX = 12;
const LIFT_MAX = 8;
const SELECTOR = [
  "article.v8-spotify-live",
  "article.v8-discord-live",
  "article.v8-minecraft-live",
  "article.v8-steam-live",
  "article.v8-github-live",
  "article.v8-google-calendar-live",
  "article.v8-google-drive-live",
  "article.v8-lastfm-live",
  "article.v8-notion-live",
  "article.v8-reddit-live",
  "article.v8-todoist-live",
  "article.v8-twitch-live",
  "article.v8-weather-live",
  "article.v8-youtube-live",
  "article.v8-lol-live",
  "article.v8-valorant-live",
  "article.v8-tracker-live"
].join(", ");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setDepth(element, event) {
  const rect = element.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  const tiltY = (x - 0.5) * TILT_MAX;
  const tiltX = (0.5 - y) * TILT_MAX;
  const lift = -Math.round(y * LIFT_MAX);

  const target = element.querySelector(".v8-live-card-inner") || element;
  target.style.setProperty("--v8-tilt-x", `${tiltX.toFixed(2)}deg`);
  target.style.setProperty("--v8-tilt-y", `${tiltY.toFixed(2)}deg`);
  target.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(${lift}px)`;

  element.style.setProperty("--v8-spotlight-x", `${(x * 100).toFixed(1)}%`);
  element.style.setProperty("--v8-spotlight-y", `${(y * 100).toFixed(1)}%`);
  element.classList.add("v8-depth-active");
}

function resetDepth(element) {
  const target = element.querySelector(".v8-live-card-inner") || element;
  target.style.transform = "";
  target.style.setProperty("--v8-tilt-x", "0deg");
  target.style.setProperty("--v8-tilt-y", "0deg");
  element.classList.remove("v8-depth-active");
}

export function attachDepthEffect(root = globalThis.document) {
  if (!root) return () => {};
  const isTouch = globalThis.matchMedia?.("(pointer: coarse)").matches === true;
  if (isTouch) return () => {};

  const onMove = (event) => {
    const card = event.target?.closest?.(SELECTOR);
    if (!card) return;
    setDepth(card, event);
  };

  const onLeave = (event) => {
    const card = event.target?.closest?.(SELECTOR);
    if (!card) return;
    resetDepth(card);
  };

  root.addEventListener("mousemove", onMove, { passive: true });
  root.addEventListener("mouseout", onLeave, { passive: true });
  return () => {
    root.removeEventListener("mousemove", onMove);
    root.removeEventListener("mouseout", onLeave);
  };
}
