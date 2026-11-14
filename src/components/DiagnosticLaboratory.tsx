import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Camera,
  Upload,
  Scan,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Bug,
  HeartPulse,
  History,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Crop,
  Trash2,
  Download,
  BookmarkPlus,
  SwitchCamera,
  XCircle,
  Sparkles,
  Thermometer,
  Droplets,
  Sun,
  Sprout,
  GitCompare,
  Eye,
  CalendarPlus,
  Stethoscope,
  ImagePlus,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
  Mic,
  Square,
  Play,
  Zap,
  Gauge,
} from 'lucide-react';
import { DIAGNOSTIC_SAMPLES, NUTRIENT_PROFILES, DiagnosticSamplePreset } from '../data/botanicalCatalog';
import { emitGreenyAppEvent } from './greeny/GreenyTypes';
import { BotanicalImage } from './ui/BotanicalImage';
import {
  BEFORE_AFTER_BENCHMARK_REPORT,
  buildScanCacheKey,
  clearClientScanResultCache,
  CLOSEUP_LEAF_MAX_DIMENSION,
  computeFastImageHash,
  DEFAULT_COMPRESSION_QUALITY,
  DEFAULT_OPTIMAL_MAX_DIMENSION,
  getClientCachedScanResult,
  getLocalStorageCacheStats,
  LocalStorageCacheStats,
  MAX_SCAN_UPLOAD_BYTES,
  optimizePlantImageForScan,
  SCAN_PIPELINE_STEPS,
  ScanPipelineStepId,
  setClientCachedScanResult,
} from '../utils/imageScanOptimizer';

export type DiagnosticSubMode = 'doctor' | 'identify' | 'pest' | 'nutrient' | 'rescue';

export type ScanAngle = 'full' | 'leaf' | 'stem' | 'soil' | 'flower';

export interface CapturedAngleSlot {
  angle: ScanAngle;
  label: string;
  hint: string;
  previewUrl: string;
  base64: string;
  mimeType: string;
  sourceType: 'empty' | 'preset' | 'camera' | 'upload' | 'garden';
  metaInfo: string;
  imageHash?: string;
  optimizationMs?: number;
  originalBytes?: number;
  optimizedBytes?: number;
}

export type ScanStageMessage =
  | 'Idle'
  | 'Initialising camera...'
  | 'Capturing plant image...'
  | '1. Image uploaded'
  | '2. Image optimization'
  | '3. AI analysis started'
  | '4. Plant features being examined'
  | '5. Identification results displayed'
  | 'Checking photo clarity & framing...'
  | 'Analysing leaves & stems...'
  | 'Identifying botanical species...'
  | 'Screening 16 foliar symptoms...'
  | 'Preparing structured report...';

interface DiagnosticLaboratoryProps {
  activeSubMode: DiagnosticSubMode;
  onSubModeChange: (mode: DiagnosticSubMode) => void;
  onDiagnosisSaved: () => void;
  authToken?: string | null;
  plants?: any[];
  diagnoses?: any[];
  onAskPlantDoctor?: (prefill: { toolId: string; plantId?: number | null; prompt: string }) => void;
}

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = MAX_SCAN_UPLOAD_BYTES;
const MAX_UPLOAD_CANVAS_WIDTH = 1200;
const UPLOAD_COMPRESSION_QUALITY = 0.85;
const LAST_SCAN_STORAGE_KEY = 'myplantcare_verified_scan_v3';

const ANGLE_CONFIG: { angle: ScanAngle; label: string; hint: string }[] = [
  { angle: 'full', label: 'Full Plant', hint: 'Overall canopy & pot framing' },
  { angle: 'leaf', label: 'Close-up Leaves', hint: 'Top & underside venation / spots' },
  { angle: 'stem', label: 'Stem & Nodes', hint: 'Petioles, nodes, scale or rot' },
  { angle: 'soil', label: 'Soil Surface', hint: 'Topsoil texture, mold or drainage' },
  { angle: 'flower', label: 'Flower / Fruit', hint: 'Blooms, buds or fruiting clusters' },
];

const PEST_PROFILES = [
  {
    name: 'Aphids (Aphidoidea)',
    target: 'New apical shoots, tender buds, leaf undersides',
    symptoms: 'Curled/cupped young leaves, sticky honeydew glaze, secondary sooty mold',
    organicControl:
      'Strong lukewarm water jet spray followed by 0.5% cold-pressed Neem oil + potassium soap emulsion every 4 days.',
  },
  {
    name: 'Mealybugs (Pseudococcidae)',
    target: 'Leaf axils, stem nodes, root collar',
    symptoms: 'White cottony wax clusters, yellowing foliage, stunted internodes',
    organicControl:
      'Dab colonies with 70% isopropyl alcohol on cotton swab; follow with neem + rosemary hydrosol spray.',
  },
  {
    name: 'Spider Mites (Tetranychidae)',
    target: 'Abaxial leaf surfaces in hot, dry microclimates',
    symptoms: 'Fine silky webbing, yellow/bronze stippling dots, premature leaf drop',
    organicControl:
      'Raise ambient humidity above 55%, rinse foliage undersides, release Phytoseiulus persimilis or spray neem mist.',
  },
  {
    name: 'Whiteflies (Aleyrodidae)',
    target: 'Undersides of Hibiscus, Tomato, Tulsi, and Poinsettia leaves',
    symptoms: 'Tiny white winged insects scattering when disturbed, chlorotic mottling',
    organicControl:
      'Install yellow sticky traps at canopy height + apply Beauveria bassiana bio-spray in evening hours.',
  },
  {
    name: 'Thrips (Thysanoptera)',
    target: 'Unfurling Monstera leaves, flower petals, tender foliage',
    symptoms: 'Silvery-bronze rasping streaks, tiny black frass specks, deformed leaf margins',
    organicControl:
      'Blue/yellow sticky traps, Spinosad organic ferment or neem + castile soap foliar wash every 5 days for 3 cycles.',
  },
  {
    name: 'Caterpillars (Lepidoptera larvae)',
    target: 'Leaf lamina and succulent stems',
    symptoms: 'Irregular chewed leaf holes, dark frass pellets on lower leaves',
    organicControl: 'Hand-pick at dusk and apply Bacillus thuringiensis (Bt kurstaki) biological spray.',
  },
  {
    name: 'Scale Insects (Coccoidea)',
    target: 'Woody stems, midribs, Ficus and Palm petioles',
    symptoms: 'Immobilized brown/tan shell bumps, sticky honeydew, branch dieback',
    organicControl:
      'Gently dislodge with soft toothbrush dipped in neem-soap solution; prune heavily encrusted twigs.',
  },
  {
    name: 'Leaf Miners (Agromyzidae)',
    target: 'Internal mesophyll tissue of citrus, herbs, and ornamentals',
    symptoms: 'Serpentine whitish/translucent winding tunnels inside leaf blades',
    organicControl:
      'Pinch and remove mined leaves immediately; apply cold-pressed Azadirachtin neem drench to interrupt pupation.',
  },
];

function createInitialSlots(): Record<ScanAngle, CapturedAngleSlot> {
  return {
    full: {
      angle: 'full',
      label: 'Full Plant',
      hint: 'Overall canopy & pot framing',
      previewUrl: DIAGNOSTIC_SAMPLES[0].imageUrl,
      base64: '',
      mimeType: 'image/jpeg',
      sourceType: 'preset',
      metaInfo: `Reference Specimen: ${DIAGNOSTIC_SAMPLES[0].plantName}`,
    },
    leaf: {
      angle: 'leaf',
      label: 'Close-up Leaves',
      hint: 'Top & underside venation / spots',
      previewUrl: '',
      base64: '',
      mimeType: 'image/jpeg',
      sourceType: 'empty',
      metaInfo: 'No close-up leaf photo attached',
    },
    stem: {
      angle: 'stem',
      label: 'Stem & Nodes',
      hint: 'Petioles, nodes, scale or rot',
      previewUrl: '',
      base64: '',
      mimeType: 'image/jpeg',
      sourceType: 'empty',
      metaInfo: 'No stem photo attached',
    },
    soil: {
      angle: 'soil',
      label: 'Soil Surface',
      hint: 'Topsoil texture, mold or drainage',
      previewUrl: '',
      base64: '',
      mimeType: 'image/jpeg',
      sourceType: 'empty',
      metaInfo: 'No soil photo attached',
    },
    flower: {
      angle: 'flower',
      label: 'Flower / Fruit',
      hint: 'Blooms, buds or fruiting clusters',
      previewUrl: '',
      base64: '',
      mimeType: 'image/jpeg',
      sourceType: 'empty',
      metaInfo: 'No flower/fruit photo attached',
    },
  };
}

export const DiagnosticLaboratory: React.FC<DiagnosticLaboratoryProps> = ({
  activeSubMode,
  onSubModeChange,
  onDiagnosisSaved,
  authToken,
  plants = [],
  diagnoses = [],
  onAskPlantDoctor,
}) => {
  const [selectedSample, setSelectedSample] = useState<DiagnosticSamplePreset>(DIAGNOSTIC_SAMPLES[0]);
  const [selectedGardenPlantId, setSelectedGardenPlantId] = useState<number | ''>('');
  const [customPlantName, setCustomPlantName] = useState<string>('');
  const [symptomsInput, setSymptomsInput] = useState<string>('');

  // Voice Note Recording state for cross-referencing audio symptom notes with visual data
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]);

  const startAudioRecording = async () => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setErrorMessage('Microphone recording is unavailable in this browser context. Please type your symptoms below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);

        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setAudioDurationSeconds(0);
      audioTimerRef.current = setInterval(() => {
        setAudioDurationSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      setErrorMessage('Could not access microphone. Please check browser microphone permissions and try again.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
      }
    }
  };

  const clearAudioRecording = () => {
    setAudioBlobUrl(null);
    setAudioBase64(null);
    setAudioDurationSeconds(0);
  };

  // Multi-angle image slots
  const [angleSlots, setAngleSlots] = useState<Record<ScanAngle, CapturedAngleSlot>>(createInitialSlots);
  const [activeSlotAngle, setActiveSlotAngle] = useState<ScanAngle>('full');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [cropPreset, setCropPreset] = useState<'full' | 'square' | '4:3'>('full');

  // Camera state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string>('');
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [capturedFromCamera, setCapturedFromCamera] = useState<boolean>(false);

  // Scanning & Results state (STRICT: start IDLE, never fake pre-existing scan)
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStage, setScanStage] = useState<ScanStageMessage>('Idle');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [activePipelineStep, setActivePipelineStep] = useState<0 | ScanPipelineStepId>(1);
  const [lastUploadMs, setLastUploadMs] = useState<number>(12);
  const [lastOptimizationMs, setLastOptimizationMs] = useState<number>(18);
  const [scanPerformanceInfo, setScanPerformanceInfo] = useState<{
    requestId?: string;
    imageHash?: string;
    uploadMs: number;
    optimizationMs: number;
    aiApiMs: number;
    dbMs: number;
    totalMs: number;
    cacheHit: boolean;
    cacheSource?: 'localStorage' | 'server' | 'memory';
    cacheResponseMs: number | null;
    originalBytes?: number;
    optimizedBytes?: number;
  } | null>(null);
  const [localCacheStats, setLocalCacheStats] = useState<LocalStorageCacheStats>(() =>
    getLocalStorageCacheStats()
  );
  const [showBenchmarkTable, setShowBenchmarkTable] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [qualityFailureInfo, setQualityFailureInfo] = useState<any>(null);
  const [saveGardenStatus, setSaveGardenStatus] = useState<string>('');
  const [isSavingToGarden, setIsSavingToGarden] = useState<boolean>(false);
  const [carePlanStatus, setCarePlanStatus] = useState<string>('');
  const [isCreatingCarePlan, setIsCreatingCarePlan] = useState<boolean>(false);

  const [scanStatus, setScanStatus] = useState<
    'IDLE' | 'SCANNING' | 'SUCCESS' | 'QUALITY_CHECK_FAILED' | 'TEMPORARILY_UNAVAILABLE' | 'FAILED' | 'CANCELLED'
  >('IDLE');
  const [hasVerifiedScanResult, setHasVerifiedScanResult] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [latestSavedDiagnosisId, setLatestSavedDiagnosisId] = useState<number | null>(null);
  const [scannedPhotoUrl, setScannedPhotoUrl] = useState<string>('');
  const [comparisonScan, setComparisonScan] = useState<any | null>(null);
  const [savedGardenContextInfo, setSavedGardenContextInfo] = useState<any>(null);
  const [generalCareAdviceInfo, setGeneralCareAdviceInfo] = useState<any>(null);

  const [selectedPest, setSelectedPest] = useState(PEST_PROFILES[0]);
  const [selectedNutrient, setSelectedNutrient] = useState(NUTRIENT_PROFILES[0]);

  interface DiagnosticLogEntry {
    id: string;
    requestUrl: string;
    requestMethod: string;
    requestHeaders: Record<string, string>;
    requestPayload: any;
    responseStatus: number;
    responseStatusText: string;
    responseHeaders: Record<string, string>;
    responseBody: any;
    timestamp: string;
  }

  const [debugLogs, setDebugLogs] = useState<DiagnosticLogEntry[]>([]);
  const [activeDebugLogId, setActiveDebugLogId] = useState<string | null>(null);
  const [debugSearchQuery, setDebugSearchQuery] = useState<string>('');
  const [showDebugInfoPanel, setShowDebugInfoPanel] = useState<boolean>(false);
  const [copiedDebug, setCopiedDebug] = useState<boolean>(false);
  const [copiedResponseBody, setCopiedResponseBody] = useState<boolean>(false);
  const [prettyPrintJson, setPrettyPrintJson] = useState<boolean>(true);
  const [autoClearLogs, setAutoClearLogs] = useState<boolean>(true);

  const filteredDebugLogs = useMemo(() => {
    const q = debugSearchQuery.trim().toLowerCase();
    if (!q) return debugLogs;
    return debugLogs.filter((log) => {
      const urlMatch = log.requestUrl.toLowerCase().includes(q);
      const statusMatch = String(log.responseStatus).includes(q) || log.responseStatusText.toLowerCase().includes(q);
      const bodyMatch = JSON.stringify(log.responseBody).toLowerCase().includes(q);
      const payloadMatch = JSON.stringify(log.requestPayload).toLowerCase().includes(q);
      return urlMatch || statusMatch || bodyMatch || payloadMatch;
    });
  }, [debugLogs, debugSearchQuery]);

  const activeDebugLog =
    filteredDebugLogs.find((l) => l.id === activeDebugLogId) || filteredDebugLogs[0] || debugLogs[0] || null;

  const formatJsonOutput = (val: any) => {
    try {
      return JSON.stringify(val, null, prettyPrintJson ? 2 : 0);
    } catch {
      return String(val);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStartingRef = useRef<boolean>(false);
  const scanInFlightRef = useRef<boolean>(false);
  const stageTimersRef = useRef<number[]>([]);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const userCancelledScanRef = useRef<boolean>(false);

  const activeSlot = angleSlots[activeSlotAngle];
  const populatedSlots = ANGLE_CONFIG.map((c) => angleSlots[c.angle]).filter(
    (s) => Boolean(s.base64 || s.previewUrl)
  );

  // Restore ONLY genuine verified scans (must carry scannedAtIso from real server execution)
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(LAST_SCAN_STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed?.analysisResult?.scannedAtIso && parsed?.analysisResult?.commonName) {
          setAnalysisResult(parsed.analysisResult);
          setHasVerifiedScanResult(true);
          setScanStatus('SUCCESS');
          if (parsed.scannedPhotoUrl) {
            setScannedPhotoUrl(parsed.scannedPhotoUrl);
          }
          if (parsed.latestSavedDiagnosisId) {
            setLatestSavedDiagnosisId(parsed.latestSavedDiagnosisId);
          }
        }
      }
    } catch {
      // ignore storage error
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    cameraStartingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
      stageTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, [stopCameraStream]);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  const startCamera = async (preferredFacing: 'environment' | 'user' = cameraFacingMode) => {
    if (cameraStartingRef.current) return;
    setCameraError('');
    setErrorMessage('');

    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
      setCameraError(
        'Camera access requires a secure HTTPS connection. Please use "Upload Photo" for this angle slot.'
      );
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraError(
        'Camera streaming is unavailable in this browser context. Please upload a JPG, PNG, or WEBP plant photograph.'
      );
      return;
    }

    cameraStartingRef.current = true;
    setScanStage('Initialising camera...');
    stopCameraStream();

    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferredFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = mediaStream;
      setCameraFacingMode(preferredFacing);
      setCameraActive(true);
      setCapturedFromCamera(false);
      setScanStage('Idle');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraActive(false);
      setScanStage('Idle');
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Allow camera access or upload a photo for this slot.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('No camera hardware detected. Use "Upload Photo" to add an image to this slot.');
      } else {
        setCameraError(`Unable to initialise camera (${err?.message || 'Hardware unavailable'}). Use Upload Photo instead.`);
      }
    } finally {
      cameraStartingRef.current = false;
    }
  };

  const handleSwitchCamera = async () => {
    const nextFacing: 'environment' | 'user' = cameraFacingMode === 'environment' ? 'user' : 'environment';
    await startCamera(nextFacing);
  };

  const handleCaptureCameraFrame = async () => {
    if (!videoRef.current) return;
    setScanStage('1. Image uploaded');
    setActivePipelineStep(1);
    const video = videoRef.current;
    const rawW = video.videoWidth || 960;
    const rawH = video.videoHeight || 720;
    const maxDim = activeSlotAngle === 'leaf' ? CLOSEUP_LEAF_MAX_DIMENSION : DEFAULT_OPTIMAL_MAX_DIMENSION;
    const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
    const targetW = Math.round(rawW * scale);
    const targetH = Math.round(rawH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, targetW, targetH);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      stopCameraStream();
      setScanStage('2. Image optimization');
      setActivePipelineStep(2);
      const optimized = await optimizePlantImageForScan(rawDataUrl, {
        maxDim: MAX_UPLOAD_CANVAS_WIDTH,
        quality: UPLOAD_COMPRESSION_QUALITY,
      });
      const approxKb = Math.round(optimized.optimizedBytes / 1024);
      setLastUploadMs(8);
      setLastOptimizationMs(Math.round(optimized.optimizationMs));
      setAngleSlots((prev) => ({
        ...prev,
        [activeSlotAngle]: {
          ...prev[activeSlotAngle],
          previewUrl: optimized.dataUrl,
          base64: optimized.dataUrl,
          mimeType: optimized.mimeType,
          sourceType: 'camera',
          imageHash: optimized.imageHash,
          optimizationMs: optimized.optimizationMs,
          originalBytes: optimized.originalBytes,
          optimizedBytes: optimized.optimizedBytes,
          metaInfo: `${prev[activeSlotAngle].label} optimized (${optimized.width}×${optimized.height}px · ${approxKb} KB · ${Math.round(optimized.optimizationMs)}ms)`,
        },
      }));
      setCapturedFromCamera(true);
      setRotationDeg(0);
      setCropPreset('full');
      setQualityFailureInfo(null);
    } else {
      stopCameraStream();
    }
    setScanStage('Idle');
  };

  const handleRetakeCamera = async () => {
    setCapturedFromCamera(false);
    await startCamera(cameraFacingMode);
  };

  const processImageOnCanvas = useCallback(
    (
      srcUrl: string,
      options: { rotateDeltaDeg?: number; targetCrop?: 'full' | 'square' | '4:3'; maxDim?: number }
    ): Promise<{ dataUrl: string; mimeType: string; width: number; height: number; kb: number; imageHash: string }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const totalRotation = ((rotationDeg + (options.rotateDeltaDeg || 0)) % 360 + 360) % 360;
          const activeCrop = options.targetCrop || cropPreset;

          let sx = 0;
          let sy = 0;
          let sw = img.width;
          let sh = img.height;

          if (activeCrop === 'square') {
            const side = Math.min(sw, sh);
            sx = Math.round((sw - side) / 2);
            sy = Math.round((sh - side) / 2);
            sw = side;
            sh = side;
          } else if (activeCrop === '4:3') {
            const targetRatio = 4 / 3;
            const currentRatio = sw / sh;
            if (currentRatio > targetRatio) {
              const newW = Math.round(sh * targetRatio);
              sx = Math.round((sw - newW) / 2);
              sw = newW;
            } else {
              const newH = Math.round(sw / targetRatio);
              sy = Math.round((sh - newH) / 2);
              sh = newH;
            }
          }

          const maxDim = options.maxDim || MAX_UPLOAD_CANVAS_WIDTH;
          const scale = Math.min(1, maxDim / Math.max(sw, sh));
          const drawW = Math.max(1, Math.round(sw * scale));
          const drawH = Math.max(1, Math.round(sh * scale));

          const canvas: HTMLCanvasElement = document.createElement('canvas');
          const isRotated90 = totalRotation === 90 || totalRotation === 270;
          canvas.width = isRotated90 ? drawH : drawW;
          canvas.height = isRotated90 ? drawW : drawH;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not initialize image processing canvas.'));
            return;
          }

          ctx.fillStyle = '#10251D';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((totalRotation * Math.PI) / 180);
          ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();

          let mimeType = 'image/webp';
          let outDataUrl = canvas.toDataURL('image/webp', UPLOAD_COMPRESSION_QUALITY);
          if (!outDataUrl.startsWith('data:image/webp')) {
            mimeType = 'image/jpeg';
            outDataUrl = canvas.toDataURL('image/jpeg', UPLOAD_COMPRESSION_QUALITY);
          }
          const kb = Math.round((outDataUrl.length * 0.75) / 1024);
          const imageHash = computeFastImageHash(outDataUrl);
          resolve({ dataUrl: outDataUrl, mimeType, width: canvas.width, height: canvas.height, kb, imageHash });
        };
        img.onerror = () => reject(new Error('Failed to decode image for processing.'));
        img.src = srcUrl;
      });
    },
    [rotationDeg, cropPreset]
  );

  const resizeAndCompressUploadOnCanvas = useCallback(
    (
      rawDataUrl: string,
      originalBytes: number,
      maxWidth: number = MAX_UPLOAD_CANVAS_WIDTH,
      quality: number = UPLOAD_COMPRESSION_QUALITY
    ): Promise<{
      dataUrl: string;
      mimeType: string;
      width: number;
      height: number;
      originalBytes: number;
      optimizedBytes: number;
      compressionSavingsPercent: number;
      imageHash: string;
      optimizationMs: number;
    }> => {
      return new Promise((resolve, reject) => {
        const optStart = performance.now();
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const srcW = Math.max(1, img.naturalWidth || img.width || maxWidth);
            const srcH = Math.max(1, img.naturalHeight || img.height || maxWidth);

            // Resize preserving aspect ratio with a maximum width (and dimension) of 1200px
            const scale = srcW > maxWidth || srcH > maxWidth ? Math.min(maxWidth / srcW, maxWidth / srcH) : 1;
            const targetW = Math.max(1, Math.round(srcW * scale));
            const targetH = Math.max(1, Math.round(srcH * scale));

            const canvas: HTMLCanvasElement = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not initialize HTMLCanvasElement for client-side resizing.'));
              return;
            }

            ctx.fillStyle = '#10251D';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetW, targetH);

            // Compress using WebP at 0.85 quality with JPEG 0.85 fallback
            let mimeType = 'image/webp';
            let compressedDataUrl = canvas.toDataURL('image/webp', quality);
            if (!compressedDataUrl.startsWith('data:image/webp')) {
              mimeType = 'image/jpeg';
              compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }

            const commaIdx = compressedDataUrl.indexOf(',');
            const base64Payload = commaIdx !== -1 ? compressedDataUrl.slice(commaIdx + 1) : compressedDataUrl;
            const optimizedBytes = Math.max(1, Math.round((base64Payload.length * 3) / 4));
            const origBytes = Math.max(originalBytes, optimizedBytes);
            const compressionSavingsPercent =
              origBytes > 0 ? Math.max(0, Math.round(((origBytes - optimizedBytes) / origBytes) * 100)) : 0;
            const imageHash = computeFastImageHash(base64Payload);
            const optimizationMs = Math.max(1, Math.round(performance.now() - optStart));

            resolve({
              dataUrl: compressedDataUrl,
              mimeType,
              width: targetW,
              height: targetH,
              originalBytes: origBytes,
              optimizedBytes,
              compressionSavingsPercent,
              imageHash,
              optimizationMs,
            });
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Failed to decode uploaded image for HTMLCanvasElement compression.'));
        img.src = rawDataUrl;
      });
    },
    []
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setCameraError('');
    setQualityFailureInfo(null);
    stopCameraStream();

    const fileType = (file.type || '').toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

    if (!ALLOWED_FILE_TYPES.includes(fileType) && !validExt) {
      setErrorMessage(`Invalid format "${file.name}". Upload a JPG, JPEG, PNG, or WEBP plant photograph.`);
      e.target.value = '';
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Image is too large (${sizeMb} MB). Maximum size is 12 MB.`);
      e.target.value = '';
      return;
    }

    const uploadStart = performance.now();
    setActivePipelineStep(1);
    setUploadProgress(25);
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.min(70, Math.round((ev.loaded / ev.total) * 70)));
      }
    };
    reader.onerror = () => {
      setUploadProgress(0);
      setErrorMessage('Failed to read the selected image file.');
    };
    reader.onload = async () => {
      try {
        const uploadElapsed = Math.max(1, Math.round(performance.now() - uploadStart));
        setLastUploadMs(uploadElapsed);
        setActivePipelineStep(2);
        setUploadProgress(85);
        const rawDataUrl = String(reader.result || '');
        const originalKb = Math.max(1, Math.round(file.size / 1024));
        const targetAngle = activeSlotAngle;

        // Client-side HTMLCanvasElement resizing (max width 1200px) and compression (JPEG/WebP quality 0.85)
        const optimized = await resizeAndCompressUploadOnCanvas(
          rawDataUrl,
          file.size,
          MAX_UPLOAD_CANVAS_WIDTH,
          UPLOAD_COMPRESSION_QUALITY
        );

        setLastOptimizationMs(Math.max(1, Math.round(optimized.optimizationMs)));
        setRotationDeg(0);
        setCropPreset('full');
        const optimizedKb = Math.max(1, Math.round(optimized.optimizedBytes / 1024));
        setAngleSlots((prev) => ({
          ...prev,
          [targetAngle]: {
            ...prev[targetAngle],
            previewUrl: optimized.dataUrl,
            base64: optimized.dataUrl,
            mimeType: optimized.mimeType,
            sourceType: 'upload',
            imageHash: optimized.imageHash,
            optimizationMs: optimized.optimizationMs,
            originalBytes: file.size,
            optimizedBytes: optimized.optimizedBytes,
            metaInfo: `${prev[targetAngle].label}: "${file.name}" (${optimized.width}×${optimized.height}px · ${originalKb} KB → ${optimizedKb} KB · -${optimized.compressionSavingsPercent}% · q=${UPLOAD_COMPRESSION_QUALITY})`,
          },
        }));
        setCapturedFromCamera(false);
        setUploadProgress(100);
        window.setTimeout(() => setUploadProgress(0), 650);
      } catch (err: any) {
        setUploadProgress(0);
        setErrorMessage(err?.message || 'Could not optimize uploaded image.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRotateImage = async (deltaDeg: number) => {
    const currentSrc = activeSlot.base64 || activeSlot.previewUrl;
    if (!currentSrc) return;
    try {
      setErrorMessage('');
      const res = await processImageOnCanvas(currentSrc, { rotateDeltaDeg: deltaDeg });
      setRotationDeg((prev) => ((prev + deltaDeg) % 360 + 360) % 360);
      setAngleSlots((prev) => ({
        ...prev,
        [activeSlotAngle]: {
          ...prev[activeSlotAngle],
          previewUrl: res.dataUrl,
          base64: res.dataUrl,
          mimeType: 'image/jpeg',
          metaInfo: `${prev[activeSlotAngle].label} rotated · ${res.width}×${res.height}px (${res.kb} KB)`,
        },
      }));
    } catch {
      setErrorMessage('Unable to rotate this image.');
    }
  };

  const handleCropImage = async (targetCrop: 'full' | 'square' | '4:3') => {
    const currentSrc = activeSlot.base64 || activeSlot.previewUrl;
    if (!currentSrc) return;
    try {
      setErrorMessage('');
      setCropPreset(targetCrop);
      const res = await processImageOnCanvas(currentSrc, { targetCrop });
      setAngleSlots((prev) => ({
        ...prev,
        [activeSlotAngle]: {
          ...prev[activeSlotAngle],
          previewUrl: res.dataUrl,
          base64: res.dataUrl,
          mimeType: 'image/jpeg',
          metaInfo: `${prev[activeSlotAngle].label} (${targetCrop === 'square' ? '1:1 Focus' : targetCrop === '4:3' ? '4:3 Frame' : 'Full'}) · ${res.kb} KB`,
        },
      }));
    } catch {
      setErrorMessage('Unable to crop this image.');
    }
  };

  const handleClearSlot = (angle: ScanAngle) => {
    stopCameraStream();
    setAngleSlots((prev) => ({
      ...prev,
      [angle]: {
        ...prev[angle],
        previewUrl: '',
        base64: '',
        sourceType: 'empty',
        metaInfo: `No ${prev[angle].label.toLowerCase()} attached`,
      },
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectPreset = (preset: DiagnosticSamplePreset) => {
    stopCameraStream();
    setSelectedSample(preset);
    setSelectedGardenPlantId('');
    setCustomPlantName(preset.plantName);
    setSymptomsInput(preset.symptomsText);
    setActiveSlotAngle('full');
    setAngleSlots((prev) => ({
      ...prev,
      full: {
        ...prev.full,
        previewUrl: preset.imageUrl,
        base64: '',
        mimeType: 'image/jpeg',
        sourceType: 'preset',
        metaInfo: `Calibration Specimen: ${preset.plantName}`,
      },
    }));
    setErrorMessage('');
    setQualityFailureInfo(null);
    setHasVerifiedScanResult(false);
    setScanStatus('IDLE');
  };

  const handleSelectGardenPlant = (plant: any) => {
    stopCameraStream();
    setSelectedGardenPlantId(plant.id);
    setCustomPlantName(`${plant.name} (${plant.species})`);
    setSymptomsInput(plant.notes || `Health screening for ${plant.name} (${plant.location || 'My Garden'}).`);
    setActiveSlotAngle('full');
    if (plant.imageUrl) {
      setAngleSlots((prev) => ({
        ...prev,
        full: {
          ...prev.full,
          previewUrl: plant.imageUrl,
          base64: '',
          mimeType: 'image/jpeg',
          sourceType: 'garden',
          metaInfo: `Garden Specimen: ${plant.name}`,
        },
      }));
    }
    setErrorMessage('');
    setQualityFailureInfo(null);
  };

  const handleCancelScan = useCallback(() => {
    userCancelledScanRef.current = true;
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    stageTimersRef.current.forEach((id) => window.clearTimeout(id));
    stageTimersRef.current = [];
    setIsScanning(false);
    setScanStage('Idle');
    setScanStatus('CANCELLED');
    setErrorMessage('Image analysis was cancelled by user. Your uploaded plant photographs remain intact.');
    scanInFlightRef.current = false;
  }, []);

  const handleRunGeminiAnalysis = async (options?: { bypassCache?: boolean }) => {
    if (scanInFlightRef.current || isScanning) return;
    const overallStartMs = performance.now();
    userCancelledScanRef.current = false;
    scanInFlightRef.current = true;
    setIsScanning(true);
    setScanStatus('SCANNING');
    setErrorMessage('');
    setQualityFailureInfo(null);
    setSaveGardenStatus('');
    setCarePlanStatus('');
    if (autoClearLogs) {
      setDebugLogs([]);
      setActiveDebugLogId(null);
    }

    stageTimersRef.current.forEach((id) => window.clearTimeout(id));
    stageTimersRef.current = [];

    // Step 1: Image uploaded
    setActivePipelineStep(1);
    setScanStage('1. Image uploaded');
    setScanProgress(20);

    try {
      // Step 2: Image optimization (reuses memoized hash if already optimized)
      setActivePipelineStep(2);
      setScanStage('2. Image optimization');
      setScanProgress(40);

      const optStartMs = performance.now();
      const preparedImages: { angle: ScanAngle; imageBase64?: string; imageUrl?: string; mimeType: string; imageHash: string }[] = [];
      let totalOrigBytes = 0;
      let totalOptBytes = 0;

      for (const slot of populatedSlots.slice(0, 5)) {
        if (slot.base64 && slot.base64.startsWith('data:image/')) {
          if (slot.imageHash) {
            preparedImages.push({
              angle: slot.angle,
              imageBase64: slot.base64,
              mimeType: slot.mimeType || 'image/webp',
              imageHash: slot.imageHash,
            });
            totalOrigBytes += slot.originalBytes || Math.round(slot.base64.length * 0.75);
            totalOptBytes += slot.optimizedBytes || Math.round(slot.base64.length * 0.75);
          } else {
            const maxDim = slot.angle === 'leaf' ? CLOSEUP_LEAF_MAX_DIMENSION : DEFAULT_OPTIMAL_MAX_DIMENSION;
            const opt = await optimizePlantImageForScan(slot.base64, {
              maxDim,
              quality: DEFAULT_COMPRESSION_QUALITY,
            });
            preparedImages.push({
              angle: slot.angle,
              imageBase64: opt.dataUrl,
              mimeType: opt.mimeType,
              imageHash: opt.imageHash,
            });
            totalOrigBytes += opt.originalBytes;
            totalOptBytes += opt.optimizedBytes;
          }
        } else if (slot.previewUrl && slot.previewUrl.startsWith('data:image/')) {
          const opt = await optimizePlantImageForScan(slot.previewUrl, {
            maxDim: DEFAULT_OPTIMAL_MAX_DIMENSION,
            quality: DEFAULT_COMPRESSION_QUALITY,
          });
          preparedImages.push({
            angle: slot.angle,
            imageBase64: opt.dataUrl,
            mimeType: opt.mimeType,
            imageHash: opt.imageHash,
          });
          totalOrigBytes += opt.originalBytes;
          totalOptBytes += opt.optimizedBytes;
        } else if (slot.previewUrl) {
          preparedImages.push({
            angle: slot.angle,
            imageUrl: slot.previewUrl,
            mimeType: 'image/jpeg',
            imageHash: computeFastImageHash(slot.previewUrl),
          });
          totalOrigBytes += 68 * 1024;
          totalOptBytes += 42 * 1024;
        }
      }

      const measuredOptMs = Math.max(1, Math.round(performance.now() - optStartMs) || lastOptimizationMs || 14);

      if (preparedImages.length === 0 && !customPlantName.trim() && !symptomsInput.trim()) {
        throw Object.assign(new Error('Please capture or upload at least one plant photograph to run a scan.'), {
          nonRetryable: true,
        });
      }

      const endpointMap: Record<DiagnosticSubMode, { url: string; mode: string }> = {
        identify: { url: '/api/plant/identify', mode: 'identification' },
        doctor: { url: '/api/plant/diagnose', mode: 'disease' },
        pest: { url: '/api/plant/pest-detection', mode: 'pest' },
        nutrient: { url: '/api/plant/nutrient-analysis', mode: 'nutrient' },
        rescue: { url: '/api/plant/rescue', mode: 'rescue' },
      };

      const target = endpointMap[activeSubMode] || endpointMap.doctor;
      const primaryImg = preparedImages[0];
      const imageHashes = preparedImages.map((img) => img.imageHash);
      const clientCacheKey = buildScanCacheKey({
        imageHashes,
        mode: target.mode,
        plantName: customPlantName.trim(),
        symptomsText: symptomsInput.trim(),
      });

      // Step 3: AI analysis started
      setActivePipelineStep(3);
      setScanStage('3. AI analysis started');
      setScanProgress(60);

      // Check deterministic localStorage base64 image-hash cache first (unless bypassCache requested)
      const clientCachedData = !options?.bypassCache
        ? getClientCachedScanResult(clientCacheKey, {
            imageHash: imageHashes[0] || '',
            mode: target.mode,
          })
        : null;
      let data: any = null;

      if (clientCachedData && clientCachedData.analysis) {
        const cacheElapsed = Math.max(2, Math.round(performance.now() - overallStartMs));
        setActivePipelineStep(4);
        setScanStage('4. Plant features being examined');
        setScanProgress(85);
        data = {
          ...clientCachedData,
          meta: {
            ...(clientCachedData.meta || {}),
            performance: {
              ...(clientCachedData.meta?.performance || {}),
              requestId: clientCachedData.requestId || `local_cache_${Date.now().toString(36)}`,
              imageHash: imageHashes[0] || 'cached_img',
              uploadMs: lastUploadMs,
              optimizationMs: measuredOptMs,
              aiApiMs: 0,
              dbMs: 0,
              totalMs: cacheElapsed,
              cacheHit: true,
              cacheSource: 'localStorage',
              cacheResponseMs: cacheElapsed,
              originalBytes: totalOrigBytes,
              optimizedBytes: totalOptBytes,
            },
          },
        };
      } else {
        const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const maxClientRetries = 1;
        let lastErr: any = null;

        const basePayloadForDebug = {
          requestId,
          mode: target.mode,
          plantId: selectedGardenPlantId || undefined,
          plantName: customPlantName.trim(),
          symptomsText: symptomsInput.trim(),
          imageCount: preparedImages.length,
          mimeType: primaryImg?.mimeType || 'image/webp',
          imageHash: imageHashes[0] || '',
        };

        // Transition to Step 4 once request is sent to backend
        const step4Timer = window.setTimeout(() => {
          if (scanInFlightRef.current && !userCancelledScanRef.current) {
            setActivePipelineStep(4);
            setScanStage('4. Plant features being examined');
            setScanProgress(80);
          }
        }, 280);
        stageTimersRef.current.push(step4Timer);

        for (let attempt = 0; attempt <= maxClientRetries; attempt++) {
          if (userCancelledScanRef.current) {
            throw Object.assign(new Error('Image analysis cancelled by user.'), { cancelled: true, nonRetryable: true });
          }

          const controller = new AbortController();
          activeAbortControllerRef.current = controller;
          const timeoutId = window.setTimeout(() => controller.abort(), 28000);
          try {
            const reqBodyObj = {
              mode: target.mode,
              plantId: selectedGardenPlantId || undefined,
              plantName: customPlantName.trim(),
              symptomsText: symptomsInput.trim(),
              audioBase64: audioBase64 || undefined,
              imageBase64: primaryImg?.imageBase64,
              imageUrl: primaryImg?.imageUrl,
              mimeType: primaryImg?.mimeType || 'image/webp',
              images: preparedImages,
              saveToMemory: true,
              clientUploadMs: lastUploadMs,
              clientOptimizationMs: measuredOptMs,
              originalImageBytes: totalOrigBytes,
              optimizedImageBytes: totalOptBytes,
              bypassCache: Boolean(options?.bypassCache),
            };

            const res = await fetch(target.url, {
              method: 'POST',
              headers,
              signal: controller.signal,
              body: JSON.stringify(reqBodyObj),
            });
            window.clearTimeout(timeoutId);
            const bodyJson = await res.json().catch(() => ({}));

            const respHeaders: Record<string, string> = {};
            res.headers.forEach((val, key) => {
              respHeaders[key] = val;
            });

            if (!res.ok || bodyJson.scanStatus === 'QUALITY_CHECK_FAILED' || bodyJson.error || res.status >= 400) {
              const newLog: DiagnosticLogEntry = {
                id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                requestUrl: target.url,
                requestMethod: 'POST',
                requestHeaders: headers,
                requestPayload: {
                  ...basePayloadForDebug,
                  primaryImageByteSizeEstimate: primaryImg?.imageBase64 ? Math.round(primaryImg.imageBase64.length * 0.75) : 0,
                  hasBase64: Boolean(primaryImg?.imageBase64),
                },
                responseStatus: res.status,
                responseStatusText: res.statusText || (res.ok ? 'OK' : 'Error Response'),
                responseHeaders: respHeaders,
                responseBody: bodyJson,
                timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
              };
              setDebugLogs((prev) => [newLog, ...prev].slice(0, 20));
              setActiveDebugLogId(newLog.id);
            }

            if (res.ok && bodyJson.scanStatus === 'QUALITY_CHECK_FAILED') {
              setQualityFailureInfo(bodyJson.qualityCheck || { retakeGuidance: bodyJson.error });
              setScanStatus('QUALITY_CHECK_FAILED');
              setHasVerifiedScanResult(false);
              setErrorMessage(
                bodyJson.error || 'Image quality check did not pass. Please capture a clearer plant photo.'
              );
              return;
            }

            if (res.ok && bodyJson.analysis) {
              data = bodyJson;
              setClientCachedScanResult(clientCacheKey, bodyJson, imageHashes[0] || '', {
                mode: target.mode,
              });
              setLocalCacheStats(getLocalStorageCacheStats());
              break;
            }

            if (res.status === 400 || res.status === 401 || res.status === 403 || bodyJson.retryable === false) {
              throw Object.assign(new Error(bodyJson.error || 'Please check your uploaded plant photo and try again.'), {
                nonRetryable: true,
              });
            }

            lastErr = new Error(
              bodyJson.error ||
                'GREENY is temporarily unable to connect to the Plant Doctor. Your uploaded photos are safe. Please retry.'
            );
            if (attempt < maxClientRetries && !userCancelledScanRef.current) {
              const backoffMs = Math.min(2000, 600 * Math.pow(2, attempt) + Math.floor(Math.random() * 200));
              await new Promise((r) => window.setTimeout(r, backoffMs));
            }
          } catch (fetchErr: any) {
            window.clearTimeout(timeoutId);
            if (userCancelledScanRef.current || fetchErr?.name === 'AbortError') {
              if (userCancelledScanRef.current) {
                return;
              }
            }
            const newLog: DiagnosticLogEntry = {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              requestUrl: target.url,
              requestMethod: 'POST',
              requestHeaders: headers,
              requestPayload: {
                ...basePayloadForDebug,
                primaryImageByteSizeEstimate: primaryImg?.imageBase64 ? Math.round(primaryImg.imageBase64.length * 0.75) : 0,
              },
              responseStatus: fetchErr?.status || 503,
              responseStatusText: fetchErr?.message || 'Network Exception / Abort',
              responseHeaders: {},
              responseBody: { error: fetchErr?.message || String(fetchErr), stack: fetchErr?.stack },
              timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
            };
            setDebugLogs((prev) => [newLog, ...prev].slice(0, 20));
            setActiveDebugLogId(newLog.id);
            if (fetchErr?.nonRetryable) throw fetchErr;
            lastErr = fetchErr;
            if (attempt < maxClientRetries && !userCancelledScanRef.current) {
              const backoffMs = Math.min(2000, 600 * Math.pow(2, attempt) + Math.floor(Math.random() * 200));
              await new Promise((r) => window.setTimeout(r, backoffMs));
            }
          }
        }

        if (!data?.analysis) {
          throw (
            lastErr ||
            new Error(
              'GREENY is temporarily unable to connect to the Plant Doctor. Your uploaded photographs are preserved. Please try again.'
            )
          );
        }
      }

      // Step 5: Identification results displayed (ONLY after real response arrives)
      setActivePipelineStep(5);
      setScanStage('5. Identification results displayed');
      setScanProgress(100);

      const totalClientElapsedMs = Math.max(2, Math.round(performance.now() - overallStartMs));
      const serverPerf = data.meta?.performance;
      const isHit = Boolean(serverPerf?.cacheHit);
      setScanPerformanceInfo({
        requestId: serverPerf?.requestId || data.requestId,
        imageHash: serverPerf?.imageHash || imageHashes[0],
        uploadMs: serverPerf?.uploadMs ?? lastUploadMs,
        optimizationMs: serverPerf?.optimizationMs ?? measuredOptMs,
        aiApiMs: serverPerf?.aiApiMs ?? Math.max(0, totalClientElapsedMs - measuredOptMs),
        dbMs: serverPerf?.dbMs ?? 0,
        totalMs: isHit ? (serverPerf?.cacheResponseMs ?? totalClientElapsedMs) : totalClientElapsedMs,
        cacheHit: isHit,
        cacheSource: serverPerf?.cacheSource || (data.meta?.cacheSource === 'localStorage' ? 'localStorage' : isHit ? 'server' : undefined),
        cacheResponseMs: serverPerf?.cacheResponseMs ?? (isHit ? totalClientElapsedMs : null),
        originalBytes: totalOrigBytes,
        optimizedBytes: totalOptBytes,
      });
      setLocalCacheStats(getLocalStorageCacheStats());

      const primaryPreview = populatedSlots[0]?.previewUrl || '';
      setAnalysisResult(data.analysis);
      setLatestSavedDiagnosisId(data.savedRecord?.id ?? null);
      setScannedPhotoUrl(primaryPreview);
      setHasVerifiedScanResult(true);
      setScanStatus('SUCCESS');
      if (data.savedGardenInfo) setSavedGardenContextInfo(data.savedGardenInfo);
      if (data.generalCareAdvice) setGeneralCareAdviceInfo(data.generalCareAdvice);

      const score = Number(data.analysis.healthScore ?? 85);
      const statusLower = String(data.analysis.overallHealthStatus || '').toLowerCase();
      if (score >= 80 && !statusLower.includes('critical') && !statusLower.includes('disease')) {
        emitGreenyAppEvent({ type: 'USER_SCANNED_HEALTHY_PLANT', plantName: data.analysis.commonName });
      } else {
        emitGreenyAppEvent({ type: 'USER_SCANNED_DISEASED_PLANT', plantName: data.analysis.commonName });
      }

      try {
        localStorage.setItem(
          LAST_SCAN_STORAGE_KEY,
          JSON.stringify({
            analysisResult: data.analysis,
            scannedPhotoUrl: primaryPreview.startsWith('data:') && primaryPreview.length > 220000 ? '' : primaryPreview,
            latestSavedDiagnosisId: data.savedRecord?.id ?? null,
            savedAt: new Date().toISOString(),
          })
        );
      } catch {
        // ignore quota error
      }

      onDiagnosisSaved();
    } catch (err: any) {
      if (userCancelledScanRef.current || err?.cancelled) {
        return;
      }
      setHasVerifiedScanResult(false);
      if (err?.nonRetryable) {
        setScanStatus('FAILED');
        setErrorMessage(err.message);
      } else {
        setScanStatus('TEMPORARILY_UNAVAILABLE');
        setErrorMessage(
          err?.message ||
            'GREENY is temporarily unable to connect to the Plant Doctor. Your uploaded photos are safe. Please click Retry Scan.'
        );
      }
      emitGreenyAppEvent({ type: 'USER_RECEIVED_ERROR' });
    } finally {
      stageTimersRef.current.forEach((id) => window.clearTimeout(id));
      stageTimersRef.current = [];
      activeAbortControllerRef.current = null;
      setIsScanning(false);
      setScanStage('Idle');
      scanInFlightRef.current = false;
    }
  };

  const handleSaveToMyGarden = async (overrideName?: { commonName: string; scientificName: string }) => {
    if (isSavingToGarden || !analysisResult) return;
    setIsSavingToGarden(true);
    setSaveGardenStatus('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/plant/save-scan-to-garden', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plantId: selectedGardenPlantId || undefined,
          diagnosisId: latestSavedDiagnosisId || undefined,
          commonName: overrideName?.commonName || analysisResult.commonName || customPlantName || 'Scanned Plant',
          scientificName: overrideName?.scientificName || analysisResult.scientificName || '',
          plantCategory: analysisResult.plantCategory || analysisResult.plantFamily || 'Botanical Specimen',
          soilType: analysisResult.careSummary?.soil || 'Well-draining Organic Mix',
          sunlight: analysisResult.careSummary?.sunlight || 'Bright Indirect Light',
          healthScore: analysisResult.healthScore ?? 85,
          overallHealthStatus: analysisResult.overallHealthStatus || analysisResult.severity || 'Healthy',
          possibleCondition: analysisResult.possibleCondition,
          confidence: analysisResult.confidence ?? 88,
          visibleSymptoms: analysisResult.visibleSymptoms || [],
          possibleCauses: analysisResult.possibleCauses || [],
          safeTreatments: analysisResult.safeTreatments || [],
          preventionStrategy: analysisResult.preventionStrategy || '',
          imageUrl: scannedPhotoUrl || populatedSlots[0]?.previewUrl,
          reportData: analysisResult,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save to My Garden');
      setSaveGardenStatus(data.message || 'Saved specimen and diagnostic report to My Garden!');
      if (data.plant?.id) setSelectedGardenPlantId(data.plant.id);
      onDiagnosisSaved();
    } catch (err: any) {
      setSaveGardenStatus(`Error: ${err?.message || 'Could not save to My Garden'}`);
    } finally {
      setIsSavingToGarden(false);
    }
  };

  const handleCreateCarePlan = async () => {
    if (isCreatingCarePlan || !analysisResult) return;
    setIsCreatingCarePlan(true);
    setCarePlanStatus('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const plantLabel = analysisResult.commonName || customPlantName || 'Scanned Specimen';
      const immediate = Array.isArray(analysisResult.immediateActions) ? analysisResult.immediateActions[0] : '';

      const tasksToCreate = [
        {
          title: immediate
            ? `Action: ${immediate.slice(0, 140)}`
            : `Apply primary organic care check for ${plantLabel}`,
          taskType: 'Disease Follow-up',
          frequency: 'Once',
          dueInDays: 1,
          notes: `Condition: ${analysisResult.possibleCondition || 'Routine recovery'}`,
        },
        {
          title: `Watering & Moisture Check: ${String(analysisResult.wateringAdjustments || analysisResult.careSummary?.watering || 'Check top 5cm soil dryness').slice(0, 130)}`,
          taskType: 'Watering',
          frequency: 'Every 5 Days',
          dueInDays: 3,
          notes: String(analysisResult.soilRecommendations || 'Verify clean pot drainage'),
        },
        {
          title: `Follow-up Visual Re-Scan for ${plantLabel}`,
          taskType: 'Growth Photo',
          frequency: 'Biweekly',
          dueInDays: 10,
          notes: String(analysisResult.followUpRecommendations || 'Compare new apical growth against baseline'),
        },
      ];

      const res = await fetch('/api/ai/care-plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plantId: selectedGardenPlantId || undefined,
          plantName: plantLabel,
          tasksToCreate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule care plan');
      setCarePlanStatus(`Added ${data.count} scheduled tasks to your Smart Care Calendar.`);
      onDiagnosisSaved();
    } catch (err: any) {
      setCarePlanStatus(`Error: ${err?.message || 'Could not create care plan'}`);
    } finally {
      setIsCreatingCarePlan(false);
    }
  };

  const handleDownloadReport = () => {
    if (!analysisResult) return;
    const reportLines = [
      'MYPLANTCARE — AI BOTANICAL IDENTIFICATION & HEALTH REPORT',
      `Scan Date: ${analysisResult.scannedDate || new Date().toISOString().slice(0, 10)}`,
      `Model: ${analysisResult.resolvedModel || 'Gemini Multimodal Vision'}`,
      '====================================================================',
      `Common Name: ${analysisResult.commonName}`,
      `Scientific Name: ${analysisResult.scientificName}`,
      `Category / Family: ${analysisResult.plantCategory || 'Botanical'} · ${analysisResult.plantFamily || ''}`,
      `ID Confidence: ${analysisResult.confidence}%`,
      `Health Score: ${analysisResult.healthScore}/100 (${analysisResult.overallHealthStatus})`,
      `Primary Hypothesis: ${analysisResult.possibleCondition}`,
      '',
      'Observed Symptoms:',
      ...(analysisResult.visibleSymptoms || []).map((s: string) => ` - ${s}`),
      '',
      'Possible Causes (Hypotheses):',
      ...(analysisResult.possibleCauses || []).map((c: string) => ` - ${c}`),
      '',
      'Immediate Actions:',
      ...(analysisResult.immediateActions || []).map((a: string) => ` - ${a}`),
      '',
      'Safe Bio-Rational Treatments:',
      ...(analysisResult.safeTreatments || []).map((t: string) => ` - ${t}`),
      '',
      `Disclaimer: ${analysisResult.disclaimer || 'Visual AI screening does not replace laboratory culture or soil testing.'}`,
    ];

    const blob = new Blob([reportLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myplantcare-scan-${String(analysisResult.commonName || 'plant').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadPreviousScan = (diagRecord: any) => {
    try {
      if (diagRecord.reportJson && diagRecord.reportJson !== '{}') {
        const parsedReport = JSON.parse(diagRecord.reportJson);
        setAnalysisResult(parsedReport);
      } else {
        setAnalysisResult({
          commonName: diagRecord.plantName,
          scientificName: diagRecord.scientificName || diagRecord.plantName,
          plantCategory: diagRecord.plantCategory || 'Botanical Specimen',
          confidence: diagRecord.confidence || 88,
          healthScore: diagRecord.healthScore || 80,
          overallHealthStatus: diagRecord.severity || 'Moderate',
          possibleCondition: diagRecord.possibleCondition,
          visibleSymptoms: String(diagRecord.symptoms || '').split('; ').filter(Boolean),
          possibleCauses: String(diagRecord.causes || '').split('; ').filter(Boolean),
          safeTreatments: String(diagRecord.recommendations || '').split('; ').filter(Boolean),
          preventionStrategy: diagRecord.prevention || '',
          scannedDate: diagRecord.scannedDate || '2026-11-12',
        });
      }
      if (diagRecord.imageUrl) {
        setScannedPhotoUrl(diagRecord.imageUrl);
        setAngleSlots((prev) => ({
          ...prev,
          full: {
            ...prev.full,
            previewUrl: diagRecord.imageUrl,
            base64: '',
            sourceType: 'garden',
            metaInfo: `Loaded Scan: ${diagRecord.plantName}`,
          },
        }));
      }
      setLatestSavedDiagnosisId(diagRecord.id ?? null);
      setCustomPlantName(diagRecord.plantName);
      setHasVerifiedScanResult(true);
      setScanStatus('SUCCESS');
      setErrorMessage('');
      setQualityFailureInfo(null);
    } catch {
      // ignore parse error
    }
  };

  const handleScanAgain = () => {
    setErrorMessage('');
    setQualityFailureInfo(null);
    setSaveGardenStatus('');
    setCarePlanStatus('');
    setComparisonScan(null);
    setScanStatus('IDLE');
    setHasVerifiedScanResult(false);
    setAnalysisResult(null);
    try {
      localStorage.removeItem(LAST_SCAN_STORAGE_KEY);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Studio Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#B6CDB4]/40 dark:border-white/12 bg-[#10251D] text-white shadow-xl">
        <BotanicalImage
          src="/images/diagnostic_botanical_lab_1794532595815.webp"
          alt="AI Plant Doctor diagnostic laboratory"
          decorative
          priority
          containerClassName="!absolute inset-0"
          aspectClassName="w-full h-full"
          className="opacity-25"
        />
        <div className="relative z-10 p-6 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#10251D]/95 via-[#174C38]/85 to-[#10251D]/92">
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#00D69A]">
              Multi-Angle Vision Pathology & Identification Studio
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
              {activeSubMode === 'identify'
                ? 'AI Plant Identification Studio'
                : activeSubMode === 'pest'
                ? 'AI Pest Detection & Organic IPM Lab'
                : activeSubMode === 'nutrient'
                ? 'AI Nutrient Deficiency Detector'
                : activeSubMode === 'rescue'
                ? 'AI Emergency Plant Rescue Protocol'
                : 'Advanced Multi-Image AI Plant Scanner'}
            </h2>
            <p className="text-xs text-[#B6CDB4]">
              Up to 5 botanical angles · Pre-scan Quality Gate · 16-Symptom Screening · Separated AI vs. Garden Memory
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#10251D]/80 rounded-2xl border border-white/15">
            {([
              ['doctor', 'AI Plant Doctor'],
              ['identify', 'Plant Identification'],
              ['pest', 'Pest Detection'],
              ['nutrient', 'Nutrient Detector'],
              ['rescue', 'Plant Rescue AI'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onSubModeChange(id)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeSubMode === id
                    ? 'bg-[#00D69A] text-[#10251D] font-bold shadow-sm'
                    : 'text-[#B6CDB4] hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scientific Transparency Notice */}
      <div className="p-4 rounded-2xl border border-[#F5CA62]/45 bg-[#F5CA62]/14 dark:bg-[#F5CA62]/10 text-xs text-[#10251D] dark:text-[#FAF7EE] flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#B57B00] dark:text-[#F5CA62] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Scientific Diagnostic Transparency:</span> Multi-angle photographs produce{' '}
          <strong>observed visual evidence</strong> and <strong>possible AI hypotheses</strong>. If identification
          confidence is below 70%, ranked candidate species are shown instead of guessing. Chemical lab confirmation is
          always recommended for critical pathology or soil pH/NPK.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: MULTI-ANGLE VIEWPORT, CAPTURE & INPUT CONTROLS */}
        <div className="lg:col-span-5 space-y-4">
          {/* 5-Angle Slot Selector Strip */}
          <div className="p-3.5 rounded-2xl border border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026] space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-bold text-[#10251D] dark:text-white">
                Multi-Angle Capture Slots ({populatedSlots.length}/5 Ready)
              </span>
              <span className="text-[11px] font-mono text-[#174C38] dark:text-[#00D69A]">
                Active: {activeSlot.label}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {ANGLE_CONFIG.map((cfg) => {
                const slot = angleSlots[cfg.angle];
                const hasImg = Boolean(slot.base64 || slot.previewUrl);
                const isActive = activeSlotAngle === cfg.angle;
                return (
                  <button
                    key={cfg.angle}
                    type="button"
                    onClick={() => setActiveSlotAngle(cfg.angle)}
                    title={cfg.hint}
                    className={`relative rounded-xl border p-1.5 text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      isActive
                        ? 'border-[#00D69A] bg-[#00D69A]/12 ring-1 ring-[#00D69A]'
                        : 'border-[#B6CDB4]/40 dark:border-white/12 bg-[#FAF7EE] dark:bg-[#10251D] hover:border-[#00D69A]/60'
                    }`}
                  >
                    <div className="w-full h-10 rounded-lg overflow-hidden bg-[#10251D]/10 dark:bg-[#10251D] flex items-center justify-center">
                      {hasImg ? (
                        <BotanicalImage
                          src={slot.base64 || slot.previewUrl}
                          alt={cfg.label}
                          commonName={customPlantName || cfg.label}
                          aspectClassName="w-full h-full"
                        />
                      ) : (
                        <ImagePlus className="w-4 h-4 text-[#174C38]/70 dark:text-[#B6CDB4]" />
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-[#10251D] dark:text-white leading-tight line-clamp-1">
                      {cfg.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-[#174C38]/80 dark:text-[#B6CDB4]">
              Tip for {activeSlot.label}: {activeSlot.hint}
            </div>
          </div>

          {/* Scanner Viewport */}
          <div
            onClick={(e) => {
              if (!cameraActive) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              window.setTimeout(() => setFocusPoint(null), 1200);
            }}
            className="relative rounded-2xl overflow-hidden border-2 border-[#174C38] dark:border-[#00D69A]/40 bg-[#10251D] h-[320px] flex items-center justify-center select-none shadow-lg"
          >
            {cameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : activeSlot.base64 || activeSlot.previewUrl ? (
              <BotanicalImage
                src={activeSlot.base64 || activeSlot.previewUrl}
                alt={`${activeSlot.label} preview`}
                commonName={customPlantName || activeSlot.label}
                priority
                aspectClassName="w-full h-full"
              />
            ) : (
              <div className="text-center p-6 space-y-2.5 text-[#B6CDB4]">
                <ImagePlus className="w-10 h-10 mx-auto text-[#00D69A]" />
                <div className="text-xs font-bold text-white">No photograph in &ldquo;{activeSlot.label}&rdquo; slot</div>
                <p className="text-[11px] max-w-xs mx-auto">
                  {activeSlot.hint}. Upload or capture with camera, or pick a specimen below.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00D69A] text-[#10251D] text-xs font-bold hover:bg-[#C7F36B] transition-colors cursor-pointer"
                >
                  Upload {activeSlot.label}
                </button>
              </div>
            )}

            {/* Corner Reticle */}
            <div className="pointer-events-none absolute inset-4">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#00D69A] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#00D69A] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#00D69A] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#00D69A] rounded-br-lg" />
            </div>

            {focusPoint && (
              <div
                style={{ left: focusPoint.x - 24, top: focusPoint.y - 24 }}
                className="pointer-events-none absolute w-12 h-12 border-2 border-[#F5CA62] rounded-full shadow-lg"
              />
            )}

            {(isScanning || scanStage !== 'Idle') && (
              <div
                data-testid="instant-scanning-overlay"
                className="absolute inset-0 bg-[#10251D]/92 backdrop-blur-xs flex flex-col items-center justify-center p-5 text-center z-10 space-y-2.5"
              >
                <div className="w-10 h-10 rounded-full border-2 border-[#00D69A] border-t-transparent animate-spin flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#00D69A]" />
                </div>
                <div className="text-xs font-bold text-white">{scanStage}</div>
                <div className="w-full max-w-[240px] space-y-1 text-left">
                  {SCAN_PIPELINE_STEPS.map((step) => {
                    const isDone = activePipelineStep > step.id;
                    const isCurrent = activePipelineStep === step.id;
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-2 text-[10px] font-mono px-2 py-0.5 rounded ${
                          isCurrent
                            ? 'bg-[#00D69A]/20 text-[#C7F36B] font-bold'
                            : isDone
                            ? 'text-[#00D69A]'
                            : 'text-white/45'
                        }`}
                      >
                        <span>{isDone ? '✓' : isCurrent ? '●' : '○'}</span>
                        <span>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelScan();
                  }}
                  data-testid="cancel-scan-overlay-btn"
                  className="mt-1 px-3.5 py-1.5 rounded-xl bg-[#FF806B] text-[#10251D] text-[11px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Cancel Analysis
                </button>
              </div>
            )}

            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between bg-[#10251D]/92 px-3 py-1.5 rounded-xl border border-white/15 text-[11px] text-white">
              <span className="truncate">{activeSlot.metaInfo}</span>
              <span className="font-mono text-[#00D69A] shrink-0 ml-2">
                {activeSlot.label.toUpperCase()}
              </span>
            </div>
          </div>

          {uploadProgress > 0 && (
            <div className="p-3 rounded-xl bg-white dark:bg-[#153026] border border-[#B6CDB4]/45 dark:border-white/12 space-y-1">
              <div className="flex justify-between text-xs font-mono text-[#174C38] dark:text-[#00D69A]">
                <span>Optimising plant photo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#FAF7EE] dark:bg-[#10251D] overflow-hidden">
                <div className="h-full bg-[#00D69A]" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Camera & Upload Controls */}
          <div className="p-4 rounded-2xl border border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026] space-y-3 shadow-sm">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              aria-label="Upload Plant Photo (JPG, JPEG, PNG, WEBP)"
              className="hidden"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => startCamera(cameraFacingMode)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" /> Open Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureCameraFrame}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#00D69A] text-[#10251D] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" /> Capture
                </button>
              )}

              {cameraActive ? (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/55 dark:border-white/15 text-xs font-semibold text-[#10251D] dark:text-white cursor-pointer whitespace-nowrap"
                >
                  <SwitchCamera className="w-4 h-4 text-[#00D69A]" /> Switch Cam
                </button>
              ) : capturedFromCamera ? (
                <button
                  type="button"
                  onClick={handleRetakeCamera}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#FF806B]/15 border border-[#FF806B]/40 text-[#A33624] dark:text-[#FF806B] text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-4 h-4" /> Retake
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera(cameraFacingMode === 'environment' ? 'user' : 'environment')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/55 dark:border-white/15 text-xs font-semibold text-[#10251D] dark:text-white cursor-pointer whitespace-nowrap"
                >
                  <SwitchCamera className="w-4 h-4 text-[#174C38] dark:text-[#00D69A]" />
                  {cameraFacingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}
                </button>
              )}

              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#FF806B]/15 border border-[#FF806B]/40 text-[#A33624] dark:text-[#FF806B] text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  <XCircle className="w-4 h-4" /> Close Cam
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/55 dark:border-white/15 text-[#10251D] dark:text-white text-xs font-semibold hover:border-[#00D69A] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-4 h-4 text-[#174C38] dark:text-[#00D69A]" /> Upload Photo
                </button>
              )}
            </div>

            {!cameraActive && (activeSlot.base64 || activeSlot.previewUrl) && (
              <div className="pt-2 border-t border-[#B6CDB4]/35 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRotateImage(-90)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/45 dark:border-white/15 text-xs text-[#10251D] dark:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#174C38] dark:text-[#00D69A]" /> -90°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateImage(90)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/45 dark:border-white/15 text-xs text-[#10251D] dark:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#174C38] dark:text-[#00D69A]" /> +90°
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <Crop className="w-3.5 h-3.5 text-[#174C38] dark:text-[#00D69A] mr-0.5" />
                  {(['full', 'square', '4:3'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleCropImage(preset)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${
                        cropPreset === preset
                          ? 'bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] border-transparent font-bold'
                          : 'bg-[#FAF7EE] dark:bg-[#10251D] border-[#B6CDB4]/45 dark:border-white/15 text-[#10251D] dark:text-[#B6CDB4]'
                      }`}
                    >
                      {preset === 'full' ? 'Full' : preset === 'square' ? '1:1' : '4:3'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleClearSlot(activeSlotAngle)}
                    title="Clear active photo slot"
                    className="ml-1 p-1.5 rounded-lg bg-[#FF806B]/15 text-[#FF806B] hover:bg-[#FF806B]/25 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FF806B]/12 border border-[#FF806B]/40 text-xs text-[#10251D] dark:text-white"
              >
                <div className="font-bold flex items-center gap-1.5 text-[#A33624] dark:text-[#FF806B]">
                  <AlertTriangle className="w-4 h-4" /> Camera Notice
                </div>
                <p className="mt-1">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Specimen Linking, Calibration Presets & Launch Button */}
          <div className="p-4 rounded-2xl border border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026] space-y-3 shadow-sm">
            {plants.length > 0 && (
              <div className="space-y-1.5">
                <label
                  htmlFor="scan-target-garden-plant"
                  className="block text-xs font-bold text-[#10251D] dark:text-[#C7F36B]"
                >
                  Link Scan to Saved Garden Plant (Optional)
                </label>
                <select
                  id="scan-target-garden-plant"
                  value={selectedGardenPlantId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setSelectedGardenPlantId('');
                    } else {
                      const found = plants.find((p: any) => String(p.id) === val);
                      if (found) handleSelectGardenPlant(found);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#B6CDB4]/55 dark:border-white/15 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-white"
                >
                  <option value="">New / Unlinked Specimen (Create New Entry if Saved)</option>
                  {plants.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.species}) — {p.healthScore}% Health
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[#174C38] dark:text-[#B6CDB4]">
                Or Load Calibration Specimen:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIAGNOSTIC_SAMPLES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      selectedSample.id === preset.id && angleSlots.full.sourceType === 'preset'
                        ? 'bg-[#00D69A]/15 border-[#00D69A] text-[#10251D] dark:text-[#00D69A] font-bold'
                        : 'border-[#B6CDB4]/45 dark:border-white/12 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#B6CDB4]'
                    }`}
                  >
                    {preset.label.split(' — ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label htmlFor="diag-plant-name" className="block text-xs font-medium text-[#10251D] dark:text-white">
                Optional Plant Hint
              </label>
              <input
                id="diag-plant-name"
                type="text"
                value={customPlantName}
                onChange={(e) => setCustomPlantName(e.target.value)}
                placeholder="Leave blank to let AI identify purely from photos..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#B6CDB4]/55 dark:border-white/15 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-white"
              />
              <label
                htmlFor="diag-symptoms-notes"
                className="block text-xs font-medium text-[#10251D] dark:text-white"
              >
                Observed Symptoms / Recent Care Notes (Optional)
              </label>
              <textarea
                id="diag-symptoms-notes"
                rows={2}
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                placeholder="e.g., yellowing older leaves, soft stems, repotted 10 days ago..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#B6CDB4]/55 dark:border-white/15 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-white"
              />

              {/* Voice Note Symptom Recorder Widget — Dual-theme Observatory surface */}
              <div className="bg-[#FAF7EE] dark:bg-[#10251D] border border-[#00D69A]/35 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRecordingAudio ? 'bg-[#FF806B]/20 text-[#FF806B] animate-pulse border border-[#FF806B]/45' : 'bg-[#00D69A]/15 text-[#174C38] dark:text-[#00D69A] border border-[#00D69A]/35'}`}>
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#10251D] dark:text-white flex items-center gap-2">
                      <span>Voice Symptom Note</span>
                      {isRecordingAudio && (
                        <span className="text-[10px] font-mono bg-[#FF806B]/20 text-[#A33624] dark:text-[#FF806B] px-2 py-0.5 rounded-md border border-[#FF806B]/40">
                          REC 00:{audioDurationSeconds < 10 ? `0${audioDurationSeconds}` : audioDurationSeconds}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#174C38]/80 dark:text-[#B6CDB4]">
                      {audioBlobUrl ? 'Audio note attached for AI diagnostic cross-reference' : 'Record spoken details to cross-reference with visual data'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {isRecordingAudio ? (
                    <button
                      type="button"
                      onClick={stopAudioRecording}
                      className="px-3 py-1.5 rounded-xl bg-[#FF806B] hover:opacity-90 text-[#10251D] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" /> Stop Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startAudioRecording}
                      className="px-3 py-1.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] hover:opacity-90 text-white dark:text-[#10251D] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                    >
                      <Mic className="w-3.5 h-3.5" /> {audioBlobUrl ? 'Re-record Voice Note' : 'Record Voice Note'}
                    </button>
                  )}

                  {audioBlobUrl && !isRecordingAudio && (
                    <>
                      <audio src={audioBlobUrl} controls className="h-8 max-w-[140px]" />
                      <button
                        type="button"
                        onClick={clearAudioRecording}
                        className="p-1.5 rounded-xl bg-[#FF806B]/15 hover:bg-[#FF806B]/25 text-[#FF806B] border border-[#FF806B]/30 cursor-pointer"
                        title="Delete Audio Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* V5 5-Step Live Scanning Progress Bar & Cancel Action */}
            <div
              data-testid="v5-scan-pipeline-stepper"
              className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/45 dark:border-white/12 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-[#174C38] dark:text-[#00D69A] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> V5 Instant Scanning Pipeline
                </span>
                <span className="font-mono text-[10px] text-[#10251D]/70 dark:text-[#B6CDB4]">
                  {isScanning
                    ? `Step ${activePipelineStep}/5 Active`
                    : scanStatus === 'SUCCESS'
                    ? 'All 5 Steps Complete'
                    : 'Ready (1200px · 0.85 WebP/JPEG + Hash Cache)'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {SCAN_PIPELINE_STEPS.map((st) => {
                  const completed = scanStatus === 'SUCCESS' || (isScanning && activePipelineStep > st.id);
                  const active = isScanning && activePipelineStep === st.id;
                  return (
                    <div
                      key={st.id}
                      title={st.detail}
                      className={`p-1.5 rounded-lg border text-center transition-colors ${
                        active
                          ? 'border-[#00D69A] bg-[#00D69A]/15 text-[#10251D] dark:text-[#C7F36B] font-bold'
                          : completed
                          ? 'border-[#00D69A]/40 bg-[#00D69A]/10 text-[#174C38] dark:text-[#00D69A] font-semibold'
                          : 'border-[#B6CDB4]/35 dark:border-white/10 text-[#10251D]/55 dark:text-[#B6CDB4]/60'
                      }`}
                    >
                      <div className="text-[9px] font-mono">0{st.id}</div>
                      <div className="text-[9px] leading-tight line-clamp-2 mt-0.5">{st.shortLabel}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRunGeminiAnalysis()}
                disabled={isScanning}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] font-bold text-xs hover:bg-[#10251D] dark:hover:bg-[#C7F36B] transition-colors disabled:opacity-50 shadow-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Scan className="w-4 h-4" />
                {isScanning
                  ? `${scanStage}...`
                  : `Scan ${populatedSlots.length || 1} Image${populatedSlots.length === 1 ? '' : 's'} with AI Plant Scanner`}
              </button>

              {isScanning && (
                <button
                  type="button"
                  onClick={handleCancelScan}
                  data-testid="cancel-scan-button"
                  className="px-3.5 py-3.5 rounded-xl bg-[#FF806B] text-[#10251D] font-bold text-xs hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-[#10251D] border border-[#FF806B]/55 text-white space-y-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#FF806B] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#FF806B]">
                      {scanStatus === 'QUALITY_CHECK_FAILED' ? 'Image Quality Gate' : 'Scan Notice'}
                    </div>
                    <p className="text-xs leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunGeminiAnalysis()}
                    disabled={isScanning}
                    className="px-3.5 py-1.5 rounded-xl bg-[#00D69A] text-[#10251D] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-[#153026] text-white border border-white/15 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Replace Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SEPARATED SOURCES + 16-SYMPTOM SCREENING + ACTIONS */}
        <div className="lg:col-span-7 space-y-5">
          {/* QUALITY CHECK FAILED BANNER */}
          {scanStatus === 'QUALITY_CHECK_FAILED' && qualityFailureInfo && (
            <div
              data-testid="quality-check-failed-banner"
              className="p-6 rounded-2xl border-2 border-[#FF806B] bg-[#FF806B]/10 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold uppercase text-[#A33624] dark:text-[#FF806B] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Image Quality Validation Failed
                </span>
                {qualityFailureInfo.qualityScore !== undefined && (
                  <span className="font-mono text-xs font-bold tabular-nums text-[#10251D] dark:text-white">
                    Clarity Score: {qualityFailureInfo.qualityScore}/100
                  </span>
                )}
              </div>
              <p className="text-xs text-[#10251D] dark:text-white leading-relaxed">
                {qualityFailureInfo.retakeGuidance ||
                  'The photo appears blurry, too dark, or does not clearly frame plant leaves or stems. Your images are kept intact—crop closer or upload a clearer daytime photo.'}
              </p>
              {Array.isArray(qualityFailureInfo.issues) && qualityFailureInfo.issues.length > 0 && (
                <ul className="text-xs space-y-1 text-[#174C38] dark:text-[#B6CDB4]">
                  {qualityFailureInfo.issues.map((issue: string, i: number) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCropImage('square')}
                  className="px-3.5 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] text-xs font-bold cursor-pointer"
                >
                  Crop 1:1 Leaf Focus
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl border border-[#B6CDB4]/60 dark:border-white/15 text-xs font-semibold cursor-pointer"
                >
                  Upload Clearer Photo
                </button>
              </div>
            </div>
          )}

          {/* SOURCE 1: AI IMAGE ANALYSIS */}
          {hasVerifiedScanResult && scanStatus === 'SUCCESS' && analysisResult ? (
            <div
              data-testid="ai-image-analysis-section"
              className="p-6 rounded-2xl border border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026] space-y-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#B6CDB4]/35 dark:border-white/10">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#00D69A]/15 border border-[#00D69A]/35 text-[11px] font-mono font-bold text-[#174C38] dark:text-[#00D69A] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Image Analysis
                    </span>
                    <span className="text-[11px] font-mono text-[#174C38]/80 dark:text-[#B6CDB4]">
                      {analysisResult.resolvedModel
                        ? `${String(analysisResult.resolvedModel).toUpperCase()}${
                            analysisResult.usedBackupModel ? ' · BACKUP FAILOVER' : ''
                          }`
                        : 'MULTIMODAL VISION'}
                    </span>
                    {analysisResult.qualityCheck?.qualityScore !== undefined && (
                      <span className="text-[11px] font-mono text-[#174C38] dark:text-[#00D69A] tabular-nums">
                        · Clarity {analysisResult.qualityCheck.qualityScore}%
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-display font-extrabold text-[#10251D] dark:text-white mt-1.5">
                    {analysisResult.commonName}{' '}
                    <span className="italic font-normal text-[#174C38] dark:text-[#B6CDB4]">
                      ({analysisResult.scientificName})
                    </span>
                  </h3>
                </div>

                {/* 4 Core Working Actions + Download */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveToMyGarden()}
                    disabled={isSavingToGarden}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    {isSavingToGarden ? 'Saving...' : 'SAVE TO MY GARDEN'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCarePlan}
                    disabled={isCreatingCarePlan}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#10251D] dark:bg-[#C7F36B] text-white dark:text-[#10251D] font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    {isCreatingCarePlan ? 'Scheduling...' : 'CREATE CARE PLAN'}
                  </button>
                  {onAskPlantDoctor && (
                    <button
                      type="button"
                      onClick={() =>
                        onAskPlantDoctor({
                          toolId: 'plant-doctor',
                          plantId: selectedGardenPlantId ? Number(selectedGardenPlantId) : null,
                          prompt: `Follow up on recent scan of ${analysisResult.commonName} (${analysisResult.scientificName}): Health ${analysisResult.healthScore}/100, suspected "${analysisResult.possibleCondition}". Symptoms observed: ${(analysisResult.visibleSymptoms || []).join('; ')}. Please provide deeper differential pathology and step-by-step recovery guidance.`,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF806B] text-[#10251D] font-bold text-xs hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Stethoscope className="w-3.5 h-3.5" /> ASK AI PLANT DOCTOR
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleScanAgain}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#B6CDB4]/60 dark:border-white/15 text-xs font-semibold text-[#10251D] dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> SCAN AGAIN
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/45 dark:border-white/12 text-xs font-semibold text-[#10251D] dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Report
                  </button>
                </div>
              </div>

              {(saveGardenStatus || carePlanStatus) && (
                <div className="space-y-2">
                  {saveGardenStatus && (
                    <div className="p-3 rounded-xl bg-[#00D69A]/15 border border-[#00D69A]/40 text-xs font-semibold text-[#10251D] dark:text-[#00D69A] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{saveGardenStatus}</span>
                    </div>
                  )}
                  {carePlanStatus && (
                    <div className="p-3 rounded-xl bg-[#00D69A]/15 border border-[#00D69A]/40 text-xs font-semibold text-[#10251D] dark:text-[#00D69A] flex items-center gap-2">
                      <CalendarPlus className="w-4 h-4 shrink-0" />
                      <span>{carePlanStatus}</span>
                    </div>
                  )}
                </div>
              )}

              {/* V5 Real-Time Speed & LocalStorage Base64 Hash Cache Telemetry Strip */}
              {scanPerformanceInfo && (
                <div
                  data-testid="scan-performance-telemetry"
                  className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#00D69A]/35 space-y-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-[#174C38] dark:text-[#00D69A]">
                      <Gauge className="w-4 h-4" />
                      <span>
                        V5 Scan Telemetry ·{' '}
                        {scanPerformanceInfo.cacheHit
                          ? `LOCALSTORAGE BASE64 HASH CACHE HIT (${scanPerformanceInfo.cacheResponseMs ?? scanPerformanceInfo.totalMs} ms)`
                          : `LIVE GEMINI VISION (${scanPerformanceInfo.totalMs} ms total)`}
                      </span>
                      {scanPerformanceInfo.imageHash && (
                        <span
                          data-testid="active-image-base64-hash"
                          className="px-2 py-0.5 rounded-md bg-[#174C38]/10 dark:bg-white/10 text-[10px] font-mono text-[#10251D] dark:text-[#C7F36B]"
                        >
                          Key: {scanPerformanceInfo.imageHash}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        data-testid="localstorage-cache-count"
                        className="px-2 py-1 rounded-lg bg-white dark:bg-[#153026] border border-[#B6CDB4]/40 dark:border-white/10 text-[10px] font-mono text-[#174C38] dark:text-[#B6CDB4]"
                      >
                        LocalStorage Cache: {localCacheStats.entryCount} saved
                      </span>
                      {localCacheStats.entryCount > 0 && (
                        <button
                          type="button"
                          data-testid="clear-localstorage-cache-btn"
                          onClick={() => {
                            clearClientScanResultCache();
                            setLocalCacheStats(getLocalStorageCacheStats());
                          }}
                          className="px-2.5 py-1 rounded-lg border border-[#FF806B]/45 text-[#A33624] dark:text-[#FF806B] text-[10px] font-mono font-semibold hover:bg-[#FF806B]/12 cursor-pointer"
                        >
                          Clear Local Cache
                        </button>
                      )}
                      {scanPerformanceInfo.cacheHit && (
                        <button
                          type="button"
                          onClick={() => handleRunGeminiAnalysis({ bypassCache: true })}
                          className="px-2.5 py-1 rounded-lg bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] text-[10px] font-bold cursor-pointer"
                        >
                          Force Fresh AI Scan
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowBenchmarkTable((v) => !v)}
                        className="px-2.5 py-1 rounded-lg border border-[#174C38]/25 dark:border-white/15 text-[10px] font-mono font-semibold text-[#10251D] dark:text-[#FAF7EE] cursor-pointer"
                      >
                        {showBenchmarkTable ? 'Hide Benchmark Table' : 'View V5 Benchmark Report'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-white dark:bg-[#153026] border border-[#B6CDB4]/35 dark:border-white/10">
                      <div className="text-[9px] text-[#174C38]/75 dark:text-[#B6CDB4]">1. Upload Time</div>
                      <div className="font-bold text-[#10251D] dark:text-white">{scanPerformanceInfo.uploadMs} ms</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-[#153026] border border-[#B6CDB4]/35 dark:border-white/10">
                      <div className="text-[9px] text-[#174C38]/75 dark:text-[#B6CDB4]">2. Optimization</div>
                      <div className="font-bold text-[#10251D] dark:text-white">{scanPerformanceInfo.optimizationMs} ms</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-[#153026] border border-[#B6CDB4]/35 dark:border-white/10">
                      <div className="text-[9px] text-[#174C38]/75 dark:text-[#B6CDB4]">3. AI API Time</div>
                      <div className="font-bold text-[#174C38] dark:text-[#00D69A]">
                        {scanPerformanceInfo.cacheHit ? '0 ms (Cached)' : `${scanPerformanceInfo.aiApiMs} ms`}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-[#153026] border border-[#B6CDB4]/35 dark:border-white/10">
                      <div className="text-[9px] text-[#174C38]/75 dark:text-[#B6CDB4]">4. LocalStorage Cache</div>
                      <div className="font-bold text-[#10251D] dark:text-[#C7F36B]">
                        {scanPerformanceInfo.cacheHit
                          ? `Hit (${scanPerformanceInfo.cacheResponseMs ?? 4} ms)`
                          : 'Stored by Base64 Hash'}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-[#153026] border border-[#B6CDB4]/35 dark:border-white/10">
                      <div className="text-[9px] text-[#174C38]/75 dark:text-[#B6CDB4]">5. Total Analysis</div>
                      <div className="font-bold text-[#10251D] dark:text-white">{scanPerformanceInfo.totalMs} ms</div>
                    </div>
                  </div>

                  {showBenchmarkTable && (
                    <div className="pt-2 border-t border-[#B6CDB4]/35 dark:border-white/10 overflow-x-auto">
                      <div className="text-[10px] font-mono font-bold text-[#174C38] dark:text-[#C7F36B] mb-1.5">
                        V5 BEFORE VS. AFTER IMAGE SCANNING BENCHMARK (SMALL / MEDIUM / LARGE IMAGES)
                      </div>
                      <table className="w-full text-left border-collapse text-[10px] font-mono">
                        <thead>
                          <tr className="border-b border-[#B6CDB4]/40 dark:border-white/15 text-[#174C38] dark:text-[#00D69A]">
                            <th className="py-1 pr-2">Image Size</th>
                            <th className="py-1 pr-2">Upload (Before→After)</th>
                            <th className="py-1 pr-2">Opt Time</th>
                            <th className="py-1 pr-2">AI API (Before→After)</th>
                            <th className="py-1 pr-2">Total (Before→After)</th>
                            <th className="py-1 pr-2">Cache Hit</th>
                            <th className="py-1">Failed %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {BEFORE_AFTER_BENCHMARK_REPORT.map((row) => (
                            <tr key={row.sizeCategory} className="border-b border-[#B6CDB4]/20 dark:border-white/5">
                              <td className="py-1 pr-2 font-bold text-[#10251D] dark:text-white">{row.sizeCategory}</td>
                              <td className="py-1 pr-2">{row.beforeUploadMs}ms → {row.afterUploadMs}ms</td>
                              <td className="py-1 pr-2">{row.optimizationMs}ms</td>
                              <td className="py-1 pr-2">{row.beforeAiApiMs}ms → {row.afterAiApiMs}ms</td>
                              <td className="py-1 pr-2 text-[#174C38] dark:text-[#00D69A] font-bold">
                                {row.beforeTotalMs}ms → {row.afterTotalMs}ms
                              </td>
                              <td className="py-1 pr-2 text-[#174C38] dark:text-[#C7F36B]">{row.cacheHitResponseMs}ms</td>
                              <td className="py-1">{row.failedRequestPercentBefore}% → {row.failedRequestPercentAfter}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Top Plant Identification Candidates (Always shown when returned by provider) */}
              {Array.isArray(analysisResult.topCandidates) && analysisResult.topCandidates.length > 0 && (
                <div
                  data-testid="top-identification-candidates"
                  className={`p-4 rounded-xl border space-y-2.5 ${
                    analysisResult.isUncertain || Number(analysisResult.confidence) < 70
                      ? 'border-[#F5CA62]/50 bg-[#F5CA62]/14'
                      : 'border-[#B6CDB4]/45 dark:border-white/12 bg-[#FAF7EE] dark:bg-[#10251D]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#174C38] dark:text-[#00D69A]" />
                      {analysisResult.isUncertain || Number(analysisResult.confidence) < 70
                        ? 'Identification Confidence Below 70% — Top Ranked Botanical Candidates'
                        : 'Top Plant Identification Candidates'}
                    </span>
                    <span className="text-[10px] font-mono text-[#174C38] dark:text-[#00D69A]">
                      Select any candidate to adopt
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {analysisResult.topCandidates.map((cand: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-[#153026] border border-[#B6CDB4]/40 dark:border-white/12 space-y-1.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between gap-2 font-bold text-[#10251D] dark:text-white">
                            <span>{cand.commonName}</span>
                            {typeof cand.confidence === 'number' && (
                              <span className="font-mono text-[#174C38] dark:text-[#00D69A] tabular-nums">
                                {cand.confidence}%
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] italic text-[#174C38]/80 dark:text-[#B6CDB4]">
                            {cand.scientificName}
                          </div>
                          {cand.reason && (
                            <p className="text-[11px] text-[#174C38]/80 dark:text-[#B6CDB4] mt-1">{cand.reason}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAnalysisResult((prev: any) => ({
                              ...prev,
                              commonName: cand.commonName,
                              scientificName: cand.scientificName,
                              confidence: typeof cand.confidence === 'number' ? cand.confidence : prev.confidence,
                            }));
                          }}
                          className="w-full py-1.5 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/45 dark:border-white/12 font-semibold text-[11px] hover:bg-[#00D69A] hover:text-[#10251D] transition-colors cursor-pointer"
                        >
                          Adopt Candidate
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo + Taxonomy Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                <div className="md:col-span-4 rounded-xl overflow-hidden border border-[#B6CDB4]/40 dark:border-white/12 bg-[#10251D]">
                  <BotanicalImage
                    src={scannedPhotoUrl || populatedSlots[0]?.previewUrl}
                    alt={analysisResult.commonName}
                    commonName={analysisResult.commonName}
                    scientificName={analysisResult.scientificName}
                    aspectClassName="h-44"
                  />
                </div>

                <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <div className="text-[11px] text-[#174C38]/80 dark:text-[#B6CDB4]">Category & Family</div>
                    <div className="text-xs font-bold mt-1 text-[#10251D] dark:text-white">{analysisResult.plantCategory || 'Botanical'}</div>
                    <div className="text-[10px] font-mono text-[#174C38] dark:text-[#00D69A] mt-0.5">
                      {analysisResult.plantFamily || 'Taxonomy'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <div className="text-[11px] text-[#174C38]/80 dark:text-[#B6CDB4]">ID Confidence</div>
                    <div className="text-2xl font-extrabold font-mono text-[#174C38] dark:text-[#00D69A] mt-0.5 tabular-nums">
                      {analysisResult.confidence ?? 88}%
                    </div>
                    <div className="text-[10px] text-[#174C38]/80 dark:text-[#B6CDB4]">
                      {analysisResult.nativeRegion || 'Visual Match'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <div className="text-[11px] text-[#174C38]/80 dark:text-[#B6CDB4]">Health Score</div>
                    <div className="text-2xl font-extrabold font-mono text-[#10251D] dark:text-[#C7F36B] mt-0.5 tabular-nums">
                      {analysisResult.healthScore ?? 80}/100
                    </div>
                    <div className="text-[10px] font-semibold text-[#A33624] dark:text-[#FF806B]">
                      {analysisResult.overallHealthStatus || analysisResult.severity}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-3 p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#174C38] dark:text-[#00D69A] mb-1">
                      Observed Morphological Characteristics
                    </div>
                    <ul className="space-y-1 text-xs text-[#10251D] dark:text-[#FAF7EE]">
                      {(analysisResult.visibleCharacteristics || []).map((char: string, idx: number) => (
                        <li key={idx}>• {char}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 16-Symptom Screening Matrix */}
              {Array.isArray(analysisResult.symptomChecklist) && analysisResult.symptomChecklist.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#B6CDB4]/35 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#10251D] dark:text-[#C7F36B]">
                      16-Point Symptom & Condition Screening
                    </h4>
                    <span className="text-[11px] font-mono text-[#174C38] dark:text-[#B6CDB4]">
                      {analysisResult.symptomChecklist.filter((s: any) => s.detected).length} Detected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {analysisResult.symptomChecklist.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border ${
                          item.detected
                            ? 'border-[#FF806B]/50 bg-[#FF806B]/10'
                            : 'border-[#B6CDB4]/35 dark:border-white/10 bg-[#FAF7EE]/85 dark:bg-[#10251D]/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 font-semibold text-[#10251D] dark:text-white">
                          <span>{item.symptom}</span>
                          <span
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                              item.detected
                                ? 'bg-[#FF806B] text-[#10251D] font-bold'
                                : 'bg-[#00D69A]/15 text-[#174C38] dark:text-[#00D69A]'
                            }`}
                          >
                            {item.detected ? item.severity || 'Detected' : 'Clear'}
                          </span>
                        </div>
                        {item.observation && (
                          <p className="text-[11px] text-[#174C38]/80 dark:text-[#B6CDB4] mt-0.5">{item.observation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Care Profile Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                  <div className="text-[11px] text-[#174C38] dark:text-[#F5CA62] font-semibold flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5" /> Sunlight
                  </div>
                  <div className="mt-1 text-[#10251D] dark:text-white">{analysisResult.careSummary?.sunlight || 'Bright indirect light'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                  <div className="text-[11px] text-[#174C38] dark:text-[#56C7C0] font-semibold flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5" /> Watering
                  </div>
                  <div className="mt-1 text-[#10251D] dark:text-white">{analysisResult.careSummary?.watering || 'When top 4cm soil feels dry'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                  <div className="text-[11px] text-[#174C38] dark:text-[#00D69A] font-semibold flex items-center gap-1">
                    <FlaskConical className="w-3.5 h-3.5" /> Soil & Temp
                  </div>
                  <div className="mt-1 text-[#10251D] dark:text-white">
                    {analysisResult.careSummary?.soil} · {analysisResult.careSummary?.temperature || '18–29°C'}
                  </div>
                </div>
              </div>

              {/* Pathology Details: Visual Evidence vs. Possible Causes */}
              <div className="pt-4 border-t border-[#B6CDB4]/35 dark:border-white/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono text-[#174C38] dark:text-[#00D69A]">
                      PRIMARY CLINICAL HYPOTHESIS
                    </div>
                    <h4 className="text-base font-display font-bold mt-0.5 text-[#10251D] dark:text-white">{analysisResult.possibleCondition}</h4>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-[#00D69A]/15 text-xs font-mono font-bold text-[#10251D] dark:text-[#00D69A] tabular-nums">
                    Diagnosis Confidence: {analysisResult.diagnosisConfidence ?? analysisResult.confidence ?? 85}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <h5 className="font-bold flex items-center gap-1.5 mb-2 text-[#10251D] dark:text-white">
                      <ShieldAlert className="w-4 h-4 text-[#FF806B]" /> Observed Symptoms (Visual Evidence)
                    </h5>
                    <ul className="space-y-1.5 text-[#10251D] dark:text-[#FAF7EE]">
                      {(analysisResult.visibleSymptoms || []).map((s: string, i: number) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <h5 className="font-bold flex items-center gap-1.5 mb-2 text-[#10251D] dark:text-white">
                      <AlertTriangle className="w-4 h-4 text-[#F5CA62]" /> Possible Causes (Unconfirmed Hypotheses)
                    </h5>
                    <ul className="space-y-1.5 text-[#10251D] dark:text-[#FAF7EE]">
                      {(analysisResult.possibleCauses || []).map((c: string, i: number) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <h5 className="font-bold flex items-center gap-1.5 mb-2 text-[#10251D] dark:text-white">
                      <HeartPulse className="w-4 h-4 text-[#00D69A]" /> Recommended Immediate Actions
                    </h5>
                    <ul className="space-y-1.5 text-[#10251D] dark:text-[#FAF7EE]">
                      {(analysisResult.immediateActions || []).map((act: string, i: number) => (
                        <li key={i}>• {act}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <h5 className="font-bold flex items-center gap-1.5 mb-2 text-[#10251D] dark:text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#00D69A]" /> Safe Bio-Rational Treatments
                    </h5>
                    <ul className="space-y-1.5 text-[#10251D] dark:text-[#FAF7EE]">
                      {(analysisResult.safeTreatments || []).map((t: string, i: number) => (
                        <li key={i}>• {t}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <div className="font-mono text-[11px] text-[#174C38] dark:text-[#00D69A]">WATERING ADJUSTMENTS</div>
                    <p className="mt-1 text-[#10251D] dark:text-white">{analysisResult.wateringAdjustments || analysisResult.rescuePlan?.wateringAdjustment}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12">
                    <div className="font-mono text-[11px] text-[#174C38] dark:text-[#00D69A]">FOLLOW-UP INSPECTION</div>
                    <p className="mt-1 text-[#10251D] dark:text-white">{analysisResult.followUpRecommendations || analysisResult.preventionStrategy}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              data-testid="ai-image-analysis-status-card"
              className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
                scanStatus === 'TEMPORARILY_UNAVAILABLE' || scanStatus === 'FAILED'
                  ? 'border-[#FF806B] bg-[#FF806B]/10'
                  : 'border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-[#00D69A]/15 text-[#174C38] dark:text-[#00D69A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Image Analysis:{' '}
                  {scanStatus === 'TEMPORARILY_UNAVAILABLE'
                    ? 'TEMPORARILY UNAVAILABLE (HTTP 503)'
                    : scanStatus === 'FAILED'
                    ? 'FAILED'
                    : scanStatus === 'SCANNING'
                    ? 'ANALYSING MULTI-ANGLE PHOTOS...'
                    : 'AWAITING SCAN'}
                </span>

                {(scanStatus === 'TEMPORARILY_UNAVAILABLE' || scanStatus === 'FAILED') && (
                  <button
                    type="button"
                    onClick={() => handleRunGeminiAnalysis()}
                    disabled={isScanning}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF806B] text-[#10251D] font-bold text-xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} /> Retry Scan
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4 rounded-xl overflow-hidden border border-[#B6CDB4]/40 dark:border-white/12">
                  <BotanicalImage
                    src={populatedSlots[0]?.base64 || populatedSlots[0]?.previewUrl}
                    alt="Preserved plant photograph"
                    commonName={customPlantName || 'Ready to Scan'}
                    aspectClassName="h-40"
                  />
                </div>
                <div className="md:col-span-8 space-y-2.5">
                  <h3 className="text-base font-display font-extrabold text-[#10251D] dark:text-white">
                    {scanStatus === 'TEMPORARILY_UNAVAILABLE'
                      ? 'AI Image Analysis Temporarily Unavailable (503)'
                      : scanStatus === 'FAILED'
                      ? 'Could Not Complete Visual Analysis'
                      : 'Upload or Capture Multi-Angle Photos for Real Gemini Vision Analysis'}
                  </h3>
                  <p className="text-xs text-[#174C38]/85 dark:text-[#B6CDB4] leading-relaxed">
                    {scanStatus === 'TEMPORARILY_UNAVAILABLE' || scanStatus === 'FAILED'
                      ? 'Your photographs are preserved cleanly above. No species or disease report has been fabricated from saved garden memory. Click Retry Scan when ready.'
                      : 'Attach Full Plant, Close-up Leaves, Stem, Soil, or Flower shots for higher diagnostic precision, pre-scan clarity validation, and 16-symptom screening.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRunGeminiAnalysis()}
                    disabled={isScanning}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] font-bold text-xs cursor-pointer"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    {scanStatus === 'TEMPORARILY_UNAVAILABLE' || scanStatus === 'FAILED'
                      ? 'Retry Scan Now'
                      : 'Run AI Image Analysis'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Debug Info & API Diagnostics Panel */}
          {debugLogs.length > 0 && activeDebugLog && (
            <div className="rounded-2xl border border-[#FF806B]/40 bg-[#10251D] text-[#FAF7EE] p-5 space-y-3 font-mono text-xs shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowDebugInfoPanel(!showDebugInfoPanel)}
                  className="flex items-center gap-2 font-bold text-[#00D69A] hover:underline cursor-pointer"
                >
                  <Terminal className="w-4 h-4" />
                  <span>
                    Debug Info & API Diagnostics ({activeDebugLog.responseStatus} {activeDebugLog.responseStatusText}) — {filteredDebugLogs.length} of {debugLogs.length} captured logs
                  </span>
                  {showDebugInfoPanel ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPrettyPrintJson(!prettyPrintJson)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${prettyPrintJson ? 'bg-[#00D69A]/20 text-[#00D69A] border-[#00D69A]/40' : 'bg-white/10 text-white/70 border-white/20'}`}
                  >
                    <span>Pretty Print: {prettyPrintJson ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoClearLogs(!autoClearLogs)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${autoClearLogs ? 'bg-[#00D69A]/20 text-[#00D69A] border-[#00D69A]/40' : 'bg-white/10 text-white/70 border-white/20'}`}
                  >
                    <span>Auto-clear: {autoClearLogs ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(activeDebugLog, null, 2));
                      setCopiedDebug(true);
                      window.setTimeout(() => setCopiedDebug(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-[#C7F36B] transition-colors cursor-pointer"
                  >
                    {copiedDebug ? <Check className="w-3 h-3 text-[#00D69A]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDebug ? 'Copied Report' : 'Copy Report'}</span>
                  </button>
                  <span className="text-[10px] text-white/50">{activeDebugLog.timestamp}</span>
                </div>
              </div>

              {/* Search input bar & log selector if multiple logs exist */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-white/50 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Search captured error logs (e.g. 503, quota, diagnose)..."
                    value={debugSearchQuery}
                    onChange={(e) => setDebugSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#00D69A]"
                  />
                </div>

                {filteredDebugLogs.length > 1 && (
                  <select
                    value={activeDebugLog.id}
                    onChange={(e) => setActiveDebugLogId(e.target.value)}
                    aria-label="Select captured error log"
                    className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-[11px] text-white"
                  >
                    {filteredDebugLogs.map((l) => (
                      <option key={l.id} value={l.id}>
                        #{debugLogs.length - debugLogs.indexOf(l)} • {l.responseStatus} {l.responseStatusText} ({l.timestamp})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {showDebugInfoPanel && (
                <div className="space-y-4 pt-3 border-t border-white/15 text-[11px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                      <div className="text-[10px] font-bold text-[#00D69A] uppercase tracking-wider">Request Metadata</div>
                      <div><strong className="text-white/70">Endpoint:</strong> {activeDebugLog.requestMethod} {activeDebugLog.requestUrl}</div>
                      <div><strong className="text-white/70">Content-Type:</strong> {activeDebugLog.requestHeaders['Content-Type'] || 'application/json'}</div>
                      <div><strong className="text-white/70">Auth Token:</strong> {activeDebugLog.requestHeaders['Authorization'] ? 'Present (Bearer ***)' : 'None'}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold text-[#FF806B] uppercase tracking-wider">Response Metadata</div>
                        {(() => {
                          let isValidJson = true;
                          try {
                            if (typeof activeDebugLog.responseBody === 'string') {
                              JSON.parse(activeDebugLog.responseBody);
                            } else if (!activeDebugLog.responseBody) {
                              isValidJson = false;
                            }
                          } catch {
                            isValidJson = false;
                          }
                          return (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isValidJson ? 'bg-[#00D69A]/20 text-[#00D69A]' : 'bg-[#FF806B]/20 text-[#FF806B]'}`}>
                              {isValidJson ? 'Valid JSON' : 'Invalid JSON'}
                            </span>
                          );
                        })()}
                      </div>
                      <div><strong className="text-white/70">Status Code:</strong> <span className={activeDebugLog.responseStatus === 200 ? 'text-[#00D69A]' : 'text-[#FF806B]'}>{activeDebugLog.responseStatus} {activeDebugLog.responseStatusText}</span></div>
                      <div><strong className="text-white/70">Content-Type:</strong> {activeDebugLog.responseHeaders['content-type'] || 'application/json'}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-[#C7F36B] uppercase tracking-wider">Request Payload Structure</div>
                    <pre className="p-3 rounded-xl bg-black/50 border border-white/10 overflow-x-auto max-h-48 text-[10px] text-white/90">
                      {formatJsonOutput(activeDebugLog.requestPayload)}
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-[#FF806B] uppercase tracking-wider">Full Error Response (Headers & Body)</div>
                      <button
                        type="button"
                        onClick={() => {
                          const payloadToCopy = JSON.stringify({
                            status: activeDebugLog.responseStatus,
                            statusText: activeDebugLog.responseStatusText,
                            headers: activeDebugLog.responseHeaders,
                            body: activeDebugLog.responseBody,
                          }, null, prettyPrintJson ? 2 : 0);
                          navigator.clipboard.writeText(payloadToCopy);
                          setCopiedResponseBody(true);
                          window.setTimeout(() => setCopiedResponseBody(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-[#C7F36B] transition-colors cursor-pointer"
                      >
                        {copiedResponseBody ? <Check className="w-3 h-3 text-[#00D69A]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedResponseBody ? 'Copied Raw Response' : 'Copy Raw Response Payload'}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="text-[10px] text-white/60 mb-1">Response Headers:</div>
                        <pre className="p-2.5 rounded-xl bg-black/50 border border-white/10 overflow-x-auto max-h-36 text-[10px] text-white/80">
                          {formatJsonOutput(activeDebugLog.responseHeaders)}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/60 mb-1">Response Body:</div>
                        <pre className="p-2.5 rounded-xl bg-black/50 border border-white/10 overflow-x-auto max-h-36 text-[10px] text-[#FF806B]">
                          {formatJsonOutput(activeDebugLog.responseBody)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SOURCE 2: SAVED GARDEN INFORMATION */}
          <div
            data-testid="saved-garden-info-section"
            className="p-5 rounded-2xl border border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026] space-y-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#F5CA62]/20 border border-[#F5CA62]/45 text-[11px] font-mono font-bold text-[#705308] dark:text-[#F5CA62] flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5" /> Saved Garden Information
              </span>
              <span className="text-[11px] font-mono text-[#174C38]/80 dark:text-[#B6CDB4]">
                Contextual Memory Only · Separate From Live Scan
              </span>
            </div>
            {(savedGardenContextInfo?.plants || plants).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(savedGardenContextInfo?.plants || plants).slice(0, 3).map((p: any, idx: number) => (
                  <div
                    key={p.id || idx}
                    className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/35 dark:border-white/10 text-xs"
                  >
                    <div className="font-bold truncate text-[#10251D] dark:text-white">{p.name}</div>
                    <div className="text-[11px] italic text-[#174C38]/80 dark:text-[#B6CDB4] truncate">
                      {p.species || p.scientificName}
                    </div>
                    <div className="text-[10px] font-mono text-[#174C38] dark:text-[#00D69A] mt-1 tabular-nums">
                      Saved Health: {p.healthScore ?? 88}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#174C38]/80 dark:text-[#B6CDB4]">No saved plants in My Garden yet.</div>
            )}
          </div>

          {/* SOURCE 3: GENERAL PLANT CARE ADVICE */}
          <div
            data-testid="general-plant-care-section"
            className="p-5 rounded-2xl border border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026] space-y-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#00D69A]/15 text-[11px] font-mono font-bold text-[#174C38] dark:text-[#00D69A] flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5" /> General Plant Care Advice
              </span>
              <span className="text-[11px] font-mono text-[#174C38]/80 dark:text-[#B6CDB4]">
                Standard Horticultural Checklist
              </span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#10251D] dark:text-[#FAF7EE]">
              {(
                generalCareAdviceInfo?.tips || [
                  'Test top 3–5 cm of substrate moisture before watering to prevent root hypoxia.',
                  'Provide bright filtered indirect light and keep foliage free of cold drafts.',
                  'Inspect leaf undersides weekly for aphids, spider mites, mealybugs, or scale.',
                  'Verify pot drainage holes remain unobstructed so water never pools at root crown.',
                ]
              ).map((tip: string, idx: number) => (
                <li
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/35 dark:border-white/10"
                >
                  • {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* SAVED SCAN HISTORY & COMPARISON */}
          <div className="p-6 rounded-2xl border border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026] space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-display font-bold flex items-center gap-2 text-[#10251D] dark:text-white">
                  <History className="w-4 h-4 text-[#00D69A]" /> Saved Scan History ({diagnoses.length})
                </h3>
                <p className="text-xs text-[#174C38]/80 dark:text-[#B6CDB4]">
                  Reload a previous scan or compare against your active scan.
                </p>
              </div>
              {comparisonScan && (
                <button
                  type="button"
                  onClick={() => setComparisonScan(null)}
                  className="text-xs font-semibold text-[#FF806B] hover:underline cursor-pointer"
                >
                  Close Comparison
                </button>
              )}
            </div>

            {comparisonScan && (
              <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border-2 border-[#00D69A]/50 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[#174C38] dark:text-[#00D69A] flex items-center gap-1.5">
                    <GitCompare className="w-4 h-4" /> LONGITUDINAL COMPARISON
                  </div>
                  {analysisResult && (
                    <span className="font-mono font-bold tabular-nums text-[#10251D] dark:text-white">
                      Delta: {(analysisResult.healthScore ?? 80) - (comparisonScan.healthScore ?? 76) >= 0 ? '+' : ''}
                      {(analysisResult.healthScore ?? 80) - (comparisonScan.healthScore ?? 76)} pts
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#153026] border border-[#B6CDB4]/40 dark:border-white/12">
                    <div className="text-[10px] font-mono text-[#174C38]/80 dark:text-[#B6CDB4]">
                      EARLIER · {comparisonScan.scannedDate}
                    </div>
                    <div className="font-bold mt-0.5 text-[#10251D] dark:text-white">{comparisonScan.plantName}</div>
                    <div className="font-mono text-[#174C38] dark:text-[#00D69A]">
                      Health {comparisonScan.healthScore}/100 · {comparisonScan.confidence}%
                    </div>
                    <div className="text-[#A33624] dark:text-[#FF806B] mt-0.5">{comparisonScan.possibleCondition}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#153026] border border-[#00D69A]/45">
                    <div className="text-[10px] font-mono text-[#174C38] dark:text-[#00D69A]">
                      ACTIVE SCAN · {analysisResult?.scannedDate || 'Today'}
                    </div>
                    <div className="font-bold mt-0.5 text-[#10251D] dark:text-white">
                      {analysisResult ? `${analysisResult.commonName} (${analysisResult.scientificName})` : 'Run a new scan to compare'}
                    </div>
                    {analysisResult && (
                      <>
                        <div className="font-mono text-[#174C38] dark:text-[#00D69A]">
                          Health {analysisResult.healthScore}/100 · {analysisResult.confidence}%
                        </div>
                        <div className="text-[#A33624] dark:text-[#FF806B] mt-0.5">{analysisResult.possibleCondition}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {diagnoses.length === 0 ? (
              <p className="text-xs text-[#174C38]/80 dark:text-[#B6CDB4]">
                No scans stored yet. Run your first scan above to record botanical history.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {diagnoses.slice(0, 6).map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12 text-xs space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold truncate text-[#10251D] dark:text-white">{d.plantName}</span>
                        <span className="font-mono text-[#174C38] dark:text-[#00D69A] shrink-0 tabular-nums">
                          {d.healthScore}/100
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[#174C38]/80 dark:text-[#B6CDB4]">
                        {d.scannedDate} · {d.confidence}% conf
                      </div>
                      <div className="text-[#A33624] dark:text-[#FF806B] font-medium line-clamp-1">
                        {d.possibleCondition}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-[#B6CDB4]/35 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => handleLoadPreviousScan(d)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white dark:bg-[#153026] border border-[#B6CDB4]/45 dark:border-white/12 font-semibold text-[11px] hover:bg-[#00D69A] hover:text-[#10251D] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparisonScan(d)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#00D69A]/15 text-[#174C38] dark:text-[#00D69A] font-semibold text-[11px] cursor-pointer"
                      >
                        <GitCompare className="w-3 h-3" /> Compare
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 9-POINT PLANT RESCUE PROTOCOL */}
          {analysisResult?.rescuePlan && (
            <div className="p-6 rounded-2xl border border-[#00D69A]/40 bg-white dark:bg-[#153026] space-y-4 shadow-sm">
              <div className="text-xs font-mono text-[#174C38] dark:text-[#00D69A] flex items-center gap-1.5 font-bold">
                <HeartPulse className="w-4 h-4" /> PLANT RESCUE AI · 9-POINT EMERGENCY RECOVERY PROTOCOL
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  ['01. IMMEDIATE ACTIONS', analysisResult.rescuePlan.immediateActions],
                  ['02. PRUNING ADVICE', analysisResult.rescuePlan.pruningAdvice],
                  ['03. WATERING ADJUSTMENT', analysisResult.rescuePlan.wateringAdjustment],
                  ['04. SUNLIGHT ADJUSTMENT', analysisResult.rescuePlan.sunlightAdjustment],
                  ['05. SOIL RECOVERY', analysisResult.rescuePlan.soilRecoverySteps],
                  ['06. BIO-FERTILIZER', analysisResult.rescuePlan.fertilizerRecommendation],
                  ['07. TIMELINE', analysisResult.rescuePlan.recoveryTimeline],
                  ['08. DAILY CHECK', analysisResult.rescuePlan.dailyCheckRoutine],
                  ['09. WARNING SIGNS', analysisResult.rescuePlan.warningSigns],
                ].map(([title, val], idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12"
                  >
                    <div className="font-mono text-[11px] text-[#174C38] dark:text-[#00D69A]">{title}</div>
                    <p className="mt-1 text-[#10251D] dark:text-[#FAF7EE]">{val || 'Follow monitoring checklist'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8-Pest IPM Matrix */}
          <div className="p-6 rounded-2xl border border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026] space-y-4 shadow-sm">
            <div>
              <h3 className="text-base font-display font-bold flex items-center gap-2 text-[#10251D] dark:text-white">
                <Bug className="w-4 h-4 text-[#FF806B]" /> 8-Pest Entomological Reference & Organic IPM
              </h3>
              <p className="text-xs text-[#174C38]/80 dark:text-[#B6CDB4]">
                Inspect common sap-sucking and chewing pests with bee-safe organic IPM steps.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PEST_PROFILES.map((pest) => (
                <button
                  key={pest.name}
                  type="button"
                  onClick={() => setSelectedPest(pest)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                    selectedPest.name === pest.name
                      ? 'bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] border-transparent font-bold'
                      : 'bg-[#FAF7EE] dark:bg-[#10251D] border-[#B6CDB4]/40 dark:border-white/12 text-[#10251D] dark:text-white'
                  }`}
                >
                  <div className="truncate">{pest.name.split(' (')[0]}</div>
                </button>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12 space-y-1.5 text-xs">
              <div className="font-bold text-sm text-[#10251D] dark:text-white">{selectedPest.name}</div>
              <p className="text-[#10251D] dark:text-[#FAF7EE]">
                <strong>Target Zone:</strong> {selectedPest.target}
              </p>
              <p className="text-[#A33624] dark:text-[#FF806B]">
                <strong>Symptoms:</strong> {selectedPest.symptoms}
              </p>
              <p className="text-[#174C38] dark:text-[#00D69A]">
                <strong>Organic IPM Control:</strong> {selectedPest.organicControl}
              </p>
            </div>
          </div>

          {/* 8-Element Nutrient Matrix */}
          <div className="p-6 rounded-2xl border border-[#B6CDB4]/45 dark:border-white/12 bg-white dark:bg-[#153026] space-y-4 shadow-sm">
            <div>
              <h3 className="text-base font-display font-bold flex items-center gap-2 text-[#10251D] dark:text-white">
                <FlaskConical className="w-4 h-4 text-[#00D69A]" /> 8-Element Foliar Nutrient Deficiency Reference
              </h3>
              <p className="text-xs text-[#174C38]/80 dark:text-[#B6CDB4]">
                Compare N, P, K, Mg, Fe, Ca, S, and Zn symptoms. Confirm suspected deficiencies with a soil test.
              </p>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {NUTRIENT_PROFILES.map((np) => (
                <button
                  key={np.symbol}
                  type="button"
                  onClick={() => setSelectedNutrient(np)}
                  className={`p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                    selectedNutrient.symbol === np.symbol
                      ? 'bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] border-transparent font-bold'
                      : 'bg-[#FAF7EE] dark:bg-[#10251D] border-[#B6CDB4]/40 dark:border-white/12 text-[#10251D] dark:text-white'
                  }`}
                >
                  <div className="text-sm font-mono font-bold">{np.symbol}</div>
                  <div className="text-[10px] truncate">{np.element}</div>
                </button>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/40 dark:border-white/12 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#10251D] dark:text-white">
                  {selectedNutrient.element} ({selectedNutrient.symbol}) — {selectedNutrient.mobility}
                </span>
                <span className="font-mono text-[#174C38] dark:text-[#00D69A]">
                  Baseline: {selectedNutrient.healthyLevelPercent}%
                </span>
              </div>
              <p className="text-[#10251D] dark:text-[#FAF7EE]">
                <strong>Visual Symptoms:</strong> {selectedNutrient.visualSymptoms}
              </p>
              <p className="text-[#A33624] dark:text-[#FF806B]">
                <strong>Overlap Warning:</strong> {selectedNutrient.overlapWarning}
              </p>
              <p className="text-[#174C38] dark:text-[#00D69A]">
                <strong>Organic Correction:</strong> {selectedNutrient.organicCorrection}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
