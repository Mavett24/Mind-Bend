/**
 * Builds the app icons from one mark: a terminal prompt (paper chevron) and the wordmark's
 * ember block cursor on the raised dark surface (DESIGN.md §1, D-060).
 *
 *   node scripts/build-icons.mjs
 *
 * Writes:
 *   src/app/icon.svg            browser tab (modern browsers)
 *   src/app/favicon.ico         16, 32 and 48 px PNGs in one ICO (older browsers, Windows)
 *   src/app/apple-icon.png      180 px, full bleed (iOS rounds the corners itself)
 *   public/icons/icon-192.png   PWA
 *   public/icons/icon-512.png   PWA
 *   public/icons/icon-maskable-512.png  PWA, mark inside the 80% safe zone
 *
 * Needs `sharp` (installed with Next.js). Output is committed, so this only runs when the mark changes.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

// Tokens from src/app/globals.css.
const C = {
  surfaceTop: "#0e0e0e",
  surfaceBottom: "#262623",
  paper: "#eeeeee",
  ember: "#da5c2c",
};

/**
 * The mark on a 64 grid.
 * @param {{ radius: number, scale: number }} o radius of the tile corners, scale of the glyph around the centre
 */
function mark({ radius, scale }) {
  const t = (1 - scale) * 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.surfaceTop}"/>
      <stop offset="1" stop-color="${C.surfaceBottom}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="${radius}" fill="url(#s)"/>
  <g transform="translate(${t} ${t}) scale(${scale})">
    <path d="M14 19.5 26.5 32 14 44.5" fill="none" stroke="${C.paper}" stroke-width="6.5" stroke-linecap="square"/>
    <rect x="33" y="18" width="15" height="28" fill="${C.ember}"/>
  </g>
</svg>
`;
}

const rounded = mark({ radius: 14, scale: 1 });
const square = mark({ radius: 0, scale: 1 });
const maskable = mark({ radius: 0, scale: 0.72 });

const png = (svg, size) => sharp(Buffer.from(svg), { density: (72 * size) / 64 }).resize(size, size).png().toBuffer();

/** Packs PNG images into one ICO file (PNG entries are valid in ICO since Windows Vista). */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((im) => im.data)]);
}

mkdirSync("public/icons", { recursive: true });

writeFileSync("src/app/icon.svg", rounded);
const icoSizes = [16, 32, 48];
writeFileSync("src/app/favicon.ico", ico(await Promise.all(icoSizes.map(async (size) => ({ size, data: await png(rounded, size) })))));
writeFileSync("src/app/apple-icon.png", await png(square, 180));
writeFileSync("public/icons/icon-192.png", await png(rounded, 192));
writeFileSync("public/icons/icon-512.png", await png(rounded, 512));
writeFileSync("public/icons/icon-maskable-512.png", await png(maskable, 512));

console.log("icons written");
