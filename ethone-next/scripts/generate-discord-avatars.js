const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, '..', 'public', 'branding');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Perfectly circular Discord avatar with glowing gradient ring
const svgCircularRing = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#122b2b" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#0a1219" stop-opacity="1"/>
      <stop offset="100%" stop-color="#05080c" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="ethone-signal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7be5c3"/>
      <stop offset="50%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="e-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#7be5c3" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Full Background Circle -->
  <circle cx="512" cy="512" r="512" fill="#06090e"/>
  
  <!-- Outer Glow Ring -->
  <circle cx="512" cy="512" r="486" fill="none" stroke="url(#ethone-signal)" stroke-width="28" filter="url(#glow)"/>
  <circle cx="512" cy="512" r="486" fill="none" stroke="url(#ethone-signal)" stroke-width="24"/>
  
  <!-- Inner Background Area -->
  <circle cx="512" cy="512" r="468" fill="url(#bg-glow)"/>

  <!-- Centered Iconic ETHONE E -->
  <path d="M330 300v424 M330 300h364 M330 512h280 M330 724h364" 
        fill="none" 
        stroke="#ffffff" 
        stroke-width="84" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        filter="url(#e-glow)"/>
</svg>
`;

// 2. Full Solid Gradient Circle (Modern Neo-Glass Discord Avatar)
const svgNeonBadge = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="ethone-signal-solid" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="40%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <filter id="badge-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <circle cx="512" cy="512" r="512" fill="#040608"/>
  <circle cx="512" cy="512" r="480" fill="url(#ethone-signal-solid)"/>
  
  <!-- Inner Dark Disc -->
  <circle cx="512" cy="512" r="448" fill="#080c14"/>

  <!-- Centered E -->
  <path d="M340 310v404 M340 310h344 M340 512h260 M340 714h344" 
        fill="none" 
        stroke="#ffffff" 
        stroke-width="80" 
        stroke-linecap="round" 
        stroke-linejoin="round"/>
</svg>
`;

async function main() {
  const p1 = path.join(outDir, 'ethone-discord-avatar.png');
  const p2 = path.join(outDir, 'ethone-discord-avatar-solid.png');
  const p3 = path.join(outDir, 'ethone-discord-avatar-512.png');
  const userDesktop = path.join(process.env.USERPROFILE || 'C:\\Users\\storm', 'Desktop', 'ethone-discord-avatar.png');

  await sharp(Buffer.from(svgCircularRing)).png().toFile(p1);
  await sharp(Buffer.from(svgNeonBadge)).png().toFile(p2);
  await sharp(Buffer.from(svgCircularRing)).resize(512, 512).png().toFile(p3);

  try {
    fs.copyFileSync(p1, userDesktop);
    console.log('Successfully copied to Desktop:', userDesktop);
  } catch (e) {
    console.log('Desktop copy skipped:', e.message);
  }

  console.log('Generated avatars:');
  console.log('1. ', p1);
  console.log('2. ', p2);
  console.log('3. ', p3);
}

main().catch(console.error);
