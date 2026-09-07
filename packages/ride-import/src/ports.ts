import type { Track } from './track.js';

/**
 * The one real port in this project.
 *
 * GPX, TCX and FIT are three interchangeable implementations. A future Strava
 * OAuth adapter is a fourth, and the domain never learns which one ran.
 */
export interface TrackParser {
  readonly format: string;
  parse(bytes: Uint8Array): Track;
}
