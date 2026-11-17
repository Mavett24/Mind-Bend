/**
 * Builds the country flags shown in trivia's higher or lower (D-064) into public/flags/.
 *
 *   node scripts/build-flags.mjs
 *
 * Reads every `code` (ISO 3166-1 alpha-2, lower case) in public/data/trivia/higher-lower.json and
 * renders that flag from the flag-icons package (MIT, 4:3 SVGs) to a 240×180 WebP. Some source
 * SVGs are over 100 KB; the WebPs are a few KB each, which matters on phones.
 * Needs `sharp` (installed with Next.js). Run again after scripts/build-data.mjs changes the decks.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const FLAGS = join(dirname(require.resolve("flag-icons/package.json")), "flags/4x3");
const OUT = "public/flags";
const WIDTH = 240;
const HEIGHT = 180;

const decks = JSON.parse(readFileSync("public/data/trivia/higher-lower.json", "utf8"));
const codes = [...new Set(decks.flatMap((d) => d.items.map((i) => i.code)).filter(Boolean))].sort();

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let bytes = 0;
for (const code of codes) {
  const svg = readFileSync(join(FLAGS, `${code}.svg`));
  const webp = await sharp(svg, { density: 300 }).resize(WIDTH, HEIGHT, { fit: "fill" }).webp({ quality: 82 }).toBuffer();
  writeFileSync(join(OUT, `${code}.webp`), webp);
  bytes += webp.length;
}
console.log(`${codes.length} flags, ${Math.round(bytes / 1024)} KB`);
