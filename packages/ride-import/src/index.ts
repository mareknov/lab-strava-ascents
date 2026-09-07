/**
 * @ascents/ride-import — everything between a file and an analysed ride.
 *
 * Isomorphic: no DOM, no Node APIs. The same code runs in the browser today and
 * would run unchanged behind an HTTP endpoint.
 *
 * The FIT adapter is intentionally NOT re-exported here. Importing it pulls in
 * the Garmin SDK, and `importRide` loads it on demand instead.
 */
export * from './track.js';
export * from './ports.js';
export * from './errors.js';
export * from './detect-format.js';
export * from './import-ride.js';
export { gpxParser } from './adapters/gpx.parser.js';
export { tcxParser } from './adapters/tcx.parser.js';
export * from './validation/persisted-ride.schema.js';
