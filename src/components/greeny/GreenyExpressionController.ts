import { GreenyAnimationState } from './GreenyTypes';

export interface GreenyFacialExpressionTargets {
  eyeScaleY: number;
  eyeScaleX: number;
  eyelidClose: number;
  pupilOffsetX: number;
  pupilOffsetY: number;
  sparkleScale: number;
  browLeftAngle: number;
  browRightAngle: number;
  browOffsetY: number;
  mouthOpenY: number;
  mouthWidthX: number;
  mouthSmileCurve: number;
  cheekBlushOpacity: number;
  flowerBloomScale: number;
}

export class GreenyExpressionController {
  private blinkTimer = 0;
  private nextBlinkInterval = 3.2;
  private isBlinking = false;
  private blinkProgress = 0;

  public computeTargets(
    state: GreenyAnimationState,
    elapsed: number,
    delta: number,
    speechAmplitude: number,
    headPatTimer: number,
    reducedMotion: boolean
  ): GreenyFacialExpressionTargets {
    // Natural automatic blinking
    this.blinkTimer += delta;
    if (!this.isBlinking && this.blinkTimer >= this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.blinkTimer = 0;
      this.nextBlinkInterval = state === 'THINKING' ? 2.1 : 2.6 + Math.random() * 2.8;
    }

    let autoBlinkClose = 0;
    if (this.isBlinking) {
      this.blinkProgress += delta * (state === 'THINKING' ? 4.5 : 9.0);
      if (this.blinkProgress >= 1) {
        this.isBlinking = false;
        autoBlinkClose = 0;
      } else {
        autoBlinkClose = Math.sin(this.blinkProgress * Math.PI);
      }
    }

    const targets: GreenyFacialExpressionTargets = {
      eyeScaleY: 1.0,
      eyeScaleX: 1.0,
      eyelidClose: autoBlinkClose,
      pupilOffsetX: 0,
      pupilOffsetY: 0,
      sparkleScale: 1.0,
      browLeftAngle: 0.05,
      browRightAngle: -0.05,
      browOffsetY: 0,
      mouthOpenY: 0.14,
      mouthWidthX: 1.0,
      mouthSmileCurve: 0.4,
      cheekBlushOpacity: 0.55,
      flowerBloomScale: 0.65,
    };

    // Head pat override: eyes gently closed in a happy arc, extra warm blush & wide smile
    if (headPatTimer > 0) {
      targets.eyelidClose = 0.92;
      targets.eyeScaleY = 0.25;
      targets.mouthSmileCurve = 0.95;
      targets.mouthWidthX = 1.22;
      targets.cheekBlushOpacity = 0.92;
      targets.flowerBloomScale = 1.18;
      targets.sparkleScale = 1.35;
      return targets;
    }

    switch (state) {
      case 'IDLE': {
        const slowLook = reducedMotion ? 0 : Math.sin(elapsed * 0.65) * 0.04;
        targets.pupilOffsetX = slowLook;
        targets.pupilOffsetY = reducedMotion ? 0 : Math.cos(elapsed * 0.45) * 0.02;
        targets.mouthSmileCurve = 0.45 + (reducedMotion ? 0 : Math.sin(elapsed * 0.8) * 0.12);
        targets.flowerBloomScale = 0.72 + (reducedMotion ? 0 : Math.sin(elapsed * 1.4) * 0.05);
        break;
      }
      case 'GREETING': {
        targets.eyeScaleX = 1.12;
        targets.eyeScaleY = 1.14;
        targets.sparkleScale = 1.45 + Math.sin(elapsed * 8) * 0.2;
        targets.browOffsetY = 0.04;
        targets.mouthOpenY = 0.48 + Math.abs(Math.sin(elapsed * 5)) * 0.22;
        targets.mouthWidthX = 1.24;
        targets.mouthSmileCurve = 0.95;
        targets.cheekBlushOpacity = 0.85;
        targets.flowerBloomScale = 1.25;
        break;
      }
      case 'LISTENING': {
        // Attentive wide eyes facing user
        targets.eyeScaleX = 1.1;
        targets.eyeScaleY = 1.12;
        targets.pupilOffsetX = 0;
        targets.pupilOffsetY = 0.015;
        targets.browOffsetY = 0.035;
        targets.mouthOpenY = 0.16;
        targets.mouthSmileCurve = 0.55;
        targets.cheekBlushOpacity = 0.65;
        targets.flowerBloomScale = 0.88;
        break;
      }
      case 'THINKING': {
        // Looking upward, slow blink, curious brow tilt
        targets.pupilOffsetX = 0.03;
        targets.pupilOffsetY = 0.055;
        targets.browLeftAngle = 0.22;
        targets.browRightAngle = 0.08;
        targets.browOffsetY = 0.03;
        targets.mouthOpenY = 0.2;
        targets.mouthWidthX = 0.72;
        targets.mouthSmileCurve = 0.1;
        targets.flowerBloomScale = 0.75;
        break;
      }
      case 'SPEAKING': {
        // Synchronized strictly with actual speech amplitude (no random mouth open when silent)
        const clampedAmp = Math.max(0, Math.min(1, speechAmplitude));
        targets.mouthOpenY = clampedAmp > 0.03 ? 0.16 + clampedAmp * 0.78 : 0.14;
        targets.mouthWidthX = 0.95 + clampedAmp * 0.28;
        targets.mouthSmileCurve = 0.65;
        targets.browOffsetY = clampedAmp * 0.035;
        targets.sparkleScale = 1.15 + clampedAmp * 0.2;
        targets.cheekBlushOpacity = 0.68;
        targets.flowerBloomScale = 0.95 + clampedAmp * 0.15;
        break;
      }
      case 'HAPPY': {
        targets.eyeScaleX = 1.12;
        targets.eyeScaleY = 1.15;
        targets.sparkleScale = 1.5;
        targets.browOffsetY = 0.045;
        targets.mouthOpenY = 0.56;
        targets.mouthWidthX = 1.26;
        targets.mouthSmileCurve = 1.0;
        targets.cheekBlushOpacity = 0.9;
        targets.flowerBloomScale = 1.32;
        break;
      }
      case 'SAD': {
        // Gentle concerned expression (supportive, never harsh)
        targets.eyeScaleY = 0.92;
        targets.pupilOffsetY = -0.025;
        targets.browLeftAngle = -0.24;
        targets.browRightAngle = 0.24;
        targets.browOffsetY = -0.015;
        targets.mouthOpenY = 0.14;
        targets.mouthWidthX = 0.85;
        targets.mouthSmileCurve = -0.25;
        targets.cheekBlushOpacity = 0.4;
        targets.flowerBloomScale = 0.48;
        break;
      }
      case 'SURPRISED': {
        // Open eyes widely, open mouth O-shape
        targets.eyeScaleX = 1.22;
        targets.eyeScaleY = 1.26;
        targets.eyelidClose = 0;
        targets.browOffsetY = 0.065;
        targets.mouthOpenY = 0.72;
        targets.mouthWidthX = 0.76;
        targets.mouthSmileCurve = 0.0;
        targets.sparkleScale = 1.4;
        targets.flowerBloomScale = 1.1;
        break;
      }
      case 'SLEEPING': {
        targets.eyelidClose = 0.98;
        targets.eyeScaleY = 0.15;
        targets.mouthOpenY = 0.12 + Math.sin(elapsed * 1.6) * 0.06;
        targets.mouthWidthX = 0.78;
        targets.mouthSmileCurve = 0.35;
        targets.cheekBlushOpacity = 0.65;
        targets.flowerBloomScale = 0.52;
        break;
      }
      case 'CELEBRATION': {
        targets.eyeScaleX = 1.15;
        targets.eyeScaleY = 1.18;
        targets.sparkleScale = 1.6;
        targets.browOffsetY = 0.05;
        targets.mouthOpenY = 0.62;
        targets.mouthWidthX = 1.3;
        targets.mouthSmileCurve = 1.0;
        targets.cheekBlushOpacity = 0.95;
        targets.flowerBloomScale = 1.42;
        break;
      }
    }

    return targets;
  }
}
