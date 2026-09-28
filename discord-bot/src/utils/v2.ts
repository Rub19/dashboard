import { ContainerBuilder } from 'discord.js';
import { getAppEmoji } from '../services/appEmojis.js';
import { container, text, separator, type ContainerPart } from './components.js';

export { V2_FLAGS } from './components.js';

/** Rouge de marque ETHONE (#c2304a). */
export const BRAND_RED = 0xc2304a;

/** Émoji d'application `etho_<name>` si synchronisé, sinon le repli Unicode. */
export function icon(name: string, fallback: string): string {
  return getAppEmoji(`etho_${name}`) ?? fallback;
}

/** Carte V2 : titre en gras, séparateur, puis les parties (texte/section/rangée), barre d'accent rouge de marque par défaut. */
export function v2Container(title: string, sections: ContainerPart[], accent: number = BRAND_RED): ContainerBuilder {
  return container(accent, [text(`## ${title}`), separator(), ...sections]);
}
