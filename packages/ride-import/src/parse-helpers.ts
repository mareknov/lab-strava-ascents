/** Coerce a value that may have arrived as a string. Returns null if it is not a finite number. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** XML parsers collapse a single repeated element into one object. Always want a list. */
export function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Milliseconds since epoch from an ISO-8601 timestamp, or null. */
export function toEpochMs(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Depth-first search for the first descendant with the given key.
 *
 * Heart rate hides at different depths depending on who wrote the GPX —
 * Garmin nests it under TrackPointExtension, others put it directly in
 * extensions. Namespace prefixes are already stripped by the parser.
 */
export function findDeep(node: unknown, key: string, depth = 6): unknown {
  if (depth < 0 || !isRecord(node)) return undefined;
  if (key in node) return node[key];
  for (const child of Object.values(node)) {
    const hit = findDeep(child, key, depth - 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}
