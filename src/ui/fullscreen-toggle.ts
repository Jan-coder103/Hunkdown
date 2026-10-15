/** Keeps the button in sync with browser exits (including Escape). */
export function attachFullscreenToggle(target: HTMLElement, button: HTMLButtonElement, doc: Document = document): () => void {
  const supported = typeof target.requestFullscreen === 'function' && typeof doc.exitFullscreen === 'function' && doc.fullscreenEnabled !== false;
  let pending = false;
  let disposed = false;
  const sync = () => {
    const active = doc.fullscreenElement === target;
    button.disabled = !supported || pending;
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    button.title = !supported ? 'Fullscreen is unavailable in this browser' : active ? 'Exit fullscreen' : 'Enter fullscreen';
    button.textContent = active ? '↙' : '⛶';
  };
  const toggle = async () => {
    if (!supported || pending || disposed) return;
    pending = true; sync();
    try {
      if (doc.fullscreenElement === target) await doc.exitFullscreen();
      else await target.requestFullscreen();
    } catch {
      if (!disposed) button.title = 'Fullscreen request was declined. Tap to try again.';
    } finally {
      pending = false;
      if (!disposed) {
        const failedTitle = button.title;
        sync();
        if (failedTitle.includes('declined')) button.title = failedTitle;
      }
    }
  };
  button.addEventListener('click', toggle);
  doc.addEventListener('fullscreenchange', sync);
  sync();
  return () => { disposed = true; button.removeEventListener('click', toggle); doc.removeEventListener('fullscreenchange', sync); };
}
