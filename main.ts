// The Moon Gets One Star — make.fun entry
// Writes the funniest one-star review of the Moon (<= 120 chars) to
// $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt).
//
// The program holds 18 original candidate lines, scores each one with a
// deterministic scorer that mirrors the judge brief's five criteria in
// their listed order (weights 30 / 25 / 20 / 15 / 10, total 100), picks
// the highest-scoring line, writes it out, reads it back and re-checks
// every gate from the brief before exiting.
//
// Node 22 stdlib only. No network, no clock, no randomness: the same
// input always produces the same entry.txt byte for byte.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Gate constants, straight from the brief (competition.yaml / RULES.txt).
// ---------------------------------------------------------------------------
const MAX_CHARS = 120;
const MIN_CHARS = 1;

// ---------------------------------------------------------------------------
// The 18 candidates. Every line was written in this session for this brief.
// Each one is a one-star review of the Moon itself: a rating, a grievance,
// and a reason the Moon earned its single star. None of them leans on the
// obvious jokes the brief warns against (craters, cheese, how bright it
// is); each finds a specific, surprising grievance instead — tides, phases,
// orbit, eclipses, tidal locking, the monthly disappearing act.
// ---------------------------------------------------------------------------
type Candidate = { id: number; text: string; angle: string };

const CANDIDATES: Candidate[] = [
  {
    id: 1,
    text: "★☆☆☆☆ It drags the ocean across my beach twice a day and has never once apologised. Rude.",
    angle: "tides ruin the beach, no apology",
  },
  {
    id: 2,
    text: "One star. It only works nights, takes two weeks off every month, and still expects a five-star review.",
    angle: "part-time worker with full-time expectations",
  },
  {
    id: 3,
    text: "★☆☆☆☆ It follows me home every single night, then pretends not to know me at dawn. Creepy.",
    angle: "the Moon stalks you, then denies it",
  },
  {
    id: 4,
    text: "One star. Same face for 4.5 billion years and it has never once smiled back. Zero effort.",
    angle: "tidal locking as a joyless relationship",
  },
  {
    id: 5,
    text: "★☆☆☆☆ Went dark mid-shift with no notice. Management blames the Earth. I blame the Moon.",
    angle: "eclipse as an unannounced walkout",
  },
  {
    id: 6,
    text: "One star. It controls the tides and still cannot commit to a shape. Pick a phase and stick to it.",
    angle: "phases as commitment issues",
  },
  {
    id: 7,
    text: "★☆☆☆☆ Charged me rent in tides, left a golf ball and 96 bags of rubbish up there, never fixed a thing.",
    angle: "the Moon as a negligent landlord",
  },
  {
    id: 8,
    text: "One star. It wobbles, it shrinks, it vanishes for a fortnight, then shows up full like nothing happened.",
    angle: "the monthly vanishing act",
  },
  {
    id: 9,
    text: "★☆☆☆☆ HR calls it \"phases\". I call it ghosting. Two weeks gone, no text, no apology.",
    angle: "phases reframed as workplace ghosting",
  },
  {
    id: 10,
    text: "One star. My dog howls at it, my sleep schedule fears it, and it never once paid rent.",
    angle: "full moon side effects, unpaid tenant",
  },
  {
    id: 11,
    text: "★☆☆☆☆ It has one job — orbit — and it still shows up late every single month.",
    angle: "orbit as a single, failed job duty",
  },
  {
    id: 12,
    text: "One star. Four billion years old, same grey rock, still hasn't learned to stay full-time.",
    angle: "ancient but unemployable",
  },
  {
    id: 13,
    text: "★☆☆☆☆ I asked for a refund on the tides. Customer service said to take it up with gravity.",
    angle: "refund runaround, gravity as head office",
  },
  {
    id: 14,
    text: "One star. It photobombs every night sky and has the nerve to call itself a natural wonder.",
    angle: "the Moon as an arrogant photobomber",
  },
  {
    id: 15,
    text: "★☆☆☆☆ Tidal-locked for aeons and it still only shows me one side. Commitment issues.",
    angle: "tidal locking as emotional unavailability",
  },
  {
    id: 16,
    text: "One star. It moved my ocean, woke the neighbourhood dogs, and left before sunrise. No tip.",
    angle: "tides and howling as bad service",
  },
  {
    id: 17,
    text: "★☆☆☆☆ Would not recommend. It waxes, it wanes, it ghosts — the flakiest roommate in the sky.",
    angle: "phases as a flaky roommate",
  },
  {
    id: 18,
    text: "One star. It has been shrinking since Tuesday, will be gone by Friday, and calls that a cycle.",
    angle: "waning as a shrinking product",
  },
];

// ---------------------------------------------------------------------------
// Lexicons. All matching is case-insensitive and deterministic.
// ---------------------------------------------------------------------------

// Words that tie the complaint to the Moon itself (criterion 1) and to a
// Moon-specific, non-obvious grievance (criterion 4). The brief warns the
// obvious jokes are craters, cheese and brightness; none of those appear
// in any candidate, and the banned list below enforces it in the scorer.
const MOON_WORDS = [
  "moon",
  "lunar",
  "tides",
  "tide",
  "phases",
  "phase",
  "orbit",
  "eclipse",
  "gravity",
  "wax",
  "wane",
  "waning",
  "waxing",
  "tidal",
  "full moon",
  "fortnight",
  "wobble",
  "wobbles",
  "cycle",
  "aeons",
  // Tide-adjacent and phase-adjacent specifics the first draft of this
  // lexicon missed (revise pass): the ocean the Moon drags, the eclipse's
  // unannounced dark, the one face tidal locking always shows, the howling
  // a full moon draws, the two-week disappearance, the Moon following you
  // home, and the waxing/waning inflections.
  "ocean",
  "went dark",
  "same face",
  "howls",
  "night sky",
  "two weeks",
  "follows me",
  "waxes",
  "wanes",
];

// Grievance verbs aimed at the Moon: the complaint must be ABOUT the Moon.
const COMPLAINT_VERBS = [
  "drags",
  "controls",
  "follows",
  "wobbles",
  "shrinks",
  "vanishes",
  "shows up",
  "charged",
  "moved",
  "woke",
  "left",
  "photobombs",
  "ghosts",
  "works",
  "takes",
  "expects",
  "blame",
  "calls",
];

// Words that would show the line is really about a trip, a person or some
// other place instead of the Moon. A hit here costs criterion 1 points.
const OFF_TOPIC_WORDS = [
  "hotel",
  "flight",
  "airline",
  "restaurant",
  "trip to",
  "holiday",
  "tour",
  "museum",
  "my boyfriend",
  "my girlfriend",
  "my boss",
  "my landlord",
];

// Punch words and phrases: the laugh. Incongruity between a cosmic body
// and mundane human institutions (HR, customer service, rent, tips) is
// where most of these lines get their laugh, so those count here too.
const PUNCH_WORDS = [
  "rude",
  "creepy",
  "zero effort",
  "no tip",
  "no apology",
  "like nothing happened",
  "commitment issues",
  "flakiest",
  "ghosting",
  "ghost",
  "ghosts",
  "take it up with gravity",
  "never fixed a thing",
  "pick a phase",
  "stay full-time",
  "one job",
  "has the nerve",
  "pretends not to know me",
  "never once smiled back",
  "never once paid rent",
  "would not recommend",
  "refund",
  "blame the moon",
  "shows up late",
];

// Workplace / service / domestic vocabulary: the incongruity engine. A
// celestial body described with HR, rent and customer-service language is
// a quicker laugh than a poetic one, and it reads like a real review.
const MUNDANE_INCONGRUITY = [
  "hr",
  "management",
  "customer service",
  "refund",
  "rent",
  "landlord",
  "roommate",
  "job",
  "shift",
  "works nights",
  "takes two weeks off",
  "five-star review",
  "tip",
  "apologised",
  "apology",
  "text",
];

// Review idioms a genuine one-star reviewer leaves.
const REVIEW_IDIOMS = [
  "would not recommend",
  "one star",
  "refund",
  "customer service",
  "zero effort",
  "no tip",
  "never once",
  "never fixed",
  "apologised",
  "apology",
  "do not recommend",
  "stay away",
  "avoid",
];

// Filler words that waste characters without earning their place.
const FILLER_WORDS = ["very", "really", "just", "actually", "literally", "quite", "somewhat"];

// The obvious jokes the brief says lose to a specific grievance. Any hit
// is penalised in criterion 4.
const OBVIOUS_JOKES = ["crater", "cheese", "bright", "brightness", "glow", "glowing", "shiny", "man in the moon"];

// ---------------------------------------------------------------------------
// Small deterministic text helpers.
// ---------------------------------------------------------------------------

// Count Unicode code points, not UTF-16 units: the gate counts characters.
function charCount(text: string): number {
  return [...text].length;
}

// Split into clauses for punch-position analysis. Splits only on sentence
// and clause boundaries followed by a space, never inside a number: "4.5
// billion" keeps its decimal point because the "." is followed by a digit,
// not a space; "96 bags" has no comma, so ", " splits are safe here.
function splitClauses(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|;\s+|,\s+|\s+—\s+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

// Case-insensitive substring test.
function hasWord(text: string, word: string): boolean {
  return text.toLowerCase().includes(word.toLowerCase());
}

// Count how many distinct lexicon entries appear in the text. Matching is
// word-boundary aware (revise pass): the first draft used plain substring
// matching, which counted "hr" inside "shrinks"/"shrinking", "very" inside
// "every", and "tide" inside "tides" as separate hits. A lexicon entry
// counts only when it appears as a whole word or phrase.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lexiconHits(text: string, lexicon: string[]): string[] {
  return lexicon.filter((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(text));
}

// The final clause is where the punchline must land.
function lastClause(text: string): string {
  const clauses = splitClauses(text);
  return clauses.length > 0 ? clauses[clauses.length - 1] : text;
}

// ---------------------------------------------------------------------------
// The scorer. Mirrors the judge brief's five criteria in their listed
// order, weights 30 / 25 / 20 / 15 / 10. Each sub-score is capped at its
// weight; the total is out of 100.
// ---------------------------------------------------------------------------
type Score = {
  id: number;
  text: string;
  c1OnTopic: number;
  c2Funny: number;
  c3RealReview: number;
  c4Specific: number;
  c5Economy: number;
  total: number;
  notes: string[];
};

function scoreCandidate(c: Candidate): Score {
  const text = c.text;
  const notes: string[] = [];

  // --- Criterion 1 (30): is a one-star review of the Moon itself. --------
  let c1 = 0;
  const moonHits = lexiconHits(text, MOON_WORDS);
  if (moonHits.length > 0) {
    c1 += 12;
    notes.push(`moon terms: ${moonHits.join(", ")}`);
  }
  // A rating marker up front makes it a review, not a slogan or a poem.
  const hasRating = text.startsWith("★☆☆☆☆") || /^one star/i.test(text);
  if (hasRating) {
    c1 += 8;
    notes.push("rating marker present");
  }
  const verbHits = lexiconHits(text, COMPLAINT_VERBS);
  if (verbHits.length > 0) {
    c1 += 6;
    notes.push(`complaint verbs: ${verbHits.join(", ")}`);
  }
  // The Moon is the grammatical subject of the grievance, not a backdrop.
  // A first-person complaint ("I asked for a refund on the tides") counts
  // too, but only when the line also names a Moon term — "I" on its own
  // says nothing about the Moon (revise pass: #13 was losing these points
  // because it opens with "I asked...").
  const moonIsSubject =
    /^(★☆☆☆☆\s+)?(it|the moon|one star)\b/i.test(text) ||
    (moonHits.length > 0 && /^(★☆☆☆☆\s+)?i\b/i.test(text));
  if (moonIsSubject) {
    c1 += 4;
  }
  const offTopic = lexiconHits(text, OFF_TOPIC_WORDS);
  if (offTopic.length > 0) {
    c1 -= 8 * offTopic.length;
    notes.push(`off-topic penalty: ${offTopic.join(", ")}`);
  }
  c1 = Math.max(0, Math.min(30, c1));

  // --- Criterion 2 (25): is funnier; lands on first read. -----------------
  let c2 = 0;
  const punchHits = lexiconHits(text, PUNCH_WORDS);
  c2 += Math.min(15, punchHits.length * 5);
  if (punchHits.length > 0) {
    notes.push(`punch: ${punchHits.join(", ")}`);
  }
  // The punchline must sit in the final clause to land fast.
  const last = lastClause(text);
  const lastPunch = lexiconHits(last, PUNCH_WORDS);
  if (lastPunch.length > 0) {
    c2 += 5;
    notes.push(`punch lands in final clause: "${last}"`);
  }
  // Mundane-institution incongruity is the quickest laugh in this field.
  const incongruity = lexiconHits(text, MUNDANE_INCONGRUITY);
  c2 += Math.min(5, incongruity.length * 2);
  if (incongruity.length > 0) {
    notes.push(`incongruity: ${incongruity.join(", ")}`);
  }
  c2 = Math.max(0, Math.min(25, c2));

  // --- Criterion 3 (20): reads like a real one-star review. ---------------
  let c3 = 0;
  if (hasRating) {
    c3 += 8;
  }
  // First-person grievance: a genuine reviewer complains about what
  // happened to them, in their own voice.
  if (/\b(I|my|me)\b/i.test(text)) {
    c3 += 6;
    notes.push("first-person voice");
  }
  const idiomHits = lexiconHits(text, REVIEW_IDIOMS);
  c3 += Math.min(6, idiomHits.length * 3);
  if (idiomHits.length > 0) {
    notes.push(`review idioms: ${idiomHits.join(", ")}`);
  }
  c3 = Math.max(0, Math.min(20, c3));

  // --- Criterion 4 (15): specific, surprising grievance. ------------------
  let c4 = 0;
  // Distinct Moon-specific details beyond the word "moon" itself: tides,
  // phases, orbit, gravity, the monthly cycle, tidal locking.
  const specificHits = moonHits.filter((w) => w !== "moon" && w !== "lunar");
  c4 += Math.min(12, specificHits.length * 4);
  if (specificHits.length > 0) {
    notes.push(`specific grievance terms: ${specificHits.join(", ")}`);
  }
  // A concrete number or time span makes the grievance specific rather
  // than generic ("twice a day", "4.5 billion years", "96 bags").
  if (/\d/.test(text)) {
    c4 += 3;
    notes.push("concrete number/time span");
  }
  const obvious = lexiconHits(text, OBVIOUS_JOKES);
  if (obvious.length > 0) {
    c4 -= 5 * obvious.length;
    notes.push(`obvious-joke penalty: ${obvious.join(", ")}`);
  }
  c4 = Math.max(0, Math.min(15, c4));

  // --- Criterion 5 (10): uses its few characters well. --------------------
  let c5 = 0;
  const n = charCount(text);
  // Sweet spot: long enough to set up and punch, short enough that the
  // punchline lands well before the 120 limit. 75–105 is ideal.
  if (n >= 75 && n <= 105) {
    c5 += 7;
  } else if (n >= 60 && n <= 115) {
    c5 += 5;
  } else {
    c5 += 3;
  }
  // No filler words: every word earns its place.
  const filler = lexiconHits(text, FILLER_WORDS);
  if (filler.length === 0) {
    c5 += 3;
  } else {
    notes.push(`filler penalty: ${filler.join(", ")}`);
  }
  c5 = Math.max(0, Math.min(10, c5));

  return {
    id: c.id,
    text,
    c1OnTopic: c1,
    c2Funny: c2,
    c3RealReview: c3,
    c4Specific: c4,
    c5Economy: c5,
    total: c1 + c2 + c3 + c4 + c5,
    notes,
  };
}

// ---------------------------------------------------------------------------
// The gate, exactly as the brief states it: UTF-8 text of 1 to 120
// characters, not only white space. Single-line is enforced by the entry
// being one review: a newline would break the "single line" shape the
// judge reads, so the gate fails on any line break too.
// ---------------------------------------------------------------------------
function gateCheck(text: string): string[] {
  const failures: string[] = [];
  if (charCount(text) < MIN_CHARS || charCount(text) > MAX_CHARS) {
    failures.push(`length ${charCount(text)} chars outside ${MIN_CHARS}-${MAX_CHARS}`);
  }
  if (text.trim().length === 0) {
    failures.push("entry is only white space");
  }
  if (/[\r\n]/.test(text)) {
    failures.push("entry is not a single line");
  }
  // UTF-8 round-trip: encoding then decoding must reproduce the text.
  const bytes = Buffer.from(text, "utf8");
  if (Buffer.from(bytes).toString("utf8") !== text) {
    failures.push("entry is not valid UTF-8");
  }
  // No trailing newline in the file content itself: the file holds the
  // line and nothing else, so byte count equals the line.
  return failures;
}

// ---------------------------------------------------------------------------
// Main: score, rank, write, read back, re-gate.
// ---------------------------------------------------------------------------
function main(): void {
  const scores = CANDIDATES.map(scoreCandidate);

  // Rank: highest total first; ties break to the shorter line (the brief
  // says length for its own sake does not count, and a smaller text wins
  // an exact tie), then to the lower candidate id for determinism.
  const ranked = [...scores].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    const lenDiff = charCount(a.text) - charCount(b.text);
    if (lenDiff !== 0) return lenDiff;
    return a.id - b.id;
  });

  console.log("The Moon Gets One Star — candidate scores (weights 30/25/20/15/10)");
  console.log("=".repeat(100));
  for (const s of ranked) {
    console.log(
      `#${String(s.id).padStart(2)} total=${String(s.total).padStart(3)} ` +
        `(c1=${String(s.c1OnTopic).padStart(2)} c2=${String(s.c2Funny).padStart(2)} ` +
        `c3=${String(s.c3RealReview).padStart(2)} c4=${String(s.c4Specific).padStart(2)} ` +
        `c5=${String(s.c5Economy).padStart(2)}) ${charCount(s.text)} chars`,
    );
    console.log(`     ${s.text}`);
    console.log(`     notes: ${s.notes.join("; ") || "none"}`);
  }
  console.log("=".repeat(100));

  const winner = ranked[0];
  const runnerUp = ranked[1];
  console.log(`WINNER #${winner.id}: ${winner.total} pts, ${charCount(winner.text)} chars`);
  console.log(`  ${winner.text}`);
  console.log(`RUNNER-UP #${runnerUp.id}: ${runnerUp.total} pts, ${charCount(runnerUp.text)} chars`);
  console.log(`  ${runnerUp.text}`);

  // Gate the winner before writing anything.
  const preFailures = gateCheck(winner.text);
  if (preFailures.length > 0) {
    console.error(`GATE FAILED (pre-write): ${preFailures.join("; ")}`);
    process.exit(1);
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output/entry.txt".replace(/\/entry\.txt$/, "");
  const outPath = process.env.MAKEFUN_OUTPUT_DIR
    ? join(process.env.MAKEFUN_OUTPUT_DIR, "entry.txt")
    : "/output/entry.txt";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, winner.text, "utf8");
  console.log(`Wrote ${outPath} (${Buffer.byteLength(winner.text, "utf8")} bytes)`);

  // Read back and re-check every gate from the brief.
  const readBack = readFileSync(outPath, "utf8");
  if (readBack !== winner.text) {
    console.error("GATE FAILED (read-back): file content differs from winner text");
    process.exit(1);
  }
  const postFailures = gateCheck(readBack);
  if (postFailures.length > 0) {
    console.error(`GATE FAILED (post-write): ${postFailures.join("; ")}`);
    process.exit(1);
  }
  console.log(
    `GATE PASSED: ${charCount(readBack)} chars, single line, valid UTF-8, not only white space`,
  );
}

main();
