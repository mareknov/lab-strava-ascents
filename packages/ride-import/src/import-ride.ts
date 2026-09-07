import {
  analyseRide,
  gatedAscent,
  movingTime as deriveMovingTime,
  resampleUniform,
  type Ride,
  type RideSamples,
} from '@ascents/domain';
import { detectFormat } from './detect-format.js';
import { fail, ok, problem, type Result } from './errors.js';
import { gpxParser } from './adapters/gpx.parser.js';
import { tcxParser } from './adapters/tcx.parser.js';
import type { TrackParser } from './ports.js';
import type { Track, TrackFormat } from './track.js';

export interface ImportOptions {
  /** Used for the ride name and as a fallback for format detection. */
  readonly filename?: string;
}

/**
 * Resolve a parser for the format.
 *
 * GPX and TCX are cheap and always bundled. FIT is loaded on demand: the Garmin
 * SDK is around 390 KB minified, and most visitors never upload one. This
 * dynamic import is what lets the bundler split it into its own chunk — do not
 * turn it into a static import.
 */
async function parserFor(format: TrackFormat): Promise<TrackParser> {
  if (format === 'gpx') return gpxParser;
  if (format === 'tcx') return tcxParser;
  const { fitParser } = await import('./adapters/fit.parser.js');
  return fitParser;
}

/**
 * Parse a file into a raw Track, without analysing it.
 *
 * Exposed so tests can compare a parsed track against the reference numbers
 * before resampling gets involved, and so a future service can reuse parsing
 * without the browser-facing pipeline.
 */
export async function parseTrack(
  bytes: Uint8Array,
  { filename }: ImportOptions = {},
): Promise<Result<Track>> {
  const format = detectFormat(bytes, filename ?? '');
  if (!format) {
    return fail(problem('UNSUPPORTED_FORMAT', 'That does not look like a GPX, TCX or FIT file.'));
  }
  try {
    const parser = await parserFor(format);
    return ok(parser.parse(bytes));
  } catch (cause) {
    return fail(problem('PARSE_FAILED', `The ${format.toUpperCase()} file could not be read.`, cause));
  }
}

/** Drop points with no altitude fix, keeping the remaining channels aligned. */
export function trackToSamples(track: Track): RideSamples {
  const dist: number[] = [];
  const alt: number[] = [];
  const hr: (number | null)[] = [];
  const time: number[] = [];

  let lastDist = -1;
  for (let i = 0; i < track.alt.length; i++) {
    const a = track.alt[i];
    const d = track.dist[i];
    // Distance must stay monotonic or the binary search in altAt breaks.
    if (a == null || d == null || d < lastDist) continue;
    dist.push(d);
    alt.push(a);
    hr.push(track.hr[i] ?? null);
    time.push(track.time[i] ?? 0);
    lastDist = d;
  }
  return { dist, alt, hr, time };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function titleFrom(track: Track, filename: string | undefined): string {
  const fromFile = track.meta.name?.trim();
  if (fromFile && !/^\d{4}-\d{2}-\d{2}T/.test(fromFile)) return fromFile;
  const base = (filename ?? '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base || 'Uploaded ride';
}

/**
 * Turn an uploaded file into an analysed ride.
 *
 * Ascent and pedalling time are taken at full resolution — or from the device's
 * own figures where the file reports them — *before* the track is resampled.
 * That ordering is deliberate: resampling is what makes the climb detector
 * behave, but it also throws away the detail an honest ascent total needs.
 */
export async function importRide(
  bytes: Uint8Array,
  { filename }: ImportOptions = {},
): Promise<Result<Ride>> {
  const parsed = await parseTrack(bytes, { filename: filename ?? '' });
  if (!parsed.ok) return parsed;
  const track = parsed.value;

  const raw = trackToSamples(track);
  if (raw.dist.length < 2) {
    return fail(
      problem(
        'NO_ELEVATION',
        'This file has no elevation data, so there are no climbs to measure. GPS watches sometimes omit it — try exporting the original file rather than a converted one.',
      ),
    );
  }
  if (raw.dist[raw.dist.length - 1] <= 0) {
    return fail(problem('TOO_FEW_POINTS', 'This ride has no distance recorded.'));
  }

  // Both computed on the full-resolution track, before resampling.
  const ascent = track.meta.ascent ?? gatedAscent(raw.alt);
  const movingTime = track.meta.movingTime ?? (track.meta.hasTime ? deriveMovingTime(raw.dist, raw.time) : 0);

  const samples = resampleUniform(raw);
  const highPoint = Math.round(Math.max(...samples.alt));
  const date = formatDate(track.meta.startTime);

  const ride = analyseRide(
    {
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: titleFrom(track, filename),
      sub: `${date ? `${date} · ` : ''}${highPoint} m`,
      movingTime,
      ascent: Math.round(ascent),
      source: 'upload',
    },
    samples,
  );

  if (ride.climbs.length === 0) {
    return fail(
      problem(
        'NO_CLIMBS',
        'No climb in this ride gains 60 m without giving 30 m back, so there is nothing to break into slots.',
      ),
    );
  }

  return ok(ride);
}
