import { analyseRide, type Ride, type SlotSize } from '@ascents/domain';
import { parsePersistedState, type PersistedRideDto } from '@ascents/ride-import';
import { SAMPLE_RIDES } from '../samples.generated.js';

const STORAGE_KEY = 'ascents.rides.v1';
const STORAGE_VERSION = 1;

export interface CatalogState {
  rides: Ride[];
  rideIndex: number;
  climbIndex: number;
  slotSize: SlotSize;
}

function analyseSamples(): Ride[] {
  return SAMPLE_RIDES.map((s) => {
    const { samples, ...meta } = s;
    return analyseRide(meta, samples);
  });
}

/**
 * Uploaded rides from a previous visit.
 *
 * Only the metadata and samples are stored; climbs are recomputed on load so a
 * change to the detector takes effect on old rides too, rather than leaving
 * stale analysis cached in someone's browser.
 */
function loadPersisted(): Ride[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return []; // private mode, or storage disabled
  }
  if (!raw) return [];

  try {
    const parsed = parsePersistedState(JSON.parse(raw));
    if (!parsed || parsed.version !== STORAGE_VERSION) return [];
    return parsed.rides.map((r: PersistedRideDto) =>
      analyseRide(
        {
          id: r.id,
          name: r.name,
          sub: r.sub,
          movingTime: r.movingTime,
          ascent: r.ascent,
          source: 'upload',
        },
        r.samples,
      ),
    );
  } catch {
    return [];
  }
}

function persist(rides: readonly Ride[]): void {
  const uploads = rides.filter((r) => r.source === 'upload');
  try {
    if (uploads.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        rides: uploads.map((r) => ({
          id: r.id,
          name: r.name,
          sub: r.sub,
          movingTime: r.movingTime,
          ascent: r.ascent,
          samples: r.samples,
        })),
      }),
    );
  } catch {
    // Over quota or storage disabled: the ride still works for this session.
  }
}

export function createCatalog(): CatalogState {
  // Uploads lead, newest first, then the curated rides. Someone who has added
  // their own ride came here for that one, so it should be the tab already
  // open — with the curated peaks sitting right beside it to compare against.
  const rides = [...loadPersisted(), ...analyseSamples()];
  return {
    rides,
    rideIndex: 0,
    climbIndex: rides[0]?.mainClimb ?? 0,
    slotSize: 500,
  };
}

/**
 * Add an uploaded ride at the front of the list and select it.
 * Samples are never replaced, only pushed along.
 */
export function addRide(state: CatalogState, ride: Ride): void {
  state.rides.unshift(ride);
  state.rideIndex = 0;
  state.climbIndex = ride.mainClimb;
  persist(state.rides);
}

export function removeRide(state: CatalogState, index: number): void {
  const ride = state.rides[index];
  if (!ride || ride.source !== 'upload') return;
  state.rides.splice(index, 1);
  if (state.rideIndex >= state.rides.length) state.rideIndex = state.rides.length - 1;
  state.climbIndex = state.rides[state.rideIndex]?.mainClimb ?? 0;
  persist(state.rides);
}

export function currentRide(state: CatalogState): Ride {
  return state.rides[state.rideIndex] as Ride;
}
