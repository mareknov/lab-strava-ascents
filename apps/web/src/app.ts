/**
 * Composition root.
 *
 * Everything is constructed here and passed down: no container, no decorators,
 * no globals beyond the state object. The views know how to draw a ride; they
 * do not know where rides come from.
 */
import type { SlotSize } from '@ascents/domain';
import { addRide, createCatalog, currentRide, removeRide } from './state/catalog.js';
import { drawProfile } from './views/profile-chart.js';
import { drawClimbPick, drawHeader, drawLadder, drawSlots } from './views/panels.js';
import { drawTabs } from './views/tabs.js';
import { mountUpload } from './views/upload-control.js';

const state = createCatalog();

const svg = document.getElementById('chart') as unknown as SVGSVGElement;
const tip = document.getElementById('tip') as HTMLElement;

function render(): void {
  const ride = currentRide(state);
  if (!ride) return;

  const climb = ride.climbs[Math.min(state.climbIndex, ride.climbs.length - 1)];
  if (!climb) return;

  drawTabs(state.rides, state.rideIndex, {
    onSelect: (index) => {
      state.rideIndex = index;
      state.climbIndex = state.rides[index]?.mainClimb ?? 0;
      render();
    },
    onRemove: (index) => {
      removeRide(state, index);
      render();
    },
  });

  drawHeader(ride, climb);
  drawProfile(svg, tip, ride, climb, state.slotSize);
  drawClimbPick(ride, climb.idx, (i) => {
    state.climbIndex = i;
    render();
  });
  drawSlots(ride, climb, state.slotSize);
  drawLadder(ride, climb);
}

document.querySelectorAll<HTMLButtonElement>('.seg button').forEach((button) => {
  button.addEventListener('click', () => {
    state.slotSize = Number(button.dataset['slot']) as SlotSize;
    document
      .querySelectorAll<HTMLButtonElement>('.seg button')
      .forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    render();
  });
});

mountUpload({
  onRide: (ride) => {
    addRide(state, ride);
    render();
  },
});

render();
window.addEventListener('resize', render);
