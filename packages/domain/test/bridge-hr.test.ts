import { describe, expect, it } from 'vitest';
import { bridgeHeartRateGaps } from '@ascents/domain';

describe('bridgeHeartRateGaps', () => {
  it('interpolates across a short sampling gap', () => {
    const hr = [100, null, null, null, 140];
    const time = [0, 1, 2, 3, 4];
    expect(bridgeHeartRateGaps(hr, time, 30)).toEqual([100, 110, 120, 130, 140]);
  });

  it('leaves a real dropout as a break', () => {
    const hr = [100, null, null, 140];
    const time = [0, 100, 200, 300];
    expect(bridgeHeartRateGaps(hr, time, 30)).toEqual([100, null, null, 140]);
  });

  it('carries the first and last readings to the edges, within the limit', () => {
    const hr = [null, 120, null];
    const time = [0, 10, 20];
    expect(bridgeHeartRateGaps(hr, time, 30)).toEqual([120, 120, 120]);
  });

  it('does not invent readings beyond the limit at the edges', () => {
    const hr = [null, 120, null];
    const time = [0, 100, 200];
    expect(bridgeHeartRateGaps(hr, time, 30)).toEqual([null, 120, null]);
  });

  it('returns the channel untouched when nothing was ever recorded', () => {
    expect(bridgeHeartRateGaps([null, null], [0, 1], 30)).toEqual([null, null]);
  });

  it('leaves an already-complete channel alone', () => {
    expect(bridgeHeartRateGaps([100, 110, 120], [0, 1, 2], 30)).toEqual([100, 110, 120]);
  });
});
