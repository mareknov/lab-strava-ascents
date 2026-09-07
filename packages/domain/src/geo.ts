const EARTH_RADIUS_M = 6371008.8;
const RAD = Math.PI / 180;

/** Great-circle distance in metres between two WGS-84 points. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Cumulative distance along a sequence of positions, starting at zero.
 * Points with a missing fix repeat the previous distance rather than jumping.
 */
export function cumulativeDistance(
  lat: readonly (number | null)[],
  lon: readonly (number | null)[],
): number[] {
  const out = new Array<number>(lat.length);
  let total = 0;
  let prevLat: number | null = null;
  let prevLon: number | null = null;

  for (let i = 0; i < lat.length; i++) {
    const a = lat[i];
    const b = lon[i];
    if (a != null && b != null) {
      if (prevLat != null && prevLon != null) total += haversine(prevLat, prevLon, a, b);
      prevLat = a;
      prevLon = b;
    }
    out[i] = total;
  }
  return out;
}
