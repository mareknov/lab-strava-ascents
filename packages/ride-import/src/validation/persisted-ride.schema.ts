import { array, nullable, number, object, optional, safeParse, string } from 'zod/mini';
import type { output } from 'zod/mini';

/**
 * Rides the browser persisted on a previous visit.
 *
 * This is the genuinely untrusted boundary in the app: the data is versioned,
 * may have been written by an older build, and can be edited by hand in
 * devtools. Everything else is either bundled at build time or comes from a
 * file the parsers have already normalised.
 *
 * `zod/mini` with named imports, not `import { z } from 'zod'` — the namespace
 * import defeats tree-shaking and costs about 420 KB more in the bundle.
 */
export const PersistedSamples = object({
  dist: array(number()),
  alt: array(number()),
  hr: array(nullable(number())),
  time: array(number()),
});

export const PersistedRide = object({
  id: string(),
  name: string(),
  sub: string(),
  movingTime: number(),
  ascent: number(),
  intro: optional(string()),
  foot: optional(string()),
  samples: PersistedSamples,
});

export const PersistedState = object({
  version: number(),
  rides: array(PersistedRide),
});

export type PersistedRideDto = output<typeof PersistedRide>;
export type PersistedStateDto = output<typeof PersistedState>;

export function parsePersistedState(raw: unknown): PersistedStateDto | null {
  const result = safeParse(PersistedState, raw);
  return result.success ? result.data : null;
}
