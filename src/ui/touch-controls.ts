export type PhoneControlsMode = 'auto' | 'on' | 'off';
export function detectPhone(userAgent: string, coarse: boolean, shortSide: number): boolean {
  return /iPhone|iPod|Android.*Mobile/i.test(userAgent) || (coarse && shortSide <= 600);
}
export function phoneControlsEnabled(mode: PhoneControlsMode, detected: boolean): boolean {
  return mode === 'on' || (mode === 'auto' && detected);
}

/** Pointer capture keeps each thumb independent, including releases outside a button. */
export class TouchControls {
  readonly element: HTMLDivElement;
  private held = new Set<string>();
  private pressed = new Set<string>();
  private pointers = new Map<number, { action: string; x: number; y: number }>();
  private aimToggled = false;
  private lean: 'KeyQ' | 'KeyE' | null = null;
  private enabled = false;
  private active = false;
  constructor(root: HTMLElement, private readonly look: (x: number, y: number, aim: boolean) => void, private readonly pause: () => void, private readonly swap: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'touch-controls';
    this.element.innerHTML = `<div class="touch-look" data-touch="look" aria-label="Drag to look"></div><div class="touch-move" data-touch="move" aria-label="Drag to move">MOVE</div><div class="touch-actions">${[['fire','FIRE'],['aim','AIM'],['Space','JUMP'],['KeyR','RELOAD'],['KeyG','GRENADE'],['KeyF','INTERACT'],['KeyC','CROUCH'],['KeyQ','LEAN L'],['KeyE','LEAN R'],['swap','KNIFE']].map(([key,label]) => `<button type="button" data-touch="${key}" aria-label="${label}"${key === 'aim' || key === 'KeyQ' || key === 'KeyE' ? ' aria-pressed="false"' : ''}>${key === 'Space' ? '<span class="touch-icon" aria-hidden="true">↑</span>' : key === 'KeyR' ? '<span class="touch-icon" aria-hidden="true">↻</span>' : key === 'aim' ? '<svg class="touch-icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 1v6m0 10v6M1 12h6m10 0h6"/></svg>' : label}</button>`).join('')}</div><button type="button" class="touch-pause" data-touch="pause">PAUSE</button>`;
    root.append(this.element);
    this.element.addEventListener('contextmenu', (event) => event.preventDefault());
    this.element.addEventListener('pointerdown', this.down);
    this.element.addEventListener('pointermove', this.move);
    this.element.addEventListener('pointerup', this.up);
    this.element.addEventListener('pointercancel', this.up);
    this.element.addEventListener('lostpointercapture', this.up);
    window.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', this.visibility);
    this.refresh();
  }
  setEnabled(value: boolean): void { this.enabled = value; this.clear(); this.refresh(); }
  setActive(value: boolean): void { if (value !== this.active) this.clear(); this.active = value; this.refresh(); }
  private refresh(): void { this.element.hidden = !this.enabled || !this.active; }
  get aiming(): boolean { return this.held.has('aim'); }
  get firing(): boolean { return this.held.has('fire'); }
  consumeFire(): boolean { return this.pressed.delete('fire'); }
  input<T extends { isDown(code: string): boolean; wasPressed(code: string): boolean }>(keyboard: T) {
    const edges = new Set(this.pressed);
    // Fire edges are consumed by combat rather than movement.
    for (const key of edges) if (key !== 'fire') this.pressed.delete(key);
    return { isDown: (code: string) => keyboard.isDown(code) || this.held.has(code) || (code === 'ShiftLeft' && this.enabled && this.active), wasPressed: (code: string) => keyboard.wasPressed(code) || edges.has(code) };
  }
  readonly clear = (): void => { this.pointers.clear(); this.held.clear(); this.pressed.clear(); this.lean = null; this.aimToggled = false; this.updateToggleButtons(); };
  private readonly visibility = (): void => { if (document.hidden) this.clear(); };
  private updateToggleButtons(): void {
    for (const button of this.element.querySelectorAll<HTMLButtonElement>('[data-touch]')) {
      if (button.dataset.touch === 'aim') button.setAttribute('aria-pressed', String(this.aimToggled));
      if (button.dataset.touch === 'KeyQ' || button.dataset.touch === 'KeyE') {
        button.setAttribute('aria-pressed', String(button.dataset.touch === this.lean));
      }
    }
  }
  private rebuild(): void {
    this.held.clear();
    if (this.lean) this.held.add(this.lean);
    if (this.aimToggled) this.held.add('aim');
    for (const p of this.pointers.values()) {
      if (p.action === 'move') {
        const dx = p.x, dy = p.y;
        if (dx < -12) this.held.add('KeyA'); if (dx > 12) this.held.add('KeyD');
        if (dy < -12) this.held.add('KeyW'); if (dy > 12) this.held.add('KeyS');
      } else this.held.add(p.action);
    }
  }
  private readonly down = (event: PointerEvent): void => {
    if (!this.enabled || !this.active) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-touch]');
    if (!target) return;
    event.preventDefault();
    const action = target.dataset.touch!;
    if (action === 'pause') { this.clear(); this.pause(); return; }
    if (action === 'aim') {
      this.aimToggled = !this.aimToggled;
      this.updateToggleButtons(); this.rebuild(); return;
    }
    if (action === 'KeyQ' || action === 'KeyE') {
      this.lean = this.lean === action ? null : action;
      this.updateToggleButtons(); this.rebuild(); return;
    }
    if (action === 'swap') { this.swap(); return; }
    target.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { action, x: action === 'move' ? 0 : event.clientX, y: action === 'move' ? 0 : event.clientY });
    this.pressed.add(action);
    this.rebuild();
  };
  private readonly move = (event: PointerEvent): void => {
    const p = this.pointers.get(event.pointerId); if (!p) return;
    event.preventDefault();
    if (p.action === 'look') { this.look(event.clientX - p.x, event.clientY - p.y, this.aiming); p.x = event.clientX; p.y = event.clientY; }
    if (p.action === 'move') {
      const box = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('.touch-move')!.getBoundingClientRect();
      p.x = event.clientX - box.left - box.width / 2; p.y = event.clientY - box.top - box.height / 2; this.rebuild();
    }
  };
  private readonly up = (event: PointerEvent): void => { this.pointers.delete(event.pointerId); this.rebuild(); };
  dispose(): void {
    this.clear(); this.element.remove();
    window.removeEventListener('blur', this.clear); document.removeEventListener('visibilitychange', this.visibility);
  }
}
