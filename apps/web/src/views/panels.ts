import {
  buildFigures,
  buildLadder,
  colourFor,
  splitIntoSlots,
  type Climb,
  type Ride,
} from '@ascents/domain';

/** Intro prose, headline figures, and the footnote. */
export function drawHeader(ride: Ride, climb: Climb): void {
  const intro = document.getElementById('intro') as HTMLElement;
  const foot = document.getElementById('foot') as HTMLElement;

  // Sample rides carry hand-written prose; uploaded rides simply have none,
  // rather than being given generated filler.
  intro.innerHTML = ride.intro ?? '';
  intro.hidden = !ride.intro;
  foot.textContent = ride.foot ?? '';
  foot.hidden = !ride.foot;

  document.getElementById('figures')!.innerHTML = buildFigures(ride, climb)
    .map(
      (f) =>
        `<div class="fig"><span class="v">${f.value}${f.unit ? `<small>${f.unit}</small>` : ''}</span>` +
        `<span class="k">${f.key}</span></div>`,
    )
    .join('');
}

export function drawClimbPick(ride: Ride, climbIndex: number, onPick: (i: number) => void): void {
  const box = document.getElementById('climbpick') as HTMLElement;
  box.innerHTML = '';
  document.getElementById('climbhead')!.textContent =
    ride.climbs.length > 1 ? 'Slot by slot, up each climb' : 'Slot by slot, up the climb';

  if (ride.climbs.length < 2) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'flex';

  ride.climbs.forEach((c, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(k === climbIndex));
    b.innerHTML =
      `<b>${(c.d0 / 1000).toFixed(1)} – ${(c.d1 / 1000).toFixed(1)} km</b>` +
      `${(c.len / 1000).toFixed(1)} km, +${Math.round(c.gain)} m, ${c.grade.toFixed(1)}% average`;
    b.addEventListener('click', () => onPick(k));
    box.appendChild(b);
  });
}

export function drawSlots(ride: Ride, climb: Climb, slotSize: number): void {
  const rows = splitIntoSlots(ride.samples, climb, slotSize);
  const scale = Math.max(6, Math.max(...rows.map((s) => s.grade)) * 1.05);
  const box = document.getElementById('slots') as HTMLElement;

  box.classList.toggle('no-hr', !ride.hasHeartRate);
  box.innerHTML =
    '<div class="row head"><div class="rng">from – to</div><div>gradient</div>' +
    '<div class="pct">%</div><div class="gain">climb</div><div class="bpm">bpm</div></div>';

  for (const s of rows) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML =
      `<div class="rng">${(s.x / 1000).toFixed(2)} – ${(s.x2 / 1000).toFixed(2)}</div>` +
      `<div class="barwrap"><div class="bar" style="width:${Math.min(100, Math.max(0, s.grade) / scale * 100).toFixed(1)}%;` +
      `background:${colourFor(s.grade)}"></div></div>` +
      `<div class="pct">${s.grade.toFixed(1)}</div>` +
      `<div class="gain">+${Math.round(s.gain)} m</div>` +
      `<div class="bpm">${s.hr ?? '–'}</div>`;
    box.appendChild(row);
  }
}

export function drawLadder(ride: Ride, climb: Climb): void {
  const ladder = document.getElementById('ladder') as HTMLElement;
  const key = document.getElementById('key') as HTMLElement;
  ladder.innerHTML = '';
  key.innerHTML = '';

  for (const segment of buildLadder(ride, climb)) {
    if (segment.metres > 0) {
      const bar = document.createElement('div');
      bar.style.cssText = `flex:${segment.metres} 0 0;background:${segment.colour}`;
      bar.title = `${segment.label}, ${(segment.metres / 1000).toFixed(2)} km`;
      ladder.appendChild(bar);
    }
    const item = document.createElement('span');
    item.innerHTML =
      `<i class="sw" style="background:${segment.colour}"></i>` +
      `<b style="color:var(--ink);font-weight:600">${(segment.metres / 1000).toFixed(2)} km</b>&nbsp;${segment.label}`;
    key.appendChild(item);
  }
}
