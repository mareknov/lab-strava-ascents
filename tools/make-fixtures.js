/**
 * Build GPX, TCX and FIT fixtures from the six sample rides.
 *
 * Each fixture round-trips back to the numbers in rides/*.json, which lets the
 * parity suite prove the parsers end-to-end against the Python oracle rather
 * than against hand-written expectations.
 *
 * Positions are laid along a meridian at a fixed longitude, so the great-circle
 * distance between consecutive points is exactly R·Δlat and the distance array
 * reconstructs from lat/lon alone. That matters for GPX, which carries no
 * distance channel of its own.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Encoder, Profile } from '@garmin/fitsdk';

const EARTH_RADIUS_M = 6371008.8; // must match packages/domain/src/geo.ts
const BASE_LAT = 48.7;
const BASE_LON = 21.25;
const START = Date.UTC(2024, 9, 20, 7, 30, 0);

const RIDES = 'rides';
const OUT = 'test/fixtures';

const latFor = (metres) => BASE_LAT + (metres / EARTH_RADIUS_M) * (180 / Math.PI);
const iso = (elapsed) => new Date(START + elapsed * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');

function gpx(name, r) {
  const pts = r.distance
    .map((d, i) => {
      const hr = r.heart_rate[i];
      const ext = hr == null ? '' :
        `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>`;
      return `<trkpt lat="${latFor(d).toFixed(12)}" lon="${BASE_LON.toFixed(12)}">` +
        `<ele>${r.altitude[i]}</ele><time>${iso(r.time[i])}</time>${ext}</trkpt>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="make-fixtures" xmlns="http://www.topografix.com/GPX/1/1"
 xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
<metadata><time>${iso(0)}</time></metadata>
<trk><name>${name}</name><type>cycling</type><trkseg>
${pts}
</trkseg></trk></gpx>`;
}

function tcx(name, r) {
  const pts = r.distance
    .map((d, i) => {
      const hr = r.heart_rate[i];
      return `<Trackpoint><Time>${iso(r.time[i])}</Time>` +
        `<Position><LatitudeDegrees>${latFor(d).toFixed(12)}</LatitudeDegrees>` +
        `<LongitudeDegrees>${BASE_LON.toFixed(12)}</LongitudeDegrees></Position>` +
        `<AltitudeMeters>${r.altitude[i]}</AltitudeMeters><DistanceMeters>${d}</DistanceMeters>` +
        (hr == null ? '' : `<HeartRateBpm><Value>${hr}</Value></HeartRateBpm>`) +
        `</Trackpoint>`;
    })
    .join('\n');
  const elapsed = r.time[r.time.length - 1];
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
<Activities><Activity Sport="Biking"><Id>${iso(0)}</Id>
<Lap StartTime="${iso(0)}"><TotalTimeSeconds>${elapsed}</TotalTimeSeconds>
<DistanceMeters>${r.distance[r.distance.length - 1]}</DistanceMeters>
<Track>
${pts}
</Track></Lap></Activity></Activities>
<Author><Name>${name}</Name></Author>
</TrainingCenterDatabase>`;
}

function fit(name, r) {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: Profile.MesgNum.FILE_ID,
    type: 'activity',
    manufacturer: 'garmin',
    product: 0,
    timeCreated: new Date(START),
    serialNumber: 1234,
  });

  for (let i = 0; i < r.distance.length; i++) {
    encoder.writeMesg({
      mesgNum: Profile.MesgNum.RECORD,
      timestamp: new Date(START + r.time[i] * 1000),
      positionLat: Math.round((latFor(r.distance[i]) / 180) * 2 ** 31),
      positionLong: Math.round((BASE_LON / 180) * 2 ** 31),
      altitude: r.altitude[i],
      distance: r.distance[i],
      ...(r.heart_rate[i] == null ? {} : { heartRate: r.heart_rate[i] }),
    });
  }

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.SESSION,
    timestamp: new Date(START + r.time[r.time.length - 1] * 1000),
    startTime: new Date(START),
    sport: 'cycling',
    totalElapsedTime: r.time[r.time.length - 1],
    totalTimerTime: r.time[r.time.length - 1],
    totalDistance: r.distance[r.distance.length - 1],
  });

  return encoder.close();
}

mkdirSync(OUT, { recursive: true });
const files = readdirSync(RIDES).filter((f) => f.endsWith('.json')).sort();
for (const file of files) {
  const stem = file.replace(/\.json$/, '');
  const ride = JSON.parse(readFileSync(join(RIDES, file), 'utf8'));
  // rides/ also holds metadata.json, which is not a stream file.
  if (!Array.isArray(ride.distance)) continue;
  writeFileSync(join(OUT, `${stem}.gpx`), gpx(stem, ride));
  writeFileSync(join(OUT, `${stem}.tcx`), tcx(stem, ride));
  writeFileSync(join(OUT, `${stem}.fit`), fit(stem, ride));
  console.log(`fixtures: ${stem} (${ride.distance.length} points)`);
}
