// Visual body-fat reference bands for men (Phase 2 of nutrition setup). Each
// band renders an SVG silhouette (muscle definition scaling with `level`),
// its % label, a short descriptor, and a 1–2 sentence description. Tapping a
// band selects it; its `pct` is stored as the starting 'visual_estimate'.
export interface BodyFatBand {
  pct: number; // representative % stored when this band is picked
  label: string; // e.g. "~15%"
  descriptor: string; // e.g. "Fit"
  description: string; // 1–2 sentences of what's visible at this level
  // 0 (leanest) … 5 (highest) — drives the silhouette's ab definition + waist.
  level: number;
}

export const MALE_BODY_FAT_BANDS: BodyFatBand[] = [
  {
    pct: 8,
    label: '~8%',
    descriptor: 'Competition lean',
    level: 0,
    description:
      'Striations and visible vascularity across the whole frame. Stage-ready conditioning that’s hard to hold year-round.',
  },
  {
    pct: 12,
    label: '~12%',
    descriptor: 'Athletic',
    level: 1,
    description:
      'A clear six-pack with defined arms and chest. The lean, athletic look most people train toward.',
  },
  {
    pct: 15,
    label: '~15%',
    descriptor: 'Fit',
    level: 2,
    description:
      'Abs are visible over a flat midsection. Fit and healthy without extreme dieting.',
  },
  {
    pct: 18,
    label: '~18%',
    descriptor: 'Average',
    level: 3,
    description:
      'A faint ab outline with a little softness over it. A solid, everyday-fit shape.',
  },
  {
    pct: 22,
    label: '~22%',
    descriptor: 'Soft',
    level: 4,
    description:
      'Little muscle definition and a softer midsection. A common starting point before a cut.',
  },
  {
    pct: 26,
    label: '~25%+',
    descriptor: 'High',
    level: 5,
    description:
      'No visible abs and a fuller midsection. A focused cut pays off quickly from here.',
  },
];
