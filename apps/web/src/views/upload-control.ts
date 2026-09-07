import { importRide } from '@ascents/ride-import';
import type { Ride } from '@ascents/domain';

export interface UploadHandlers {
  readonly onRide: (ride: Ride) => void;
}

const MAX_BYTES = 40 * 1024 * 1024;

/**
 * Wire the upload button, the file input and whole-window drag and drop.
 *
 * Files are read with FileReader and parsed in the page. Nothing is sent
 * anywhere — there is no server to send it to.
 */
export function mountUpload({ onRide }: UploadHandlers): void {
  const button = document.getElementById('uploadbtn') as HTMLButtonElement;
  const input = document.getElementById('fileinput') as HTMLInputElement;
  const dropzone = document.getElementById('dropzone') as HTMLElement;
  const notice = document.getElementById('notice') as HTMLElement;

  const say = (message: string, kind: 'error' | 'busy' | 'ok') => {
    notice.hidden = false;
    notice.className = `notice ${kind === 'ok' ? '' : kind}`.trim();
    notice.textContent = message;
  };
  const clear = () => {
    notice.hidden = true;
    notice.textContent = '';
  };

  async function handle(files: readonly File[]): Promise<void> {
    if (files.length === 0) return;
    const added: string[] = [];
    const failed: string[] = [];

    for (const file of files) {
      if (file.size > MAX_BYTES) {
        failed.push(`${file.name}: larger than 40 MB`);
        continue;
      }
      say(`Reading ${file.name}…`, 'busy');
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = await importRide(bytes, { filename: file.name });
        if (result.ok) {
          onRide(result.value);
          added.push(result.value.name);
        } else {
          failed.push(`${file.name}: ${result.error.message}`);
        }
      } catch (cause) {
        failed.push(`${file.name}: could not be read`);
        console.error(cause);
      }
    }

    if (failed.length > 0) say(failed.join('\n'), 'error');
    else if (added.length > 0) say(`Added ${added.join(', ')}.`, 'ok');
    if (failed.length === 0 && added.length > 0) setTimeout(clear, 4000);
  }

  button.addEventListener('click', () => {
    clear();
    input.click();
  });

  input.addEventListener('change', () => {
    void handle([...(input.files ?? [])]);
    input.value = ''; // so the same file can be picked twice
  });

  let dragDepth = 0;
  window.addEventListener('dragenter', (ev) => {
    if (!ev.dataTransfer?.types.includes('Files')) return;
    dragDepth++;
    dropzone.hidden = false;
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dropzone.hidden = true;
  });
  window.addEventListener('dragover', (ev) => ev.preventDefault());
  window.addEventListener('drop', (ev) => {
    ev.preventDefault();
    dragDepth = 0;
    dropzone.hidden = true;
    void handle([...(ev.dataTransfer?.files ?? [])]);
  });
}
