/**
 * Tuning constants for the analysis.
 *
 * `CLIMB_TOLERANCE_M` and `CLIMB_MIN_GAIN_M` are the two numbers the whole
 * report hangs off. They were tuned against six Strava-downsampled rides and
 * are verified against `prototype-climb-detection.py`. Changing either means
 * re-running that verification.
 */
export const CLIMB_TOLERANCE_M = 30;
export const CLIMB_MIN_GAIN_M = 60;

/** A gap in the elapsed-time stream longer than this counts as a stop. */
export const STOP_THRESHOLD_S = 600;

/** Slot lengths offered in the UI. */
export const SLOT_SIZES_M = [250, 500, 1000] as const;
export type SlotSize = (typeof SLOT_SIZES_M)[number];

/** The slot length the gradient ladder is always measured in. */
export const LADDER_SLOT_M = 250;

/**
 * Uploaded tracks are resampled onto a uniform grid at this spacing before
 * analysis. Raw recordings arrive at 1 Hz — a few metres per point — which is
 * far finer than the detector's 30 m tolerance was tuned for, and barometric
 * noise at that resolution shatters a single climb into fragments.
 */
export const RESAMPLE_SPACING_M = 100;

/** Upper bound on resampled points, so a very long ride cannot bloat the SVG. */
export const RESAMPLE_MAX_POINTS = 2500;

/**
 * Altitude changes smaller than this are treated as sensor noise when totalling
 * ascent from a full-resolution track.
 */
export const ASCENT_NOISE_GATE_M = 1;

/**
 * Longest silence in the heart-rate stream that is bridged rather than shown
 * as a break.
 *
 * Devices commonly log heart rate far less often than position — one reading
 * every five to ten seconds against 1 Hz for GPS — which leaves the channel
 * mostly empty even though the sensor was working fine. Anything longer than
 * this is treated as the sensor genuinely dropping out, and stays a gap.
 *
 * A minute is where the two separate on real files: on a sample ride logging
 * heart rate every 5 s (median gap 5 s, p90 9 s), raising the limit from 30 s
 * to 60 s removed seven breaks, while 60 s to 90 s removed none — no gap in
 * that ride falls between the two. What remains past a minute is a handful of
 * multi-minute outages, which are worth showing rather than papering over.
 */
export const HR_MAX_BRIDGE_S = 60;

/** Below this speed the rider is not considered to be pedalling. */
export const MOVING_SPEED_MIN_MPS = 0.8;
