import { RESAMPLE_MAX_POINTS, RESAMPLE_SPACING_M } from './config.js';
import type { RideSamples } from './ride.js';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Resample onto an explicit list of distances.
 *
 * Exposed separately from `resampleUniform` so tests can resample a parsed
 * track back onto its original grid and compare against the reference numbers
 * exactly, without the spacing choice muddying the comparison.
 */
export function resampleAt(samples: RideSamples, distances: readonly number[]): RideSamples {
  const { dist, alt, hr, time } = samples;
  const n = dist.length;
  const outAlt: number[] = [];
  const outHr: (number | null)[] = [];
  const outTime: number[] = [];

  let lo = 0;
  for (const x of distances) {
    while (lo < n - 2 && dist[lo + 1] < x) lo++;
    const hi = Math.min(lo + 1, n - 1);
    const span = dist[hi] - dist[lo];
    const t = span > 0 ? Math.min(1, Math.max(0, (x - dist[lo]) / span)) : 0;

    outAlt.push(lerp(alt[lo], alt[hi], t));
    outTime.push(lerp(time[lo], time[hi], t));

    const a = hr[lo];
    const b = hr[hi];
    if (a != null && b != null) outHr.push(Math.round(lerp(a, b, t)));
    else outHr.push(a ?? b ?? null);
  }

  return { dist: [...distances], alt: outAlt, hr: outHr, time: outTime };
}

/**
 * Resample onto a uniform distance grid.
 *
 * Raw recordings arrive at 1 Hz, a few metres apart. The climb detector's 30 m
 * tolerance was tuned against Strava-downsampled streams roughly 50–150 m
 * apart, and at raw resolution barometric noise shatters one climb into many.
 * Normalising here is what lets uploaded rides and the sample rides be read on
 * the same terms.
 */
export function resampleUniform(
  samples: RideSamples,
  spacing = RESAMPLE_SPACING_M,
  maxPoints = RESAMPLE_MAX_POINTS,
): RideSamples {
  const total = samples.dist[samples.dist.length - 1] ?? 0;
  if (total <= 0) return samples;

  const step = Math.max(spacing, total / (maxPoints - 1));
  const grid: number[] = [];
  for (let x = 0; x < total; x += step) grid.push(x);
  grid.push(total);

  return resampleAt(samples, grid);
}
