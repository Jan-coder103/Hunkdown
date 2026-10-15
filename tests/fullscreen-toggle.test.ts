import { expect, it, vi } from 'vitest';
import { attachFullscreenToggle } from '../src/ui/fullscreen-toggle';
import { AppElement } from './helpers/app-dom';

function setup(supported = true) {
  const button = new AppElement();
  const doc = Object.assign(new EventTarget(), { fullscreenElement: null as unknown, fullscreenEnabled: supported, exitFullscreen: vi.fn(async () => { doc.fullscreenElement = null; doc.dispatchEvent(new Event('fullscreenchange')); }) });
  const target = Object.assign(new AppElement(), { requestFullscreen: vi.fn(async () => { doc.fullscreenElement = target; doc.dispatchEvent(new Event('fullscreenchange')); }) });
  const dispose = attachFullscreenToggle(target as unknown as HTMLElement, button as unknown as HTMLButtonElement, doc as unknown as Document);
  return { button, target, doc, dispose };
}
it('enters/exits fullscreen and tracks an external Escape exit', async () => {
  const { button, target, doc, dispose } = setup();
  button.click(); await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(target.requestFullscreen).toHaveBeenCalledOnce();
  expect(button.getAttribute('aria-pressed')).toBe('true');
  button.click(); await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(doc.exitFullscreen).toHaveBeenCalledOnce();
  button.click(); await vi.waitFor(() => expect(button.disabled).toBe(false));
  await doc.exitFullscreen();
  expect(button.getAttribute('aria-label')).toBe('Enter fullscreen');
  dispose(); button.click(); expect(target.requestFullscreen).toHaveBeenCalledTimes(2);
});
it('handles unsupported browsers and denied requests without stuck state or rejection', async () => {
  const unsupported = setup(false); unsupported.button.click();
  expect(unsupported.button.disabled).toBe(true);
  expect(unsupported.target.requestFullscreen).not.toHaveBeenCalled(); unsupported.dispose();
  const { target, button, dispose } = setup();
  target.requestFullscreen.mockRejectedValueOnce(new Error('Denied'));
  button.click(); button.click();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(target.requestFullscreen).toHaveBeenCalledOnce();
  expect(button.getAttribute('aria-pressed')).toBe('false');
  button.click(); await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(button.getAttribute('aria-pressed')).toBe('true'); dispose();
});
