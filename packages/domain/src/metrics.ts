import { ASCENT_NOISE_GATE_M, MOVING_SPEED_MIN_MPS } from './config.js';

/**
 * Total ascent from a full-resolution track, with a noise gate.
 *
 * Summing every positive step over a 1 Hz barometric trace inflates the total
 * badly, because sensor jitter of a few centimetres accumulates across
 * thousands of points. This walks a reference altitude and only banks a gain
 * once the track has risen `gate` metres clear of it.
 *
 * Run this on the raw track, before resampling — that is the whole point of it.
 */
export function gatedAscent(alt: readonly number[], gate = ASCENT_NOISE_GATE_M): number {
  if (alt.length === 0) return 0;

  let sum = 0;
  let reference = alt[0];
  for (let i = 1; i < alt.length; i++) {
    const delta = alt[i] - reference;
    if (delta >= gate) {
      sum += delta;
      reference = alt[i];
    } else if (delta <= -gate) {
      reference = alt[i];
    }
  }
  return sum;
}

/**
 * Seconds actually pedalling, from distance and elapsed time.
 *
 * Used only when the file does not report a moving time of its own. FIT files
 * carry `total_timer_time`, which is the device's own figure and always better.
 */
export function movingTime(
  dist: readonly number[],
  time: readonly number[],
  minSpeed = MOVING_SPEED_MIN_MPS,
): number {
  let total = 0;
  for (let i = 0; i < time.length - 1; i++) {
    const dt = time[i + 1] - time[i];
    if (dt <= 0) continue;
    const dd = dist[i + 1] - dist[i];
    if (dd / dt >= minSpeed) total += dt;
  }
  return Math.round(total);
}
