# Decision Log

Every decision that shaped the product, with the reason. Newest at the bottom. Format: what, why, what we gave up.

---

### D-001 · Own brand, Dialed's motion principles
**2026-10-26**
We take Dialed's interaction and motion principles (card as stage, springy easing, count-up scores, voiced result lines) but not its look, logo or wordmark.
**Why:** a clone would erase the design work in the case study, and the visual identity is Dialed's IP. Motion principles are transferable craft.
**Gave up:** the exact Dialed aesthetic.

### D-002 · Original game names
**2026-10-26**
Mechanics inspired by LinkedIn's Zip, Tango, Patches and Wend ship under our own names: Path, Balance, Blocks, Weave (working titles).
**Why:** game mechanics are free to use, names and visuals are not.

### D-003 · Generated puzzles with a uniqueness check
**2026-10-26**
Every logic board is procedurally generated from a seed and accepted only if a solver proves exactly one solution.
**Why:** variance is the product. Without a uniqueness check, hard boards become guessable or broken.
**Gave up:** hand-tuned puzzles. Generation cost is paid at play time, so generators must stay fast (target under 100ms per board on a phone).

### D-004 · One seeded generator for daily, practice and challenge
**2026-10-26**
Daily boards seed from the UTC date plus game id. Practice uses a random seed. Challenge links carry the seed in the URL.
**Why:** three features from one mechanism, all deterministic and testable.

### D-005 · No backend in v1
**2026-10-26**
Stats, streaks and skill ratings live in localStorage.
**Why:** fastest path to shipping, free hosting, no accounts.
**Gave up:** cross-device sync and global leaderboards. Revisit if the app gets real users.

### D-006 · Stack: Next.js, TypeScript, Tailwind v4, Motion, Vitest
**2026-10-30**
Same base as the portfolio. Deployed on Vercel's free Hobby plan from a private GitHub repo.
**Why:** known stack, preview URL per branch, zero hosting cost.

### D-007 · Axiom as the visual base
**2026-10-30**
The Axiom style reference (terminal-grade dark, monospaced, flat, one orange accent) is the visual base. Stored at `docs/reference/axiom-style-reference.md`.
**Why:** chosen by Mavett. Fits the "train your brain like an engineer" angle and his black and orange preference.

### D-008 · Axiom geometry wins over Dialed geometry (superseded by D-014)
**2026-10-30**
Dialed uses 24px radius and deep soft shadows. Axiom uses 2px radius and no shadows. We keep Axiom's geometry and take only Dialed's motion.
**Why:** mixing soft cards into a sharp, flat system would read as two brands. Motion carries the playfulness instead.

### D-009 · Ember is the primary action color
**2026-10-30**
The reference contradicts itself: its colour table says not to use Ember for the primary CTA, while its components and Do's use it exactly there. We use Ember for primary actions, progress and active states.
**Why:** a game needs one unmistakable "go" affordance, and the components section is the more specific source.

### D-010 · Black text on Ember buttons
**2026-10-30**
The reference specifies `#eeeeee` text on Ember. That pairing is 3.3:1, below WCAG AA for 16px text. We use `#000000` on Ember (5.6:1).
**Why:** accessibility, and it reads more like a terminal selection highlight.

### D-011 · JetBrains Mono replaces BerkeleyMono (superseded by D-015)
**2026-10-30**
**Why:** BerkeleyMono requires a paid licence. JetBrains Mono is the first listed substitute, free, and available through `next/font`.

### D-012 · Extended number scale
**2026-10-30**
Added `--text-number` (56px), `--text-number-lg` (88px) and `--text-number-xl` (128px) above the reference's 32px ceiling, used only for timers and scores.
**Why:** oversized numbers are core to the Dialed feel and to a game's readability at a glance.

### D-013 · Color lives inside the board
**2026-10-30**
Axiom bans colored surfaces. Games need color as information (regions, symbols, the Recall stimulus). Color is allowed only inside a game board, never on chrome.
**Why:** keeps the system's discipline while letting games work. Recall is the explicit exception where the whole card is the stimulus.

### D-014 · Soft corners
**2026-10-30** · supersedes D-008
Cards use a 24px radius, controls 14px, board cells 8px, buttons are pills. Surfaces stay flat (no shadows).
**Why:** Mavett preferred Dialed's soft geometry. Soft shapes make the app feel like a toy you want to touch, and the flat black surfaces keep it from turning into generic SaaS.
**Gave up:** Axiom's sharp, terminal-strict silhouette.

### D-015 · Geist Mono for headings, Geist Sans for body
**2026-10-30** · supersedes D-011
**Why:** an all-mono interface reads as a code editor and gets tiring in longer text like rules and descriptions. Mono keeps the engineered character where it matters (headings, labels, numbers), sans makes everything else easier to read. Geist is free and self-hosted through the `geist` package.

### D-016 · Smaller titles, big numbers only for scores
**2026-10-30**
The game title on the start card dropped from 88px to 32px, and the home headline from 48px to 32px.
**Why:** at 88px the title dominated the card and competed with the controls. Oversized type is reserved for timers and scores, the moments it is meant to celebrate.
