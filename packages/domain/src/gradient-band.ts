export interface GradientBand {
  /** Upper bound, exclusive. */
  readonly max: number;
  readonly colour: string;
  readonly label: string;
}

export const GRADIENT_BANDS: readonly GradientBand[] = [
  { max: 3, colour: '#4F7F4E', label: 'under 3%' },
  { max: 5, colour: '#86A03F', label: '3 – 5%' },
  { max: 7, colour: '#C99A1B', label: '5 – 7%' },
  { max: 9, colour: '#D06A26', label: '7 – 9%' },
  { max: 99, colour: '#A93326', label: 'over 9%' },
];

const LAST = GRADIENT_BANDS[GRADIENT_BANDS.length - 1] as GradientBand;

export function bandFor(grade: number): GradientBand {
  return GRADIENT_BANDS.find((b) => grade < b.max) ?? LAST;
}

export function colourFor(grade: number): string {
  return bandFor(grade).colour;
}
