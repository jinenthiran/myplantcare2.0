import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GreenyAnimationState,
  GreenyCustomizationSettings,
} from './GreenyTypes';
import { GreenyAnimationController } from './GreenyAnimationController';
import { GreenyExpressionController } from './GreenyExpressionController';

interface GreenyCharacter3DProps {
  animationState: GreenyAnimationState;
  speechAmplitude: number;
  customization: GreenyCustomizationSettings;
  size?: 'floating' | 'panel' | 'studio';
  onHeadPat?: () => void;
  onLeafTouch?: () => void;
  onHappyTap?: () => void;
  onWakeUp?: () => void;
  interactiveHint?: boolean;
}

const LEAF_COLOR_MAP: Record<
  GreenyCustomizationSettings['leafColor'],
  { body: number; belly: number; leaf: number; accent: number }
> = {
  mint: {
    body: 0x6ee7b7,
    belly: 0xd1fae5,
    leaf: 0x10b981,
    accent: 0xa7f3d0,
  },
  pastel: {
    body: 0x86efac,
    belly: 0xecfdf5,
    leaf: 0x22c55e,
    accent: 0xbbf7d0,
  },
  emerald: {
    body: 0x34d399,
    belly: 0xd1fae5,
    leaf: 0x00c878,
    accent: 0xb7f76b,
  },
  lime: {
    body: 0xa3e635,
    belly: 0xf7fee7,
    leaf: 0x65a30d,
    accent: 0xd9f99d,
  },
};

const ENVIRONMENT_PALETTE: Record<
  GreenyCustomizationSettings['environment'],
  {
    bgTop: string;
    bgBottom: string;
    pedestalColor: number;
    rimColor: number;
    keyLightColor: number;
    hemiSkyColor: number;
    hemiGroundColor: number;
    particleColor: number;
    label: string;
  }
> = {
  'floating-botanical': {
    bgTop: '#0B2B1D',
    bgBottom: '#071B12',
    pedestalColor: 0x123d2a,
    rimColor: 0x00c878,
    keyLightColor: 0xfffbeb,
    hemiSkyColor: 0xa7f3d0,
    hemiGroundColor: 0x071b12,
    particleColor: 0xb7f76b,
    label: 'Floating Botanical Sanctuary',
  },
  'tiny-garden': {
    bgTop: '#143826',
    bgBottom: '#0A2116',
    pedestalColor: 0x5c4033,
    rimColor: 0x86efac,
    keyLightColor: 0xfef3c7,
    hemiSkyColor: 0xbbf7d0,
    hemiGroundColor: 0x3f2e21,
    particleColor: 0x86efac,
    label: 'Tiny Sprout Garden',
  },
  'flower-meadow': {
    bgTop: '#1A3A2A',
    bgBottom: '#0D261A',
    pedestalColor: 0x15803d,
    rimColor: 0xfda4af,
    keyLightColor: 0xfff1f2,
    hemiSkyColor: 0xfecdd3,
    hemiGroundColor: 0x14532d,
    particleColor: 0xfda4af,
    label: 'Blossom Flower Meadow',
  },
  'magical-forest': {
    bgTop: '#091E26',
    bgBottom: '#051318',
    pedestalColor: 0x0f3d3e,
    rimColor: 0x38bdf8,
    keyLightColor: 0xe0f2fe,
    hemiSkyColor: 0x67e8f9,
    hemiGroundColor: 0x06281e,
    particleColor: 0x5eead4,
    label: 'Bioluminescent Magical Forest',
  },
  greenhouse: {
    bgTop: '#163A2C',
    bgBottom: '#0B2219',
    pedestalColor: 0x78350f,
    rimColor: 0xfde047,
    keyLightColor: 0xfef9c3,
    hemiSkyColor: 0xfef08a,
    hemiGroundColor: 0x1e3a2f,
    particleColor: 0xfde047,
    label: 'Warm Glass Conservatory',
  },
  'sunny-balcony': {
    bgTop: '#1E4631',
    bgBottom: '#0E291C',
    pedestalColor: 0x92400e,
    rimColor: 0xfbbf24,
    keyLightColor: 0xffedd5,
    hemiSkyColor: 0xfde68a,
    hemiGroundColor: 0x451a03,
    particleColor: 0xfde047,
    label: 'Golden Hour Sunny Balcony',
  },
  'rainy-garden': {
    bgTop: '#0F292E',
    bgBottom: '#08181C',
    pedestalColor: 0x1e3a3a,
    rimColor: 0x7dd3fc,
    keyLightColor: 0xe0f2fe,
    hemiSkyColor: 0x93c5fd,
    hemiGroundColor: 0x0f172a,
    particleColor: 0x7dd3fc,
    label: 'Gentle Rainy Garden',
  },
};

function createBotanicalLeafGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.26, 0.14, 0.34, 0.56, 0, 0.92);
  shape.bezierCurveTo(-0.34, 0.56, -0.26, 0.14, 0, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  geo.center();
  // Shift pivot to leaf stem base
  geo.translate(0, 0.44, 0);
  return geo;
}

export const GreenyCharacter3D: React.FC<GreenyCharacter3DProps> = ({
  animationState,
  speechAmplitude,
  customization,
  size = 'studio',
  onHeadPat,
  onLeafTouch,
  onHappyTap,
  onWakeUp,
  interactiveHint = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [interactionFeedback, setInteractionFeedback] = useState<string | null>(null);
  const [webglFallback, setWebglFallback] = useState<boolean>(false);

  // Mutable refs for animation loop access without re-creating WebGL context
  const stateRef = useRef<GreenyAnimationState>(animationState);
  stateRef.current = animationState;

  const speechAmpRef = useRef<number>(speechAmplitude);
  speechAmpRef.current = speechAmplitude;

  const customRef = useRef<GreenyCustomizationSettings>(customization);
  customRef.current = customization;

  const callbacksRef = useRef({ onHeadPat, onLeafTouch, onHappyTap, onWakeUp });
  callbacksRef.current = { onHeadPat, onLeafTouch, onHappyTap, onWakeUp };

  const touchTimersRef = useRef({
    headPat: 0,
    leafWiggle: 0,
    happyJump: 0,
    wakeStretch: 0,
    rapidTapCount: 0,
    lastTapTime: 0,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection per Three.js skill guidelines
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    const width = container.clientWidth || (size === 'floating' ? 88 : size === 'panel' ? 140 : 420);
    const height = container.clientHeight || (size === 'floating' ? 88 : size === 'panel' ? 140 : 380);

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl && size === 'studio';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Studio Environment Map (RoomEnvironment + PMREMGenerator)
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // continue if PMREM fails
    }

    const camera = new THREE.PerspectiveCamera(
      size === 'floating' ? 34 : 36,
      width / Math.max(1, height),
      0.1,
      50
    );
    camera.position.set(0, size === 'floating' ? 0.32 : 0.25, size === 'floating' ? 4.35 : 4.75);
    camera.lookAt(0, 0.18, 0);

    // 2. Three-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xa7f3d0, 0x071b12, 1.15);
    hemiLight.position.set(0, 6, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    keyLight.position.set(2.8, 4.5, 3.6);
    if (!isSoftwareGl && size === 'studio') {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 15;
      const d = 2.6;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00c878, 1.25);
    rimLight.position.set(-2.6, 2.4, -2.8);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xb7f76b, 0.65, 8);
    fillLight.position.set(-1.8, 0.8, 2.5);
    scene.add(fillLight);

    // 3. Ground Pedestal & Soft Contact Shadow
    const environmentGroup = new THREE.Group();
    scene.add(environmentGroup);

    const pedestalGeo = new THREE.CylinderGeometry(1.25, 1.42, 0.24, 36);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x123d2a,
      roughness: 0.72,
      metalness: 0.1,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.set(0, -1.16, 0);
    pedestalMesh.receiveShadow = true;
    environmentGroup.add(pedestalMesh);

    const rimRingGeo = new THREE.TorusGeometry(1.27, 0.032, 16, 48);
    const rimRingMat = new THREE.MeshStandardMaterial({
      color: 0x00c878,
      emissive: 0x00c878,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.6,
    });
    const rimRingMesh = new THREE.Mesh(rimRingGeo, rimRingMat);
    rimRingMesh.rotation.x = Math.PI / 2;
    rimRingMesh.position.set(0, -1.04, 0);
    environmentGroup.add(rimRingMesh);

    // Contact shadow plane directly under GREENY
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
      grad.addColorStop(0, 'rgba(4, 15, 10, 0.65)');
      grad.addColorStop(1, 'rgba(4, 15, 10, 0.0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.7),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, -1.02, 0);
    environmentGroup.add(contactShadow);

    // Environment-specific 3D accents (mushrooms, flowers, stepping stones, butterfly)
    const envPropsGroup = new THREE.Group();
    environmentGroup.add(envPropsGroup);

    const meadowFlowers: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.4;
      const radius = 0.92;
      const flw = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 12, 12),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xfda4af : 0xfde047,
          roughness: 0.4,
        })
      );
      flw.position.set(Math.cos(angle) * radius, -1.01, Math.sin(angle) * radius);
      envPropsGroup.add(flw);
      meadowFlowers.push(flw);
    }

    // Tiny animated butterfly for flower-meadow / sunny-balcony / tiny-garden
    const butterflyGroup = new THREE.Group();
    const wingGeo = new THREE.CircleGeometry(0.08, 12);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
      roughness: 0.3,
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.x = -0.04;
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.x = 0.04;
    butterflyGroup.add(leftWing, rightWing);
    butterflyGroup.position.set(0.95, 0.65, 0.3);
    environmentGroup.add(butterflyGroup);

    // 4. Composite 14-Part 3D Baby Plant Character (GREENY)
    const greenyRoot = new THREE.Group();
    greenyRoot.position.set(0, -0.32, 0);
    scene.add(greenyRoot);

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x34d399,
      roughness: 0.36,
      metalness: 0.04,
      clearcoat: 0.28,
      clearcoatRoughness: 0.45,
    });

    const bellyMaterial = new THREE.MeshStandardMaterial({
      color: 0xd1fae5,
      roughness: 0.52,
      metalness: 0.02,
    });

    const leafMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x00c878,
      roughness: 0.28,
      metalness: 0.06,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4b56a,
      roughness: 0.22,
      metalness: 0.85,
    });

    // 4A. Chubby Baby Body Group
    const torsoGroup = new THREE.Group();
    greenyRoot.add(torsoGroup);

    const torsoMesh = new THREE.Mesh(new THREE.SphereGeometry(0.54, 32, 32), bodyMaterial);
    torsoMesh.scale.set(1.0, 0.94, 0.92);
    torsoMesh.position.set(0, -0.18, 0);
    torsoMesh.castShadow = true;
    torsoMesh.userData = { partType: 'body' };
    torsoGroup.add(torsoMesh);

    // Soft pastel belly patch
    const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), bellyMaterial);
    bellyMesh.scale.set(0.88, 0.82, 0.45);
    bellyMesh.position.set(0, -0.2, 0.36);
    bellyMesh.userData = { partType: 'body' };
    torsoGroup.add(bellyMesh);

    // Golden Botanical Emblem on the Chest
    const chestEmblemGroup = new THREE.Group();
    chestEmblemGroup.position.set(0, -0.06, 0.52);
    const emblemDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.025, 24), goldMaterial);
    emblemDisc.rotation.x = Math.PI / 2;
    const emblemGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.055, 0),
      new THREE.MeshStandardMaterial({
        color: 0xb7f76b,
        emissive: 0x00c878,
        emissiveIntensity: 0.4,
        roughness: 0.15,
      })
    );
    emblemGem.position.z = 0.018;
    chestEmblemGroup.add(emblemDisc, emblemGem);
    torsoGroup.add(chestEmblemGroup);

    // Optional Bow Ribbon Accessory on neck
    const bowRibbonGroup = new THREE.Group();
    bowRibbonGroup.position.set(0, 0.02, 0.51);
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.35 });
    const bowLeft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 16), bowMat);
    bowLeft.rotation.z = -Math.PI / 2;
    bowLeft.position.x = -0.07;
    const bowRight = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 16), bowMat);
    bowRight.rotation.z = Math.PI / 2;
    bowRight.position.x = 0.07;
    const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), goldMaterial);
    bowRibbonGroup.add(bowLeft, bowRight, bowKnot);
    torsoGroup.add(bowRibbonGroup);

    // 4B. Short Articulated Arms & Rounded Hands
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.48, -0.04, 0.05);
    torsoGroup.add(leftArmPivot);

    const leftArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 12, 16), bodyMaterial);
    leftArmMesh.position.set(-0.12, -0.08, 0);
    leftArmMesh.rotation.z = 0.4;
    leftArmMesh.userData = { partType: 'body' };
    const leftHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 16), bodyMaterial);
    leftHandMesh.position.set(-0.2, -0.2, 0.04);
    leftHandMesh.userData = { partType: 'body' };
    leftArmPivot.add(leftArmMesh, leftHandMesh);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.48, -0.04, 0.05);
    torsoGroup.add(rightArmPivot);

    const rightArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 12, 16), bodyMaterial);
    rightArmMesh.position.set(0.12, -0.08, 0);
    rightArmMesh.rotation.z = -0.4;
    rightArmMesh.userData = { partType: 'body' };
    const rightHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 16), bodyMaterial);
    rightHandMesh.position.set(0.2, -0.2, 0.04);
    rightHandMesh.userData = { partType: 'body' };
    rightArmPivot.add(rightArmMesh, rightHandMesh);

    // 4C. Tiny Chubby Feet
    const leftFootPivot = new THREE.Group();
    leftFootPivot.position.set(-0.22, -0.62, 0.08);
    torsoGroup.add(leftFootPivot);
    const leftFootMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), leafMaterial);
    leftFootMesh.scale.set(0.95, 0.65, 1.25);
    leftFootMesh.userData = { partType: 'body' };
    leftFootPivot.add(leftFootMesh);

    const rightFootPivot = new THREE.Group();
    rightFootPivot.position.set(0.22, -0.62, 0.08);
    torsoGroup.add(rightFootPivot);
    const rightFootMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), leafMaterial);
    rightFootMesh.scale.set(0.95, 0.65, 1.25);
    rightFootMesh.userData = { partType: 'body' };
    rightFootPivot.add(rightFootMesh);

    // 4D. Slightly Oversized Expressive Baby Head
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.42, 0);
    torsoGroup.add(headPivot);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.68, 36, 36), bodyMaterial);
    headMesh.scale.set(1.06, 0.96, 0.98);
    headMesh.castShadow = true;
    headMesh.userData = { partType: 'head' };
    headPivot.add(headMesh);

    // Optional Dewdrop Halo Accessory
    const dewdropHaloMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.022, 16, 40),
      new THREE.MeshStandardMaterial({
        color: 0xb7f76b,
        emissive: 0x00c878,
        emissiveIntensity: 0.7,
        roughness: 0.15,
      })
    );
    dewdropHaloMesh.rotation.x = Math.PI / 2;
    dewdropHaloMesh.position.set(0, 0.82, 0);
    headPivot.add(dewdropHaloMesh);

    // 4E. Two Enormous Glossy Expressive Eyes + Highlights + Eyelids + Eyebrows
    const eyeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x071b12,
      roughness: 0.05,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const buildEyeUnit = (side: -1 | 1) => {
      const unit = new THREE.Group();
      unit.position.set(side * 0.25, 0.06, 0.59);

      const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.145, 24, 24), eyeMaterial);
      eyeball.scale.set(1, 1, 0.55);
      eyeball.userData = { partType: 'head' };
      unit.add(eyeball);

      // Emerald iris rim
      const irisRing = new THREE.Mesh(
        new THREE.RingGeometry(0.065, 0.115, 24),
        new THREE.MeshBasicMaterial({ color: 0x00c878, side: THREE.DoubleSide })
      );
      irisRing.position.set(0, -0.01, 0.078);
      unit.add(irisRing);

      // Main big glossy highlight
      const bigCatchlight = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), highlightMaterial);
      bigCatchlight.position.set(side * 0.035, 0.045, 0.082);
      unit.add(bigCatchlight);

      // Secondary tiny sparkle highlight
      const smallCatchlight = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), highlightMaterial);
      smallCatchlight.position.set(-side * 0.038, -0.038, 0.082);
      unit.add(smallCatchlight);

      // Animated upper eyelid
      const eyelid = new THREE.Mesh(
        new THREE.SphereGeometry(0.152, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55),
        bodyMaterial
      );
      eyelid.scale.set(1.02, 1.02, 0.62);
      eyelid.rotation.x = -Math.PI * 0.45;
      eyelid.userData = { partType: 'head' };
      unit.add(eyelid);

      return { unit, eyeball, bigCatchlight, smallCatchlight, eyelid };
    };

    const leftEye = buildEyeUnit(-1);
    const rightEye = buildEyeUnit(1);
    headPivot.add(leftEye.unit, rightEye.unit);

    // Animated Eyebrows
    const browGeo = new THREE.CapsuleGeometry(0.022, 0.11, 8, 12);
    const browMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.4 });
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.rotation.z = Math.PI / 2;
    leftBrow.position.set(-0.25, 0.26, 0.61);
    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.rotation.z = Math.PI / 2;
    rightBrow.position.set(0.25, 0.26, 0.61);
    headPivot.add(leftBrow, rightBrow);

    // Small Cute Nose
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 14), leafMaterial);
    noseMesh.scale.set(1.1, 0.85, 0.8);
    noseMesh.position.set(0, -0.02, 0.67);
    noseMesh.userData = { partType: 'head' };
    headPivot.add(noseMesh);

    // Soft Pink Blush Cheeks
    const blushMaterial = new THREE.MeshBasicMaterial({
      color: 0xfda4af,
      transparent: true,
      opacity: 0.6,
    });
    const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), blushMaterial);
    leftCheek.scale.set(1.25, 0.72, 0.35);
    leftCheek.position.set(-0.38, -0.06, 0.56);
    const rightCheek = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), blushMaterial);
    rightCheek.scale.set(1.25, 0.72, 0.35);
    rightCheek.position.set(0.38, -0.06, 0.56);
    headPivot.add(leftCheek, rightCheek);

    // Animated Mouth (Opens & smiles according to speech amplitude + emotion)
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.14, 0.64);
    const mouthInnerMat = new THREE.MeshBasicMaterial({ color: 0x881337 });
    const mouthCavity = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 20), mouthInnerMat);
    mouthCavity.scale.set(1.1, 0.25, 0.35);
    const tongueMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xfb7185 })
    );
    tongueMesh.position.set(0, -0.025, 0.015);
    tongueMesh.scale.set(1.0, 0.45, 0.4);
    mouthGroup.add(mouthCavity, tongueMesh);
    headPivot.add(mouthGroup);

    // 4F. Two Fresh Green Leaves on Top of Head
    const leafGeo = createBotanicalLeafGeometry();
    const leftLeafPivot = new THREE.Group();
    leftLeafPivot.position.set(-0.08, 0.62, 0);
    const leftLeafMesh = new THREE.Mesh(leafGeo, leafMaterial);
    leftLeafMesh.castShadow = true;
    leftLeafMesh.userData = { partType: 'leaf' };
    leftLeafPivot.add(leftLeafMesh);
    headPivot.add(leftLeafPivot);

    const rightLeafPivot = new THREE.Group();
    rightLeafPivot.position.set(0.08, 0.62, 0);
    const rightLeafMesh = new THREE.Mesh(leafGeo, leafMaterial);
    rightLeafMesh.castShadow = true;
    rightLeafMesh.userData = { partType: 'leaf' };
    rightLeafPivot.add(rightLeafMesh);
    headPivot.add(rightLeafPivot);

    // 4G. Blooming Crown Flower on Top of Head
    const crownFlowerGroup = new THREE.Group();
    crownFlowerGroup.position.set(0, 0.66, 0.08);
    const flowerCenter = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
    );
    flowerCenter.userData = { partType: 'leaf' };
    crownFlowerGroup.add(flowerCenter);

    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.05,
    });
    const flowerPetals: THREE.Mesh[] = [];
    for (let p = 0; p < 6; p++) {
      const pAngle = (p / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 14), petalMat);
      petal.scale.set(0.75, 0.32, 1.35);
      petal.position.set(Math.cos(pAngle) * 0.095, 0.01, Math.sin(pAngle) * 0.095);
      petal.rotation.y = -pAngle + Math.PI / 2;
      petal.userData = { partType: 'leaf' };
      crownFlowerGroup.add(petal);
      flowerPetals.push(petal);
    }
    headPivot.add(crownFlowerGroup);

    // 5. Floating Glowing Botanical Particles & Sound-Wave Ring
    const particleCount = size === 'floating' ? 12 : 28;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const a = (i / particleCount) * Math.PI * 2;
      const r = 0.85 + (i % 4) * 0.25;
      particlePositions[i * 3] = Math.cos(a) * r;
      particlePositions[i * 3 + 1] = -0.8 + (i / particleCount) * 2.1;
      particlePositions[i * 3 + 2] = Math.sin(a) * r;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xb7f76b,
      size: size === 'floating' ? 0.06 : 0.055,
      transparent: true,
      opacity: 0.8,
    });
    const particlesPoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlesPoints);

    // Listening Sound-Wave Halo
    const listeningWaveRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.018, 12, 48),
      new THREE.MeshBasicMaterial({
        color: 0x00c878,
        transparent: true,
        opacity: 0,
      })
    );
    listeningWaveRing.rotation.x = Math.PI / 2;
    listeningWaveRing.position.set(0, 0.05, 0);
    scene.add(listeningWaveRing);

    // 6. Raycasting for Head Pat, Leaf Touch, Happy Tap & Wake-Up
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clickableMeshes = [
      headMesh,
      leftEye.eyeball,
      rightEye.eyeball,
      leftLeafMesh,
      rightLeafMesh,
      flowerCenter,
      torsoMesh,
      bellyMesh,
    ];

    const triggerFeedbackChip = (label: string) => {
      setInteractionFeedback(label);
      window.setTimeout(() => {
        setInteractionFeedback((curr) => (curr === label ? null : curr));
      }, 2200);
    };

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // If sleeping, any click wakes GREENY up with a cute stretch
      if (stateRef.current === 'SLEEPING') {
        touchTimersRef.current.wakeStretch = 1.6;
        triggerFeedbackChip('GREENY woke up & stretched!');
        callbacksRef.current.onWakeUp?.();
        return;
      }

      const now = performance.now();
      if (now - touchTimersRef.current.lastTapTime < 550) {
        touchTimersRef.current.rapidTapCount += 1;
      } else {
        touchTimersRef.current.rapidTapCount = 1;
      }
      touchTimersRef.current.lastTapTime = now;

      if (touchTimersRef.current.rapidTapCount >= 3) {
        touchTimersRef.current.happyJump = 1.8;
        touchTimersRef.current.rapidTapCount = 0;
        triggerFeedbackChip('Happy Jump! Wheee!');
        callbacksRef.current.onHappyTap?.();
        return;
      }

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);

      if (hits.length > 0) {
        const hitType = hits[0].object.userData?.partType;
        if (hitType === 'leaf') {
          touchTimersRef.current.leafWiggle = 1.4;
          triggerFeedbackChip('Leaf Wiggle!');
          callbacksRef.current.onLeafTouch?.();
          return;
        }
        if (hitType === 'head') {
          touchTimersRef.current.headPat = 1.8;
          triggerFeedbackChip('Head Pat! ♥');
          callbacksRef.current.onHeadPat?.();
          return;
        }
      }

      // Default body tap -> gentle happy reaction
      touchTimersRef.current.headPat = 1.2;
      triggerFeedbackChip('Hehehe! ♥');
      callbacksRef.current.onHeadPat?.();
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 7. Animation Loop with Damping & Software-WebGL Pacing
    const animController = new GreenyAnimationController();
    const exprController = new GreenyExpressionController();
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (isDisposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const currentState = stateRef.current;
      const currentCustom = customRef.current;
      const dampLambda = 9.5;

      // Decrement interactive touch timers
      if (touchTimersRef.current.headPat > 0) {
        touchTimersRef.current.headPat = Math.max(0, touchTimersRef.current.headPat - delta);
      }
      if (touchTimersRef.current.leafWiggle > 0) {
        touchTimersRef.current.leafWiggle = Math.max(0, touchTimersRef.current.leafWiggle - delta);
      }
      if (touchTimersRef.current.happyJump > 0) {
        touchTimersRef.current.happyJump = Math.max(0, touchTimersRef.current.happyJump - delta);
      }
      if (touchTimersRef.current.wakeStretch > 0) {
        touchTimersRef.current.wakeStretch = Math.max(0, touchTimersRef.current.wakeStretch - delta);
      }

      // Sync customization colors & accessories dynamically
      const palette = LEAF_COLOR_MAP[currentCustom.leafColor] || LEAF_COLOR_MAP.emerald;
      bodyMaterial.color.setHex(palette.body);
      bellyMaterial.color.setHex(palette.belly);
      leafMaterial.color.setHex(palette.leaf);

      chestEmblemGroup.visible = currentCustom.accessory === 'gold-emblem';
      dewdropHaloMesh.visible = currentCustom.accessory === 'dewdrop-halo';
      bowRibbonGroup.visible = currentCustom.accessory === 'bow-ribbon';

      crownFlowerGroup.visible = currentCustom.flowerStyle !== 'none';
      if (currentCustom.flowerStyle === 'lotus') {
        petalMat.color.setHex(0xfda4af);
      } else if (currentCustom.flowerStyle === 'sunflower') {
        petalMat.color.setHex(0xfde047);
      } else {
        petalMat.color.setHex(0xffffff);
      }

      // Sync Environment Palette & Props
      const envConfig = ENVIRONMENT_PALETTE[currentCustom.environment] || ENVIRONMENT_PALETTE['floating-botanical'];
      pedestalMat.color.setHex(envConfig.pedestalColor);
      rimRingMat.color.setHex(envConfig.rimColor);
      rimRingMat.emissive.setHex(envConfig.rimColor);
      keyLight.color.setHex(envConfig.keyLightColor);
      hemiLight.color.setHex(envConfig.hemiSkyColor);
      hemiLight.groundColor.setHex(envConfig.hemiGroundColor);
      particleMat.color.setHex(envConfig.particleColor);

      const showEffects = currentCustom.backgroundEffectsEnabled && !currentCustom.reducedMotion;
      particlesPoints.visible = showEffects;
      envPropsGroup.visible =
        currentCustom.environment === 'flower-meadow' ||
        currentCustom.environment === 'tiny-garden' ||
        currentCustom.environment === 'magical-forest';
      butterflyGroup.visible =
        showEffects &&
        (currentCustom.environment === 'flower-meadow' ||
          currentCustom.environment === 'sunny-balcony' ||
          currentCustom.environment === 'tiny-garden');

      if (butterflyGroup.visible) {
        butterflyGroup.position.x = Math.cos(elapsed * 1.4) * 0.95;
        butterflyGroup.position.z = Math.sin(elapsed * 1.4) * 0.65;
        butterflyGroup.position.y = 0.52 + Math.sin(elapsed * 3.2) * 0.15;
        leftWing.rotation.y = Math.sin(elapsed * 18) * 0.65;
        rightWing.rotation.y = -Math.sin(elapsed * 18) * 0.65;
      }

      if (showEffects) {
        const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
        const isRain = currentCustom.environment === 'rainy-garden';
        for (let i = 0; i < particleCount; i++) {
          let y = posAttr.getY(i);
          if (isRain) {
            y -= delta * 1.8;
            if (y < -1.0) y = 1.3;
          } else {
            y += delta * 0.28;
            if (y > 1.3) y = -0.9;
          }
          posAttr.setY(i, y);
        }
        posAttr.needsUpdate = true;
        particlesPoints.rotation.y = elapsed * 0.12;
      }

      // Compute kinematic pose & facial expression targets
      const pose = animController.computePoseTargets(
        currentState,
        elapsed,
        delta,
        speechAmpRef.current,
        touchTimersRef.current.leafWiggle,
        touchTimersRef.current.happyJump,
        touchTimersRef.current.wakeStretch,
        currentCustom.reducedMotion
      );

      const expr = exprController.computeTargets(
        currentState,
        elapsed,
        delta,
        speechAmpRef.current,
        touchTimersRef.current.headPat,
        currentCustom.reducedMotion
      );

      // Apply smooth exponential damping to body, head, limbs & leaves
      torsoGroup.position.y = THREE.MathUtils.damp(torsoGroup.position.y, pose.bodyPosY, dampLambda, delta);
      torsoGroup.position.z = THREE.MathUtils.damp(torsoGroup.position.z, pose.bodyPosZ, dampLambda, delta);
      torsoGroup.rotation.y = THREE.MathUtils.damp(torsoGroup.rotation.y, pose.bodyRotY, dampLambda, delta);
      torsoGroup.rotation.x = THREE.MathUtils.damp(torsoGroup.rotation.x, pose.bodyRotX, dampLambda, delta);
      torsoGroup.scale.set(
        THREE.MathUtils.damp(torsoGroup.scale.x, pose.bodyScaleXZ, dampLambda, delta),
        THREE.MathUtils.damp(torsoGroup.scale.y, pose.bodyScaleY, dampLambda, delta),
        THREE.MathUtils.damp(torsoGroup.scale.z, pose.bodyScaleXZ, dampLambda, delta)
      );

      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, pose.headRotX, dampLambda, delta);
      headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, pose.headRotY, dampLambda, delta);
      headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, pose.headRotZ, dampLambda, delta);

      leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, pose.leftArmRotZ, dampLambda, delta);
      leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, pose.leftArmRotX, dampLambda, delta);
      rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, pose.rightArmRotZ, dampLambda, delta);
      rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, pose.rightArmRotX, dampLambda, delta);

      leftFootPivot.rotation.x = THREE.MathUtils.damp(leftFootPivot.rotation.x, pose.leftFootRotX, dampLambda, delta);
      rightFootPivot.rotation.x = THREE.MathUtils.damp(rightFootPivot.rotation.x, pose.rightFootRotX, dampLambda, delta);

      leftLeafPivot.rotation.z = THREE.MathUtils.damp(leftLeafPivot.rotation.z, pose.leftLeafRotZ, dampLambda, delta);
      leftLeafPivot.rotation.x = THREE.MathUtils.damp(leftLeafPivot.rotation.x, pose.leftLeafRotX, dampLambda, delta);
      rightLeafPivot.rotation.z = THREE.MathUtils.damp(rightLeafPivot.rotation.z, pose.rightLeafRotZ, dampLambda, delta);
      rightLeafPivot.rotation.x = THREE.MathUtils.damp(rightLeafPivot.rotation.x, pose.rightLeafRotX, dampLambda, delta);

      // Apply facial expression damping
      const eyeScaleY = THREE.MathUtils.damp(leftEye.unit.scale.y, expr.eyeScaleY, 14, delta);
      const eyeScaleX = THREE.MathUtils.damp(leftEye.unit.scale.x, expr.eyeScaleX, 14, delta);
      leftEye.unit.scale.set(eyeScaleX, eyeScaleY, 1);
      rightEye.unit.scale.set(eyeScaleX, eyeScaleY, 1);

      const lidRot = -Math.PI * 0.45 + expr.eyelidClose * (Math.PI * 0.45);
      leftEye.eyelid.rotation.x = THREE.MathUtils.damp(leftEye.eyelid.rotation.x, lidRot, 18, delta);
      rightEye.eyelid.rotation.x = THREE.MathUtils.damp(rightEye.eyelid.rotation.x, lidRot, 18, delta);

      leftEye.bigCatchlight.scale.setScalar(expr.sparkleScale);
      rightEye.bigCatchlight.scale.setScalar(expr.sparkleScale);

      leftBrow.rotation.z = Math.PI / 2 + expr.browLeftAngle;
      rightBrow.rotation.z = Math.PI / 2 + expr.browRightAngle;
      leftBrow.position.y = 0.26 + expr.browOffsetY;
      rightBrow.position.y = 0.26 + expr.browOffsetY;

      blushMaterial.opacity = THREE.MathUtils.damp(blushMaterial.opacity, expr.cheekBlushOpacity, 10, delta);

      mouthCavity.scale.y = THREE.MathUtils.damp(mouthCavity.scale.y, expr.mouthOpenY, 18, delta);
      mouthCavity.scale.x = THREE.MathUtils.damp(mouthCavity.scale.x, expr.mouthWidthX, 16, delta);
      mouthGroup.rotation.x = expr.mouthSmileCurve * 0.18;

      const bloomScale = THREE.MathUtils.damp(crownFlowerGroup.scale.x, expr.flowerBloomScale, 8, delta);
      crownFlowerGroup.scale.setScalar(bloomScale);

      // Listening sound-wave ring animation
      if (currentState === 'LISTENING') {
        const waveScale = 1 + ((elapsed * 1.4) % 1) * 0.45;
        listeningWaveRing.scale.setScalar(waveScale);
        (listeningWaveRing.material as THREE.MeshBasicMaterial).opacity =
          (1 - ((elapsed * 1.4) % 1)) * 0.65;
      } else {
        (listeningWaveRing.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      // Contact shadow scale responds to jump height
      const shadowScale = Math.max(0.58, 1 - Math.max(0, torsoGroup.position.y) * 0.85);
      contactShadow.scale.setScalar(shadowScale);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.dispose();
    };
  }, [size]);

  const envTheme = ENVIRONMENT_PALETTE[customization.environment] || ENVIRONMENT_PALETTE['floating-botanical'];

  if (webglFallback) {
    return (
      <div
        className="relative flex flex-col items-center justify-center rounded-2xl border border-[#00C878]/30 p-4 text-center"
        style={{ background: `linear-gradient(180deg, ${envTheme.bgTop}, ${envTheme.bgBottom})` }}
      >
        <div className="text-sm font-bold text-[#B7F76B]">GREENY 3D Companion ({animationState})</div>
        <p className="text-xs text-[#F7F9F2]/80 mt-1">Your Little Botanical Friend is Ready!</p>
      </div>
    );
  }

  return (
    <div
      className={`relative select-none overflow-hidden ${
        size === 'floating'
          ? 'w-20 h-20 rounded-full'
          : size === 'panel'
          ? 'w-full h-40 rounded-2xl'
          : 'w-full h-[360px] sm:h-[400px] rounded-2xl'
      }`}
      style={{
        background: `radial-gradient(circle at 50% 32%, ${envTheme.bgTop} 0%, ${envTheme.bgBottom} 100%)`,
      }}
    >
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`Interactive 3D GREENY Baby Plant Character in ${animationState} state. Click head to pat or leaves to wiggle.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (animationState === 'SLEEPING') {
              onWakeUp?.();
            } else {
              onHeadPat?.();
            }
          }
        }}
      />

      {/* State-Specific 2D Semantic Overlays (Thinking Bubbles, Sleeping Zzz, Listening Sound Waves, Celebration Leaves) */}
      {animationState === 'THINKING' && size !== 'floating' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#071B12]/80 border border-[#B7F76B]/40 text-xs font-bold text-[#B7F76B]"
        >
          <span>• • ○</span>
          <span>? ?</span>
        </div>
      )}

      {animationState === 'SLEEPING' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 right-3 px-2.5 py-0.5 rounded-full bg-[#071B12]/80 text-xs font-mono font-bold text-[#A7F3D0]"
        >
          Zzz...
        </div>
      )}

      {animationState === 'LISTENING' && size !== 'floating' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 left-4 px-3 py-1 rounded-full bg-[#00C878]/20 border border-[#00C878] text-[11px] font-mono font-semibold text-[#B7F76B]"
        >
          ((( Listening to You )))
        </div>
      )}

      {(animationState === 'HAPPY' || animationState === 'CELEBRATION' || animationState === 'GREETING') &&
        size !== 'floating' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-4 px-3 py-1 rounded-full bg-[#B7F76B]/20 border border-[#B7F76B]/50 text-[11px] font-semibold text-[#B7F76B]"
          >
            ✿ Crown Flower Blooming ✿
          </div>
        )}

      {/* Touch Feedback Toast */}
      {interactionFeedback && size !== 'floating' && (
        <div
          role="status"
          className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[#00C878] text-[#071B12] text-xs font-bold shadow-lg whitespace-nowrap"
        >
          {interactionFeedback}
        </div>
      )}

      {/* Interactive Petting Guide Label in Studio View */}
      {interactiveHint && size === 'studio' && !interactionFeedback && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-xl bg-[#071B12]/80 border border-[#123D2A] text-[11px] text-[#F7F9F2]/85 whitespace-nowrap">
          Tap GREENY’s Head for Head Pat · Tap Leaves to Wiggle · Double-Tap to Jump · Env: {envTheme.label}
        </div>
      )}
    </div>
  );
};
