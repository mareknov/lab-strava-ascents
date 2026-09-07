/** Parallel sample arrays, one entry per point. This is the shape everything analyses. */
export interface RideSamples {
  /** Metres from the start. Monotonically non-decreasing. */
  readonly dist: readonly number[];
  /** Metres above sea level. */
  readonly alt: readonly number[];
  /** Beats per minute, or null where no reading is available. */
  readonly hr: readonly (number | null)[];
  /** Seconds elapsed since the start — elapsed, not moving. */
  readonly time: readonly number[];
}

export interface RideMeta {
  readonly id: string;
  /** Display name, e.g. "Kráľova hoľa". */
  readonly name: string;
  /** Secondary tab line, e.g. "20 Oct 2024 · 1932 m". */
  readonly sub: string;
  /** Seconds actually pedalling. */
  readonly movingTime: number;
  /** Total metres climbed. For samples this is Strava's figure; for uploads it
   *  is computed from the full-resolution track before resampling. */
  readonly ascent: number;
  /** Hand-written prose. Present on the six sample rides, absent on uploads. */
  readonly intro?: string;
  readonly foot?: string;
  readonly source: 'sample' | 'upload';
}

export interface Stop {
  /** Metres from the start. */
  readonly d: number;
  /** Altitude at the stop. */
  readonly a: number;
  /** Whole minutes stopped. */
  readonly min: number;
}

export interface Climb {
  readonly idx: number;
  readonly i0: number;
  readonly i1: number;
  readonly d0: number;
  readonly d1: number;
  readonly a0: number;
  readonly a1: number;
  /** Metres of road. */
  readonly len: number;
  /** Metres gained. */
  readonly gain: number;
  /** Average gradient, percent. */
  readonly grade: number;
}

export interface Ride extends RideMeta {
  readonly samples: RideSamples;
  readonly n: number;
  /** Ascent recomputed from these samples. Reads low against `ascent` when the
   *  track has been downsampled — that difference is expected, not a bug. */
  readonly totalAscent: number;
  readonly stops: readonly Stop[];
  readonly climbs: readonly Climb[];
  /** Index of the biggest climb, used as the initial selection. */
  readonly mainClimb: number;
  /** True when at least one sample carries a heart-rate reading. */
  readonly hasHeartRate: boolean;
}
