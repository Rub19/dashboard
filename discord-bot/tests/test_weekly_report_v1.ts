import { isReportDue } from '../src/services/weeklySecurityReportService.js';

let ok = 0;
let ko = 0;
const check = (label: string, cond: boolean) => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}`);
  cond ? ok++ : ko++;
};

const monday10 = new Date('2026-10-12T10:00:00Z');
check('lundi 10 h, jamais envoyé : dû', isReportDue(null, monday10));
check('lundi 8 h : pas encore', !isReportDue(null, new Date('2026-10-12T08:00:00Z')));
check('mardi : jamais', !isReportDue(null, new Date('2026-10-13T10:00:00Z')));
check('déjà envoyé ce lundi à 9 h : pas de doublon', !isReportDue('2026-10-12T09:00:00Z', monday10));
check('envoyé le lundi précédent : dû', isReportDue('2026-10-05T09:00:00Z', monday10));
console.log(`\n${ok} réussis, ${ko} échoués`);
if (ko) process.exit(1);
