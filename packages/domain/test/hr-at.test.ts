import { describe, expect, it } from 'vitest';
import { hrAt, type RideSamples } from '@ascents/domain';

const samples = (hr: (number | null)[]): RideSamples => ({
  dist: [0, 100, 200, 300, 400],
  alt: [100, 110, 120, 130, 140],
  hr,
  time: [0, 30, 60, 90, 120],
});

describe('hrAt', () => {
  it('reads the sample nearest the distance', () => {
    expect(hrAt(samples([120, 130, 140, 150, 160]), 205)).toBe(140);
  });

  it('walks outwards past a gap where the strap dropped out', () => {
    expect(hrAt(samples([120, null, null, 150, 160]), 150)).toBe(120);
  });

  it('returns null when nothing carries a reading', () => {
    expect(hrAt(samples([null, null, null, null, null]), 200)).toBeNull();
  });

  it('returns null when the only readings are beyond the window', () => {
    expect(hrAt(samples([120, null, null, null, null]), 400, 50)).toBeNull();
  });

  it('reads the end samples when just outside the range but inside the window', () => {
    expect(hrAt(samples([120, 130, 140, 150, 160]), -50)).toBe(120);
    expect(hrAt(samples([120, 130, 140, 150, 160]), 600)).toBe(160);
  });

  it('gives up rather than reporting a reading from far away', () => {
    // Deliberate: hovering well past the end of a ride should show nothing,
    // not a heart rate recorded kilometres earlier.
    expect(hrAt(samples([120, 130, 140, 150, 160]), 9999)).toBeNull();
  });
});
