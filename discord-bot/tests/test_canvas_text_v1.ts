/** Texte dessiné dans les images (stats, carte d'accueil) : lettres décoratives normalisées, symboles retirés, jamais de carrés vides. */
import { safeText } from '../src/utils/canvasText.js';

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};

ok(safeText('𝕷𝖔𝖗𝖉 𝕾𝖚𝖕𝖗𝖆') === 'Lord Supra', 'lettres mathématiques décoratives → « Lord Supra »');
ok(safeText('𝓛𝓸𝓻𝓭 𝓢𝓾𝓹𝓻𝓪') === 'Lord Supra', 'écriture cursive décorative');
ok(safeText('ｆｕｌｌｗｉｄｔｈ') === 'fullwidth', 'lettres pleine chasse');
ok(safeText('ф 𝕷𝖔𝖗𝖉 ф — Serveur') === 'ф Lord ф — Serveur', 'cyrillique conservé, tiret conservé');
ok(safeText('Café Ünïcode ñ') === 'Café Ünïcode ñ', 'accents latins conservés');
ok(safeText('Salon 🔥 général ✨') === 'Salon général', 'émojis retirés, espaces propres');
ok(safeText('🔥🔥🔥', 'Membre') === 'Membre', 'rien de lisible : texte de repli');
ok(safeText('★彡 ★', 'Membre') === 'Membre', 'symboles seuls : texte de repli');
ok(safeText('', 'x') === 'x' && safeText(undefined as unknown as string, 'y') === 'y', 'vide ou absent : repli');
ok(safeText('ﬁn ①') === 'fin 1', 'ligatures et chiffres cerclés ramenés à la forme normale');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
