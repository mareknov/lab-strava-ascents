/**
 * @ascents/domain — the analysis, and nothing else.
 *
 * This package compiles without the DOM lib and has no runtime dependencies,
 * so it runs unchanged in a browser, in Node, and in a future service. Keep it
 * that way: anything that touches a file, a socket or the document belongs in
 * an adapter, not here.
 */
export * from './config.js';
export * from './gradient-band.js';
export * from './geo.js';
export * from './ride.js';
export * from './climb-detector.js';
export * from './slot-splitter.js';
export * from './metrics.js';
export * from './resampler.js';
export * from './analyse.js';
export * from './view-model.js';
