import { Decoder, Stream } from '@garmin/fitsdk';
import { cumulativeDistance } from '@ascents/domain';
import { isRecord, toNumber } from '../parse-helpers.js';
import type { TrackParser } from '../ports.js';
import type { Track } from '../track.js';

/** Semicircles to degrees. FIT stores position as a signed 32-bit angle. */
const SEMICIRCLE_TO_DEG = 180 / 2 ** 31;

/**
 * FIT is the richest of the three formats: it carries distance, the device's
 * own pedalling time and its own total ascent, all of which beat anything we
 * can derive. It is also the heaviest to decode, which is why this module is
 * behind its own export path and loaded on demand — see `importRide`.
 */
export const fitParser: TrackParser = {
  format: 'fit',

  parse(bytes: Uint8Array): Track {
    const decoder = new Decoder(Stream.fromByteArray(bytes));
    // Defaults apply scale/offset and convert timestamps to Date, which is what
    // we want: altitude and distance arrive in metres, timestamps as dates.
    const { messages } = decoder.read({ convertTypesToStrings: true });

    const records = Array.isArray(messages.recordMesgs) ? messages.recordMesgs : [];

    const lat: (number | null)[] = [];
    const lon: (number | null)[] = [];
    const alt: (number | null)[] = [];
    const hr: (number | null)[] = [];
    const stamps: (number | null)[] = [];
    const fileDist: (number | null)[] = [];

    for (const record of records) {
      if (!isRecord(record)) continue;
      const rawLat = toNumber(record['positionLat']);
      const rawLon = toNumber(record['positionLong']);
      lat.push(rawLat == null ? null : rawLat * SEMICIRCLE_TO_DEG);
      lon.push(rawLon == null ? null : rawLon * SEMICIRCLE_TO_DEG);

      // enhancedAltitude covers altitudes outside the basic field's range.
      alt.push(toNumber(record['enhancedAltitude']) ?? toNumber(record['altitude']));
      hr.push(toNumber(record['heartRate']));
      fileDist.push(toNumber(record['distance']));

      const at = record['timestamp'];
      stamps.push(at instanceof Date ? at.getTime() : toEpoch(at));
    }

    const first = stamps.find((s) => s != null) ?? null;
    const hasTime = first != null;
    const time = stamps.map((s) => (s != null && first != null ? (s - first) / 1000 : 0));

    const usable = fileDist.filter((d) => d != null).length > fileDist.length / 2;
    const dist = usable ? forwardFill(fileDist) : cumulativeDistance(lat, lon);

    const session = firstRecord(messages.sessionMesgs);
    const sport = session ? session['sport'] : undefined;
    const timer = session ? toNumber(session['totalTimerTime']) : null;
    const ascent = session ? toNumber(session['totalAscent']) : null;

    return {
      lat,
      lon,
      alt,
      hr,
      time,
      dist,
      meta: {
        ...(typeof sport === 'string' ? { sport } : {}),
        ...(first != null ? { startTime: new Date(first).toISOString() } : {}),
        ...(timer != null ? { movingTime: Math.round(timer) } : {}),
        ...(ascent != null ? { ascent } : {}),
        format: 'fit',
        hasTime,
      },
    };
  },
};

function firstRecord(list: unknown): Record<string, unknown> | null {
  if (!Array.isArray(list)) return null;
  const head: unknown = list[0];
  return isRecord(head) ? head : null;
}

function toEpoch(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function forwardFill(values: readonly (number | null)[]): number[] {
  const out: number[] = [];
  let last = 0;
  for (const v of values) {
    if (v != null && v >= last) last = v;
    out.push(last);
  }
  return out;
}
