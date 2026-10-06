import fs from 'fs';
import path from 'path';

const changelogPath = path.resolve('ethone-next/data/changelog.ts');
const publicJsonPath = path.resolve('ethone-next/public/changelog.json');

const content = fs.readFileSync(changelogPath, 'utf8').replace(/\r\n/g, '\n');

// Find every block starting with "const ..._fr: ChangelogEntry = {"
const blocks = content.split(/const\s+([a-zA-Z0-9_]+_fr):\s*ChangelogEntry\s*=\s*\{/g);

const entries = [];
for (let i = 1; i < blocks.length; i += 2) {
  const varName = blocks[i];
  const body = blocks[i + 1] ? blocks[i + 1].split(/\n\};/)[0] : '';
  
  const versionMatch = body.match(/version:\s*"([^"]+)"/);
  const dateMatch = body.match(/date:\s*"([^"]+)"/);
  const titleMatch = body.match(/title:\s*"([^"]+)"/);
  
  const itemsIdx = body.indexOf('items: [');
  const items = [];
  if (itemsIdx !== -1) {
    const itemsSub = body.slice(itemsIdx);
    const itemRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let im;
    while ((im = itemRegex.exec(itemsSub)) !== null) {
      items.push(im[1].replace(/\\"/g, '"'));
    }
  }

  if (versionMatch && titleMatch) {
    entries.push({
      version: versionMatch[1],
      date: dateMatch ? dateMatch[1] : '',
      title: titleMatch[1],
      items
    });
  }
}

console.log(`Parsed ${entries.length} French entries.`);

function parseSemver(v) {
  const clean = String(v || '').replace(/^v/i, '').trim();
  return clean.split('.').map(part => {
    const n = parseInt(part, 10);
    return isNaN(n) ? 0 : n;
  });
}

function compareEntries(a, b) {
  const timeA = a.date ? new Date(a.date).getTime() : 0;
  const timeB = b.date ? new Date(b.date).getTime() : 0;
  if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
    return timeB - timeA;
  }
  const va = parseSemver(a.version);
  const vb = parseSemver(b.version);
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const x = va[i] || 0;
    const y = vb[i] || 0;
    if (x !== y) return y - x;
  }
  return 0;
}

entries.sort(compareEntries);

const seen = new Set();
const deduped = [];
for (const e of entries) {
  if (!seen.has(e.version)) {
    seen.add(e.version);
    deduped.push(e);
  }
}

const slice = deduped.slice(0, 50);

fs.writeFileSync(publicJsonPath, JSON.stringify(slice, null, 2), 'utf8');
console.log(`Saved ${slice.length} changelog entries to ${publicJsonPath}`);
