/**
 * Colour science for recall. Pure TypeScript.
 * OKLCH for sampling and the picker (perceptually even sliders),
 * CIELAB + CIEDE2000 for scoring (the industry standard for "how different do these look").
 */

export interface Oklch {
  l: number; // 0..1
  c: number; // 0..~0.37
  h: number; // degrees
}

type Rgb = [number, number, number]; // 0..1, gamma-encoded sRGB
type Lab = [number, number, number];

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

// ---------------------------------------------------------------- OKLCH -> sRGB

function oklchToLinearSrgb({ l, c, h }: Oklch): Rgb {
  const a = c * Math.cos(toRad(h));
  const b = c * Math.sin(toRad(h));
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const L = l_ ** 3;
  const M = m_ ** 3;
  const S = s_ ** 3;
  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}

const encode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const decode = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

export function inGamut(color: Oklch): boolean {
  const eps = 1e-4;
  return oklchToLinearSrgb(color).every((v) => v >= -eps && v <= 1 + eps);
}

/** Reduces chroma until the colour fits sRGB (keeps lightness and hue, like CSS gamut mapping). */
export function toGamut(color: Oklch): Oklch {
  if (inGamut(color)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...color, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}

export function oklchToRgb(color: Oklch): Rgb {
  return oklchToLinearSrgb(toGamut(color)).map((v) => Math.min(1, Math.max(0, encode(v)))) as Rgb;
}

export function oklchToHex(color: Oklch): string {
  return `#${oklchToRgb(color)
    .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

// ---------------------------------------------------------------- sRGB -> CIELAB (D65)

export function rgbToLab([r, g, b]: Rgb): Lab {
  const [R, G, B] = [decode(r), decode(g), decode(b)];
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// ---------------------------------------------------------------- CIEDE2000

export function deltaE2000([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hp = (a: number, b: number) => (a === 0 && b === 0 ? 0 : (toDeg(Math.atan2(b, a)) + 360) % 360);
  const h1p = hp(a1p, b1);
  const h2p = hp(a2p, b2);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(toRad(dhp / 2));

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
    else hbarp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos(toRad(hbarp - 30)) +
    0.24 * Math.cos(toRad(2 * hbarp)) +
    0.32 * Math.cos(toRad(3 * hbarp + 6)) -
    0.2 * Math.cos(toRad(4 * hbarp - 63));
  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(toRad(2 * dTheta)) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

export function colourDistance(a: Oklch, b: Oklch): number {
  return deltaE2000(rgbToLab(oklchToRgb(a)), rgbToLab(oklchToRgb(b)));
}
