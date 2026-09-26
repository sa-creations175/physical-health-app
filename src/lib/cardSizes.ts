// One set of card sizes for Home and Fitness's first screen (from
// body-home-headings.html, Build 7), so the two screens never drift apart:
// rings, the text in and under them, dots and their labels, and card padding.
// Home spreads the room it has left between its cards (Build 8); both screens
// use these sizes for everything inside a card.

export const CARD_PAD = 'px-3 py-[5px]';
// Fitness's first screen has room for the spec's roomier cards
// (body-fitness-options.html: about 10px top and bottom at phone size).
export const CARD_PAD_ROOMY = 'px-3.5 py-2.5';

// Rings: 32px, or 34px where three or five share a row. Numbers 8.5px.
export const RING = { size: 32, inner: 24, textClass: 'text-[8.5px]' };
export const WIDE_RING = { size: 34, inner: 25, textClass: 'text-[8.5px]' };
// A ring with its label beside it (Fitness's collapsed Quick Reps and
// Recovery): the spec's 44px ring, numbers 10px.
export const ROW_RING = { size: 44, inner: 34, textClass: 'text-[10px]' };

// Clear space above a row of rings, and above a single ring, under the
// heading line; and the rule above a row of dots.
export const RING_ROW_GAP = 'mt-1.5';
export const RING_GAP = 'mt-1';
export const DOT_RULE = 'mt-1 pt-1 border-t';

// Text: the caption under a ring, the corner text on a heading row, and the
// small lines (labels under dots, "Set up in More").
export const CAPTION = 'text-[10px] leading-tight font-semibold text-muted';
export const CORNER = 'text-[12px] text-muted whitespace-nowrap';
export const SMALL_TEXT = 'text-[10px] leading-tight';

// ---- First screens ------------------------------------------------------------------
// Home and Fitness each fill exactly one screen: the screen frame's content
// area, between the locked header and the tab bar (Build 14).

// How far below the tab bar's top line its icons start.
export const TAB_BAR_ICON_TOP = 11;
// Home: Checkups ends this far above the tab bar's line.
export const HOME_MARGIN_ABOVE_TAB_BAR = 15;
// Fitness: Quick Reps and Recovery end this far above the tab bar's icons
// (body-fitness-options.html, scaled to the phone).
export const FITNESS_GAP_ABOVE_TAB_ICONS = 20;
// The smallest gap between first-screen cards; spare room spreads on top.
export const FIRST_SCREEN_CARD_GAP = 'gap-[9px]';
