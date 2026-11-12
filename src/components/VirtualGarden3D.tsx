import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Sun,
  Sparkles,
  Move,
  Maximize2,
  Minimize2,
  CloudUpload,
} from 'lucide-react';
import { auth, saveGardenLayoutToFirestore } from '../lib/firebase';

export interface VirtualPlantInstance {
  id: string;
  name: string;
  speciesType: 'monstera' | 'tulsi' | 'ficus' | 'palm' | 'snake';
  potStyle: 'terracotta' | 'ceramic' | 'emerald_gold';
  x: number;
  z: number;
  scale: number;
  healthScore: number;
}

interface VirtualGarden3DProps {
  mode?: 'hero' | 'studio';
  initialPlants?: VirtualPlantInstance[];
}

const DEFAULT_GARDEN_PLANTS: VirtualPlantInstance[] = [
  { id: 'vp-1', name: 'Emerald Fenestra (Monstera)', speciesType: 'monstera', potStyle: 'emerald_gold', x: 0, z: 0, scale: 1.15, healthScore: 95 },
  { id: 'vp-2', name: 'Sacred Vrinda Tulsi', speciesType: 'tulsi', potStyle: 'terracotta', x: -2.2, z: 0.9, scale: 0.95, healthScore: 91 },
  { id: 'vp-3', name: 'Sculpted Ficus Canopy', speciesType: 'ficus', potStyle: 'ceramic', x: 2.1, z: 0.7, scale: 1.1, healthScore: 84 },
  { id: 'vp-4', name: 'Golden Cane Areca Palm', speciesType: 'palm', potStyle: 'ceramic', x: -1.6, z: -1.8, scale: 1.05, healthScore: 94 },
  { id: 'vp-5', name: 'Sansevieria Night Purifier', speciesType: 'snake', potStyle: 'emerald_gold', x: 1.8, z: -1.6, scale: 1.0, healthScore: 98 },
];

export const VirtualGarden3D: React.FC<VirtualGarden3DProps> = ({
  mode = 'studio',
  initialPlants = DEFAULT_GARDEN_PLANTS,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const [plants, setPlants] = useState<VirtualPlantInstance[]>(initialPlants);
  const [selectedId, setSelectedId] = useState<string>('vp-1');
  const [lightingPreset, setLightingPreset] = useState<'golden' | 'daylight' | 'bioluminescent'>('golden');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [isFullBleed, setIsFullBleed] = useState<boolean>(false);
  const [firestoreSyncMsg, setFirestoreSyncMsg] = useState<string | null>(null);

  const plantsRef = useRef<VirtualPlantInstance[]>(plants);
  plantsRef.current = plants;

  const selectedIdRef = useRef<string>(selectedId);
  selectedIdRef.current = selectedId;

  const lightingRef = useRef(lightingPreset);
  lightingRef.current = lightingPreset;

  const rebuildScenePlantsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    if (mode !== 'hero') {
      scene.background = new THREE.Color(0x071b12);
      scene.fog = new THREE.FogExp2(0x071b12, 0.045);
    }

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    if (mode === 'hero') {
      camera.position.set(0, 3.6, 5.6);
    } else {
      camera.position.set(0, 4.2, 6.8);
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 2.2;
    controls.maxDistance = 14;
    controls.target.set(0, 0.95, 0);
    controls.update();

    // Balanced 3-Point Botanical Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xd4f7e6, 0x123d2a, 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d0, 2.4);
    keyLight.position.set(5, 8, 4);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00c878, 1.25);
    rimLight.position.set(-4, 5, -5);
    scene.add(rimLight);

    // Procedural CanvasTexture Color & Bump/Roughness Maps
    const createProceduralFloorMaps = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#0d291d';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#164531';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 256; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
      }
      const colorTex = new THREE.CanvasTexture(c);
      colorTex.colorSpace = THREE.SRGBColorSpace;
      colorTex.wrapS = THREE.RepeatWrapping;
      colorTex.wrapT = THREE.RepeatWrapping;
      colorTex.repeat.set(6, 6);
      colorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

      // Procedural Bump & Roughness Map
      const b = document.createElement('canvas');
      b.width = 128;
      b.height = 128;
      const bCtx = b.getContext('2d')!;
      bCtx.fillStyle = '#909090';
      bCtx.fillRect(0, 0, 128, 128);
      bCtx.strokeStyle = '#404040';
      bCtx.lineWidth = 2;
      for (let i = 0; i <= 128; i += 32) {
        bCtx.beginPath();
        bCtx.moveTo(i, 0);
        bCtx.lineTo(i, 128);
        bCtx.stroke();
        bCtx.beginPath();
        bCtx.moveTo(0, i);
        bCtx.lineTo(128, i);
        bCtx.stroke();
      }
      const bumpTex = new THREE.CanvasTexture(b);
      bumpTex.wrapS = THREE.RepeatWrapping;
      bumpTex.wrapT = THREE.RepeatWrapping;
      bumpTex.repeat.set(6, 6);

      return { colorTex, bumpTex };
    };

    const { colorTex, bumpTex } = createProceduralFloorMaps();
    const floorGeo = new THREE.CircleGeometry(6.5, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      map: colorTex,
      bumpMap: bumpTex,
      bumpScale: 0.015,
      roughnessMap: bumpTex,
      roughness: 0.78,
      metalness: 0.1,
      transparent: mode === 'hero',
      opacity: mode === 'hero' ? 0.82 : 1.0,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Subtle Brass Sanctuary Ring on Deck (offset by +0.02 Y to avoid Z-fighting)
    const ringGeo = new THREE.RingGeometry(4.6, 4.72, 64);
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4b56a,
      metalness: 0.88,
      roughness: 0.22,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.02;
    scene.add(ringMesh);

    // InstancedMesh 1: 28 Perimeter Botanical River Pebbles (>20 repeated items)
    const pebbleCount = 28;
    const pebbleGeo = new THREE.DodecahedronGeometry(0.09, 1);
    const pebbleMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d43,
      roughness: 0.86,
      metalness: 0.06,
    });
    const pebbleInstanced = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount);
    const scratchMat4 = new THREE.Matrix4();
    const scratchVec3 = new THREE.Vector3();
    const scratchScale = new THREE.Vector3();
    const scratchQuat = new THREE.Quaternion();

    for (let i = 0; i < pebbleCount; i++) {
      const ang = (i / pebbleCount) * Math.PI * 2;
      const rad = 4.38 + (i % 3) * 0.08;
      scratchVec3.set(Math.cos(ang) * rad, 0.035, Math.sin(ang) * rad);
      scratchScale.set(1.2 + (i % 3) * 0.25, 0.45, 0.9 + (i % 2) * 0.2);
      scratchQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      scratchMat4.compose(scratchVec3, scratchQuat, scratchScale);
      pebbleInstanced.setMatrixAt(i, scratchMat4);
    }
    pebbleInstanced.instanceMatrix.needsUpdate = true;
    pebbleInstanced.computeBoundingSphere();
    scene.add(pebbleInstanced);

    // InstancedMesh 2: 36 Floating Botanical Pollen / Bioluminescent Spores (>20 repeated items)
    const particleCount = 36;
    const sporeGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const sporeMat = new THREE.MeshBasicMaterial({
      color: 0xb7f76b,
      transparent: true,
      opacity: 0.75,
    });
    const sporeInstanced = new THREE.InstancedMesh(sporeGeo, sporeMat, particleCount);
    const sporePositions: { x: number; y: number; z: number; speed: number; phase: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.8 + (i % 7) * 0.55;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.5 + (i % 5) * 0.55;
      sporePositions.push({ x, y, z, speed: 0.6 + (i % 4) * 0.25, phase: i * 0.7 });
      scratchMat4.makeTranslation(x, y, z);
      sporeInstanced.setMatrixAt(i, scratchMat4);
    }
    sporeInstanced.instanceMatrix.needsUpdate = true;
    sporeInstanced.computeBoundingSphere();
    scene.add(sporeInstanced);

    // Group holding all composite 3-12 part procedural plant models
    const plantsRoot = new THREE.Group();
    scene.add(plantsRoot);
    const interactables: THREE.Object3D[] = [];

    // Shared Materials with varied roughness (>= 0.25 delta between parts)
    const potMaterials = {
      terracotta: new THREE.MeshStandardMaterial({
        color: 0xb85d3b,
        bumpMap: bumpTex,
        bumpScale: 0.008,
        roughness: 0.82,
        metalness: 0.05,
      }),
      ceramic: new THREE.MeshPhysicalMaterial({
        color: 0xf7f9f2,
        roughness: 0.18,
        metalness: 0.08,
        clearcoat: 0.6,
      }),
      emerald_gold: new THREE.MeshStandardMaterial({
        color: 0x123d2a,
        roughness: 0.42,
        metalness: 0.25,
      }),
    };
    const brassTrimMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4b56a,
      roughness: 0.18,
      metalness: 0.92,
    });
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x261a12,
      bumpMap: bumpTex,
      bumpScale: 0.012,
      roughness: 0.95,
      metalness: 0.0,
    });
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x1e5e3a,
      roughness: 0.55,
      metalness: 0.05,
    });
    const leafGlossMat = new THREE.MeshPhysicalMaterial({
      color: 0x00a862,
      roughness: 0.22,
      metalness: 0.05,
      clearcoat: 0.45,
      side: THREE.DoubleSide,
    });
    const leafLimeMat = new THREE.MeshStandardMaterial({
      color: 0x52c45a,
      roughness: 0.48,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const shadowDiscGeo = new THREE.CircleGeometry(0.68, 24);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x020805,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });

    // Shared TubeGeometry for organic curved central woody stem
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.03, 0.22, -0.02),
      new THREE.Vector3(-0.02, 0.45, 0.02),
      new THREE.Vector3(0, 0.66, 0),
    ]);
    const sharedTrunkTubeGeo = new THREE.TubeGeometry(stemCurve, 12, 0.052, 10, false);

    // Shared LatheGeometry for sculpted planter vessel silhouette
    const lathePoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.33, 0.0),
      new THREE.Vector2(0.36, 0.15),
      new THREE.Vector2(0.41, 0.42),
      new THREE.Vector2(0.44, 0.62),
    ];
    const sharedLathePotGeo = new THREE.LatheGeometry(lathePoints, 24);

    const buildCompositePlantGroup = (item: VirtualPlantInstance, isSelected: boolean): THREE.Group => {
      const group = new THREE.Group();
      group.position.set(item.x, 0, item.z);
      group.scale.setScalar(item.scale);
      group.userData = { plantId: item.id };

      // 1. Contact Shadow Disc (grounded at y = 0.015)
      const contactShadow = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.y = 0.015;
      group.add(contactShadow);

      // 2. Primary Silhouette: Sculpted LatheGeometry Planter Vessel (bottom-center flush at y = 0, top at y = 0.62)
      const potMesh = new THREE.Mesh(sharedLathePotGeo, potMaterials[item.potStyle] || potMaterials.emerald_gold);
      potMesh.position.y = 0;
      potMesh.castShadow = !isSoftwareGl;
      potMesh.receiveShadow = !isSoftwareGl;
      potMesh.userData = { plantId: item.id };
      group.add(potMesh);
      interactables.push(potMesh);

      // 3. Accent Detail: Beveled Brass/Ceramic Rim Collar
      const rimGeo = new THREE.TorusGeometry(0.45, 0.038, 12, 32);
      const rimMesh = new THREE.Mesh(rimGeo, brassTrimMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = 0.64;
      group.add(rimMesh);

      if (isSelected) {
        const selRingGeo = new THREE.RingGeometry(0.56, 0.63, 32);
        const selRingMat = new THREE.MeshBasicMaterial({
          color: 0x00c878,
          side: THREE.DoubleSide,
        });
        const selRing = new THREE.Mesh(selRingGeo, selRingMat);
        selRing.rotation.x = -Math.PI / 2;
        selRing.position.y = 0.025;
        group.add(selRing);
      }

      // 4. Organic Soil Mound (disjoint depth at y = 0.635, top at 0.655 > 0.62 pot top, zero Z-fighting)
      const soilGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24);
      const soilMesh = new THREE.Mesh(soilGeo, soilMat);
      soilMesh.position.y = 0.635;
      group.add(soilMesh);

      // 5. Secondary Read: TubeGeometry Trunk + Multi-layered Beveled ExtrudeGeometry Foliage Blades (7-9 parts)
      const foliageGroup = new THREE.Group();
      foliageGroup.position.y = 0.655;
      foliageGroup.name = 'foliageCanopy';

      const leafShape = new THREE.Shape();
      leafShape.moveTo(0, 0);
      leafShape.bezierCurveTo(0.26, 0.15, 0.34, 0.55, 0, 0.85);
      leafShape.bezierCurveTo(-0.34, 0.55, -0.26, 0.15, 0, 0);
      const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
        depth: 0.015,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      });

      const leafCount = item.speciesType === 'palm' ? 9 : item.speciesType === 'snake' ? 7 : 8;
      for (let i = 0; i < leafCount; i++) {
        const pivot = new THREE.Group();
        const angle = (i / leafCount) * Math.PI * 2 + (i % 2) * 0.2;
        const tierHeight = 0.15 + (i / leafCount) * 0.55;

        const stemGeo = new THREE.CylinderGeometry(0.022, 0.032, 0.55, 8);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.25;
        stem.rotation.z = 0.28;
        pivot.add(stem);

        const blade = new THREE.Mesh(leafGeo, i % 2 === 0 ? leafGlossMat : leafLimeMat);
        blade.position.set(-0.08, 0.48, 0);
        if (item.speciesType === 'snake') {
          blade.scale.set(0.45, 1.35, 1);
          blade.rotation.x = -0.12;
        } else if (item.speciesType === 'tulsi') {
          blade.scale.set(0.65, 0.65, 1);
          blade.rotation.x = -0.5;
        } else {
          blade.scale.set(1.05, 1.0, 1);
          blade.rotation.x = -0.65;
        }
        blade.castShadow = !isSoftwareGl;
        blade.userData = { plantId: item.id };
        pivot.add(blade);
        interactables.push(blade);

        pivot.position.y = tierHeight * 0.45;
        pivot.rotation.y = angle;
        foliageGroup.add(pivot);
      }

      if (item.speciesType === 'tulsi') {
        const spikeGeo = new THREE.ConeGeometry(0.06, 0.38, 10);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x9b6b9e, roughness: 0.5 });
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.y = 0.85;
        foliageGroup.add(spike);
      } else {
        const coreStem = new THREE.Mesh(sharedTrunkTubeGeo, stemMat);
        foliageGroup.add(coreStem);
      }

      group.add(foliageGroup);
      return group;
    };

    const rebuildPlants = () => {
      interactables.length = 0;
      while (plantsRoot.children.length > 0) {
        plantsRoot.remove(plantsRoot.children[0]);
      }
      const list = mode === 'hero' ? DEFAULT_GARDEN_PLANTS.slice(0, 3) : plantsRef.current;
      list.forEach((p, idx) => {
        const g = buildCompositePlantGroup(p, p.id === selectedIdRef.current);
        if (mode === 'hero') {
          if (idx === 0) {
            g.position.set(0, 0, 0.25);
            g.scale.setScalar(1.32);
          } else if (idx === 1) {
            g.position.set(-1.55, 0, -0.45);
            g.scale.setScalar(1.02);
          } else {
            g.position.set(1.55, 0, -0.45);
            g.scale.setScalar(1.08);
          }
        }
        plantsRoot.add(g);
      });
    };

    rebuildScenePlantsRef.current = rebuildPlants;
    rebuildPlants();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = (e: MouseEvent) => {
      if (mode === 'hero') return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData?.plantId;
        if (hitId) {
          setSelectedId(hitId);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setDockCollapsed((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Pre-allocated camera target vector for exponential damping (1 - Math.exp(-k * dt))
    const desiredTarget = new THREE.Vector3(0, 0.95, 0);
    const startTime = performance.now();
    let prevTime = startTime;
    let frameId = 0;
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
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
    }

    function tick() {
      if (isDisposed) return;
      const now = performance.now();
      const dt = Math.min((now - prevTime) * 0.001, 0.1);
      prevTime = now;
      const elapsed = (now - startTime) * 0.001;

      if (lightingRef.current === 'golden') {
        keyLight.color.setHex(0xfff1d0);
        keyLight.intensity = 2.4;
        if (mode !== 'hero') scene.background = new THREE.Color(0x071b12);
      } else if (lightingRef.current === 'daylight') {
        keyLight.color.setHex(0xffffff);
        keyLight.intensity = 2.8;
        if (mode !== 'hero') scene.background = new THREE.Color(0x0d3121);
      } else {
        keyLight.color.setHex(0x64ffda);
        keyLight.intensity = 1.65;
        if (mode !== 'hero') scene.background = new THREE.Color(0x04100b);
      }

      // Exponential camera target damping toward selected plant in studio mode
      if (mode === 'studio') {
        const sel = plantsRef.current.find((p) => p.id === selectedIdRef.current);
        if (sel) {
          desiredTarget.set(sel.x * 0.35, 0.95, sel.z * 0.35);
          const alpha = 1 - Math.exp(-5.0 * dt);
          controls.target.lerp(desiredTarget, alpha);
        }
      }

      plantsRoot.children.forEach((plantGroup, idx) => {
        const canopy = plantGroup.getObjectByName('foliageCanopy');
        if (canopy) {
          canopy.rotation.z = Math.sin(elapsed * 1.4 + idx) * 0.035;
          canopy.rotation.x = Math.cos(elapsed * 1.1 + idx) * 0.025;
        }
        if (mode === 'hero' && idx === 0) {
          plantGroup.rotation.y = elapsed * 0.16;
        }
      });

      for (let i = 0; i < particleCount; i++) {
        const sp = sporePositions[i];
        const yOffset = Math.sin(elapsed * sp.speed + sp.phase) * 0.22;
        scratchMat4.makeTranslation(sp.x, sp.y + yOffset, sp.z);
        sporeInstanced.setMatrixAt(i, scratchMat4);
      }
      sporeInstanced.instanceMatrix.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.dispose();
      renderer.dispose();
    };
  }, [mode, isFullBleed]);

  useEffect(() => {
    if (rebuildScenePlantsRef.current) {
      rebuildScenePlantsRef.current();
    }
  }, [plants, selectedId]);

  const selectedPlant = plants.find((p) => p.id === selectedId) || plants[0];

  const handleAddPlant = (speciesType: VirtualPlantInstance['speciesType'], label: string) => {
    const count = plants.length;
    const angle = count * 1.35;
    const radius = 1.4 + (count % 3) * 0.85;
    const newPlant: VirtualPlantInstance = {
      id: `vp-${Date.now()}`,
      name: label,
      speciesType,
      potStyle: count % 2 === 0 ? 'emerald_gold' : 'terracotta',
      x: Number((Math.cos(angle) * radius).toFixed(2)),
      z: Number((Math.sin(angle) * radius).toFixed(2)),
      scale: 1.0,
      healthScore: 96,
    };
    setPlants((prev) => [...prev, newPlant]);
    setSelectedId(newPlant.id);
  };

  const handleNudgeSelected = (dx: number, dz: number) => {
    setPlants((prev) =>
      prev.map((p) =>
        p.id === selectedId
          ? {
              ...p,
              x: Number(Math.max(-3.8, Math.min(3.8, p.x + dx)).toFixed(2)),
              z: Number(Math.max(-3.8, Math.min(3.8, p.z + dz)).toFixed(2)),
            }
          : p
      )
    );
  };

  const handleCyclePotStyle = () => {
    const order: VirtualPlantInstance['potStyle'][] = ['emerald_gold', 'terracotta', 'ceramic'];
    setPlants((prev) =>
      prev.map((p) => {
        if (p.id !== selectedId) return p;
        const nextStyle = order[(order.indexOf(p.potStyle) + 1) % order.length];
        return { ...p, potStyle: nextStyle };
      })
    );
  };

  const handleSaveLayoutToFirestore = async () => {
    if (!auth.currentUser) {
      setFirestoreSyncMsg('Sign in with Google in the top bar to save 3D layouts to Firestore.');
      setTimeout(() => setFirestoreSyncMsg(null), 4000);
      return;
    }
    try {
      await saveGardenLayoutToFirestore({
        userId: auth.currentUser.uid,
        title: `Conservatory Layout (${plants.length} Specimens)`,
        lightingPreset,
        specimenCount: plants.length,
      });
      setFirestoreSyncMsg('Saved 3D Layout to Firebase Firestore!');
      setTimeout(() => setFirestoreSyncMsg(null), 3500);
    } catch {
      setFirestoreSyncMsg('Failed to save 3D layout to Firestore.');
      setTimeout(() => setFirestoreSyncMsg(null), 3500);
    }
  };

  return (
    <div
      className={
        isFullBleed
          ? 'fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-[#071B12]'
          : `relative w-full overflow-hidden rounded-2xl border border-[#123D2A] bg-[#071B12] ${
              mode === 'hero' ? 'h-[440px] lg:h-[520px]' : 'h-[580px] lg:h-[660px]'
            }`
      }
      data-testid={mode === 'hero' ? 'hero-3d-canvas' : 'virtual-garden-3d-canvas'}
    >
      {/* Atmospheric Glasshouse Backdrop for Hero 3D Sanctuary */}
      {mode === 'hero' && (
        <div className="pointer-events-none absolute inset-0">
          <img
            src="/src/assets/images/hero_botanical_sanctuary_1794482113239.jpg"
            alt="Botanical Sanctuary Conservatory Backdrop"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071B12] via-[#071B12]/40 to-[#071B12]/70" />
        </div>
      )}

      {/* Dedicated isolated WebGL canvas mount */}
      <div ref={canvasMountRef} className="relative z-[1] w-full h-full" />

      {/* Minimal Top-Left Spec Label (100% unobstructed center viewport) */}
      <div className="pointer-events-none absolute top-4 left-4 z-10 flex flex-col gap-1 bg-[#071B12]/95 px-3.5 py-2 rounded-xl border border-[#123D2A]">
        <span className="text-xs font-medium text-[#B7F76B] tracking-wide">
          {mode === 'hero' ? 'Real-Time 3D Botanical Bio-Sanctuary' : 'Interactive 3D Virtual Garden Conservatory'}
        </span>
        <span className="text-xs text-[#F7F9F2]/80 tabular-nums">
          {mode === 'hero'
            ? 'Specimen: Monstera deliciosa · Health 95% · PAR 420 µmol/m²/s'
            : `${plants.length} Active 3D Specimens · Selected: ${selectedPlant?.name || 'None'}`}
        </span>
        {firestoreSyncMsg && (
          <span className="text-[11px] font-mono text-[#00C878]">{firestoreSyncMsg}</span>
        )}
      </div>

      {/* Top-Right Full-Bleed (100vw x 100vh) & Firestore Sync Actions in Studio Mode */}
      {mode === 'studio' && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveLayoutToFirestore}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#071B12]/95 text-[#00C878] border border-[#123D2A] rounded-xl hover:border-[#00C878] transition-colors whitespace-nowrap shrink-0"
          >
            <CloudUpload className="w-3.5 h-3.5" /> Sync to Firestore
          </button>
          <button
            type="button"
            onClick={() => setIsFullBleed((f) => !f)}
            aria-label="Toggle Full-Bleed 100vw x 100vh 3D Viewport"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#071B12]/95 text-[#F7F9F2] border border-[#123D2A] rounded-xl hover:border-[#00C878] transition-colors whitespace-nowrap shrink-0"
          >
            {isFullBleed ? <Minimize2 className="w-3.5 h-3.5 text-[#B7F76B]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#B7F76B]" />}
            {isFullBleed ? 'Exit Full-Bleed' : 'Full-Bleed 100vw×100vh'}
          </button>
        </div>
      )}

      {/* Hero Bottom Telemetry Strip */}
      {mode === 'hero' && (
        <div className="pointer-events-none absolute bottom-4 inset-x-4 z-10 flex flex-wrap items-center justify-between gap-2 bg-[#071B12]/95 px-4 py-2.5 rounded-xl border border-[#123D2A] text-xs">
          <span className="text-[#F7F9F2]/85">Interactive 3D Scene: Drag to Orbit · Scroll to Zoom</span>
          <span className="font-mono text-[#00C878]">Rhizosphere Moisture: 56% · Canopy Temp: 24.5°C</span>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (<= 15% Viewport Footprint, Solid rgba Surface, Centered) */}
      {mode === 'studio' && (
        <div
          className="absolute bottom-4 inset-x-4 mx-auto z-10 max-w-[920px] transition-transform duration-200"
          style={{
            transform: dockCollapsed ? 'translateY(calc(100% - 36px))' : 'translateY(0)',
          }}
        >
          <div className="flex justify-center mb-1">
            <button
              type="button"
              onClick={() => setDockCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium text-[#F7F9F2] bg-[#071B12]/95 border border-[#123D2A] rounded-t-lg hover:border-[#00C878] transition-colors whitespace-nowrap shrink-0"
            >
              {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {dockCollapsed ? 'Show 3D Garden Controls (H)' : 'Hide Controls (H)'}
            </button>
          </div>

          <div className="bg-[#071B12]/95 border border-[#123D2A] rounded-xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
            {/* Add Plant Controls */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[#F7F9F2]/70 mr-1">Add Specimen:</span>
              <button
                type="button"
                onClick={() => handleAddPlant('monstera', 'Monstera Deliciosa')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#123D2A] text-[#F7F9F2] rounded-lg hover:bg-[#00C878] hover:text-[#071B12] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Monstera
              </button>
              <button
                type="button"
                onClick={() => handleAddPlant('tulsi', 'Sacred Krishna Tulsi')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#123D2A] text-[#F7F9F2] rounded-lg hover:bg-[#00C878] hover:text-[#071B12] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Tulsi
              </button>
              <button
                type="button"
                onClick={() => handleAddPlant('ficus', 'Fiddle Leaf Fig')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#123D2A] text-[#F7F9F2] rounded-lg hover:bg-[#00C878] hover:text-[#071B12] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Ficus
              </button>
              <button
                type="button"
                onClick={() => handleAddPlant('palm', 'Areca Palm')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#123D2A] text-[#F7F9F2] rounded-lg hover:bg-[#00C878] hover:text-[#071B12] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Areca Palm
              </button>
            </div>

            {/* Arrange & Pot Style Controls */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[#F7F9F2]/70 flex items-center gap-1">
                <Move className="w-3.5 h-3.5 text-[#00C878]" /> Move Selected:
              </span>
              <button
                type="button"
                onClick={() => handleNudgeSelected(-0.45, 0)}
                aria-label="Move selected plant West"
                className="px-2.5 py-1.5 text-xs font-mono bg-[#123D2A]/80 text-[#F7F9F2] rounded-lg hover:bg-[#123D2A] whitespace-nowrap shrink-0"
              >
                ← X
              </button>
              <button
                type="button"
                onClick={() => handleNudgeSelected(0.45, 0)}
                aria-label="Move selected plant East"
                className="px-2.5 py-1.5 text-xs font-mono bg-[#123D2A]/80 text-[#F7F9F2] rounded-lg hover:bg-[#123D2A] whitespace-nowrap shrink-0"
              >
                X →
              </button>
              <button
                type="button"
                onClick={() => handleNudgeSelected(0, -0.45)}
                aria-label="Move selected plant North"
                className="px-2.5 py-1.5 text-xs font-mono bg-[#123D2A]/80 text-[#F7F9F2] rounded-lg hover:bg-[#123D2A] whitespace-nowrap shrink-0"
              >
                ↑ Z
              </button>
              <button
                type="button"
                onClick={() => handleNudgeSelected(0, 0.45)}
                aria-label="Move selected plant South"
                className="px-2.5 py-1.5 text-xs font-mono bg-[#123D2A]/80 text-[#F7F9F2] rounded-lg hover:bg-[#123D2A] whitespace-nowrap shrink-0"
              >
                Z ↓
              </button>
              <button
                type="button"
                onClick={handleCyclePotStyle}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#D4B56A]/20 text-[#D4B56A] border border-[#D4B56A]/40 rounded-lg hover:bg-[#D4B56A]/30 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" /> Cycle Pot Material
              </button>
            </div>

            {/* Atmosphere & Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setLightingPreset((prev) =>
                    prev === 'golden' ? 'daylight' : prev === 'daylight' ? 'bioluminescent' : 'golden'
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#123D2A] text-[#B7F76B] rounded-lg hover:bg-[#123D2A]/80 whitespace-nowrap shrink-0"
              >
                <Sun className="w-3.5 h-3.5" /> Light: {lightingPreset}
              </button>
              <button
                type="button"
                onClick={() => setPlants(DEFAULT_GARDEN_PLANTS)}
                aria-label="Reset 3D garden layout"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#123D2A]/60 text-[#F7F9F2]/80 rounded-lg hover:text-white whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
