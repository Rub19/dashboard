import assert from "node:assert/strict";
import test from "node:test";
import PostalMime from "postal-mime";
import { attachmentSummaries } from "../src/routes/mail.js";

// E-mail entrant tel que Cloudflare le fournit : seul le flux brut (message.raw) est disponible.
const RAW = [
  "From: \"Alice Martin\" <alice@example.com>",
  "To: support@ethone.dev",
  "Subject: Question",
  "MIME-Version: 1.0",
  'Content-Type: multipart/mixed; boundary="b1"',
  "",
  "--b1",
  'Content-Type: multipart/alternative; boundary="b2"',
  "",
  "--b2",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Bonjour, une question sur ETHONE.",
  "--b2",
  "Content-Type: text/html; charset=utf-8",
  "",
  "<p>Bonjour, une question sur <b>ETHONE</b>.</p>",
  "--b2--",
  "--b1",
  'Content-Type: text/plain; name="note.txt"',
  'Content-Disposition: attachment; filename="note.txt"',
  "",
  "contenu",
  "--b1--",
  "",
].join("\r\n");

test("le corps d'un e-mail entrant est décodé depuis le flux brut (avant : toujours vide)", async () => {
  const stream = new Response(RAW).body;
  const parsed = await PostalMime.parse(stream);
  assert.equal(parsed.from.name, "Alice Martin"); // sans les guillemets de l'en-tête
  assert.match(parsed.text, /une question sur ETHONE/);
  assert.match(parsed.html, /<b>ETHONE<\/b>/);
  const [att] = attachmentSummaries(parsed.attachments);
  assert.equal(att.filename, "note.txt");
  assert.equal(att.mime_type, "text/plain");
  assert.ok(att.size > 0);
  assert.equal("content" in att, false);
});
