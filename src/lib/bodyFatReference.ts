// Visual body-fat reference ranges for men (Phase 3a onboarding). The user
// picks the band that looks closest to them; the chosen band's low/high become
// the starting range saved as a 'visual_estimate' measurement (its midpoint is
// the stored bf%). Descriptions stand in for reference photos — drop real
// reference images in alongside `mid` later without changing the data shape.
export interface BodyFatBand {
  low: number;
  high: number;
  label: string;
  description: string;
}

export const MALE_BODY_FAT_BANDS: BodyFatBand[] = [
  {
    low: 6,
    high: 9,
    label: '6–9%',
    description: 'Stage-lean — striated, vascular, every muscle visible.',
  },
  {
    low: 10,
    high: 13,
    label: '10–13%',
    description: 'Very lean — clear six-pack, visible vascularity.',
  },
  {
    low: 14,
    high: 17,
    label: '14–17%',
    description: 'Lean & athletic — abs visible, defined arms and chest.',
  },
  {
    low: 18,
    high: 21,
    label: '18–21%',
    description: 'Fit — faint ab outline, a little softness over it.',
  },
  {
    low: 22,
    high: 27,
    label: '22–27%',
    description: 'Average — little definition, softer midsection.',
  },
  {
    low: 28,
    high: 34,
    label: '28–34%',
    description: 'Higher — no visible abs, fuller midsection.',
  },
  {
    low: 35,
    high: 45,
    label: '35%+',
    description: 'High — significant fat over the whole frame.',
  },
];

export function bandMidpoint(band: BodyFatBand): number {
  return Math.round((band.low + band.high) / 2);
}
