import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { detectClimbs, resampleAt, totalAscent } from '@ascents/domain';
import { parseTrack, trackToSamples } from '@ascents/ride-import';

/**
 * The contract from CLAUDE.md: if the climb detector or slot maths change, the
 * numbers must still match `prototype-climb-detection.py` on all six rides.
 *
 * The oracle is executed here rather than snapshotted, so the Python and the
 * TypeScript cannot drift apart silently.
 */
interface OracleClimb { i0: number; i1: number; d0: number; d1: number; a0: number; a1: number }
interface OracleRide { total_ascent: number; climbs: OracleClimb[] }

const FORMATS = ['gpx', 'tcx', 'fit'] as const;
let oracle: Record<string, OracleRide>;

beforeAll(() => {
  oracle = JSON.parse(
    execFileSync('python3', ['prototype-climb-detection.py', '--json'], { encoding: 'utf8' }),
  ) as Record<string, OracleRide>;
});

const rideNames = ['hresna', 'jahodna', 'kojsovka', 'kralova-hola', 'nemcova', 'sliezsky'];

describe('TypeScript detector against the Python oracle', () => {
  it.each(rideNames)('%s: climbs and ascent match exactly', (name) => {
    const ride = JSON.parse(readFileSync(`rides/${name}.json`, 'utf8')) as {
      distance: number[];
      altitude: number[];
    };
    const expected = oracle[name];

    const climbs = detectClimbs(ride.altitude);
    expect(climbs.map((c) => [c.i0, c.i1])).toEqual(expected.climbs.map((c) => [c.i0, c.i1]));
    expect(totalAscent(ride.altitude)).toBeCloseTo(expected.total_ascent, 9);
  });
});

describe('parsers round-trip to the same climbs', () => {
  const fixturesBuilt = existsSync('test/fixtures/hresna.gpx');

  for (const name of rideNames) {
    for (const format of FORMATS) {
      it(`${name}.${format} reproduces the oracle`, async () => {
        expect(
          fixturesBuilt,
          'fixtures missing — run `npm run fixtures` first',
        ).toBe(true);

        const source = JSON.parse(readFileSync(`rides/${name}.json`, 'utf8')) as {
          distance: number[];
          altitude: number[];
          heart_rate: number[];
        };
        const bytes = new Uint8Array(readFileSync(`test/fixtures/${name}.${format}`));

        const parsed = await parseTrack(bytes, { filename: `${name}.${format}` });
        expect(parsed.ok, `parse failed for ${name}.${format}`).toBe(true);
        if (!parsed.ok) return;

        const samples = trackToSamples(parsed.value);
        expect(samples.dist.length).toBe(source.distance.length);

        // Resample back onto the original grid so the comparison isolates the
        // parser. Uniform resampling is exercised separately.
        const onGrid = resampleAt(samples, source.distance);
        const expected = oracle[name];

        const found = detectClimbs(onGrid.alt).map((c) => [c.i0, c.i1]);
        const want = expected.climbs.map((c) => [c.i0, c.i1]);
        expect(found.length, 'climb count').toBe(want.length);

        if (format === 'gpx') {
          // GPX has no distance channel, so distance is integrated from lat/lon
          // and lands a fraction of a metre off over a few hundred points. Where
          // a summit is a plateau — kojsovka holds 1241.5 m across two samples —
          // that is enough to break the tie the detector resolves with `>=`, and
          // the peak moves by one sample (156 m of road, 0.28 m of height).
          // Inherent to the format; TCX and FIT carry real distance and match
          // exactly, which is asserted below.
          found.forEach(([i0, i1], k) => {
            const [w0, w1] = want[k] as [number, number];
            expect(Math.abs(i0 - w0), `climb ${k} start`).toBeLessThanOrEqual(1);
            expect(Math.abs(i1 - w1), `climb ${k} peak`).toBeLessThanOrEqual(1);
          });
        } else {
          expect(found).toEqual(want);
        }
        // Per-format altitude tolerance, reflecting what each actually promises:
        //   fit — altitude is a uint16 with scale 5, so it quantises to 0.2 m
        //   gpx — no distance channel, so regridding onto the source distances
        //         interpolates slightly off-sample
        //   tcx — carries both altitude and distance verbatim
        const tolerance = format === 'fit' ? 0.2 : format === 'gpx' ? 0.05 : 0.001;
        expect(Math.abs(onGrid.alt[0] - source.altitude[0])).toBeLessThanOrEqual(tolerance);
        expect(onGrid.hr.filter((h) => h != null).length).toBeGreaterThan(0);
      });
    }
  }
});
