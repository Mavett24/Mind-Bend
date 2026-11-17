import { ImageResponse } from "next/og";
import { GAMES, getGame } from "@/games/registry";
import { MONO, OG_FONTS, OG_SIZE, OgFrame, OgIcon, OgPrompt, OgWordmark, token } from "@/lib/og";

// Per game link preview (D-061). Challenge links (/play/<game>?s=...) share this card.
export const alt = "A Mind Bend game: its icon, name and one line on how to play.";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return GAMES.map((g) => ({ game: g.id }));
}

export default async function Image({ params }: { params: Promise<{ game: string }> }) {
  const game = getGame((await params).game) ?? GAMES[0];
  const hue = token(`hue-${game.id}`);

  return new ImageResponse(
    (
      <OgFrame glow={hue}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <OgWordmark />
          <OgPrompt>{`~/mind-bend $ play ${game.id}`}</OgPrompt>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 44, marginTop: 48 }}>
          <OgIcon id={game.id} size={176} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 22, letterSpacing: "0.08em", textTransform: "uppercase", color: token("ash") }}>
              {game.skill}
            </span>
            <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 132, lineHeight: 1, letterSpacing: "-0.05em", color: token("paper"), marginTop: 8 }}>
              {game.name}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 36, maxWidth: 980, fontSize: 40, lineHeight: 1.3, color: token("fog") }}>{game.tagline}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto", fontFamily: MONO, fontWeight: 500, fontSize: 24, color: token("ash") }}>
          <div style={{ width: 10, height: 10, borderRadius: 9999, background: hue }} />
          daily board · four tiers · free, no sign-up
        </div>
      </OgFrame>
    ),
    { ...size, fonts: OG_FONTS },
  );
}
