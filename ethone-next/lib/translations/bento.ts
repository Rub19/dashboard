export const SUPPORTED_LOCALES = ["fr", "en", "es", "de", "ja"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const BENTO_LABELS: Record<Locale, Record<string, string>> = {
  fr: {
    tasks: "Tâches",
    focusTimer: "Focus Timer",
    captureBrain: "Capture Brain",
    metrics: "Métriques",
    supportStripe: "Soutenir via Stripe",
  },
  en: {
    tasks: "Tasks",
    focusTimer: "Focus Timer",
    captureBrain: "Brain Capture",
    metrics: "Metrics",
    supportStripe: "Support via Stripe",
  },
  es: {
    tasks: "Tareas",
    focusTimer: "Temporizador de enfoque",
    captureBrain: "Captura Brain",
    metrics: "Métricas",
    supportStripe: "Apoyar vía Stripe",
  },
  de: {
    tasks: "Aufgaben",
    focusTimer: "Fokus-Timer",
    captureBrain: "Brain-Erfassung",
    metrics: "Metriken",
    supportStripe: "Unterstützung via Stripe",
  },
  ja: {
    tasks: "タスク",
    focusTimer: "フォーカスタイマー",
    captureBrain: "Brainキャプチャ",
    metrics: "メトリクス",
    supportStripe: "Stripeで支援",
  },
};

export function getBentoLabel(locale: Locale, key: string): string {
  return BENTO_LABELS[locale]?.[key] ?? BENTO_LABELS["fr"][key] ?? key;
}
