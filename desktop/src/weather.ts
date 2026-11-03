export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export function weatherKind(code: number | null | undefined): WeatherKind {
  const value = code ?? 0;
  if (value <= 1) return "clear";
  if (value === 2) return "partly";
  if (value === 3) return "cloudy";
  if (value === 45 || value === 48) return "fog";
  if (value >= 51 && value <= 57) return "drizzle";
  if ((value >= 71 && value <= 77) || value === 85 || value === 86) return "snow";
  if (value >= 95) return "storm";
  return "rain";
}

export const hourOf = (time: string | undefined) => time?.slice(11, 16) ?? "";

export function cityTime(iso: string | null | undefined, offsetSeconds: number | null | undefined): string {
  const stamp = Date.parse(iso ?? "");
  if (Number.isNaN(stamp)) return "";
  return new Date(stamp + (offsetSeconds ?? 0) * 1000).toISOString().slice(11, 16);
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
export const compass = (degrees: number) => COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];

export function uvLevel(uv: number): "low" | "moderate" | "high" | "very" {
  if (uv < 3) return "low";
  if (uv < 6) return "moderate";
  if (uv < 8) return "high";
  return "very";
}

export function airLevel(aqi: number): "good" | "fair" | "moderate" | "poor" | "bad" {
  if (aqi <= 20) return "good";
  if (aqi <= 40) return "fair";
  if (aqi <= 60) return "moderate";
  if (aqi <= 80) return "poor";
  return "bad";
}

export function nextRain(hours: { time?: string; precipitationProbability?: number | null }[]): string | null {
  return hours.find((hour) => (hour.precipitationProbability ?? 0) >= 50)?.time ?? null;
}

export function rangeBar(min: number, max: number, lowest: number, highest: number) {
  const span = highest - lowest || 1;
  return { left: ((min - lowest) / span) * 100, width: Math.max(((max - min) / span) * 100, 4) };
}

export function toggleCity(cities: string[], city: string): string[] {
  return cities.includes(city) ? cities.filter((item) => item !== city) : [...cities, city];
}
