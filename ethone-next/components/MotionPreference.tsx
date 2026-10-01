"use client";

import { MotionConfig } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";

/** Préférence de mouvement globale pour framer-motion : le réglage ETHONE « Réduire les animations »
 * force la réduction partout, sinon on suit le système (prefers-reduced-motion). Sans ça, chaque
 * composant devait y penser lui-même et beaucoup d'animations (pastilles layoutId…) l'ignoraient. */
export default function MotionPreference({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  return <MotionConfig reducedMotion={settings.reducedMotion ? "always" : "user"}>{children}</MotionConfig>;
}
