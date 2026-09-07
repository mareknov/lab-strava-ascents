import type { Climb, RideSamples } from './ride.js';

export interface Slot {
  /** Start distance, metres from the ride start. */
  x: number;
  /** End distance. */
  x2: number;
  a1: number;
  a2: number;
  gain: number;
  /** Percent. */
  grade: number;
  /** Mean bpm over the slot, or null when the ride carries no heart rate. */
  hr: number | null;
}

/** Altitude at an arbitrary distance, linearly interpolated between samples. */
export function altAt(s: RideSamples, x: number): number {
  const { dist, alt } = s;
  const n = dist.length;
  if (x <= dist[0]) return alt[0];
  if (x >= dist[n - 1]) return alt[n - 1];

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (dist[mid] <= x) lo = mid;
    else hi = mid;
  }
  return alt[lo] + ((x - dist[lo]) / (dist[hi] - dist[lo])) * (alt[hi] - alt[lo]);
}

/**
 * Mean heart rate over the sample points falling inside [a, b].
 *
 * Approximate by nature: it averages whatever points land in the window rather
 * than weighting by time or distance. At 250 m slots that is a handful of
 * points. Returns null when the ride has no readings in range.
 */
export function hrBetween(s: RideSamples, a: number, b: number): number | null {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < s.dist.length; i++) {
    const beat = s.hr[i];
    if (beat != null && s.dist[i] >= a && s.dist[i] <= b) {
      sum += beat;
      count++;
    }
  }
  return count > 0 ? Math.round(sum / count) : null;
}

/**
 * Split a climb into fixed-length slots, interpolating altitude at every
 * boundary. A trailing stub shorter than 35% of the slot length is folded into
 * the slot before it rather than shown as a runt row.
 */
export function splitIntoSlots(samples: RideSamples, climb: Climb, size: number): Slot[] {
  const out: Slot[] = [];

  for (let x = climb.d0; x < climb.d1 - 1; x += size) {
    const x2 = Math.min(x + size, climb.d1);

    if (x2 - x < size * 0.35 && out.length > 0) {
      const last = out[out.length - 1];
      last.x2 = x2;
      last.a2 = altAt(samples, x2);
      last.gain = last.a2 - last.a1;
      last.grade = (last.gain / (last.x2 - last.x)) * 100;
      last.hr = hrBetween(samples, last.x, last.x2);
      break;
    }

    const a1 = altAt(samples, x);
    const a2 = altAt(samples, x2);
    out.push({
      x,
      x2,
      a1,
      a2,
      gain: a2 - a1,
      grade: ((a2 - a1) / (x2 - x)) * 100,
      hr: hrBetween(samples, x, x2),
    });
  }
  return out;
}
