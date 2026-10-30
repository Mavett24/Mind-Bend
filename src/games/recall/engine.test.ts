import { describe, expect, it } from "vitest";
import { TIERS } from "@/engine/difficulty";
import { colourDistance, deltaE2000, inGamut, oklchToHex, rgbToLab, toGamut } from "./color";
import { accuracy, finalScore, generateRecall, ROUNDS, scoreGuess } from "./engine";

describe("colour science", () => {
  it("matches the CIEDE2000 reference pairs (Sharma, Wu, Dalal 2005)", () => {
    // Selected pairs from the published test data set.
    const pairs: [[number, number, number], [number, number, number], number][] = [
      [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
      [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
      [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
      [[50, 0, 0], [50, -1, 2], 2.3669],
      [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
      [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
      [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
      [[90.8027, -2.0831, 1.441], [91.1528, -1.6435, 0.0447], 1.4441],
    ];
    for (const [a, b, expected] of pairs) expect(deltaE2000(a, b)).toBeCloseTo(expected, 3);
  });

  it("converts pure white and black to the right Lab values", () => {
    const white = rgbToLab([1, 1, 1]);
    expect(white[0]).toBeCloseTo(100, 1);
    expect(Math.abs(white[1]) + Math.abs(white[2])).toBeLessThan(0.05);
    expect(rgbToLab([0, 0, 0])[0]).toBeCloseTo(0, 3);
  });

  it("maps out-of-gamut colours into sRGB by reducing chroma only", () => {
    const loud = { l: 0.7, c: 0.37, h: 140 };
    expect(inGamut(loud)).toBe(false);
    const mapped = toGamut(loud);
    expect(inGamut(mapped)).toBe(true);
    expect(mapped.l).toBe(loud.l);
    expect(mapped.h).toBe(loud.h);
    expect(oklchToHex(loud)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("scores identical colours as zero distance", () => {
    const c = { l: 0.6, c: 0.1, h: 30 };
    expect(colourDistance(c, c)).toBeCloseTo(0, 6);
  });
});

describe("recall generator", () => {
  for (const tier of TIERS) {
    it(`${tier}: colours are in gamut, distinct within a round, targets valid`, () => {
      for (let s = 0; s < 50; s++) {
        const p = generateRecall({ gameId: "recall", tier, seed: `t-${s}` });
        expect(p.rounds).toHaveLength(ROUNDS);
        for (const round of p.rounds) {
          round.tiles.forEach((t) => expect(inGamut(t)).toBe(true));
          for (let i = 0; i < round.tiles.length; i++) {
            for (let j = i + 1; j < round.tiles.length; j++) {
              expect(colourDistance(round.tiles[i], round.tiles[j])).toBeGreaterThanOrEqual(20);
            }
          }
          expect(new Set(round.targets).size).toBe(round.targets.length);
          round.targets.forEach((t) => expect(t).toBeLessThan(round.tiles.length));
          expect(round.starts).toHaveLength(round.targets.length);
        }
      }
    });
  }

  it("shows more tiles for less time on harder tiers", () => {
    const easy = generateRecall({ gameId: "recall", tier: "easy", seed: "x" });
    const expert = generateRecall({ gameId: "recall", tier: "expert", seed: "x" });
    expect(easy.rounds[0].tiles).toHaveLength(1);
    expect(expert.rounds[0].tiles).toHaveLength(4);
    expect(expert.rounds[0].targets).toHaveLength(2);
    expect(expert.displayMs).toBeLessThan(easy.displayMs);
  });

  it("is deterministic per seed", () => {
    const a = generateRecall({ gameId: "recall", tier: "hard", seed: "same" });
    expect(generateRecall({ gameId: "recall", tier: "hard", seed: "same" })).toEqual(a);
  });
});

describe("recall scoring", () => {
  it("maps distance to a 0 to 10 score that falls monotonically", () => {
    expect(accuracy(0)).toBe(10);
    expect(accuracy(40)).toBe(0);
    expect(accuracy(80)).toBe(0);
    let prev = 11;
    for (let d = 0; d <= 40; d += 2) {
      const a = accuracy(d);
      expect(a).toBeLessThanOrEqual(prev);
      prev = a;
    }
    expect(accuracy(5)).toBeGreaterThan(8);
  });

  it("rewards a near-miss and punishes a different hue", () => {
    const target = { l: 0.6, c: 0.15, h: 250 };
    expect(scoreGuess(target, { l: 0.62, c: 0.14, h: 255 }).points).toBeGreaterThan(8);
    expect(scoreGuess(target, { l: 0.6, c: 0.15, h: 70 }).points).toBeLessThan(2);
  });

  it("averages rounds", () => {
    expect(finalScore([10, 5, 6])).toBe(7);
    expect(finalScore([])).toBe(0);
  });
});
