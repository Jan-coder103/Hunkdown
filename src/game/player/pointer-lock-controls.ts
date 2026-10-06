export type PointerLockDocument = EventTarget & Readonly<{
  pointerLockElement: Element | null;
  hidden: boolean;
  exitPointerLock(): void;
}>;

export type PointerLockCanvas = HTMLCanvasElement & Readonly<{
  requestPointerLock(): Promise<void> | void;
}>;

export type PointerLockControlsOptions = Readonly<{
  documentTarget?: PointerLockDocument;
  windowTarget?: EventTarget;
  onLook: (movementX: number, movementY: number, aiming: boolean) => void;
  onLockChange?: (locked: boolean) => void;
}>;

/** Captures mouse look only while the game canvas owns pointer lock. */
export class PointerLockControls {
  private documentTarget: PointerLockDocument | null = null;
  private windowTarget: EventTarget | null = null;
  private locked = false;
  private aiming = false;
  private fireHeld = false;
  private firePressed = false;

  constructor(
    private readonly canvas: PointerLockCanvas,
    private readonly options: PointerLockControlsOptions,
  ) {}

  get isLocked(): boolean {
    return this.locked;
  }

  get isAiming(): boolean {
    return this.aiming;
  }

  get isFireHeld(): boolean {
    return this.locked && this.fireHeld;
  }

  consumeFirePressed(): boolean {
    const pressed = this.locked && this.firePressed;
    this.firePressed = false;
    return pressed;
  }

  private readonly handleCanvasClick: EventListener = () => {
    if (!this.locked) this.requestLock();
  };

  private readonly handleMouseDown: EventListener = (event) => {
    if (!this.locked) return;
    if ((event as MouseEvent).button === 0) {
      this.fireHeld = true;
      this.firePressed = true;
      event.preventDefault();
    } else if ((event as MouseEvent).button === 2) {
      this.aiming = true;
      event.preventDefault();
    }
  };

  private readonly handleMouseUp: EventListener = (event) => {
    if ((event as MouseEvent).button === 0) this.fireHeld = false;
    if ((event as MouseEvent).button === 2) this.aiming = false;
  };

  private readonly handleContextMenu: EventListener = (event) => {
    if (this.locked || event.target === this.canvas) event.preventDefault();
  };

  private readonly handleMouseMove: EventListener = (event) => {
    if (!this.locked) return;
    const mouseEvent = event as MouseEvent;
    this.options.onLook(mouseEvent.movementX, mouseEvent.movementY, this.aiming);
  };

  private readonly handleLockChange: EventListener = () => {
    this.setLocked(this.documentTarget?.pointerLockElement === this.canvas);
  };

  private readonly handleFocusLoss: EventListener = () => {
    this.aiming = false;
    this.fireHeld = false;
    this.firePressed = false;
    this.releaseLock();
  };

  private readonly handleVisibilityChange: EventListener = () => {
    if (this.documentTarget?.hidden) this.handleFocusLoss(new Event('blur'));
  };

  attach(): void {
    if (this.documentTarget) return;
    this.documentTarget = this.options.documentTarget ?? document;
    this.windowTarget = this.options.windowTarget ?? window;
    this.canvas.addEventListener('click', this.handleCanvasClick);
    this.documentTarget.addEventListener('mousemove', this.handleMouseMove);
    this.documentTarget.addEventListener('mousedown', this.handleMouseDown);
    this.documentTarget.addEventListener('mouseup', this.handleMouseUp);
    this.documentTarget.addEventListener('contextmenu', this.handleContextMenu);
    this.documentTarget.addEventListener('pointerlockchange', this.handleLockChange);
    this.documentTarget.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.windowTarget.addEventListener('blur', this.handleFocusLoss);
    this.options.onLockChange?.(this.locked);
  }

  requestLock(): void {
    try {
      const result = this.canvas.requestPointerLock();
      if (result) void result.catch(() => this.setLocked(false));
    } catch {
      this.setLocked(false);
    }
  }

  releaseLock(): void {
    if (this.documentTarget?.pointerLockElement === this.canvas) {
      this.documentTarget.exitPointerLock();
    }
    this.aiming = false;
    this.fireHeld = false;
    this.firePressed = false;
    this.setLocked(false);
  }

  dispose(): void {
    if (!this.documentTarget) return;
    this.releaseLock();
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    this.documentTarget.removeEventListener('mousemove', this.handleMouseMove);
    this.documentTarget.removeEventListener('mousedown', this.handleMouseDown);
    this.documentTarget.removeEventListener('mouseup', this.handleMouseUp);
    this.documentTarget.removeEventListener('contextmenu', this.handleContextMenu);
    this.documentTarget.removeEventListener('pointerlockchange', this.handleLockChange);
    this.documentTarget.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.windowTarget?.removeEventListener('blur', this.handleFocusLoss);
    this.documentTarget = null;
    this.windowTarget = null;
  }

  private setLocked(locked: boolean): void {
    if (this.locked === locked) return;
    this.locked = locked;
    if (!locked) {
      this.aiming = false;
      this.fireHeld = false;
      this.firePressed = false;
    }
    this.options.onLockChange?.(locked);
  }
}
