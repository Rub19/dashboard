"use client";

import { memo, type ComponentType } from "react";
import { Icon, addCollection, type IconifyJSON } from "@iconify/react";
import iconSet from "@/lib/ethone-icon-set.json";

// Jeu d'icônes ETHONE : téléchargé une fois depuis l'API Iconify (scripts/build-icon-set.mjs) puis embarqué
// dans le projet. Enregistré en mémoire au chargement : aucun appel réseau, rendu immédiat, CSP inchangée.
addCollection(iconSet as unknown as IconifyJSON);

export type EthoneIconName = keyof typeof iconSet.icons;

export interface EthoneIconProps {
  className?: string;
  /** Ignoré : les icônes duotone n'ont pas de trait réglable. Présent pour rester interchangeable avec Lucide. */
  strokeWidth?: number;
}

/** `<EthoneIcon name="mod-security" className="h-5 w-5" />` — hérite de la couleur du texte (currentColor). */
export const EthoneIcon = memo(function EthoneIcon({ name, className }: EthoneIconProps & { name: EthoneIconName }) {
  return <Icon icon={`ethone:${name}`} className={className} aria-hidden="true" />;
});

/**
 * Fabrique un composant d'icône à identité stable, utilisable partout où l'on attendait un composant Lucide
 * (`icon: LucideIcon`) : `const HomeIcon = ethoneIcon("home")`. À appeler au niveau du module, jamais dans un rendu.
 */
export function ethoneIcon(name: EthoneIconName): ComponentType<EthoneIconProps> {
  const Component = ({ className }: EthoneIconProps) => <EthoneIcon name={name} className={className} />;
  Component.displayName = `EthoneIcon(${name})`;
  return Component;
}
