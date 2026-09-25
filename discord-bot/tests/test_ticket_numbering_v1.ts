/** Numérotation des tickets : pas de doublon en cas d'ouvertures simultanées ni après une suppression. Dossier temporaire. */
import fs from 'fs';
import os from 'os';
import path from 'path';

process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ethone-ticket-test-')));
const { ticketRepository } = await import('../src/modules/tickets/storage/ticketRepository.js');

let fail = 0;
const ok = (c: boolean, n: string) => {
  console.log(`  ${c ? '✅' : '❌'} ${n}`);
  if (!c) fail++;
};
const G = 'g-ticket-test';
const fake = (n: number) => ({ id: `TICKET-${String(n).padStart(4, '0')}`, guildId: G, userId: 'u', status: 'OPEN' }) as any;

const a = ticketRepository.reserveTicketNumber(G);
const b = ticketRepository.reserveTicketNumber(G); // deux réservations avant toute sauvegarde = deux ouvertures simultanées
ok(a === 1 && b === 2, `deux ouvertures simultanées reçoivent 1 et 2 (reçu ${a} et ${b})`);

ticketRepository.saveTicket(fake(1));
ticketRepository.saveTicket(fake(2));
ticketRepository.saveTicket(fake(3));
ticketRepository.deleteTicket(G, 'TICKET-0002');
const c = ticketRepository.reserveTicketNumber(G);
ok(c === 4, `après suppression d'un ticket, le numéro suivant ne réutilise pas un numéro existant (reçu ${c})`);
ok(ticketRepository.reserveTicketNumber('autre-serveur') === 1, 'la numérotation est propre à chaque serveur');

console.log(fail ? `\n${fail} échec(s)` : '\nTout est bon');
process.exit(fail ? 1 : 0);
