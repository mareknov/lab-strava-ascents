import { detectClimbs, detectStops, totalAscent } from './climb-detector.js';
import type { Climb, Ride, RideMeta, RideSamples } from './ride.js';

/**
 * Turn raw sample arrays plus metadata into a fully analysed ride.
 *
 * Pure: no DOM, no I/O, no clock. This is the function `prototype-climb-detection.py`
 * mirrors, and the reason this package compiles without the DOM lib.
 */
export function analyseRide(meta: RideMeta, samples: RideSamples): Ride {
  const { dist, alt, hr, time } = samples;
  const n = dist.length;

  const climbs: Climb[] = detectClimbs(alt).map((range, idx) => {
    const { i0, i1 } = range;
    const d0 = dist[i0];
    const d1 = dist[i1];
    const a0 = alt[i0];
    const a1 = alt[i1];
    const len = d1 - d0;
    const gain = a1 - a0;
    return { idx, i0, i1, d0, d1, a0, a1, len, gain, grade: (gain / len) * 100 };
  });

  const mainClimb = climbs.reduce(
    (best, c) => (c.gain > (climbs[best]?.gain ?? -Infinity) ? c.idx : best),
    0,
  );

  return {
    ...meta,
    samples,
    n,
    totalAscent: totalAscent(alt),
    stops: detectStops(dist, alt, time),
    climbs,
    mainClimb,
    hasHeartRate: hr.some((b) => b != null),
  };
}
