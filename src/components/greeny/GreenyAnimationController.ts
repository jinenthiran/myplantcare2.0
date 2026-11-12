import { GreenyAnimationState } from './GreenyTypes';

export interface GreenyPoseTargets {
  bodyPosY: number;
  bodyPosZ: number;
  bodyRotY: number;
  bodyRotX: number;
  bodyScaleY: number;
  bodyScaleXZ: number;
  headRotX: number;
  headRotY: number;
  headRotZ: number;
  leftArmRotZ: number;
  leftArmRotX: number;
  rightArmRotZ: number;
  rightArmRotX: number;
  leftFootRotX: number;
  rightFootRotX: number;
  leftLeafRotZ: number;
  leftLeafRotX: number;
  rightLeafRotZ: number;
  rightLeafRotX: number;
}

export class GreenyAnimationController {
  private idleVariationTimer = 0;
  private currentIdleVariant: 'breathe' | 'wave-right' | 'look-curious' | 'happy-sway' = 'breathe';
  private idleVariantDuration = 4.5;

  public computePoseTargets(
    state: GreenyAnimationState,
    elapsed: number,
    delta: number,
    speechAmplitude: number,
    leafWiggleTimer: number,
    happyJumpTimer: number,
    wakeStretchTimer: number,
    reducedMotion: boolean
  ): GreenyPoseTargets {
    const motionScale = reducedMotion ? 0.25 : 1.0;

    // Update random idle variation timer so IDLE never looks repetitive
    if (state === 'IDLE') {
      this.idleVariationTimer += delta;
      if (this.idleVariationTimer >= this.idleVariantDuration) {
        this.idleVariationTimer = 0;
        const variants: Array<'breathe' | 'wave-right' | 'look-curious' | 'happy-sway'> = [
          'breathe',
          'wave-right',
          'look-curious',
          'happy-sway',
          'breathe',
        ];
        this.currentIdleVariant = variants[Math.floor(Math.random() * variants.length)];
        this.idleVariantDuration = 3.5 + Math.random() * 3.0;
      }
    } else {
      this.idleVariationTimer = 0;
      this.currentIdleVariant = 'breathe';
    }

    const breathWave = Math.sin(elapsed * 2.2) * motionScale;
    const bounceWave = Math.abs(Math.sin(elapsed * 2.6)) * motionScale;

    const pose: GreenyPoseTargets = {
      bodyPosY: bounceWave * 0.06,
      bodyPosZ: 0,
      bodyRotY: 0,
      bodyRotX: 0,
      bodyScaleY: 1 + breathWave * 0.022,
      bodyScaleXZ: 1 - breathWave * 0.014,
      headRotX: Math.sin(elapsed * 1.4) * 0.04 * motionScale,
      headRotY: Math.sin(elapsed * 0.9) * 0.08 * motionScale,
      headRotZ: Math.cos(elapsed * 1.2) * 0.04 * motionScale,
      leftArmRotZ: 0.48 + Math.sin(elapsed * 2.0) * 0.08 * motionScale,
      leftArmRotX: 0.1,
      rightArmRotZ: -0.48 - Math.sin(elapsed * 2.0) * 0.08 * motionScale,
      rightArmRotX: 0.1,
      leftFootRotX: Math.sin(elapsed * 2.6) * 0.08 * motionScale,
      rightFootRotX: -Math.sin(elapsed * 2.6) * 0.08 * motionScale,
      leftLeafRotZ: 0.42 + Math.sin(elapsed * 2.8) * 0.1 * motionScale,
      leftLeafRotX: Math.cos(elapsed * 2.1) * 0.06 * motionScale,
      rightLeafRotZ: -0.42 - Math.sin(elapsed * 2.8 + 0.4) * 0.1 * motionScale,
      rightLeafRotX: Math.sin(elapsed * 2.1) * 0.06 * motionScale,
    };

    switch (state) {
      case 'IDLE': {
        if (this.currentIdleVariant === 'wave-right') {
          pose.rightArmRotZ = -2.15 + Math.sin(elapsed * 8.5) * 0.35 * motionScale;
          pose.rightArmRotX = -0.3;
          pose.headRotZ = -0.12 * motionScale;
        } else if (this.currentIdleVariant === 'look-curious') {
          pose.headRotY = Math.sin(elapsed * 1.8) * 0.28 * motionScale;
          pose.headRotZ = 0.14 * motionScale;
          pose.leftLeafRotZ = 0.56;
          pose.rightLeafRotZ = -0.56;
        } else if (this.currentIdleVariant === 'happy-sway') {
          pose.bodyRotY = Math.sin(elapsed * 2.5) * 0.16 * motionScale;
          pose.headRotZ = Math.sin(elapsed * 2.5) * 0.12 * motionScale;
        }
        break;
      }

      case 'GREETING': {
        const jumpSin = Math.abs(Math.sin(elapsed * 5.2)) * motionScale;
        pose.bodyPosY = jumpSin * 0.28;
        pose.bodyScaleY = 1 + Math.sin(elapsed * 5.2) * 0.05 * motionScale;
        pose.headRotX = -0.08;
        pose.headRotZ = Math.sin(elapsed * 4.5) * 0.12 * motionScale;
        // Wave both hands cheerfully
        pose.leftArmRotZ = 2.25 + Math.sin(elapsed * 10) * 0.32 * motionScale;
        pose.rightArmRotZ = -2.25 - Math.sin(elapsed * 10 + 0.5) * 0.32 * motionScale;
        pose.leftArmRotX = -0.25;
        pose.rightArmRotX = -0.25;
        // Leaves bounce with jump
        pose.leftLeafRotZ = 0.25 + jumpSin * 0.38;
        pose.rightLeafRotZ = -0.25 - jumpSin * 0.38;
        break;
      }

      case 'LISTENING': {
        // Face user attentively, slight head tilt, listening hand pose
        pose.bodyPosY = Math.sin(elapsed * 2.0) * 0.03 * motionScale;
        pose.bodyRotY = 0;
        pose.headRotY = 0;
        pose.headRotZ = 0.16 * motionScale;
        pose.headRotX = -0.05;
        pose.rightArmRotZ = -1.35;
        pose.rightArmRotX = -0.65;
        pose.leftArmRotZ = 0.65;
        // Leaves perk upright and move gently
        pose.leftLeafRotZ = 0.22 + Math.sin(elapsed * 3.5) * 0.08 * motionScale;
        pose.rightLeafRotZ = -0.22 - Math.sin(elapsed * 3.5) * 0.08 * motionScale;
        break;
      }

      case 'THINKING': {
        // Look upward, touch cheek with right hand, tilt head
        pose.bodyPosY = Math.sin(elapsed * 1.6) * 0.025 * motionScale;
        pose.headRotX = -0.22;
        pose.headRotZ = -0.18;
        pose.headRotY = 0.12;
        pose.rightArmRotZ = -1.65;
        pose.rightArmRotX = -0.88;
        pose.leftArmRotZ = 0.52;
        pose.leftLeafRotZ = 0.35 + Math.sin(elapsed * 2.0) * 0.07 * motionScale;
        pose.rightLeafRotZ = -0.52;
        break;
      }

      case 'SPEAKING': {
        const amp = Math.max(0, Math.min(1, speechAmplitude));
        pose.bodyPosY = (0.04 + amp * 0.09) * motionScale;
        pose.headRotX = -amp * 0.12 * motionScale;
        pose.headRotY = Math.sin(elapsed * 2.4) * 0.12 * motionScale;
        pose.headRotZ = Math.cos(elapsed * 3.1) * 0.08 * motionScale;
        // Expressive speaking hand gestures
        pose.leftArmRotZ = 0.85 + Math.sin(elapsed * 5.5) * (0.18 + amp * 0.35) * motionScale;
        pose.rightArmRotZ = -0.85 - Math.cos(elapsed * 5.5) * (0.18 + amp * 0.35) * motionScale;
        pose.leftArmRotX = -0.35 - amp * 0.25;
        pose.rightArmRotX = -0.35 - amp * 0.25;
        // Leaves respond dynamically to speech cadence
        pose.leftLeafRotZ = 0.32 + amp * 0.28;
        pose.rightLeafRotZ = -0.32 - amp * 0.28;
        break;
      }

      case 'HAPPY': {
        const happyJump = Math.abs(Math.sin(elapsed * 6.0)) * motionScale;
        pose.bodyPosY = happyJump * 0.34;
        pose.bodyRotY = Math.sin(elapsed * 3.0) * 0.22 * motionScale;
        pose.leftArmRotZ = 2.3 + Math.sin(elapsed * 9.0) * 0.3 * motionScale;
        pose.rightArmRotZ = -2.3 - Math.sin(elapsed * 9.0) * 0.3 * motionScale;
        pose.leftFootRotX = happyJump * 0.45;
        pose.rightFootRotX = -happyJump * 0.45;
        // Leaves stand upright when excited
        pose.leftLeafRotZ = 0.16 + happyJump * 0.25;
        pose.rightLeafRotZ = -0.16 - happyJump * 0.25;
        break;
      }

      case 'SAD': {
        // Lower head slightly, leaves droop gently
        pose.bodyPosY = -0.04;
        pose.headRotX = 0.22;
        pose.headRotZ = 0.08;
        pose.leftArmRotZ = 0.28;
        pose.rightArmRotZ = -0.28;
        pose.leftArmRotX = 0.25;
        pose.rightArmRotX = 0.25;
        // Drooping leaves
        pose.leftLeafRotZ = 0.98 + Math.sin(elapsed * 1.5) * 0.04 * motionScale;
        pose.rightLeafRotZ = -0.98 - Math.sin(elapsed * 1.5) * 0.04 * motionScale;
        break;
      }

      case 'SURPRISED': {
        // Move slightly backward, raise both leaves upright
        pose.bodyPosY = 0.12 * motionScale;
        pose.bodyPosZ = -0.14 * motionScale;
        pose.bodyRotX = -0.12 * motionScale;
        pose.headRotX = -0.1;
        pose.leftArmRotZ = 1.65;
        pose.rightArmRotZ = -1.65;
        // Leaves stand upright in surprise
        pose.leftLeafRotZ = 0.08;
        pose.rightLeafRotZ = -0.08;
        break;
      }

      case 'SLEEPING': {
        // Sit down low, breathe gently, occasional leaf twitch
        const sleepBreath = Math.sin(elapsed * 1.3) * motionScale;
        pose.bodyPosY = -0.22 + sleepBreath * 0.02;
        pose.bodyScaleY = 0.94 + sleepBreath * 0.025;
        pose.bodyScaleXZ = 1.05 - sleepBreath * 0.02;
        pose.headRotX = 0.24 + sleepBreath * 0.04;
        pose.headRotZ = 0.15;
        pose.leftArmRotZ = 0.35;
        pose.rightArmRotZ = -0.35;
        pose.leftFootRotX = -0.85;
        pose.rightFootRotX = -0.85;
        pose.leftLeafRotZ = 0.72 + Math.sin(elapsed * 1.3) * 0.06 * motionScale;
        pose.rightLeafRotZ = -0.72 - Math.sin(elapsed * 1.3) * 0.06 * motionScale;
        break;
      }

      case 'CELEBRATION': {
        // Jump several times and spin gently
        const celebJump = Math.abs(Math.sin(elapsed * 6.8)) * motionScale;
        pose.bodyPosY = celebJump * 0.38;
        pose.bodyRotY = (elapsed * 2.6 * motionScale) % (Math.PI * 2);
        pose.leftArmRotZ = 2.4 + Math.sin(elapsed * 11) * 0.25 * motionScale;
        pose.rightArmRotZ = -2.4 - Math.sin(elapsed * 11) * 0.25 * motionScale;
        pose.leftLeafRotZ = 0.14 + celebJump * 0.3;
        pose.rightLeafRotZ = -0.14 - celebJump * 0.3;
        break;
      }
    }

    // Interactive Overrides: Leaf Touch Wiggle, Happy Tap Jump, Wake-Up Stretch
    if (leafWiggleTimer > 0) {
      const wiggle = Math.sin(elapsed * 22) * 0.42 * motionScale;
      pose.leftLeafRotZ += wiggle;
      pose.rightLeafRotZ -= wiggle;
      pose.headRotZ += wiggle * 0.2;
    }

    if (happyJumpTimer > 0) {
      const tapBounce = Math.abs(Math.sin(elapsed * 8.5)) * 0.36 * motionScale;
      pose.bodyPosY = Math.max(pose.bodyPosY, tapBounce);
      pose.leftArmRotZ = 2.35;
      pose.rightArmRotZ = -2.35;
    }

    if (wakeStretchTimer > 0) {
      pose.bodyPosY = 0.14 * motionScale;
      pose.bodyScaleY = 1.12;
      pose.headRotX = -0.22;
      pose.leftArmRotZ = 2.5;
      pose.rightArmRotZ = -2.5;
      pose.leftLeafRotZ = 0.12;
      pose.rightLeafRotZ = -0.12;
    }

    return pose;
  }
}
