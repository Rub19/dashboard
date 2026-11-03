import { PACK_TONES, UI_PACKS, UiPack } from "./sounds";
import { readJson, write } from "./settings";

const KEY = "ethone-ui-sound";
let context: AudioContext | null = null;

export const currentPack = (): UiPack => {
  const value = readJson<UiPack>(KEY);
  return value && UI_PACKS.includes(value) ? value : "off";
};

export function playPack(pack: UiPack = currentPack()) {
  if (pack === "off") return;
  const tone = PACK_TONES[pack];
  const audio = (context ??= new AudioContext());
  void audio.resume();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(tone.from, now);
  oscillator.frequency.exponentialRampToValueAtTime(tone.to, now + tone.seconds);
  gain.gain.setValueAtTime(tone.level, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.seconds);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + tone.seconds);
}

export function choosePack(pack: UiPack) {
  write(KEY, JSON.stringify(pack));
  playPack(pack);
}

export function startUiSounds() {
  document.addEventListener("click", (event) => {
    if ((event.target as Element | null)?.closest?.("button")) playPack();
  }, { capture: true });
}
