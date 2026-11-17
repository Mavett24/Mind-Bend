/**
 * Shared pieces for the link preview images (Open Graph and X cards, D-061).
 * Rendered at build time by next/og, so colours are read from the design tokens in globals.css
 * rather than CSS variables, and fonts are the Geist files shipped with the `geist` package.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { glyphs } from "@/components/GameIcon";
import type { GameId } from "@/games/registry";

export const OG_SIZE = { width: 1200, height: 630 };

const css = await readFile(join(process.cwd(), "src/app/globals.css"), "utf8");

/** A colour token from globals.css, e.g. token("ember") or token("hue-path"). */
export function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!match) throw new Error(`og: missing colour token --color-${name}`);
  return match[1];
}

const fontDir = join(process.cwd(), "node_modules/geist/dist/fonts");
const [monoMedium, monoBold, sansRegular] = await Promise.all([
  readFile(join(fontDir, "geist-mono/GeistMono-Medium.ttf")),
  readFile(join(fontDir, "geist-mono/GeistMono-Bold.ttf")),
  readFile(join(fontDir, "geist-sans/Geist-Regular.ttf")),
]);

export const OG_FONTS = [
  { name: "Geist Mono", data: monoMedium, weight: 500 as const, style: "normal" as const },
  { name: "Geist Mono", data: monoBold, weight: 700 as const, style: "normal" as const },
  { name: "Geist", data: sansRegular, weight: 400 as const, style: "normal" as const },
];

export const MONO = "Geist Mono";
export const SANS = "Geist";

/** The header wordmark: mind_bend and the ember block cursor. */
export function OgWordmark({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.2, fontFamily: MONO, fontWeight: 700, fontSize: size, color: token("paper"), letterSpacing: "-0.02em" }}>
      mind_bend
      <div style={{ width: size * 0.55, height: size * 1.05, background: token("ember") }} />
    </div>
  );
}

/** A game's squircle icon tile: hue fill, black glyph, top highlight. */
export function OgIcon({ id, size }: { id: GameId; size: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: token(`hue-${id}`),
        boxShadow: "inset 0 2px 0 rgba(255,255,255,0.25), 0 6px 18px rgba(0,0,0,0.45)",
        color: token("void"),
      }}
    >
      <svg viewBox="0 0 20 20" width={size * 0.55} height={size * 0.55} style={{ color: token("void") }}>
        {glyphs[id]}
      </svg>
    </div>
  );
}

/** The 1200×630 canvas: void page with the raised surface gradient and an optional glow in a hue. */
export function OgFrame({ glow, children }: { glow?: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: token("void"),
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          right: 24,
          bottom: 24,
          display: "flex",
          overflow: "hidden",
          borderRadius: 40,
          backgroundImage: `linear-gradient(${token("surface-top")}, ${token("surface-bottom")})`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {glow ? (
          <div
            style={{
              position: "absolute",
              right: -184,
              bottom: -284,
              width: 760,
              height: 760,
              display: "flex",
              borderRadius: 9999,
              backgroundImage: `radial-gradient(circle, ${glow}55 0%, ${glow}00 65%)`,
            }}
          />
        ) : null}
      </div>
      <div style={{ position: "absolute", top: 24, left: 24, right: 24, bottom: 24, display: "flex", flexDirection: "column", padding: "48px 56px" }}>
        {children}
      </div>
    </div>
  );
}

/** Terminal prompt line, as on the hero and footer. */
export function OgPrompt({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", fontFamily: MONO, fontWeight: 500, fontSize: 24, color: token("steel") }}>{children}</div>;
}
