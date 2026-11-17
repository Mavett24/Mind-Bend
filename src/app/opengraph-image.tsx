import { ImageResponse } from "next/og";
import { GAMES } from "@/games/registry";
import { MONO, OG_FONTS, OG_SIZE, OgFrame, OgIcon, OgPrompt, OgWordmark, token } from "@/lib/og";

// Site-wide link preview (D-061). Pages without their own image (home, stats, credits, privacy) use this one.
export const alt = "Mind Bend: eight daily brain games. Logic puzzles, memory, trivia and chess tactics.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <OgWordmark />
          <OgPrompt>free · no sign-up</OgPrompt>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
          <OgPrompt>~/mind-bend $ daily</OgPrompt>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 14,
              fontFamily: MONO,
              fontWeight: 500,
              fontSize: 84,
              lineHeight: 1,
              letterSpacing: "-0.05em",
            }}
          >
            <span style={{ color: token("paper") }}>Eight games.</span>
            <span style={{ color: token("steel"), marginTop: 6 }}>Fresh daily.</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto" }}>
          {GAMES.map((g) => (
            <div key={g.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: 112 }}>
              <OgIcon id={g.id} size={88} />
              <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 20, color: token("fog") }}>{g.name}</span>
            </div>
          ))}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: OG_FONTS },
  );
}
