import { PerspectiveCamera, Vector3 } from 'three';

/** Small pointer orbit control for inspection: drag to rotate, wheel to dolly. */
export class OrbitController {
  private readonly target = new Vector3(0, 1, 0);
  private radius = 7;
  private theta = Math.PI / 4;
  private phi = Math.PI / 2.7;
  private pointerId: number | null = null;
  private previousX = 0;
  private previousY = 0;
  private disposed = false;

  constructor(private readonly canvas: HTMLElement, private readonly camera: PerspectiveCamera) {
    this.syncCamera();
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.pointerId !== null && this.canvas.hasPointerCapture?.(this.pointerId)) {
      this.canvas.releasePointerCapture?.(this.pointerId);
    }
    this.pointerId = null;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.disposed) return;
    this.pointerId = event.pointerId;
    this.previousX = event.clientX;
    this.previousY = event.clientY;
    this.canvas.setPointerCapture?.(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || this.disposed) return;
    const deltaX = event.clientX - this.previousX;
    const deltaY = event.clientY - this.previousY;
    this.previousX = event.clientX;
    this.previousY = event.clientY;
    this.theta -= deltaX * 0.008;
    this.phi = Math.min(Math.PI - 0.12, Math.max(0.12, this.phi + deltaY * 0.008));
    this.syncCamera();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = null;
    if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture?.(event.pointerId);
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.radius = Math.min(16, Math.max(2.5, this.radius * Math.exp(event.deltaY * 0.001)));
    this.syncCamera();
  };

  private syncCamera(): void {
    const sinPhi = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.radius * sinPhi * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sinPhi * Math.cos(this.theta),
    );
    this.camera.lookAt(this.target);
  }
}
