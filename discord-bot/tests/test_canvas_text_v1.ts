/** Texte dessiné dans les images (stats, carte d'accueil) : lettres décoratives normalisées, symboles retirés, jamais de carrés vides. */
import { safeText } from '../src/utils/canvasText.js';
import { renderRankCard } from '../src/modules/leveling/images/rankCard.js';

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

const card = await renderRankCard({ username: '𝕷𝖔𝖗𝖉 𝕾𝖚𝖕𝖗𝖆', avatarUrl: null, rank: 1, totalMembers: 10, level: 3, totalXp: 350, currentLevelXp: 50, nextLevelXp: 100, progressPercentage: 50, messages: 42, accent: '#f59e0b', nextReward: { name: '🔥', level: 5 } });
ok(card.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && card.length > 5000, 'carte de rang : image PNG valide même sans avatar, avec nom décoratif et rôle à emoji');
const bad = await renderRankCard({ username: '', avatarUrl: 'http://127.0.0.1:1/x.png', rank: 1, totalMembers: 0, level: 0, totalXp: 0, currentLevelXp: 0, nextLevelXp: 100, progressPercentage: 0, messages: 0, accent: 'pas-une-couleur' });
ok(bad.length > 5000, 'carte de rang : avatar injoignable, nom vide et couleur invalide ne font pas échouer le rendu');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
