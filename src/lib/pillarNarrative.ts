// Pillar hype narrative (June 5 design). Each pillar has its own voice and its
// own *why* — hype-man, confident, body-aesthetic-forward, never scolding even
// when lagging. Phrases are plain editable arrays: add lines to any tier freely.
//
// Everything keys off the live fill FRACTION (actual/target against live
// user_preferences targets), never raw counts — so a changed Settings target
// re-tiers the copy automatically.

export type NarrativeKey = 'lower' | 'upper' | 'cardio' | 'bundle' | 'mobility';
export type Tier = 'crushing' | 'onTrack' | 'lagging';

// Tier thresholds on the fill fraction. Crushing ≥ 0.8, Lagging ≤ 0.3,
// On track in between.
export const CRUSHING_MIN = 0.8;
export const LAGGING_MAX = 0.3;

export function tierFor(fraction: number): Tier {
  if (fraction >= CRUSHING_MIN) return 'crushing';
  if (fraction <= LAGGING_MAX) return 'lagging';
  return 'onTrack';
}

// Per-pillar phrase banks, by tier. Verbatim from the June 5 design doc.
export const PILLAR_PHRASES: Record<NarrativeKey, Record<Tier, string[]>> = {
  lower: {
    crushing: [
      'Your legs are gonna look UNREAL if you keep this up.',
      'Tree trunks in progress. The foundation is being built.',
      'Leg day royalty. The squats are paying off.',
      "Wheels of steel. Nobody's skipping you on leg day.",
      'Quads, hams, glutes — all eating this week.',
      'Building a base most people never touch. Respect.',
    ],
    onTrack: [
      'Wheels coming along nicely. Keep stacking sessions.',
      "Foundation's solid this week — legs are working.",
      'Legs are putting in honest work. Stay on it.',
      'Good leg volume. The trunks are listening.',
    ],
    lagging: [
      "Don't skip leg day — the whole house sits on this foundation.",
      "Legs are quiet this week. One session and you're back.",
      'No foundation, no gains up top. Hit the squat rack.',
      'The wheels need a turn. Get under the bar.',
    ],
  },
  upper: {
    crushing: [
      'Boulder shoulders incoming. Arms getting CHISELED.',
      "Upper body's on fire — the chisel is real.",
      'Delts popping, chest filling out. Keep hammering.',
      "Sleeves are getting tighter. That's the goal.",
      "T-shirt's about to fit different. Keep pressing.",
      'Cannons for arms. The work shows.',
    ],
    onTrack: [
      'Arms are coming in. Stay on the press.',
      'Shoulders building nicely this week.',
      "Upper body's trending right. Keep the volume.",
      'Chest and back getting their reps. Solid.',
    ],
    lagging: [
      "Those boulder shoulders won't build themselves — get a press in.",
      "Upper body's lagging. Time to pump the chisel.",
      "Arms are hungry. Feed 'em a session.",
      'The chisel needs the hammer. Hit upper soon.',
    ],
  },
  cardio: {
    crushing: [
      "You've REALLY been moving. Heart's getting stronger, leaning right out.",
      "Engine's humming. Fat's on the run this week.",
      'Cardio king. The heart thanks you.',
      'Conditioning on point — wind for days.',
      'Burning clean this week. The leanout is real.',
      'Ticker’s getting tougher every session.',
    ],
    onTrack: [
      'Good movement this week — keep the engine warm.',
      "Heart's getting its work. Stay on it.",
      "Cardio's ticking along. Keep the sweat coming.",
      'Steady conditioning. The engine likes routine.',
    ],
    lagging: [
      "Engine's been idle — a session or two melts fat and feeds the heart.",
      "Cardio's low. Get the blood pumping.",
      'The heart wants a workout too. Lace up.',
      'Leanout stalls without the engine. Get moving.',
    ],
  },
  bundle: {
    crushing: [
      'Locked IN. Pushups, core, calves — the basics are dialed.',
      'Vanity muscles firing daily. Chest, abs, calves — pumped.',
      'Discipline on lock. The little things add up huge.',
      "Every day a little pump. That's how it compounds.",
      'Core tight, calves popping. The details matter.',
      'The basics never miss with you. Elite habit.',
    ],
    onTrack: [
      'Basics are happening. Keep the daily pump going.',
      'Core and calves getting their reps. Stay consistent.',
      "Fundamentals ticking over. Don't break the chain.",
      "Daily pump's alive. Keep showing up.",
    ],
    lagging: [
      "The bundle's the easy win — drop and give me some pushups.",
      'Fundamentals slipped. Five minutes locks it back in.',
      'Pushups, core, calves. Two minutes, no excuses.',
      'The daily pump misses you. Knock it out.',
    ],
  },
  mobility: {
    crushing: [
      'Limber and pain-free. Future you is grateful.',
      'Mobility on point — moving like silk.',
      'Staying loose. This is the longevity play.',
      'Joints happy, body open. The smart money move.',
      'Moving like water this week. Beautiful.',
      'Recovery game strong. This is how you last.',
    ],
    onTrack: [
      'Good stretch work this week. Keep the body open.',
      "Mobility's ticking along. Stay limber.",
      'Loose and ready. Keep the routine.',
      "Body's thanking you for the stretch. Continue.",
    ],
    lagging: [
      "Don't forget to stretch — tight muscles, no gains.",
      "Mobility's at zero. Five minutes keeps you moving free.",
      'Tight today, sore tomorrow. Roll it out.',
      'The longevity play needs you. Get loose.',
    ],
  },
};

// State 4 — everything lagging, week slipping by. One unified kick.
export const ALL_LOW_PHRASES = [
  'Get up and do SOMETHING. Your body and mind need it.',
  "The week's slipping. One move changes the momentum — go.",
  "Nothing logged worth bragging about yet. Let's fix that right now.",
];

// State 3 — everything lagging BUT still early in the week. Gentle, no grim
// Monday scores. (Not in the doc's bank; written to the doc's described tone.)
export const EARLY_DAYS_PHRASES = [
  "Early days — plenty of week left to stack wins.",
  "Week's young. One session sets the tone.",
  'Fresh week, clean slate. Go put a mark on the board.',
];

// State 2 — all caught up. Pairs with the strongest pillar's win line.
export const ALL_CLEAR_PHRASES = [
  'Firing on all cylinders. Every pillar eating.',
  'Full house this week. Nothing left on the table.',
  'Every mark hit. This is what a complete week looks like.',
];

// Deterministic-but-fresh phrase pick: stable within a render (no flicker) and
// across a day, rotating day to day via the seed. Empty bank → ''.
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function pickPhrase(bank: string[], seed: string): string {
  if (bank.length === 0) return '';
  return bank[hashSeed(seed) % bank.length];
}

// A single pillar's callout for its current fraction. `seed` should vary by
// day (and caller context) so the line stays fresh without flickering.
export function pillarCallout(
  key: NarrativeKey,
  fraction: number,
  seed: string,
): string {
  const tier = tierFor(fraction);
  return pickPhrase(PILLAR_PHRASES[key][tier], `${key}-${tier}-${seed}`);
}

// ---- Fitness Score summary (four-state) ----------------------------------

export interface SummaryMark {
  key: NarrativeKey;
  fraction: number;
  participates: boolean;
}

// What the Home summary should say. Exactly one shape is populated:
//  - { win, nudge }     state 1: mostly good, something behind
//  - { win, allClear }  state 2: all caught up
//  - { message }        state 3 (early-week) or state 4 (all-low kick)
export interface SummaryNarrative {
  win?: string;
  nudge?: string;
  allClear?: string;
  message?: string;
}

// Early-week cutoff for the all-lagging softening (state 3 vs 4). Sun–Tue is
// "early"; Wed onward the week is "slipping". daysElapsed is Sun..today (1..7).
const EARLY_WEEK_DAYS = 3;

export function summaryNarrative(
  marks: SummaryMark[],
  daysElapsed: number,
  seed: string,
): SummaryNarrative | null {
  const participating = marks.filter((m) => m.participates);
  if (participating.length === 0) return null;

  const sorted = [...participating].sort((a, b) => b.fraction - a.fraction);
  const strongest = sorted[0];
  const mostBehind = sorted[sorted.length - 1];

  const allLagging = participating.every((m) => m.fraction <= LAGGING_MAX);
  const allCaughtUp = participating.every((m) => m.fraction >= CRUSHING_MIN);

  // State 3 / 4 — everything lagging.
  if (allLagging) {
    const bank = daysElapsed <= EARLY_WEEK_DAYS ? EARLY_DAYS_PHRASES : ALL_LOW_PHRASES;
    return { message: pickPhrase(bank, `alllow-${seed}`) };
  }

  // State 2 — all caught up: strongest pillar win + an all-clear flourish.
  if (allCaughtUp) {
    return {
      win: pillarCallout(strongest.key, strongest.fraction, `${seed}-win`),
      allClear: pickPhrase(ALL_CLEAR_PHRASES, `allclear-${seed}`),
    };
  }

  // State 1 — mostly good, something behind: celebrate strongest, nudge the
  // most-behind. (Guard the degenerate one-mark case so win ≠ nudge dup.)
  if (strongest.key === mostBehind.key) {
    return { win: pillarCallout(strongest.key, strongest.fraction, `${seed}-win`) };
  }
  return {
    win: pillarCallout(strongest.key, strongest.fraction, `${seed}-win`),
    nudge: pillarCallout(mostBehind.key, mostBehind.fraction, `${seed}-nudge`),
  };
}
