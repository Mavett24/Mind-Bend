import { describe, expect, it } from "vitest";
import { CONSENT_MAX_AGE_MS, CONSENT_VERSION, cookieDomains, currentChoice, gaCookieNames, makeRecord } from "./consent";

const now = new Date("2026-11-02T12:00:00Z");

describe("currentChoice", () => {
  it("keeps a fresh choice", () => {
    expect(currentChoice(makeRecord("granted", now), now)).toBe("granted");
    expect(currentChoice(makeRecord("denied", now), now)).toBe("denied");
  });

  it("asks again after 12 months", () => {
    const old = makeRecord("granted", new Date(now.getTime() - CONSENT_MAX_AGE_MS - 1));
    expect(currentChoice(old, now)).toBeNull();
  });

  it("asks again when the version changes", () => {
    expect(currentChoice({ ...makeRecord("granted", now), v: CONSENT_VERSION - 1 }, now)).toBeNull();
  });

  it("ignores missing, malformed and future records", () => {
    expect(currentChoice(null, now)).toBeNull();
    expect(currentChoice("granted", now)).toBeNull();
    expect(currentChoice({ v: CONSENT_VERSION, choice: "maybe", at: now.toISOString() }, now)).toBeNull();
    expect(currentChoice({ v: CONSENT_VERSION, choice: "granted", at: "not a date" }, now)).toBeNull();
    expect(currentChoice(makeRecord("granted", new Date(now.getTime() + 60_000)), now)).toBeNull();
  });
});

describe("gaCookieNames", () => {
  it("finds _ga and stream cookies only", () => {
    const jar = "_ga=GA1.1.123.456; _ga_NYRL1D8R69=GS2.1.s1; mind-bend=1; _gat=1; _gads=x";
    expect(gaCookieNames(jar)).toEqual(["_ga", "_ga_NYRL1D8R69"]);
    expect(gaCookieNames("")).toEqual([]);
  });
});

describe("cookieDomains", () => {
  it("covers host-only and every parent domain", () => {
    expect(cookieDomains("mind-bend.vercel.app")).toEqual([null, "mind-bend.vercel.app", "vercel.app"]);
    expect(cookieDomains("localhost")).toEqual([null]);
  });
});
