import { XMLParser } from 'fast-xml-parser';
import { cumulativeDistance } from '@ascents/domain';
import { findDeep, isRecord, toArray, toEpochMs, toNumber } from '../parse-helpers.js';
import type { TrackParser } from '../ports.js';
import type { Track } from '../track.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Turns gpxtpx:hr into hr, so Garmin, Wahoo and Suunto extensions all read alike.
  removeNSPrefix: true,
  parseAttributeValue: true,
});

/**
 * GPX has no distance channel, so distance is integrated from the positions.
 * That makes it the least accurate of the three formats over a twisty descent,
 * but it is the format every device and every export button can produce.
 */
export const gpxParser: TrackParser = {
  format: 'gpx',

  parse(bytes: Uint8Array): Track {
    const doc: unknown = parser.parse(new TextDecoder('utf-8').decode(bytes));
    const gpx = isRecord(doc) ? doc['gpx'] : undefined;
    const tracks = toArray(isRecord(gpx) ? gpx['trk'] : undefined);

    const lat: (number | null)[] = [];
    const lon: (number | null)[] = [];
    const alt: (number | null)[] = [];
    const hr: (number | null)[] = [];
    const stamps: (number | null)[] = [];
    let name: string | undefined;

    for (const trk of tracks) {
      if (!isRecord(trk)) continue;
      if (name === undefined && typeof trk['name'] === 'string') name = trk['name'];

      for (const seg of toArray(trk['trkseg'])) {
        if (!isRecord(seg)) continue;

        for (const pt of toArray(seg['trkpt'])) {
          if (!isRecord(pt)) continue;
          lat.push(toNumber(pt['@_lat']));
          lon.push(toNumber(pt['@_lon']));
          alt.push(toNumber(pt['ele']));
          hr.push(toNumber(findDeep(pt['extensions'], 'hr')));
          stamps.push(toEpochMs(pt['time']));
        }
      }
    }

    const meta = isRecord(gpx) ? gpx['metadata'] : undefined;
    if (name === undefined && isRecord(meta) && typeof meta['name'] === 'string') name = meta['name'];

    const first = stamps.find((s) => s != null) ?? null;
    const hasTime = first != null;
    const time = stamps.map((s) => (s != null && first != null ? (s - first) / 1000 : 0));

    return {
      lat,
      lon,
      alt,
      hr,
      time,
      dist: cumulativeDistance(lat, lon),
      meta: {
        ...(name !== undefined ? { name } : {}),
        ...(first != null ? { startTime: new Date(first).toISOString() } : {}),
        format: 'gpx',
        hasTime,
      },
    };
  },
};
