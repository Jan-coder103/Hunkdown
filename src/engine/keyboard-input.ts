export type VisibilityEventTarget = EventTarget & Readonly<{ hidden: boolean }>;

export type KeyboardInputTargets = Readonly<{
  windowTarget?: EventTarget;
  documentTarget?: VisibilityEventTarget;
}>;

/** Tracks held keys and one-frame presses, clearing them when focus is lost. */
export class KeyboardInput {
  private readonly heldKeys = new Set<string>();
  private readonly pressedKeys = new Set<string>();
  private windowTarget: EventTarget | null = null;
  private documentTarget: VisibilityEventTarget | null = null;

  constructor(private readonly targets: KeyboardInputTargets = {}) {}

  private readonly handleKeyDown: EventListener = (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.repeat || !keyboardEvent.code) return;
    if (!this.heldKeys.has(keyboardEvent.code)) this.pressedKeys.add(keyboardEvent.code);
    this.heldKeys.add(keyboardEvent.code);
  };

  private readonly handleKeyUp: EventListener = (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.code) this.heldKeys.delete(keyboardEvent.code);
  };

  private readonly handleBlur: EventListener = () => this.clear();

  private readonly handleVisibilityChange: EventListener = () => {
    if (this.documentTarget?.hidden) this.clear();
  };

  attach(): void {
    if (this.windowTarget) return;

    this.windowTarget = this.targets.windowTarget ?? window;
    this.documentTarget = this.targets.documentTarget ?? document;
    this.windowTarget.addEventListener('keydown', this.handleKeyDown);
    this.windowTarget.addEventListener('keyup', this.handleKeyUp);
    this.windowTarget.addEventListener('blur', this.handleBlur);
    this.documentTarget.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  isDown(code: string): boolean {
    return this.heldKeys.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  consumePressed(code: string): boolean {
    return this.pressedKeys.delete(code);
  }

  endFrame(): void {
    this.pressedKeys.clear();
  }

  clear(): void {
    this.heldKeys.clear();
    this.pressedKeys.clear();
  }

  dispose(): void {
    if (this.windowTarget) {
      this.windowTarget.removeEventListener('keydown', this.handleKeyDown);
      this.windowTarget.removeEventListener('keyup', this.handleKeyUp);
      this.windowTarget.removeEventListener('blur', this.handleBlur);
    }
    this.documentTarget?.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.windowTarget = null;
    this.documentTarget = null;
    this.clear();
  }
}
