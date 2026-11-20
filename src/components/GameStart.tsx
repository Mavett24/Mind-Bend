"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { GAMES, type GameMeta } from "@/games/registry";
import { MODULES, OWN_SESSION, playable } from "@/games/modules";
import { ChessSession } from "@/games/chess/Session";
import { DAILY_TARGETS } from "@/games/chess/engine";
import { RushSession } from "@/games/chess/RushSession";
import { cardOpenDone } from "@/lib/cardOpen";
import { isRushMinutes, RUSH_MINUTES, rushBests, type RushMinutes } from "@/games/chess/rush";
import { useHistory } from "@/lib/history";
import { isTier, suggestTier, TIERS, TIER_LABEL, type Tier } from "@/engine/difficulty";
import { boardSeed, dailyBoard, isValidSeed, randomSeed, type BoardKey, type Mode } from "@/engine/seed";
import { levelProgress, PUZZLE_RATED, startRating } from "@/engine/history";
import { useProfile } from "@/lib/profile";
import { useToday } from "@/lib/useToday";
import { dur, ease } from "@/lib/motion";
import { Button } from "./Button";
import { GameIntroScreen, introSkipped } from "./GameIntro";
import { INTRO } from "@/games/intro";
import { PlaySession } from "./PlaySession";
import { PointsDisplay, TimeDisplay } from "./TimeDisplay";
import { GameIcon, gameColours, hue } from "./GameIcon";
import { MiniBoard } from "./GameArt";
import { Sparkline, TierBar } from "./charts";
import { Segmented } from "./Segmented";
import { TitleReveal } from "./TitleReveal";

export function GameStart({ game }: { game: GameMeta }) {
  const params = useSearchParams();
  const today = useToday();

  const challenge = useMemo(() => {
    const t = params.get("t");
    const s = params.get("s");
    return isTier(t) && isValidSeed(s) ? { tier: t, seed: s } : null;
  }, [params]);

  // Puzzle Rush is chess only (D-071). A shared run is /play/chess?m=rush&r=3&s=<seed>&b=<score to beat>.
  const hasRush = game.id === "chess";
  const rushLink = useMemo(() => {
    if (!hasRush || params.get("m") !== "rush") return null;
    const r = params.get("r");
    const s = params.get("s");
    const b = Number(params.get("b"));
    return {
      minutes: (isRushMinutes(r) ? Number(r) : 3) as RushMinutes,
      seed: isValidSeed(s) ? s : null,
      beat: Number.isInteger(b) && b > 0 && b < 1000 ? b : null,
    };
  }, [hasRush, params]);
  /** The friend's run waits for the first rush; after that, every run gets a fresh seed. */
  const [friendRun, setFriendRun] = useState(rushLink?.seed ? { seed: rushLink.seed, beat: rushLink.beat } : null);
  const [minutes, setMinutes] = useState<RushMinutes>(rushLink?.minutes ?? 3);
  const [beat, setBeat] = useState<number | null>(null);
  const history = useHistory();
  const rush = useMemo(() => (history && hasRush ? rushBests(history) : null), [history, hasRush]);

  const [mode, setMode] = useState<Mode>(
    challenge ? "challenge" : params.get("m") === "daily" ? "daily" : rushLink ? "rush" : "practice",
  );
  const profile = useProfile();
  const summary = profile?.games[game.id] ?? null;
  const puzzleRated = PUZZLE_RATED.has(game.id);
  const rating = summary?.rating ?? startRating(game.id);
  // Puzzle-rated games pick puzzles around your rating, so "medium" (at your level) is always the suggestion.
  const suggested = puzzleRated ? "medium" : suggestTier(rating);
  const progress = levelProgress(game.id, rating);
  const [tier, setTier] = useState<Tier>(challenge?.tier ?? "medium");
  const [board, setBoard] = useState<BoardKey | null>(null);
  /** Board waiting behind the how-to-play screen. */
  const [pending, setPending] = useState<BoardKey | null>(null);

  // Once history is read, open on the tier your rating suggests (a challenge link keeps its own tier).
  const ready = profile !== null;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- history lives in localStorage, read after mount
    if (ready && !challenge) setTier(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when history first becomes available
  }, [ready, challenge]);

  // The colour that grew out of the home card hands off to this screen's wash (D-073).
  useEffect(() => {
    cardOpenDone();
  }, []);

  // Next keeps a visited page alive (hidden) after you navigate away, and its effects clean up when it hides.
  // Reset here so any way out (×, wordmark, back button) brings you back to the start screen, not the old board (D-063).
  useEffect(
    () => () => {
      setBoard(null);
      setPending(null);
    },
    [],
  );

  const daily = today ? dailyBoard(game.id, today) : null;
  const effectiveTier = mode === "daily" ? (daily?.tier ?? tier) : mode === "challenge" ? challenge!.tier : tier;
  const best = summary?.best[effectiveTier];
  const solveRate = summary && summary.played > 0 ? Math.round((summary.solved / summary.played) * 100) : null;

  const gameModule = MODULES[game.id];
  const nextDaily = GAMES.slice(GAMES.findIndex((g) => g.id === game.id) + 1).find((g) => playable(g.id));
  const dailyDoneToday = !!(today && summary?.dailyDone.has(today.toISOString().slice(0, 10)));
  const nextDailyHref = nextDaily ? `/play/${nextDaily.id}?m=daily` : "/";

  function backToMenu() {
    setBoard(null);
  }

  /** Abort: leave the board or how to play and show this game's start screen. */
  function backToStart() {
    setBoard(null);
    setPending(null);
  }

  function nextBoard(promotedTo?: Tier) {
    const nextTier = promotedTo ?? board?.tier ?? tier;
    setMode("practice");
    setTier(nextTier);
    setBoard({ gameId: game.id, tier: nextTier, seed: randomSeed() });
  }

  function startRush(forceIntro = false) {
    const key: BoardKey = { gameId: game.id, tier: "medium", seed: friendRun?.seed ?? randomSeed() };
    setBeat(friendRun?.beat ?? null);
    setFriendRun(null);
    if (forceIntro || !introSkipped(game.id)) setPending(key);
    else setBoard(key);
  }

  function rushAgain() {
    setBeat(null);
    setBoard({ gameId: game.id, tier: "medium", seed: randomSeed() });
  }

  function start(forceIntro = false) {
    if (mode === "rush") return startRush(forceIntro);
    const key: BoardKey | null =
      mode === "daily" ? daily : mode === "challenge" && challenge ? { gameId: game.id, ...challenge } : { gameId: game.id, tier, seed: randomSeed() };
    if (!key) return;
    if (forceIntro || !introSkipped(game.id)) setPending(key);
    else setBoard(key);
  }

  const modeOptions = [
    { value: "daily" as const, label: "daily" },
    { value: "practice" as const, label: "practice" },
    ...(hasRush ? [{ value: "rush" as const, label: "rush" }] : []),
    ...(challenge ? [{ value: "challenge" as const, label: "challenge" }] : []),
  ];

  // The start menu sits on the game's colour; a board, an intro or a rush gets the plain surface (D-073).
  const onMenu = !board && !pending;

  return (
    <div className="flex w-full justify-center">
      <motion.article
        style={gameColours(game.id)}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur.slow, ease: ease.out }}
        className="surface relative flex min-h-[min(586px,calc(100dvh-104px))] w-full max-w-[440px] flex-col overflow-hidden rounded-card"
      >
        {/* The game's colour across the top of the card, fading into the surface before the controls. */}
        <motion.div
          aria-hidden
          className="card-tint pointer-events-none absolute inset-x-0 top-0 h-[400px]"
          initial={false}
          animate={{ opacity: onMenu ? 1 : 0 }}
          transition={{ duration: dur.base, ease: ease.out }}
        />
        <header
          className={`relative flex h-12 shrink-0 items-center justify-between border-b px-4 text-caption transition-colors duration-[var(--dur-base)] ${
            onMenu ? "on-colour-soft border-white/[0.1]" : "border-white/[0.06] text-steel"
          }`}
        >
          {board || pending ? (
            // Abort (D-063): back to this game's start screen. Leaving a board counts as a quit, as before.
            <button
              type="button"
              onClick={backToStart}
              aria-label={`Abort and go back to the ${game.name} start screen`}
              className="-ml-2 inline-flex h-8 items-center gap-1.5 rounded-full px-2 font-mono text-fog transition-colors duration-[var(--dur-fast)] hover:bg-white/[0.08] hover:text-paper"
            >
              <span aria-hidden>←</span> abort
            </button>
          ) : (
            <span>~/play/{game.id}</span>
          )}
          {/* Next keeps this page's state when you navigate away, so reset it or the board reopens on return. */}
          <Link
            href="/"
            onClick={backToStart}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-fog transition-colors duration-[var(--dur-fast)] hover:bg-white/[0.08] hover:text-paper"
          >
            ×
          </Link>
        </header>

        <div className="relative flex flex-1 flex-col">
          <AnimatePresence mode="wait" initial={false}>
            {board && mode === "rush" && hasRush ? (
              <RushSession key={`rush-${minutes}-${board.seed}`} game={game} minutes={minutes} seed={board.seed} beat={beat} onExit={backToMenu} onAgain={rushAgain} />
            ) : board && OWN_SESSION.has(game.id) ? (
              <ChessSession key={boardSeed(board)} game={game} mode={mode} tier={board.tier} seed={board.seed} onExit={backToMenu} />
            ) : board && gameModule ? (
              <PlaySession
                key={boardSeed(board)}
                game={game}
                module={gameModule}
                board={board}
                mode={mode}
                nextDailyHref={nextDailyHref}
                onExit={backToMenu}
                onNext={nextBoard}
              />
            ) : pending ? (
              <GameIntroScreen
                key="intro"
                game={game}
                tier={pending.tier}
                mode={mode}
                override={mode === "rush" ? { steps: RUSH_STEPS, label: `puzzle rush · ${minutes} min`, note: `as many puzzles as you can in ${minutes} minutes` } : undefined}
                onBack={() => setPending(null)}
                onStart={() => {
                  setBoard(pending);
                  setPending(null);
                }}
              />
            ) : (
              <motion.div
                key="start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: dur.base, ease: ease.out }}
                className="flex flex-1 flex-col gap-6 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <GameIcon id={game.id} size={44} />
                      <span className="on-colour-soft text-caption uppercase">{game.skill}</span>
                    </div>
                    <h1 className="text-display font-medium">
                      <TitleReveal text={game.name} />
                    </h1>
                    <p className="on-colour-soft">{game.rules}</p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, rotate: 0, scale: 0.9 }}
                    animate={{ opacity: 1, rotate: 6, scale: 1 }}
                    transition={{ duration: dur.slow, ease: ease.spring, delay: 0.1 }}
                    className="hidden shrink-0 rounded-[16px] bg-[#151515] p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.5)] min-[380px]:block"
                  >
                    <MiniBoard id={game.id} size={72} />
                  </motion.div>
                </div>

                {/* Your record: context, kept quieter than the choices below (D-045). */}
                <div className="well flex flex-col gap-3 rounded-[18px] p-4">
                  <dl className="grid grid-cols-4 gap-3">
                    <Stat label="rating" value={summary ? String(rating) : "--"} />
                    {mode === "rush" ? (
                      <>
                        <Stat label="best 3m" value={rush?.best[3] == null ? "--" : String(rush.best[3])} />
                        <Stat label="best 5m" value={rush?.best[5] == null ? "--" : String(rush.best[5])} />
                        <Stat label="runs" value={String(rush?.runs ?? 0)} />
                      </>
                    ) : puzzleRated ? (
                      <Stat label="peak" value={summary?.played ? String(summary.peak) : "--"} />
                    ) : (
                      <Stat
                        label="best"
                        title={`best on ${effectiveTier}`}
                        value={best === undefined ? "--" : gameModule?.scoring === "points" ? <PointsDisplay points={best} /> : <TimeDisplay ms={best} />}
                      />
                    )}
                    {mode !== "rush" && (
                      <>
                        <Stat label="played" value={summary ? String(summary.played) : "0"} />
                        <Stat label="solved" value={solveRate === null ? "--" : `${solveRate}%`} />
                      </>
                    )}
                  </dl>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <TierBar progress={progress.progress} color={hue(game.id)} />
                    </div>
                    {summary && summary.ratingSeries.length > 1 && (
                      <Sparkline points={summary.ratingSeries.slice(-20).map((p) => p.rating)} color={hue(game.id)} width={72} height={20} />
                    )}
                  </div>
                  <span className="font-mono text-caption text-ash">
                    {puzzleRated
                      ? `puzzle rating · ${progress.caption}`
                      : progress.caption
                        ? `${suggested} now · ${progress.caption}`
                        : "expert. the top tier."}
                  </span>
                </div>

                <div className="mt-auto flex flex-col gap-5">
                  <section className="flex flex-col gap-2" aria-labelledby="start-mode">
                    <Eyebrow id="start-mode" step="01">
                      mode
                    </Eyebrow>
                    <Segmented id="mode" label="Mode" options={modeOptions} value={mode} onChange={setMode} />
                  </section>

  {mode === "rush" ? (
                    <section className="flex flex-col gap-2" aria-labelledby="start-time">
                      <Eyebrow id="start-time" step="02" note={friendRun ? "set by the link" : undefined}>
                        time
                      </Eyebrow>
                      <Segmented
                        id="rush-minutes"
                        label="Time"
                        options={RUSH_MINUTES.map((m) => ({ value: String(m) as `${RushMinutes}`, label: `${m} min` }))}
                        value={String(minutes) as `${RushMinutes}`}
                        onChange={(v) => setMinutes(Number(v) as RushMinutes)}
                        disabled={!!friendRun}
                      />
                      <div className="flex min-h-[44px] flex-col gap-0.5 pt-1">
                        <p className="text-body text-paper">as many puzzles as you can in {minutes} minutes. three mistakes and the run ends.</p>
                        <p className="text-caption text-ash">
                          {friendRun?.beat
                            ? `a friend's run · same puzzles · beat ${friendRun.beat}`
                            : friendRun
                              ? "a friend's run · same puzzles, same order"
                              : "mates in one first, then it climbs. no hints, no rating at stake."}
                        </p>
                      </div>
                    </section>
                  ) : (
                                    <section className="flex flex-col gap-2" aria-labelledby="start-tier">
                      <Eyebrow
                        id="start-tier"
                        step="02"
                        note={mode === "daily" ? (puzzleRated ? "three puzzles, ramping up" : "fixed today") : mode === "challenge" ? "set by the link" : undefined}
                      >
                        difficulty
                      </Eyebrow>
                      <Segmented
                        id="tier"
                        label="Difficulty"
                        options={TIERS.map((t) => ({ value: t, label: TIER_LABEL[t], marked: mode === "practice" && t === suggested }))}
                        value={effectiveTier}
                        onChange={setTier}
                        disabled={mode !== "practice"}
                      />
                      <div className="flex min-h-[44px] flex-col gap-0.5 pt-1">
                        <p className="text-body text-paper">
                          {puzzleRated && mode === "daily"
                            ? `three puzzles at about ${DAILY_TARGETS.join(", ").replace(/, (\d+)$/, " and $1")}`
                            : puzzleRated && mode === "challenge"
                              ? "the exact puzzle your friend played"
                              : INTRO[game.id].tiers[effectiveTier]}
                        </p>
                        <p className="text-caption text-ash">
                          {mode === "daily" &&
                            (puzzleRated
                              ? dailyDoneToday
                                ? "done today. replays don't change your rating."
                                : "the same three for everyone, rated against each puzzle."
                              : "everyone plays this board today.")}
                          {mode === "practice" &&
                            (effectiveTier === suggested ? (
                              <>
                                <span className="text-ember">•</span> suggested for your rating
                              </>
                            ) : (
                              <>
                                <span className="text-ember">•</span> suggested for your rating: {suggested}
                              </>
                            ))}
                          {mode === "challenge" && `a friend's board · seed ${challenge?.seed}`}
                        </p>
                      </div>
                    </section>
                  )}

                  {/* Play is the one primary action. On narrow phones the two stack, play on top. */}
                  <div className="flex flex-col-reverse gap-3 min-[420px]:grid min-[420px]:grid-cols-[auto_1fr]">
                    <Button variant="ghost" arrow={false} onClick={() => start(true)} className="w-full">
                      how to play
                    </Button>
                    <Button onClick={() => start()} className="w-full" disabled={mode === "daily" && !daily}>
                      {mode === "rush" ? "start rush" : `play ${game.name}`}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.article>
    </div>
  );
}

function Stat({ label, value, title }: { label: string; value: React.ReactNode; title?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1" title={title}>
      <dt className="truncate text-caption uppercase text-ash">{label}</dt>
      <dd className="font-num text-heading-sm">{value}</dd>
    </div>
  );
}

/** Section label above a choice on the start card: a step number and a name (D-045). */
function Eyebrow({ id, step, note, children }: { id: string; step: string; note?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-caption uppercase text-ash">
      <span className="text-ember">{step}</span>
      <span>{children}</span>
      {note && <span className="normal-case tracking-normal text-steel">· {note}</span>}
    </h2>
  );
}

/** How to play, for a rush (D-071). */
const RUSH_STEPS = [
  "Puzzles come one after another on the same board. The first few are mates in one.",
  "Every solve scores a point, and each puzzle is a little harder than the last.",
  "Three wrong moves, or the clock hitting zero, ends the run. No hints, and your puzzle rating is never at stake.",
] as const;
