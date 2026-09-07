import type { Ride } from '@ascents/domain';

export interface TabHandlers {
  readonly onSelect: (index: number) => void;
  readonly onRemove: (index: number) => void;
}

/** The map-sheet index tabs. Uploaded rides get a badge and a remove control. */
export function drawTabs(rides: readonly Ride[], selected: number, handlers: TabHandlers): void {
  const box = document.getElementById('tabs') as HTMLElement;
  box.innerHTML = '';

  rides.forEach((ride, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(k === selected));

    const badge = ride.source === 'upload' ? '<span class="badge">yours</span>' : '';
    b.innerHTML = `<span class="n">${escapeHtml(ride.name)}${badge}</span><span class="s">${escapeHtml(ride.sub)}</span>`;

    if (ride.source === 'upload') {
      const remove = document.createElement('span');
      remove.className = 'x';
      remove.textContent = '×';
      remove.title = `Remove ${ride.name}`;
      remove.setAttribute('role', 'button');
      remove.addEventListener('click', (ev) => {
        ev.stopPropagation();
        handlers.onRemove(k);
      });
      b.querySelector('.n')?.appendChild(remove);
    }

    b.addEventListener('click', () => handlers.onSelect(k));
    box.appendChild(b);
  });
}

/** Ride names come from user files, so they are inserted as text, never as markup. */
function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
