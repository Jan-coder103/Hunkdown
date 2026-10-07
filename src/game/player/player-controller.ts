import { PerspectiveCamera, Vector3 } from 'three';
import type { KeyboardInput } from '../../engine/keyboard-input';
import { MovementWorld } from './movement-world';

export type CrouchMode = 'hold' | 'toggle';

export type MovementCapabilities = Readonly<{
  boostedDoubleJump: boolean;
  wallJump: boolean;
}>;

export type PlayerControllerOptions = Readonly<{
  spawn?: Readonly<{ x: number; y: number; z: number }>;
  crouchMode?: CrouchMode;
  capabilities?: MovementCapabilities;
  lookSensitivity?: number;
}>;

const DEFAULT_CAPABILITIES: MovementCapabilities = Object.freeze({
  boostedDoubleJump: false,
  wallJump: false,
});

const WALK_SPEED = 4.6;
const SPRINT_SPEED = 7.4;
const CROUCH_SPEED = 2.5;
const PLAYER_RADIUS = 0.34;
const STANDING_HEIGHT = 1.75;
const CROUCHED_HEIGHT = 1.1;
const STANDING_EYE_HEIGHT = 1.58;
const CROUCHED_EYE_HEIGHT = 1.02;
const GRAVITY = 19;
const JUMP_SPEED = 6.3;
const BOOSTED_JUMP_SPEED = 7.4;
const WALL_JUMP_SPEED = 7.1;
const WALL_JUMP_HORIZONTAL_SPEED = 5.8;
const MAX_STEP_HEIGHT = 0.2;
const SLIDE_DURATION = 0.68;
const SLIDE_FRICTION = 9;
const BASE_FOV = 65;
const AIM_FOV = 48;
const MAX_PITCH = Math.PI * 0.48;
const IMPACT_DRAG = 4.2;
const MAX_IMPULSE_SPEED = 12;
const MAX_LEAN = 0.28;

/** Kinematic first-person controller for the movement playground. */
export class PlayerController {
  readonly position: Vector3;
  readonly velocity = new Vector3();
  private readonly impactVelocity = new Vector3();
  readonly capabilities: MovementCapabilities;
  readonly crouchMode: CrouchMode;
  lookSensitivity: number;

  isGrounded = true;
  isCrouched = false;
  isSliding = false;
  jumpCount = 0;
  aiming = false;
  yaw = 0;
  pitch = 0;
  private readonly previousPosition = new Vector3();
  private previousYaw = 0;
  private previousPitch = 0;
  private previousLean = 0;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private previousRecoilPitch = 0;
  private previousRecoilYaw = 0;
  private previousEyeHeight = STANDING_EYE_HEIGHT;
  private lean = 0;
  private crouchToggled = false;
  private slideRemaining = 0;
  private slideSpeed = 0;
  private slideDirectionX = 0;
  private slideDirectionZ = 0;
  private wallNormalX = 0;
  private wallNormalZ = 0;
  private wallJumpControlLock = 0;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly world: MovementWorld,
    options: PlayerControllerOptions = {},
  ) {
    this.position = new Vector3(
      options.spawn?.x ?? 0,
      options.spawn?.y ?? 0,
      options.spawn?.z ?? 8,
    );
    this.capabilities = options.capabilities ?? DEFAULT_CAPABILITIES;
    this.crouchMode = options.crouchMode ?? 'hold';
    this.lookSensitivity = options.lookSensitivity ?? 0.002;
    this.camera.rotation.order = 'YXZ';
    this.camera.fov = BASE_FOV;
    this.previousPosition.copy(this.position);
    this.syncCamera();
  }

  setLookSensitivity(value: number): void {
    if (!Number.isFinite(value) || value < 0.0005 || value > 0.005) {
      throw new RangeError('Look sensitivity must be between 0.0005 and 0.005');
    }
    this.lookSensitivity = value;
  }

  get leanRadians(): number { return this.lean; }

  /** Feet stay anchored; the upper hit volume follows the same body tilt as the eyes. */
  get bodyLeanOffset(): Vector3 {
    const height = this.isCrouched ? CROUCHED_HEIGHT : STANDING_HEIGHT;
    return new Vector3(-Math.sin(this.lean) * height * Math.cos(this.yaw), 0,
      Math.sin(this.lean) * height * Math.sin(this.yaw));
  }

  get leanedBodyHeight(): number {
    return (this.isCrouched ? CROUCHED_HEIGHT : STANDING_HEIGHT) * Math.cos(this.lean);
  }

  get horizontalSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** Resets interpolation and movement state when the match lifecycle spawns the player. */
  setSpawn(position: Readonly<{ x: number; y: number; z: number }>): void {
    if (![position.x, position.y, position.z].every(Number.isFinite)) throw new RangeError('Player spawn position must be finite');
    this.position.set(position.x, position.y, position.z);
    this.previousPosition.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.impactVelocity.set(0, 0, 0);
    this.isGrounded = true;
    this.isCrouched = false;
    this.isSliding = false;
    this.aiming = false;
    this.crouchToggled = false;
    this.jumpCount = 0;
    this.previousYaw = this.yaw;
    this.previousPitch = this.pitch;
    this.slideRemaining = 0;
    this.slideSpeed = 0;
    this.wallNormalX = 0;
    this.wallNormalZ = 0;
    this.wallJumpControlLock = 0;
    this.lean = 0;
    this.previousLean = 0;
    this.previousEyeHeight = STANDING_EYE_HEIGHT;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.previousRecoilPitch = 0;
    this.previousRecoilYaw = 0;
    this.camera.fov = BASE_FOV;
    this.camera.updateProjectionMatrix();
    this.syncCamera();
  }

  /** Applies raw pointer-lock deltas. Aiming scales look speed by the specified 20%. */
  handleMouseMove(movementX: number, movementY: number, aiming = this.aiming): void {
    if (!Number.isFinite(movementX) || !Number.isFinite(movementY)) return;
    this.previousYaw = this.yaw;
    this.previousPitch = this.pitch;
    const sensitivity = this.lookSensitivity * (aiming ? 0.8 : 1);
    this.yaw -= movementX * sensitivity;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch - movementY * sensitivity));
    this.lean = this.limitLean(this.lean, this.position, this.yaw, this.isCrouched ? CROUCHED_HEIGHT : STANDING_HEIGHT);
    this.syncCamera();
  }

  /** Adds a short weapon kick without changing the player's underlying look direction. */
  applyRecoil(pitchRadians: number, yawRadians: number): void {
    if (!Number.isFinite(pitchRadians) || !Number.isFinite(yawRadians)) return;
    this.recoilPitch += Math.max(0, pitchRadians);
    this.recoilYaw += yawRadians;
    this.syncCameraRotation();
  }

  /** Adds a bounded physical impulse that composes with keyboard movement. */
  applyImpulse(direction: Readonly<{ x: number; y: number; z: number }>, speed: number): void {
    if (![direction.x, direction.y, direction.z, speed].every(Number.isFinite) || speed <= 0) return;
    const impulse = new Vector3(direction.x, direction.y, direction.z);
    if (impulse.lengthSq() === 0) return;
    impulse.normalize().multiplyScalar(speed);
    const verticalImpulse = impulse.y;
    this.impactVelocity.x += impulse.x;
    this.impactVelocity.z += impulse.z;
    this.velocity.y += verticalImpulse;
    if (this.velocity.y > 0.08) {
      this.isGrounded = false;
      this.jumpCount = Math.max(1, this.jumpCount);
    }
    const totalSpeed = Math.hypot(this.impactVelocity.x, this.velocity.y, this.impactVelocity.z);
    if (totalSpeed > MAX_IMPULSE_SPEED) {
      const scale = MAX_IMPULSE_SPEED / totalSpeed;
      this.impactVelocity.multiplyScalar(scale);
      this.velocity.y *= scale;
    }
  }

  update(deltaSeconds: number, input: KeyboardInput, aiming: boolean): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    this.previousPosition.copy(this.position);
    this.previousYaw = this.yaw;
    this.previousPitch = this.pitch;
    this.previousLean = this.lean;
    this.previousRecoilPitch = this.recoilPitch;
    this.previousRecoilYaw = this.recoilYaw;
    const recoilRecovery = Math.exp(-5.5 * deltaSeconds);
    this.recoilPitch *= recoilRecovery;
    this.recoilYaw *= recoilRecovery;
    this.previousEyeHeight = this.isCrouched ? CROUCHED_EYE_HEIGHT : STANDING_EYE_HEIGHT;
    this.aiming = aiming;

    const crouchPressed = input.wasPressed('KeyC');
    if (this.crouchMode === 'toggle' && crouchPressed) this.crouchToggled = !this.crouchToggled;
    const crouchRequested = this.crouchMode === 'hold' ? input.isDown('KeyC') : this.crouchToggled;
    const sprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');

    let moveX = Number(input.isDown('KeyD')) - Number(input.isDown('KeyA'));
    let moveForward = Number(input.isDown('KeyW')) - Number(input.isDown('KeyS'));
    const moveLength = Math.hypot(moveX, moveForward);
    if (moveLength > 1) {
      moveX /= moveLength;
      moveForward /= moveLength;
    }

    const directionX = moveX * Math.cos(this.yaw) - moveForward * Math.sin(this.yaw);
    const directionZ = -moveX * Math.sin(this.yaw) - moveForward * Math.cos(this.yaw);
    const wallJumpImpulseActive = this.wallJumpControlLock > 0;
    this.wallJumpControlLock = Math.max(0, this.wallJumpControlLock - deltaSeconds);

    if (
      !wallJumpImpulseActive &&
      crouchPressed &&
      sprinting &&
      this.isGrounded &&
      this.horizontalSpeed >= SPRINT_SPEED * 0.65
    ) {
      this.isSliding = true;
      this.slideRemaining = SLIDE_DURATION;
      this.slideSpeed = Math.max(this.horizontalSpeed, SPRINT_SPEED) * 1.35;
      const currentSpeed = this.horizontalSpeed;
      this.slideDirectionX = currentSpeed > 0 ? this.velocity.x / currentSpeed : directionX;
      this.slideDirectionZ = currentSpeed > 0 ? this.velocity.z / currentSpeed : directionZ;
    }

    if (this.isSliding && !wallJumpImpulseActive) {
      this.slideRemaining = Math.max(0, this.slideRemaining - deltaSeconds);
      this.slideSpeed = Math.max(0, this.slideSpeed - SLIDE_FRICTION * deltaSeconds);
      if (this.slideRemaining === 0 || this.slideSpeed < WALK_SPEED * 0.8) {
        this.isSliding = false;
      }
    }

    this.isCrouched = crouchRequested || this.isSliding;
    if (wallJumpImpulseActive) {
      this.isSliding = false;
      this.isCrouched = crouchRequested;
    } else if (this.isSliding) {
      this.velocity.x = this.slideDirectionX * this.slideSpeed;
      this.velocity.z = this.slideDirectionZ * this.slideSpeed;
    } else if (moveLength > 0) {
      const speed = crouchRequested ? CROUCH_SPEED : sprinting ? SPRINT_SPEED : WALK_SPEED;
      this.velocity.x = directionX * speed;
      this.velocity.z = directionZ * speed;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    const bodyHeight = this.isCrouched ? CROUCHED_HEIGHT : STANDING_HEIGHT;
    const move = this.world.moveHorizontal(
      this.position.x,
      this.position.z,
      (this.velocity.x + this.impactVelocity.x) * deltaSeconds,
      (this.velocity.z + this.impactVelocity.z) * deltaSeconds,
      this.position.y,
      bodyHeight,
      PLAYER_RADIUS,
    );
    this.position.x = move.x;
    this.position.z = move.z;
    this.wallNormalX = move.wallNormalX;
    this.wallNormalZ = move.wallNormalZ;
    if (move.wallNormalX !== 0) {
      this.velocity.x = 0;
      this.impactVelocity.x = 0;
    }
    if (move.wallNormalZ !== 0) {
      this.velocity.z = 0;
      this.impactVelocity.z = 0;
    }
    this.impactVelocity.multiplyScalar(Math.exp(-IMPACT_DRAG * deltaSeconds));
    if (this.impactVelocity.lengthSq() < 0.0004) this.impactVelocity.set(0, 0, 0);

    if (input.wasPressed('Space')) this.tryJump();
    this.updateVerticalPosition(deltaSeconds);
    this.updateLean(deltaSeconds, input);
    const targetFov = this.aiming ? AIM_FOV : BASE_FOV;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, deltaSeconds * 12);
    this.camera.updateProjectionMatrix();
    this.syncCamera();
  }

  /** Interpolates fixed-step camera state for the current render frame. */
  render(interpolationAlpha: number): void {
    const alpha = Math.max(0, Math.min(1, interpolationAlpha));
    const eyeHeight = this.isCrouched ? CROUCHED_EYE_HEIGHT : STANDING_EYE_HEIGHT;
    this.camera.position.set(
      this.previousPosition.x + (this.position.x - this.previousPosition.x) * alpha,
      this.previousPosition.y + (this.position.y - this.previousPosition.y) * alpha +
        this.previousEyeHeight + (eyeHeight - this.previousEyeHeight) * alpha,
      this.previousPosition.z + (this.position.z - this.previousPosition.z) * alpha,
    );
    const renderYaw = this.previousYaw + (this.yaw - this.previousYaw) * alpha;
    const renderLean = this.limitLean(this.previousLean + (this.lean - this.previousLean) * alpha,
      { x: this.camera.position.x, y: this.camera.position.y - (this.previousEyeHeight + (eyeHeight - this.previousEyeHeight) * alpha), z: this.camera.position.z },
      renderYaw, this.isCrouched ? CROUCHED_HEIGHT : STANDING_HEIGHT);
    this.offsetCamera(renderLean, renderYaw, this.previousEyeHeight + (eyeHeight - this.previousEyeHeight) * alpha);
    this.camera.rotation.set(
      Math.max(-MAX_PITCH, Math.min(MAX_PITCH,
        this.previousPitch + (this.pitch - this.previousPitch) * alpha + this.previousRecoilPitch + (this.recoilPitch - this.previousRecoilPitch) * alpha,
      )),
      this.previousYaw + (this.yaw - this.previousYaw) * alpha + this.previousRecoilYaw + (this.recoilYaw - this.previousRecoilYaw) * alpha,
      renderLean,
      'YXZ',
    );
  }

  private tryJump(): void {
    if (this.isGrounded) {
      this.velocity.y = JUMP_SPEED;
      this.isGrounded = false;
      this.jumpCount = 1;
      return;
    }

    if (this.capabilities.wallJump && (this.wallNormalX !== 0 || this.wallNormalZ !== 0)) {
      this.velocity.x = this.wallNormalX * WALL_JUMP_HORIZONTAL_SPEED;
      this.velocity.z = this.wallNormalZ * WALL_JUMP_HORIZONTAL_SPEED;
      this.velocity.y = WALL_JUMP_SPEED;
      this.jumpCount = 1;
      this.wallJumpControlLock = 0.18;
      this.isSliding = false;
      this.wallNormalX = 0;
      this.wallNormalZ = 0;
      return;
    }

    if (this.capabilities.boostedDoubleJump && this.jumpCount === 1) {
      this.velocity.y = BOOSTED_JUMP_SPEED;
      this.jumpCount = 2;
    }
  }

  private updateVerticalPosition(deltaSeconds: number): void {
    const targetGroundY = this.world.groundHeightAt(this.position.x, this.position.z);
    if (this.isGrounded && Math.abs(targetGroundY - this.position.y) <= MAX_STEP_HEIGHT) {
      this.position.y = targetGroundY;
      this.velocity.y = 0;
      this.jumpCount = 0;
      return;
    }

    this.isGrounded = false;
    this.velocity.y -= GRAVITY * deltaSeconds;
    this.position.y += this.velocity.y * deltaSeconds;
    if (this.position.y <= targetGroundY) {
      this.position.y = targetGroundY;
      this.velocity.y = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
    }
  }

  private updateLean(deltaSeconds: number, input: KeyboardInput): void {
    const leanInput = Number(input.isDown('KeyQ')) - Number(input.isDown('KeyE'));
    const targetLean = leanInput * MAX_LEAN;
    const desired = this.lean + (targetLean - this.lean) * (1 - Math.exp(-10 * deltaSeconds));
    this.lean = this.limitLean(desired, this.position, this.yaw, this.isCrouched ? CROUCHED_HEIGHT : STANDING_HEIGHT);
  }

  private syncCamera(): void {
    this.camera.position.set(
      this.position.x,
      this.position.y + (this.isCrouched ? CROUCHED_EYE_HEIGHT : STANDING_EYE_HEIGHT),
      this.position.z,
    );
    this.offsetCamera(this.lean, this.yaw, this.isCrouched ? CROUCHED_EYE_HEIGHT : STANDING_EYE_HEIGHT);
    this.syncCameraRotation();
  }

  private offsetCamera(lean: number, yaw: number, eyeHeight: number): void {
    this.camera.position.x -= Math.sin(lean) * eyeHeight * Math.cos(yaw);
    this.camera.position.z += Math.sin(lean) * eyeHeight * Math.sin(yaw);
    this.camera.position.y += eyeHeight * (Math.cos(lean) - 1);
  }

  private limitLean(angle: number, feet: Readonly<{ x: number; y: number; z: number }>, yaw: number, height: number): number {
    if (angle === 0) return 0;
    const clear = (candidate: number): boolean => {
      const vertical = height * Math.cos(candidate);
      for (let band = 0; band < 5; band += 1) {
        const fraction = (band + 0.5) / 5;
        const side = -Math.sin(candidate) * height * fraction;
        if (!this.world.isBodyClear(feet.x + side * Math.cos(yaw), feet.z - side * Math.sin(yaw),
          feet.y + vertical * band / 5, vertical / 5, band < 2 ? PLAYER_RADIUS : 0.20)) return false;
      }
      return true;
    };
    // Sweep from neutral so a narrow wall cannot be skipped by a fast turn or movement.
    let safe = 0;
    for (let step = 1; step <= 8; step += 1) {
      const next = angle * step / 8;
      if (clear(next)) { safe = next; continue; }
      let blocked = next;
      for (let iteration = 0; iteration < 7; iteration += 1) {
        const midpoint = (safe + blocked) / 2;
        if (clear(midpoint)) safe = midpoint; else blocked = midpoint;
      }
      return safe;
    }
    return safe;
  }

  private syncCameraRotation(): void {
    this.camera.rotation.set(
      Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + this.recoilPitch)),
      this.yaw + this.recoilYaw,
      this.lean,
      'YXZ',
    );
  }
}
