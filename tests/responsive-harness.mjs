const params = new URLSearchParams(globalThis.location.search);
const frame = document.querySelector("iframe");

function dimension(name, fallback, min, max) {
  const value = Number(params.get(name));
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

const width = dimension("width", 390, 320, 2560);
const height = dimension("height", 844, 480, 1440);
const route = String(params.get("route") || "home").replace(/[^a-z-]/gi, "") || "home";

frame.style.width = `${width}px`;
frame.style.height = `${height}px`;
frame.title = `ETHONE QA ${width}x${height}`;
frame.src = `/index.html?qaViewport=${width}x${height}#/${route}`;
