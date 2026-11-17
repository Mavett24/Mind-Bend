"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { BoardProps } from "@/games/types";
import { dur, ease } from "@/lib/motion";
import {
  answerPoints,
  buildHigherLower,
  buildQuiz,
  CATEGORIES,
  countdownParts,
  formatValue,
  loadHigherLower,
  loadQuestions,
  QUESTIONS_PER_GAME,
  secondsFor,
  totalPoints,
  type CategoryId,
  type HLPair,
  type QuizQuestion,
  type TriviaPuzzle,
} from "./engine";

type Round =
  | { mode: "higher-lower"; items: HLPair[] }
  | { mode: "categories"; category: CategoryId; items: QuizQuestion[] };

const FEEDBACK_MS = 1300;

/**
 * The clock for one question: a ticking seconds readout and a shrinking bar under it, both read from one value
 * that ticks every 100ms. The bar moves by scaleX only. Both freeze where they were when the player answers.
 */
function QuestionClock({
  ms,
  running,
  onTimeout,
  children,
}: {
  ms: number;
  running: boolean;
  onTimeout: () => void;
  children: ReactNode;
}) {
  const done = useRef(onTimeout);
  const startedAt = useRef(0);
  const [left, setLeft] = useState(ms);
  const [frozen, setFrozen] = useState(false);
  useEffect(() => {
    done.current = onTimeout;
  }, [onTimeout]);
  useEffect(() => {
    if (!running) return;
    startedAt.current = performance.now();
    const remaining = () => Math.max(0, ms - (performance.now() - startedAt.current));
    const tick = window.setInterval(() => setLeft(remaining()), 100);
    const out = window.setTimeout(() => done.current(), ms);
    return () => {
      clearInterval(tick);
      clearTimeout(out);
      setLeft(remaining());
      setFrozen(true);
    };
  }, [ms, running]);
  const [whole, fraction] = countdownParts(left);
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        {children}
        <span
          role="timer"
          aria-label={`${Math.ceil(left / 1000)} seconds left`}
          className={`font-mono text-heading-lg font-bold leading-none tabular-nums transition-colors duration-[var(--dur-base)] ${frozen ? "text-fog" : "text-paper"}`}
        >
          {whole}
          <span className="text-ash">{fraction}</span>
          <span className="ml-1 text-caption font-normal uppercase tracking-wide text-steel">s</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-iron">
        {/* Driven by the same tick as the number. The short linear transition smooths the 100ms steps. */}
        <div
          className="h-full origin-left rounded-full bg-ember transition-transform duration-100 ease-linear motion-reduce:transition-none"
          style={{ transform: `scaleX(${left / ms})` }}
        />
      </div>
    </>
  );
}

/**
 * Country flag beside a higher or lower choice (D-064): the country itself, or the city's country.
 * Decorative, since the name sits next to it. 4:3, small WebPs from scripts/build-flags.mjs.
 */
function Flag({ code }: { code: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static WebPs, sized here; the image optimiser would add nothing
    <img
      src={`/flags/${code}.webp`}
      alt=""
      width={80}
      height={60}
      decoding="async"
      className="h-[42px] w-14 shrink-0 rounded-[6px] object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.12)] min-[380px]:h-12 min-[380px]:w-16 sm:h-[60px] sm:w-20"
    />
  );
}

/** Fetch the next pair's flags while this question is on screen, so they never pop in. */
function usePreloadFlags(pair: HLPair | undefined) {
  useEffect(() => {
    if (!pair) return;
    for (const side of [pair.left, pair.right]) {
      if (side.code) new Image().src = `/flags/${side.code}.webp`;
    }
  }, [pair]);
}

function Chooser({ onPick, loading }: { onPick: (mode: "higher-lower" | CategoryId) => void; loading: boolean }) {
  return (
    <div className="flex w-full flex-col gap-4">
      <button
        type="button"
        disabled={loading}
        onClick={() => onPick("higher-lower")}
        className="group flex flex-col gap-1 rounded-control border border-iron bg-graphite p-5 text-left transition-colors duration-[var(--dur-fast)] hover:border-slate"
      >
        <span className="text-caption uppercase tracking-wide text-steel">mode 1</span>
        <span className="font-mono text-heading-lg font-bold">higher or lower</span>
        <span className="text-fog">Two real numbers. Pick the bigger one. People, economies, countries, cities.</span>
      </button>
      <div className="flex flex-col gap-3 rounded-control border border-iron bg-graphite p-5">
        <span className="text-caption uppercase tracking-wide text-steel">mode 2</span>
        <span className="font-mono text-heading-lg font-bold">categories</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={loading}
              onClick={() => onPick(c.id)}
              className="h-9 rounded-full border border-slate px-3 font-mono text-[13px] text-paper transition-colors duration-[var(--dur-fast)] hover:border-fog"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {loading && <p className="text-center font-mono text-caption uppercase tracking-wide text-steel">loading questions</p>}
    </div>
  );
}

export function TriviaBoard({ puzzle, onSolved }: BoardProps<TriviaPuzzle>) {
  const { key } = puzzle;
  const totalMs = secondsFor(key.tier) * 1000;
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null); // -1 = timed out
  const [points, setPoints] = useState<number[]>([]);
  const askedAt = useRef(0);
  const finished = useRef(false);
  const reduced = useReducedMotion();

  const pick = async (choice: "higher-lower" | CategoryId) => {
    setLoading(true);
    setError(false);
    try {
      const next: Round =
        choice === "higher-lower"
          ? { mode: "higher-lower", items: buildHigherLower(await loadHigherLower(), key) }
          : { mode: "categories", category: choice, items: buildQuiz(await loadQuestions(choice), key, choice) };
      setRound(next);
      setIndex(0);
      askedAt.current = performance.now();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const answer = useCallback(
    (choice: number) => {
      if (!round || picked !== null) return;
      const item = round.items[index];
      const correct = choice === (round.mode === "higher-lower" ? (item as HLPair).answer : (item as QuizQuestion).answer);
      const left = totalMs - (performance.now() - askedAt.current);
      setPicked(choice);
      setPoints((p) => [...p, answerPoints(correct, left, totalMs)]);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(correct ? 8 : [20, 40, 20]);
    },
    [index, picked, round, totalMs],
  );

  // After feedback, move on (or finish).
  useEffect(() => {
    if (picked === null || !round) return;
    const id = setTimeout(() => {
      if (index + 1 < round.items.length) {
        setIndex(index + 1);
        setPicked(null);
        askedAt.current = performance.now();
      } else if (!finished.current) {
        finished.current = true;
        onSolved({ points: totalPoints(points), extra: { label: "correct", value: points.filter((p) => p > 0).length } });
      }
    }, FEEDBACK_MS);
    return () => clearTimeout(id);
  }, [index, onSolved, picked, points, round]);

  usePreloadFlags(round?.mode === "higher-lower" ? (round.items[index + 1] as HLPair | undefined) : undefined);

  if (!round) {
    return (
      <div className="flex w-full max-w-[400px] flex-col gap-3">
        <Chooser onPick={pick} loading={loading} />
        {error && <p className="text-center text-fog">Questions couldn&apos;t load. Check your connection and try again.</p>}
      </div>
    );
  }

  const item = round.items[index];
  const answered = picked !== null;
  const correctIndex = round.mode === "higher-lower" ? (item as HLPair).answer : (item as QuizQuestion).answer;
  const lastPoints = answered ? points[points.length - 1] : 0;
  const shake = !reduced ? { x: [0, -5, 5, -5, 5, 0] } : {};
  const [scoreWhole, scoreFraction] = totalPoints(points).toFixed(2).split(".");
  const score = [scoreWhole, `.${scoreFraction}`];

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-4">
      <QuestionClock key={index} ms={totalMs} running={!answered} onTimeout={() => answer(-1)}>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-caption uppercase tracking-wide text-steel">
            {index + 1} / {QUESTIONS_PER_GAME} ·{" "}
            {round.mode === "higher-lower" ? "higher or lower" : CATEGORIES.find((c) => c.id === round.category)?.label}
          </span>
          <span className="font-mono text-heading-sm leading-none tabular-nums">
            {score[0]}
            <span className="text-ash">{score[1]}</span>
            <span className="ml-1 text-caption uppercase tracking-wide text-steel">pts</span>
          </span>
        </div>
      </QuestionClock>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: dur.base, ease: ease.out }}
          className="flex flex-col gap-4"
        >
          {round.mode === "higher-lower" ? (
            <>
              <p className="text-heading-sm text-paper">{(item as HLPair).prompt}</p>
              {[(item as HLPair).left, (item as HLPair).right].map((side, i) => {
                const isRight = i === correctIndex;
                const isPicked = i === picked;
                return (
                  <motion.button
                    key={side.name}
                    type="button"
                    disabled={answered}
                    onClick={() => answer(i)}
                    whileTap={answered ? undefined : { scale: 0.98 }}
                    animate={answered && isPicked && !isRight ? shake : {}}
                    transition={{ duration: 0.36 }}
                    className={`flex min-h-[104px] items-center gap-4 rounded-control border p-4 text-left transition-colors duration-[var(--dur-base)] sm:gap-5 sm:p-5 ${
                      answered && isRight ? "border-paper bg-iron" : answered && isPicked ? "border-ember bg-graphite" : "border-iron bg-graphite hover:border-slate"
                    }`}
                  >
                    {side.code && <Flag code={side.code} />}
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-heading-lg font-bold [overflow-wrap:anywhere]">{side.name}</span>
                      {answered && <span className="font-mono text-paper">{isRight ? "✓" : isPicked ? "×" : ""}</span>}
                    </span>
                    {side.sub && <span className="text-caption text-steel">{side.sub}</span>}
                    <AnimatePresence>
                      {answered && (
                        <motion.span
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: dur.base, ease: ease.out, delay: i * 0.08 }}
                          className="font-mono text-fog"
                        >
                          {formatValue(side.value, (item as HLPair).unit)}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    </span>
                  </motion.button>
                );
              })}
              <p className="text-caption text-steel">source: {(item as HLPair).source}</p>
            </>
          ) : (
            <>
              <p className="min-h-[3.5em] text-heading-sm text-paper">{(item as QuizQuestion).q}</p>
              <div className="flex flex-col gap-2">
                {(item as QuizQuestion).options.map((option, i) => {
                  const isRight = i === correctIndex;
                  const isPicked = i === picked;
                  return (
                    <motion.button
                      key={`${index}-${i}`}
                      type="button"
                      disabled={answered}
                      onClick={() => answer(i)}
                      whileTap={answered ? undefined : { scale: 0.98 }}
                      animate={answered && isPicked && !isRight ? shake : {}}
                      transition={{ duration: 0.36 }}
                      className={`flex min-h-12 items-center gap-3 rounded-control border px-4 py-3 text-left transition-colors duration-[var(--dur-base)] ${
                        answered && isRight ? "border-paper bg-iron" : answered && isPicked ? "border-ember bg-graphite" : "border-iron bg-graphite hover:border-slate"
                      }`}
                    >
                      <span className="w-4 shrink-0 font-mono text-caption text-steel">{"abcd"[i]}</span>
                      <span className="flex-1">{option}</span>
                      {answered && (isRight || isPicked) && <span className="font-mono">{isRight ? "✓" : "×"}</span>}
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="h-5 text-center font-mono text-caption text-steel" aria-live="polite">
        {answered ? (picked === -1 ? "out of time" : lastPoints > 0 ? `+${lastPoints.toFixed(2)}` : "not quite") : ""}
      </p>
    </div>
  );
}
