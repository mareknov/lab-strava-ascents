import { LADDER_SLOT_M } from './config.js';
import { GRADIENT_BANDS, bandFor } from './gradient-band.js';
import type { Climb, Ride } from './ride.js';
import { splitIntoSlots, type Slot } from './slot-splitter.js';

export interface LadderSegment {
  readonly label: string;
  readonly colour: string;
  /** Metres of climb spent in this band. */
  readonly metres: number;
}

export interface Figure {
  readonly value: string;
  readonly unit: string;
  readonly key: string;
}

/** Hours:minutes, e.g. 2:31. */
export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 3600)}:${String(Math.round((seconds % 3600) / 60)).padStart(2, '0')}`;
}

/** Distance spent in each gradient band, always measured in 250 m pieces. */
export function buildLadder(ride: Ride, climb: Climb): LadderSegment[] {
  const totals = new Map<string, number>(GRADIENT_BANDS.map((b) => [b.label, 0]));
  for (const slot of splitIntoSlots(ride.samples, climb, LADDER_SLOT_M)) {
    const band = bandFor(slot.grade);
    totals.set(band.label, (totals.get(band.label) ?? 0) + (slot.x2 - slot.x));
  }
  return GRADIENT_BANDS.map((b) => ({
    label: b.label,
    colour: b.colour,
    metres: totals.get(b.label) ?? 0,
  }));
}

/** The steepest 250 m anywhere on the climb, in percent. */
export function steepest250(ride: Ride, climb: Climb): number {
  const slots = splitIntoSlots(ride.samples, climb, LADDER_SLOT_M);
  return slots.reduce((max, s) => Math.max(max, s.grade), -Infinity);
}

/** The six headline figures above the profile. */
export function buildFigures(ride: Ride, climb: Climb): Figure[] {
  const distanceKm = ride.samples.dist[ride.n - 1] / 1000;
  return [
    { value: distanceKm.toFixed(1), unit: ' km', key: 'ride distance' },
    { value: String(Math.round(ride.ascent)), unit: ' m', key: 'climbed in total' },
    { value: (climb.len / 1000).toFixed(2), unit: ' km', key: 'this climb' },
    { value: climb.grade.toFixed(1), unit: '%', key: 'average gradient' },
    { value: steepest250(ride, climb).toFixed(1), unit: '%', key: 'steepest 250 m' },
    { value: formatDuration(ride.movingTime), unit: '', key: 'pedalling time' },
  ];
}

export type { Slot };
