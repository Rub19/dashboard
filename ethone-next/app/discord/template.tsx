import type { ReactNode } from "react";

/**
 * Remonté à chaque navigation dans /discord : le contenu de chaque page de module entre en cascade
 * (animation CSS `discord-route`, sans transform résiduel ni coût JS).
 */
export default function DiscordTemplate({ children }: { children: ReactNode }) {
  return <div className="discord-route contents">{children}</div>;
}
