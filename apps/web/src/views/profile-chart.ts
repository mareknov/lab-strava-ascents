import { altAt, colourFor, hrAt, splitIntoSlots, type Climb, type Ride } from '@ascents/domain';

const W = 1000;
const H = 362;
const L = 50;
/** Right margin. Widened only when a heart-rate axis needs labelling. */
const R_PLAIN = 14;
const R_WITH_HR = 46;
const T = 48;
const B = 30;

const HR_COLOUR = '#C62828';
const SHEET = '#F5F7F2';

/**
 * Share of the plot height given to the heart-rate lane, along the bottom.
 * Across the full height the trace weaves through the elevation line and the
 * two are hard to tell apart; kept low it reads as its own band.
 */
const HR_BAND = 0.25;
const NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number>;

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Attrs = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function txt(x: number, y: number, s: string | number, attrs: Attrs = {}): SVGTextElement {
  const t = el('text', {
    x,
    y,
    fill: '#63736C',
    'font-size': 11.5,
    'font-family': 'system-ui,sans-serif',
    ...attrs,
  });
  t.textContent = String(s);
  return t;
}

/**
 * Render the whole ride as an SVG area, clip it, then paint one coloured
 * rectangle per slot inside the clip. Unselected climbs get a mid grey, the
 * rest of the ride a light grey.
 */
export function drawProfile(
  svg: SVGSVGElement,
  tip: HTMLElement,
  ride: Ride,
  climb: Climb,
  slotSize: number,
): void {
  const { dist, alt, hr } = ride.samples;
  svg.textContent = '';

  let beatLo = Infinity;
  let beatHi = -Infinity;
  let beatCount = 0;
  for (const b of hr) {
    if (b == null) continue;
    if (b < beatLo) beatLo = b;
    if (b > beatHi) beatHi = b;
    beatCount++;
  }
  const showHr = ride.hasHeartRate && beatCount > 1 && beatHi > beatLo;
  const R = showHr ? R_WITH_HR : R_PLAIN;

  // Heart rate has its own scale, rounded out to tens so the right-hand ticks
  // land on readable numbers, and occupies only the bottom band of the plot.
  const hrLo = showHr ? Math.floor(beatLo / 10) * 10 - 5 : 0;
  const hrHi = showHr ? Math.ceil(beatHi / 10) * 10 + 5 : 1;
  const hrBandHeight = (H - B - T) * HR_BAND;
  const hrBandTop = H - B - hrBandHeight;
  const syHr = (b: number) => H - B - ((b - hrLo) / (hrHi - hrLo)) * hrBandHeight;

  const X1 = dist[ride.n - 1];
  const lo = Math.min(...alt);
  const hi = Math.max(...alt);
  const pad = (hi - lo) * 0.28 + 15;
  const Y0 = Math.floor((lo - 15) / 50) * 50;
  const Y1 = hi + pad;
  const sx = (d: number) => L + (d / X1) * (W - L - R);
  const sy = (a: number) => H - B - ((a - Y0) / (Y1 - Y0)) * (H - B - T);

  const pts: string[] = [];
  for (let i = 0; i < ride.n; i++) pts.push(`${sx(dist[i]).toFixed(1)},${sy(alt[i]).toFixed(1)}`);
  const areaD = `M${sx(0)},${H - B} L${pts.join(' L')} L${sx(X1)},${H - B} Z`;

  const clipId = `prof-${ride.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const defs = el('defs');
  const clip = el('clipPath', { id: clipId });
  clip.appendChild(el('path', { d: areaD }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  const step = Y1 - Y0 > 700 ? 200 : 100;
  for (let a = Math.ceil(Y0 / step) * step; a < hi; a += step) {
    svg.appendChild(el('line', { x1: L, x2: W - R, y1: sy(a), y2: sy(a), stroke: '#C3CABB', 'stroke-width': 1 }));
    svg.appendChild(txt(L - 8, sy(a) + 4, a, { 'text-anchor': 'end' }));
  }

  const slots = splitIntoSlots(ride.samples, climb, slotSize);

  const bands = el('g', { 'clip-path': `url(#${clipId})` });
  bands.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#CDD4C8' }));
  ride.climbs.forEach((other) => {
    if (other.idx !== climb.idx) {
      bands.appendChild(
        el('rect', { x: sx(other.d0), y: 0, width: sx(other.d1) - sx(other.d0), height: H, fill: '#A7B4A0' }),
      );
    }
  });
  for (const s of slots) {
    bands.appendChild(
      el('rect', {
        x: sx(s.x),
        y: 0,
        width: Math.max(0.6, sx(s.x2) - sx(s.x)),
        height: H,
        fill: colourFor(s.grade),
      }),
    );
  }
  svg.appendChild(bands);

  const dividers = el('g', { 'clip-path': `url(#${clipId})` });
  for (const s of slots) {
    dividers.appendChild(
      el('line', { x1: sx(s.x2), x2: sx(s.x2), y1: 0, y2: H, stroke: '#F5F7F2', 'stroke-width': 0.9, opacity: 0.65 }),
    );
  }
  svg.appendChild(dividers);

  svg.appendChild(
    el('path', { d: `M${pts.join(' L')}`, fill: 'none', stroke: '#1D2A2B', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }),
  );
  svg.appendChild(el('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: '#1D2A2B', 'stroke-width': 1 }));

  if (showHr) {
    // Break the trace wherever the sensor dropped out, rather than drawing a
    // straight line across a gap that was never recorded. Runs too short to
    // read as a line are dropped instead: stranded inside a dropout they look
    // like specks of noise, not data. The tooltip still reports their values.
    const MIN_RUN_POINTS = 3;
    const runs: string[] = [];
    let run: string[] = [];
    const flush = () => {
      if (run.length >= MIN_RUN_POINTS) runs.push(run.join(' L'));
      run = [];
    };
    for (let i = 0; i < ride.n; i++) {
      const b = hr[i];
      if (b == null) {
        flush();
        continue;
      }
      run.push(`${sx(dist[i]).toFixed(1)},${syHr(b).toFixed(1)}`);
    }
    flush();

    const trace = el('g');
    for (const d of runs) {
      // A paper-coloured halo underneath keeps the line legible where it
      // crosses the darker gradient bands.
      trace.appendChild(
        el('path', { d: `M${d}`, fill: 'none', stroke: SHEET, 'stroke-width': 3.4, opacity: 0.85, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
      );
      trace.appendChild(
        el('path', { d: `M${d}`, fill: 'none', stroke: HR_COLOUR, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
      );
    }
    svg.appendChild(trace);

    // The band is only a quarter of the height, so pick a step coarse enough
    // that the labels do not collide.
    const hrStep = [20, 40, 50, 100].find((step) => (hrHi - hrLo) / step <= 3) ?? 100;
    for (let bpm = Math.ceil(hrLo / hrStep) * hrStep; bpm <= hrHi; bpm += hrStep) {
      const y = syHr(bpm);
      if (y < hrBandTop || y > H - B) continue;
      svg.appendChild(el('line', { x1: W - R, x2: W - R + 4, y1: y, y2: y, stroke: HR_COLOUR, 'stroke-width': 1, opacity: 0.65 }));
      svg.appendChild(txt(W - R + 8, y + 4, bpm, { 'text-anchor': 'start', fill: HR_COLOUR }));
    }
    svg.appendChild(txt(W - R + 8, hrBandTop - 5, 'bpm', { 'text-anchor': 'start', fill: HR_COLOUR }));
  }

  const kmStep = X1 > 26000 ? 4000 : 2000;
  for (let d = 0; d <= X1; d += kmStep) {
    if (sx(d) > W - R - 30) continue;
    svg.appendChild(el('line', { x1: sx(d), x2: sx(d), y1: H - B, y2: H - B + 5, stroke: '#63736C', 'stroke-width': 1 }));
    svg.appendChild(txt(sx(d), H - B + 18, d / 1000, { 'text-anchor': 'middle' }));
  }
  svg.appendChild(txt(W - R, H - B + 18, 'km', { 'text-anchor': 'end' }));

  const atTop = (d: number) => Math.abs(d - climb.d1) < 500;
  for (const stop of ride.stops) {
    if (atTop(stop.d)) continue;
    const near = Math.abs(stop.d - climb.d1) < 2500; // keep clear of the climb-top label
    const lift = near ? 26 : 12;
    svg.appendChild(
      el('line', { x1: sx(stop.d), x2: sx(stop.d), y1: sy(stop.a) - lift + 3, y2: sy(stop.a), stroke: '#1D2A2B', 'stroke-width': 1 }),
    );
    svg.appendChild(
      el('circle', { cx: sx(stop.d), cy: sy(stop.a) - lift, r: 3.2, fill: '#F5F7F2', stroke: '#1D2A2B', 'stroke-width': 1.4 }),
    );
    const left = stop.d < climb.d1;
    svg.appendChild(
      near
        ? txt(sx(stop.d) + (left ? -8 : 8), sy(stop.a) - lift + 4, `${stop.min} min stop`, {
            fill: '#1D2A2B',
            'text-anchor': left ? 'end' : 'start',
          })
        : txt(sx(stop.d), sy(stop.a) - lift - 8, `${stop.min} min stop`, {
            'text-anchor': 'middle',
            fill: '#1D2A2B',
          }),
    );
  }
  const topStop = ride.stops.find((s) => atTop(s.d));

  // top of the selected climb
  const px = sx(climb.d1);
  const py = sy(climb.a1);
  svg.appendChild(el('line', { x1: px, x2: px, y1: py - 30, y2: py - 5, stroke: '#1D2A2B', 'stroke-width': 1 }));
  svg.appendChild(el('circle', { cx: px, cy: py, r: 4, fill: '#1D2A2B' }));
  const anchor = px > W - 160 ? 'end' : px < 160 ? 'start' : 'middle';
  const label = el('text', {
    x: px,
    y: py - 36,
    'text-anchor': anchor,
    fill: '#1D2A2B',
    'font-size': 17,
    'font-family': '"Iowan Old Style",Palatino,Georgia,serif',
  });
  label.textContent = `${Math.round(climb.a1)} m`;
  svg.appendChild(label);
  svg.appendChild(
    txt(
      px,
      py - 51,
      `top of the climb at ${(climb.d1 / 1000).toFixed(1)} km` +
        (topStop ? `, where you stopped for ${topStop.min} minutes` : ''),
      { 'text-anchor': anchor },
    ),
  );

  const hover = el('g', { opacity: 0 });
  const hline = el('line', { y1: T, y2: H - B, stroke: '#1D2A2B', 'stroke-width': 1, 'stroke-dasharray': '3 3' });
  const hdot = el('circle', { r: 4, fill: '#1D2A2B', stroke: '#F5F7F2', 'stroke-width': 1.6 });
  hover.appendChild(hline);
  hover.appendChild(hdot);
  svg.appendChild(hover);

  const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - B - T, fill: 'transparent', style: 'cursor:crosshair' });
  svg.appendChild(hit);

  const move = (ev: MouseEvent | TouchEvent) => {
    const bb = svg.getBoundingClientRect();
    const clientX = 'touches' in ev ? (ev.touches[0]?.clientX ?? 0) : ev.clientX;
    const vx = ((clientX - bb.left) / bb.width) * W;
    const d = Math.max(0, Math.min(X1, ((vx - L) / (W - L - R)) * X1));
    const a = altAt(ride.samples, d);
    const w0 = Math.max(0, d - 80);
    const w1 = Math.min(X1, d + 80);
    const grade = ((altAt(ride.samples, w1) - altAt(ride.samples, w0)) / (w1 - w0)) * 100;

    hover.setAttribute('opacity', '1');
    hline.setAttribute('x1', String(sx(d)));
    hline.setAttribute('x2', String(sx(d)));
    hdot.setAttribute('cx', String(sx(d)));
    hdot.setAttribute('cy', String(sy(a)));
    tip.classList.add('on');
    tip.style.left = `${(sx(d) / W) * 100}%`;
    tip.style.top = `${(sy(a) / H) * bb.height}px`;
    const bpm = showHr ? hrAt(ride.samples, d) : null;
    tip.innerHTML =
      `<b>${(d / 1000).toFixed(2)} km</b> · ${Math.round(a)} m<br>` +
      (grade >= 0 ? `climbing ${grade.toFixed(1)}%` : `descending ${Math.abs(grade).toFixed(1)}%`) +
      (bpm != null ? ` · ${bpm} bpm` : '');
  };
  const leave = () => {
    hover.setAttribute('opacity', '0');
    tip.classList.remove('on');
  };

  hit.addEventListener('mousemove', move);
  hit.addEventListener('mouseleave', leave);
  hit.addEventListener('touchstart', move, { passive: true });
  hit.addEventListener('touchmove', move, { passive: true });
  hit.addEventListener('touchend', leave);
}
