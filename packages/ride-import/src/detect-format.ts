import type { TrackFormat } from './track.js';

const FIT_MAGIC = '.FIT';

/**
 * Identify the format from the bytes themselves, falling back to the filename.
 *
 * FIT carries ".FIT" at offset 8. XML formats are told apart by their root
 * element, which is more reliable than the extension — plenty of TCX files are
 * saved as .xml, and Strava's GPX export has been served as .txt before now.
 */
export function detectFormat(bytes: Uint8Array, filename = ''): TrackFormat | null {
  if (bytes.length >= 12) {
    const magic = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (magic === FIT_MAGIC) return 'fit';
  }

  const head = new TextDecoder('utf-8').decode(bytes.subarray(0, 2048));
  if (/<gpx[\s>]/i.test(head)) return 'gpx';
  if (/<TrainingCenterDatabase[\s>]/i.test(head)) return 'tcx';

  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'gpx') return 'gpx';
  if (ext === 'tcx') return 'tcx';
  if (ext === 'fit') return 'fit';
  return null;
}
