/**
 * A track as it comes out of a file, before any analysis.
 *
 * Full resolution — typically 1 Hz — and deliberately permissive: any channel
 * may be missing, because real files routinely lack one.
 */
export interface Track {
  readonly lat: readonly (number | null)[];
  readonly lon: readonly (number | null)[];
  readonly alt: readonly (number | null)[];
  readonly hr: readonly (number | null)[];
  /** Seconds elapsed since the first point. All zero when the file has no timestamps. */
  readonly time: readonly number[];
  /** Metres from the start. Taken from the file when present, else computed from positions. */
  readonly dist: readonly number[];
  readonly meta: TrackMeta;
}

export interface TrackMeta {
  /** Activity name from the file, when it carries one. */
  readonly name?: string;
  /** Start of the activity, ISO-8601, when known. */
  readonly startTime?: string;
  /** Device-reported pedalling time in seconds. FIT only. */
  readonly movingTime?: number;
  /** Device-reported total ascent in metres. FIT only, and better than anything we compute. */
  readonly ascent?: number;
  readonly sport?: string;
  /** Which parser produced this. */
  readonly format: TrackFormat;
  /** True when the file carried real timestamps. */
  readonly hasTime: boolean;
}

export type TrackFormat = 'gpx' | 'tcx' | 'fit';
