import { ASCENT_NOISE_GATE_M, HR_MAX_BRIDGE_S, MOVING_SPEED_MIN_MPS } from './config.js';

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

/**
 * Fill the holes a low heart-rate sampling rate leaves behind.
 *
 * A device that logs position at 1 Hz may log heart rate only every five or
 * ten seconds, so most points carry no reading even though the sensor was
 * working. Left alone those holes survive resampling and the trace draws as
 * disconnected fragments.
 *
 * Readings are interpolated across a silence up to `maxGap` seconds. Anything
 * longer is a real dropout and stays null, so the chart still shows a break
 * where the sensor actually stopped rather than inventing a line across it.
 */
export function bridgeHeartRateGaps(
  hr: readonly (number | null)[],
  time: readonly number[],
  maxGap = HR_MAX_BRIDGE_S,
): (number | null)[] {
  const out = hr.slice();
  const known: number[] = [];
  for (let i = 0; i < hr.length; i++) if (hr[i] != null) known.push(i);
  if (known.length === 0) return out;

  for (let k = 0; k < known.length - 1; k++) {
    const a = known[k];
    const b = known[k + 1];
    if (b - a < 2) continue;
    if (time[b] - time[a] > maxGap) continue; // a real dropout: leave the break

    const span = time[b] - time[a];
    const from = hr[a] as number;
    const to = hr[b] as number;
    for (let i = a + 1; i < b; i++) {
      const t = span > 0 ? (time[i] - time[a]) / span : 0;
      out[i] = Math.round(from + (to - from) * t);
    }
  }

  // Carry the first and last readings to the very edges, within the same limit.
  const first = known[0];
  for (let i = 0; i < first; i++) {
    if (time[first] - time[i] <= maxGap) out[i] = hr[first];
  }
  const last = known[known.length - 1];
  for (let i = last + 1; i < hr.length; i++) {
    if (time[i] - time[last] <= maxGap) out[i] = hr[last];
  }
  return out;
}
