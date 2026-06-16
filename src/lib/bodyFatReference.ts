// Visual body-fat reference bands for men (Phase 2 of nutrition setup). Each
// band is a text card: its % label, a short descriptor, and a 1–2 sentence
// description. Tapping a band selects it; its `pct` is stored as the starting
// 'visual_estimate'.
export interface BodyFatBand {
  pct: number; // representative % stored when this band is picked
  label: string; // e.g. "~15%"
  descriptor: string; // e.g. "Fit"
  description: string; // 1–2 sentences of what's visible at this level
}

export const MALE_BODY_FAT_BANDS: BodyFatBand[] = [
  {
    pct: 10, // midpoint of 8–11%
    label: '8–11%',
    descriptor: 'Competition lean',
    description:
      'Striations and visible vascularity across the whole frame. Stage-ready conditioning that’s hard to hold year-round.',
  },
  {
    pct: 13, // midpoint of 12–14%
    label: '12–14%',
    descriptor: 'Athletic',
    description:
      'A clear six-pack with defined arms and chest. The lean, athletic look most people train toward.',
  },
  {
    pct: 16, // midpoint of 15–17%
    label: '15–17%',
    descriptor: 'Fit',
    description:
      'Abs are visible over a flat midsection. Fit and healthy without extreme dieting.',
  },
  {
    pct: 19, // midpoint of 18–21%
    label: '18–21%',
    descriptor: 'Average',
    description:
      'A faint ab outline with a little softness over it. A solid, everyday-fit shape.',
  },
  {
    pct: 23, // midpoint of 22–25%
    label: '22–25%',
    descriptor: 'Soft',
    description:
      'Little muscle definition and a softer midsection. A common starting point before a cut.',
  },
  {
    pct: 27, // 25%+
    label: '25%+',
    descriptor: 'High',
    description:
      'No visible abs and a fuller midsection. A focused cut pays off quickly from here.',
  },
];
