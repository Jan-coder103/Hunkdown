/** Short visual-only hit stop, hit marker, and nearby blast camera shake. */
export class CombatFeedback {
  private hitFlashRemaining = 0;
  private localFreezeRemaining = 0;
  private shakeRemaining = 0;
  private shakeStrength = 0;
  private elapsed = 0;

  registerHit(): void {
    this.hitFlashRemaining = Math.max(this.hitFlashRemaining, 0.12);
    this.localFreezeRemaining = Math.max(this.localFreezeRemaining, 0.045);
  }

  registerExplosion(distance: number, radius: number): void {
    if (!Number.isFinite(distance) || !Number.isFinite(radius) || radius <= 0 || distance >= radius * 3) return;
    const strength = Math.max(0, 1 - distance / (radius * 3));
    this.shakeRemaining = Math.max(this.shakeRemaining, 0.3 * strength);
    this.shakeStrength = Math.max(this.shakeStrength, 0.06 * strength);
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    this.elapsed += deltaSeconds;
    this.hitFlashRemaining = Math.max(0, this.hitFlashRemaining - deltaSeconds);
    this.localFreezeRemaining = Math.max(0, this.localFreezeRemaining - deltaSeconds);
    this.shakeRemaining = Math.max(0, this.shakeRemaining - deltaSeconds);
    this.shakeStrength = this.shakeRemaining === 0 ? 0 : this.shakeStrength * Math.exp(-7 * deltaSeconds);
  }

  get showHitFlash(): boolean {
    return this.hitFlashRemaining > 0;
  }

  get freezeWeaponPose(): boolean {
    return this.localFreezeRemaining > 0;
  }

  applyCameraShake(camera: import('three').Camera): void {
    if (this.shakeStrength === 0) return;
    camera.position.x += Math.sin(this.elapsed * 83) * this.shakeStrength;
    camera.position.y += Math.cos(this.elapsed * 67) * this.shakeStrength * 0.65;
    camera.rotation.z += Math.sin(this.elapsed * 59) * this.shakeStrength * 0.24;
  }
}
