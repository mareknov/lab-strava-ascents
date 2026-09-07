import { CLIMB_MIN_GAIN_M, CLIMB_TOLERANCE_M, STOP_THRESHOLD_S } from './config.js';
import type { Stop } from './ride.js';

export interface ClimbRange {
  readonly i0: number;
  readonly i1: number;
}

export interface DetectOptions {
  readonly tolerance?: number;
  readonly minGain?: number;
}

/**
 * Split a track into sustained climbs.
 *
 * Walks the track holding two markers: the lowest point since the last reset
 * (`start`) and the highest point seen since then (`peak`). Once the road gives
 * back more than `tolerance` metres from the peak, the climb is closed and both
 * markers reset to the current point.
 *
 * A direct port of `prototype-climb-detection.py`; the six sample rides are
 * asserted against that script in `test/parity.test.ts`. Do not restructure
 * this casually — re-run the parity suite if you do.
 */
export function detectClimbs(
  alt: readonly number[],
  { tolerance = CLIMB_TOLERANCE_M, minGain = CLIMB_MIN_GAIN_M }: DetectOptions = {},
): ClimbRange[] {
  const climbs: ClimbRange[] = [];
  if (alt.length === 0) return climbs;

  let start = 0;
  let peak = 0;
  for (let i = 1; i < alt.length; i++) {
    if (alt[i] >= alt[peak]) peak = i;
    if (alt[peak] - alt[i] > tolerance) {
      if (alt[peak] - alt[start] >= minGain) climbs.push({ i0: start, i1: peak });
      start = i;
      peak = i;
    }
    if (peak === start && alt[i] <= alt[start]) start = i;
  }
  if (alt[peak] - alt[start] >= minGain) climbs.push({ i0: start, i1: peak });
  return climbs;
}

/** Total metres gained, summing every positive step. */
export function totalAscent(alt: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < alt.length - 1; i++) {
    const rise = alt[i + 1] - alt[i];
    if (rise > 0) sum += rise;
  }
  return sum;
}

/** Gaps in the elapsed-time stream longer than the stop threshold. */
export function detectStops(
  dist: readonly number[],
  alt: readonly number[],
  time: readonly number[],
): Stop[] {
  const stops: Stop[] = [];
  for (let i = 0; i < time.length - 1; i++) {
    const dt = time[i + 1] - time[i];
    if (dt > STOP_THRESHOLD_S) {
      stops.push({ d: dist[i], a: alt[i], min: Math.round(dt / 60) });
    }
  }
  return stops;
}
