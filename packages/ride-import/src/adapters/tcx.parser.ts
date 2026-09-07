import { XMLParser } from 'fast-xml-parser';
import { cumulativeDistance } from '@ascents/domain';
import { isRecord, toArray, toEpochMs, toNumber } from '../parse-helpers.js';
import type { TrackParser } from '../ports.js';
import type { Track } from '../track.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseAttributeValue: true,
});

/**
 * TCX carries DistanceMeters per trackpoint, so distance comes from the device
 * rather than being integrated from GPS. Where it is missing — some exporters
 * drop it — we fall back to positions.
 */
export const tcxParser: TrackParser = {
  format: 'tcx',

  parse(bytes: Uint8Array): Track {
    const doc: unknown = parser.parse(new TextDecoder('utf-8').decode(bytes));
    const root = isRecord(doc) ? doc['TrainingCenterDatabase'] : undefined;
    const activities = isRecord(root) ? root['Activities'] : undefined;

    const lat: (number | null)[] = [];
    const lon: (number | null)[] = [];
    const alt: (number | null)[] = [];
    const hr: (number | null)[] = [];
    const stamps: (number | null)[] = [];
    const fileDist: (number | null)[] = [];

    let sport: string | undefined;
    let name: string | undefined;
    let lapSeconds = 0;

    for (const activity of toArray(isRecord(activities) ? activities['Activity'] : undefined)) {
      if (!isRecord(activity)) continue;
      if (sport === undefined && typeof activity['@_Sport'] === 'string') sport = activity['@_Sport'];
      if (name === undefined && typeof activity['Id'] === 'string') name = activity['Id'];

      for (const lap of toArray(activity['Lap'])) {
        if (!isRecord(lap)) continue;
        lapSeconds += toNumber(lap['TotalTimeSeconds']) ?? 0;

        for (const track of toArray(lap['Track'])) {
          if (!isRecord(track)) continue;

          for (const pt of toArray(track['Trackpoint'])) {
            if (!isRecord(pt)) continue;
            const pos = pt['Position'];
            lat.push(isRecord(pos) ? toNumber(pos['LatitudeDegrees']) : null);
            lon.push(isRecord(pos) ? toNumber(pos['LongitudeDegrees']) : null);
            alt.push(toNumber(pt['AltitudeMeters']));
            fileDist.push(toNumber(pt['DistanceMeters']));
            const beats = pt['HeartRateBpm'];
            hr.push(isRecord(beats) ? toNumber(beats['Value']) : toNumber(beats));
            stamps.push(toEpochMs(pt['Time']));
          }
        }
      }
    }

    const first = stamps.find((s) => s != null) ?? null;
    const hasTime = first != null;
    const time = stamps.map((s) => (s != null && first != null ? (s - first) / 1000 : 0));

    // Prefer the device's own distance, but only if it is actually populated.
    const usable = fileDist.filter((d) => d != null).length > fileDist.length / 2;
    const dist = usable ? forwardFill(fileDist) : cumulativeDistance(lat, lon);

    return {
      lat,
      lon,
      alt,
      hr,
      time,
      dist,
      meta: {
        ...(name !== undefined ? { name } : {}),
        ...(first != null ? { startTime: new Date(first).toISOString() } : {}),
        ...(sport !== undefined ? { sport } : {}),
        ...(lapSeconds > 0 ? { movingTime: Math.round(lapSeconds) } : {}),
        format: 'tcx',
        hasTime,
      },
    };
  },
};

/** Carry the last known distance across gaps so the series stays monotonic. */
function forwardFill(values: readonly (number | null)[]): number[] {
  const out: number[] = [];
  let last = 0;
  for (const v of values) {
    if (v != null && v >= last) last = v;
    out.push(last);
  }
  return out;
}
