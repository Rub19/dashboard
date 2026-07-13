import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "icons");
const samples = 4;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const dx = Math.max(left + radius - x, 0, x - (right - radius));
  const dy = Math.max(top + radius - y, 0, y - (bottom - radius));
  return dx * dx + dy * dy <= radius * radius;
}

function lineDistance(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy;
  const amount = length ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length)) : 0;
  return Math.hypot(x - (x1 + amount * dx), y - (y1 + amount * dy));
}

function mix(from, to, amount) {
  return from.map((value, index) => Math.round(value + (to[index] - value) * amount));
}

function sampleColor(x, y, opaque) {
  const outer = insideRoundedRect(x, y, 1.25, 1.25, 62.75, 62.75, 15.25);
  if (!outer && !opaque) return [0, 0, 0, 0];
  if (!outer) return [8, 10, 13, 255];

  const inner = insideRoundedRect(x, y, 4.15, 4.15, 59.85, 59.85, 12.6);
  let color = inner
    ? mix([20, 25, 31], [8, 10, 13], Math.max(0, Math.min(1, y / 64)))
    : mix([123, 229, 195], [139, 201, 250], Math.max(0, Math.min(1, (x + y) / 128)));

  const stroke = 3.15;
  const segments = [
    [19, 18, 19, 46],
    [19, 18, 45, 18],
    [19, 32, 39.5, 32],
    [19, 46, 45, 46]
  ];
  if (segments.some((segment) => lineDistance(x, y, ...segment) <= stroke)) color = [244, 247, 250];
  return [...color, 255];
}

function render(size, { opaque = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const total = [0, 0, 0, 0];
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const color = sampleColor(((x + (sx + 0.5) / samples) / size) * 64, ((y + (sy + 0.5) / samples) / size) * 64, opaque);
          color.forEach((value, index) => { total[index] += value; });
        }
      }
      const offset = (y * size + x) * 4;
      total.forEach((value, index) => { rgba[offset + index] = Math.round(value / (samples * samples)); });
    }
  }
  return encodePng(size, rgba);
}

function encodeIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header[entry] = size >= 256 ? 0 : size;
    header[entry + 1] = size >= 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.png)]);
}

fs.mkdirSync(output, { recursive: true });
const faviconImages = [16, 32, 48].map((size) => ({ size, png: render(size) }));
for (const image of faviconImages) fs.writeFileSync(path.join(output, `ethone-favicon-${image.size}.png`), image.png);
fs.writeFileSync(path.join(output, "ethone-favicon-64.png"), render(64));
fs.writeFileSync(path.join(output, "ethone-apple-touch-180.png"), render(180, { opaque: true }));
fs.writeFileSync(path.join(output, "ethone-icon-192.png"), render(192));
fs.writeFileSync(path.join(output, "ethone-icon-512.png"), render(512));
fs.writeFileSync(path.join(output, "ethone-icon-maskable-512.png"), render(512, { opaque: true }));
fs.writeFileSync(path.join(output, "favicon.ico"), encodeIco(faviconImages));

console.log("ETHONE icon assets generated: 16, 32, 48, 64, 180, 192, 512 and maskable 512.");
