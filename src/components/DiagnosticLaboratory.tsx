import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { DIAGNOSTIC_SAMPLES, NUTRIENT_PROFILES, DiagnosticSamplePreset } from '../data/botanicalCatalog';
import { emitGreenyAppEvent } from './greeny/GreenyTypes';

export type DiagnosticSubMode = 'doctor' | 'identify' | 'pest' | 'nutrient' | 'rescue';

export type ScanStageMessage =
  | 'Idle'
  | 'Initialising camera...'
  | 'Capturing plant image...'
  | 'Analysing leaves...'
  | 'Identifying plant...'
  | 'Checking plant health...'
  | 'Preparing your report...';

interface DiagnosticLaboratoryProps {
  activeSubMode: DiagnosticSubMode;
  onSubModeChange: (mode: DiagnosticSubMode) => void;
  onDiagnosisSaved: () => void;
  authToken?: string | null;
  plants?: any[];
  diagnoses?: any[];
}

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB max raw file size
const LAST_SCAN_STORAGE_KEY = 'myplantcare_active_scan_v2';

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

const INITIAL_ANALYSIS_REPORT = {
  isPlantDetected: true,
  commonName: 'Fiddle Leaf Fig',
  scientificName: 'Ficus lyrata',
  plantCategory: 'Tropical Indoor Foliage Tree',
  plantFamily: 'Moraceae',
  confidence: 94,
  visibleCharacteristics: [
    'Large lyrate (violin-shaped) coriaceous leaf blades with prominent pale green pinnate venation',
    'Undulating, slightly wavy leaf margins with glossy dark-green adaxial cuticle',
    'Woody upright stem architecture with stipular sheathing around apical bud',
  ],
  overallHealthStatus: 'Mild Stress',
  healthScore: 76,
  diagnosisConfidence: 88,
  possibleCondition: 'Possible Mild Root Moisture Stress & Early Magnesium Deficiency (Visual Hypothesis)',
  severity: 'Low to Moderate',
  detectedAnomalies: ['Yellow leaves (Interveinal Chlorosis)', 'Leaf spots (Minor Edema Speckles)', 'Possible nutrient deficiencies (Mg)'],
  visibleSymptoms: [
    'Interveinal chlorosis (yellowing between green veins) on two older basal leaf blades',
    'Pinpoint reddish-brown edema speckles near leaf margins',
    'Upper apical crown remains turgid and glossy',
  ],
  possibleCauses: [
    'Irregular soil moisture fluctuations causing transient root pressure edema',
    'Mild magnesium depletion in older potting medium',
  ],
  immediateActions: [
    'Check top 5cm of soil moisture with a finger or probe before adding water',
    'Empty any standing water from the drainage saucer immediately',
    'Inspect leaf undersides with a magnifier to rule out spider mites',
  ],
  wateringAdjustments: 'Water deeply only when the top 5–6 cm of substrate feels dry (approx. every 6–8 days). Use lukewarm filtered water.',
  sunlightAdjustments: 'Provide 4–6 hours of bright, filtered east or south-west indirect light; rotate pot 90° weekly for even canopy growth.',
  soilRecommendations: 'Use an airy, fast-draining aroid/ficus mix (60% coco coir/peat, 25% composted pine bark, 15% coarse perlite, pH 6.0–6.8).',
  safeTreatments: [
    'Allow top 5cm of substrate to aerate before next irrigation cycle',
    'Apply 1 tsp agricultural Epsom salt (MgSO4) dissolved in 2L lukewarm water',
    'Wipe foliage with clean damp microfiber cloth to maximize stomatal conductance',
  ],
  followUpRecommendations: 'Re-scan the lower and middle leaves in 10–14 days. Verify that newer apical leaves unfurl without brown stippling.',
  preventionStrategy: 'Check soil moisture at 5cm depth weekly and ensure pot drainage ports flow freely.',
  similarSpecies: ['Ficus audrey (Ficus benghalensis)', 'Ficus elastica (Rubber Fig)'],
  careSummary: {
    sunlight: 'Bright Filtered Indirect Light (4–6 hrs daily)',
    watering: 'Every 6–8 days when top 5cm of soil is dry',
    soil: 'Chunky Pine Bark + Coco Coir + Perlite (pH 6.0–6.8)',
    temperature: '18°C – 29°C (65°F – 85°F) · Avoid cold drafts below 13°C',
    growthCharacteristics: 'Upright broadleaf evergreen tree; grows 30–60 cm/year indoors up to 2.5–3m canopy height',
    suitability: 'Indoor Bright Sanctuary / Covered Warm Balcony',
  },
  rescuePlan: {
    immediateActions: 'Move pot out of standing saucer water and aerate top 4cm of compacted soil gently with a wooden chopstick.',
    pruningAdvice: 'Snip only >80% necrotic basal leaves using sterilized shears; retain partially green leaves for energy.',
    wateringAdjustment: 'Suspend watering for 5–7 days until top 5cm registers dry; resume with 350ml oxygenated lukewarm water.',
    sunlightAdjustment: 'Position 1.2m from an east or bright filtered window (avoid harsh midday direct scorch).',
    soilRecoverySteps: 'Top-dress with 25% perlite + 75% composted pine bark & vermicompost to restore rhizosphere oxygen.',
    fertilizerRecommendation: 'Pause synthetic NPK for 21 days; apply mild kelp/seaweed bio-stimulant (2ml/L) after new root tips appear.',
    recoveryTimeline: 'Days 1–7: Turgor stabilization · Days 8–21: Root hair regeneration · Days 22–35: New apical bud swell.',
    dailyCheckRoutine: 'Morning 60-second check of leaf petiole posture, topsoil moisture, and abaxial leaf surfaces.',
    warningSigns: 'Blackening petiole bases, sour anaerobic soil odor, or sudden drop of healthy upper leaves.',
  },
  scannedDate: '2026-11-12',
  disclaimer:
    'Visual AI assessment distinguishes observed foliar symptoms from possible physiological or pathogenic causes and does not replace laboratory culture or soil testing. Avoid hazardous chemical pesticides.',
};

export const DiagnosticLaboratory: React.FC<DiagnosticLaboratoryProps> = ({
  activeSubMode,
  onSubModeChange,
  onDiagnosisSaved,
  authToken,
  plants = [],
  diagnoses = [],
}) => {
  const [selectedSample, setSelectedSample] = useState<DiagnosticSamplePreset>(DIAGNOSTIC_SAMPLES[0]);
  const [customPlantName, setCustomPlantName] = useState<string>('Ficus lyrata (Fiddle Leaf Fig)');
  const [symptomsInput, setSymptomsInput] = useState<string>(DIAGNOSTIC_SAMPLES[0].symptomsText);
  const [previewImage, setPreviewImage] = useState<string>(DIAGNOSTIC_SAMPLES[0].imageUrl);
  const [uploadedBase64, setUploadedBase64] = useState<string>('');
  const [uploadedMime, setUploadedMime] = useState<string>('image/jpeg');
  const [imageSourceType, setImageSourceType] = useState<'preset' | 'camera' | 'upload' | 'garden'>('preset');
  const [imageMetaInfo, setImageMetaInfo] = useState<string>('Reference specimen loaded · Ready for live scan');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [cropPreset, setCropPreset] = useState<'full' | 'square' | '4:3'>('full');

  // Camera state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string>('');
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [capturedFromCamera, setCapturedFromCamera] = useState<boolean>(false);

  // Smart Scanning state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStage, setScanStage] = useState<ScanStageMessage>('Idle');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [saveGardenStatus, setSaveGardenStatus] = useState<string>('');
  const [isSavingToGarden, setIsSavingToGarden] = useState<boolean>(false);

  // Results, Scan Status & Separated Source state
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'TEMPORARILY_UNAVAILABLE' | 'FAILED'>('SUCCESS');
  const [hasVerifiedScanResult, setHasVerifiedScanResult] = useState<boolean>(true);
  const [analysisResult, setAnalysisResult] = useState<any>(INITIAL_ANALYSIS_REPORT);
  const [scannedPhotoUrl, setScannedPhotoUrl] = useState<string>(DIAGNOSTIC_SAMPLES[0].imageUrl);
  const [comparisonScan, setComparisonScan] = useState<any | null>(null);
  const [savedGardenContextInfo, setSavedGardenContextInfo] = useState<any>(null);
  const [generalCareAdviceInfo, setGeneralCareAdviceInfo] = useState<any>(null);

  const [selectedPest, setSelectedPest] = useState(PEST_PROFILES[0]);
  const [selectedNutrient, setSelectedNutrient] = useState(NUTRIENT_PROFILES[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStartingRef = useRef<boolean>(false);
  const scanInFlightRef = useRef<boolean>(false);
  const stageTimersRef = useRef<number[]>([]);

  // Restore last scan from localStorage on mount so refresh never loses scan results
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(LAST_SCAN_STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && parsed.analysisResult && parsed.analysisResult.commonName) {
          setAnalysisResult((prev: any) => ({ ...prev, ...parsed.analysisResult }));
          if (parsed.scannedPhotoUrl) {
            setScannedPhotoUrl(parsed.scannedPhotoUrl);
            setPreviewImage(parsed.scannedPhotoUrl);
          }
          if (parsed.customPlantName) {
            setCustomPlantName(parsed.customPlantName);
          }
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }, []);

  // Stop all active camera media tracks cleanly
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

  // Cleanup camera stream and timers on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      stageTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, [stopCameraStream]);

  // Attach stream to video element whenever cameraActive or streamRef updates
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  // Helper: Start camera with facingMode ('environment' preferred on mobile, fallback to default video)
  const startCamera = async (preferredFacing: 'environment' | 'user' = cameraFacingMode) => {
    if (cameraStartingRef.current) return;
    setCameraError('');
    setErrorMessage('');

    // Check HTTPS / Secure Context & Browser MediaDevices support
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
      setCameraError(
        'Camera access requires a secure HTTPS connection. You are currently on an insecure HTTP connection—please access MYPLANTCARE over HTTPS or use the Upload Plant Photo option below.'
      );
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraError(
        'Your browser does not support camera streaming (navigator.mediaDevices.getUserMedia). Please use a modern browser over HTTPS or upload a plant photo from your device.'
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
        // Fallback to any available video camera (e.g. desktop webcam without facingMode support)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
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
        setCameraError(
          'Camera permission was denied. Please allow camera access in your browser address bar settings and try again, or use "Upload Plant Photo" below.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError(
          'No camera hardware was detected on this device. Please use "Upload Plant Photo" to scan a JPG, PNG, or WEBP image.'
        );
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError(
          'Your camera is currently in use by another application or tab. Please close other camera apps or upload a photo instead.'
        );
      } else {
        setCameraError(
          `Unable to initialise camera (${err?.message || 'Hardware unavailable'}). Note: Browser camera access requires HTTPS and granted camera permissions. You can upload a plant photo below.`
        );
      }
    } finally {
      cameraStartingRef.current = false;
    }
  };

  const handleSwitchCamera = async () => {
    const nextFacing: 'environment' | 'user' = cameraFacingMode === 'environment' ? 'user' : 'environment';
    await startCamera(nextFacing);
  };

  const handleCaptureCameraFrame = () => {
    if (!videoRef.current) return;
    setScanStage('Capturing plant image...');
    const video = videoRef.current;
    const rawW = video.videoWidth || 960;
    const rawH = video.videoHeight || 720;
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
    const targetW = Math.round(rawW * scale);
    const targetH = Math.round(rawH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      setPreviewImage(dataUrl);
      setUploadedBase64(dataUrl);
      setUploadedMime('image/jpeg');
      setImageSourceType('camera');
      setCapturedFromCamera(true);
      setRotationDeg(0);
      setCropPreset('full');
      setHasVerifiedScanResult(false);
      setScanStatus('IDLE');
      const approxKb = Math.round((dataUrl.length * 0.75) / 1024);
      setImageMetaInfo(`Captured from ${cameraFacingMode === 'environment' ? 'Rear' : 'Front'} Camera · ${targetW}×${targetH}px (${approxKb} KB)`);
    }
    stopCameraStream();
    setScanStage('Idle');
  };

  const handleRetakeCamera = async () => {
    setCapturedFromCamera(false);
    await startCamera(cameraFacingMode);
  };

  // Image processing helper: compress, rotate, or crop an image dataURL/source
  const processImageOnCanvas = useCallback(
    (
      srcUrl: string,
      options: { rotateDeltaDeg?: number; targetCrop?: 'full' | 'square' | '4:3'; maxDim?: number }
    ): Promise<{ dataUrl: string; width: number; height: number; kb: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const totalRotation = ((rotationDeg + (options.rotateDeltaDeg || 0)) % 360 + 360) % 360;
          const activeCrop = options.targetCrop || cropPreset;

          // Determine source crop box
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

          const maxDim = options.maxDim || 1280;
          const scale = Math.min(1, maxDim / Math.max(sw, sh));
          const drawW = Math.max(1, Math.round(sw * scale));
          const drawH = Math.max(1, Math.round(sh * scale));

          const canvas = document.createElement('canvas');
          const isRotated90 = totalRotation === 90 || totalRotation === 270;
          canvas.width = isRotated90 ? drawH : drawW;
          canvas.height = isRotated90 ? drawW : drawH;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not initialize image processing canvas.'));
            return;
          }

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((totalRotation * Math.PI) / 180);
          ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();

          const outDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const kb = Math.round((outDataUrl.length * 0.75) / 1024);
          resolve({ dataUrl: outDataUrl, width: canvas.width, height: canvas.height, kb });
        };
        img.onerror = () => reject(new Error('Failed to decode image for processing.'));
        img.src = srcUrl;
      });
    },
    [rotationDeg, cropPreset]
  );

  // Handle device file upload with format/size validation, progress indicator, and automatic compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setCameraError('');
    stopCameraStream();

    const fileType = (file.type || '').toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

    if (!ALLOWED_FILE_TYPES.includes(fileType) && !validExt) {
      setErrorMessage(
        `Invalid file format "${file.name}". Please upload a valid JPG, JPEG, PNG, or WEBP plant photograph.`
      );
      e.target.value = '';
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(
        `Image is too large (${sizeMb} MB). Maximum allowed file size is 15 MB. Please choose a smaller photograph.`
      );
      e.target.value = '';
      return;
    }

    setUploadProgress(15);
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.min(70, Math.round((ev.loaded / ev.total) * 70)));
      }
    };
    reader.onerror = () => {
      setUploadProgress(0);
      setErrorMessage('Failed to read the selected image file. Please try another photograph.');
    };
    reader.onload = async () => {
      try {
        setUploadProgress(85);
        const rawDataUrl = String(reader.result || '');
        const originalKb = Math.round(file.size / 1024);
        const processed = await processImageOnCanvas(rawDataUrl, {
          rotateDeltaDeg: -rotationDeg, // reset rotation to 0
          targetCrop: 'full',
          maxDim: 1280,
        });
        setRotationDeg(0);
        setCropPreset('full');
        setPreviewImage(processed.dataUrl);
        setUploadedBase64(processed.dataUrl);
        setUploadedMime('image/jpeg');
        setImageSourceType('upload');
        setCapturedFromCamera(false);
        setHasVerifiedScanResult(false);
        setScanStatus('IDLE');
        setImageMetaInfo(
          `Uploaded "${file.name}" · Compressed ${originalKb} KB → ${processed.kb} KB (${processed.width}×${processed.height}px)`
        );
        setUploadProgress(100);
        window.setTimeout(() => setUploadProgress(0), 1200);
      } catch (err: any) {
        setUploadProgress(0);
        setErrorMessage(err?.message || 'Could not process uploaded image.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Rotate current image left/right by 90 degrees
  const handleRotateImage = async (deltaDeg: number) => {
    try {
      setErrorMessage('');
      const res = await processImageOnCanvas(previewImage, { rotateDeltaDeg: deltaDeg });
      setRotationDeg((prev) => ((prev + deltaDeg) % 360 + 360) % 360);
      setPreviewImage(res.dataUrl);
      setUploadedBase64(res.dataUrl);
      setUploadedMime('image/jpeg');
      setImageMetaInfo(`Rotated image · ${res.width}×${res.height}px (${res.kb} KB)`);
    } catch {
      setErrorMessage('Unable to rotate this image.');
    }
  };

  // Crop current image to preset aspect ratio
  const handleCropImage = async (targetCrop: 'full' | 'square' | '4:3') => {
    try {
      setErrorMessage('');
      setCropPreset(targetCrop);
      const res = await processImageOnCanvas(previewImage, { targetCrop });
      setPreviewImage(res.dataUrl);
      setUploadedBase64(res.dataUrl);
      setUploadedMime('image/jpeg');
      setImageMetaInfo(
        `Cropped (${targetCrop === 'square' ? '1:1 Leaf Focus' : targetCrop === '4:3' ? '4:3 Canopy' : 'Full Frame'}) · ${res.width}×${res.height}px (${res.kb} KB)`
      );
    } catch {
      setErrorMessage('Unable to crop this image.');
    }
  };

  // Remove current uploaded/captured image
  const handleRemoveImage = () => {
    stopCameraStream();
    setUploadedBase64('');
    setCapturedFromCamera(false);
    setRotationDeg(0);
    setCropPreset('full');
    setPreviewImage(selectedSample.imageUrl);
    setImageSourceType('preset');
    setImageMetaInfo('Image cleared · Reverted to lab reference specimen');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectPreset = (preset: DiagnosticSamplePreset) => {
    stopCameraStream();
    setSelectedSample(preset);
    setCustomPlantName(preset.plantName);
    setSymptomsInput(preset.symptomsText);
    setPreviewImage(preset.imageUrl);
    setUploadedBase64('');
    setCapturedFromCamera(false);
    setImageSourceType('preset');
    setImageMetaInfo(`Lab Reference Preset: ${preset.plantName}`);
    setErrorMessage('');
    setHasVerifiedScanResult(false);
    setScanStatus('IDLE');
  };

  const handleSelectGardenPlant = (plant: any) => {
    stopCameraStream();
    setCustomPlantName(`${plant.name} (${plant.species})`);
    setSymptomsInput(plant.notes || `Routine health check for ${plant.name} located at ${plant.location}.`);
    if (plant.imageUrl) {
      setPreviewImage(plant.imageUrl);
    }
    setUploadedBase64('');
    setCapturedFromCamera(false);
    setImageSourceType('garden');
    setImageMetaInfo(`My Garden Specimen: ${plant.name}`);
    setErrorMessage('');
    setHasVerifiedScanResult(false);
    setScanStatus('IDLE');
  };

  // Ensure we always send real image base64 bytes to the multimodal Gemini backend
  const ensureBase64ForCurrentPreview = async (): Promise<{ base64: string; mime: string }> => {
    if (uploadedBase64 && uploadedBase64.startsWith('data:image/')) {
      return { base64: uploadedBase64, mime: uploadedMime || 'image/jpeg' };
    }
    if (previewImage && previewImage.startsWith('data:image/')) {
      return { base64: previewImage, mime: 'image/jpeg' };
    }
    if (previewImage) {
      try {
        const processed = await processImageOnCanvas(previewImage, { maxDim: 1024 });
        return { base64: processed.dataUrl, mime: 'image/jpeg' };
      } catch {
        return { base64: '', mime: 'image/jpeg' };
      }
    }
    return { base64: '', mime: 'image/jpeg' };
  };

  // Run real multimodal Gemini AI plant identification & health diagnosis with intelligent retry & backoff
  const handleRunGeminiAnalysis = async () => {
    if (scanInFlightRef.current || isScanning) return;
    scanInFlightRef.current = true;
    setIsScanning(true);
    setErrorMessage('');
    setSaveGardenStatus('');

    // Clear any leftover timers
    stageTimersRef.current.forEach((id) => window.clearTimeout(id));
    stageTimersRef.current = [];

    // Real stage progression tied to actual processing pipeline
    setScanStage('Analysing leaves...');
    setScanProgress(20);

    const t1 = window.setTimeout(() => {
      setScanStage('Identifying plant...');
      setScanProgress(45);
    }, 1100);
    const t2 = window.setTimeout(() => {
      setScanStage('Checking plant health...');
      setScanProgress(72);
    }, 2400);
    const t3 = window.setTimeout(() => {
      setScanStage('Preparing your report...');
      setScanProgress(88);
    }, 3800);
    stageTimersRef.current.push(t1, t2, t3);

    try {
      const { base64, mime } = await ensureBase64ForCurrentPreview();

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const endpointMap: Record<DiagnosticSubMode, { url: string; mode: string }> = {
        identify: { url: '/api/plant/identify', mode: 'identification' },
        doctor: { url: '/api/plant/diagnose', mode: 'disease' },
        pest: { url: '/api/plant/pest-detection', mode: 'pest' },
        nutrient: { url: '/api/plant/nutrient-analysis', mode: 'nutrient' },
        rescue: { url: '/api/plant/rescue', mode: 'rescue' },
      };

      const target = endpointMap[activeSubMode] || endpointMap.doctor;

      const maxClientRetries = 3;
      let data: any = null;
      let lastErr: any = null;

      for (let attempt = 0; attempt <= maxClientRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 65000);
        try {
          const res = await fetch(target.url, {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: JSON.stringify({
              mode: target.mode,
              plantName: customPlantName,
              symptomsText: symptomsInput,
              imageBase64: base64 || undefined,
              imageUrl: previewImage,
              mimeType: mime,
              saveToMemory: true,
            }),
          });
          window.clearTimeout(timeoutId);

          const bodyJson = await res.json().catch(() => ({}));
          if (res.ok && bodyJson.analysis) {
            data = bodyJson;
            break;
          }

          // Do not retry 400/401/403 client validation or invalid API key errors
          if (res.status === 400 || res.status === 401 || res.status === 403 || bodyJson.retryable === false) {
            const nonRetryErr: any = new Error(
              bodyJson.error || 'Please check your uploaded plant image and try again.'
            );
            nonRetryErr.nonRetryable = true;
            throw nonRetryErr;
          }

          // Transient 503, 429, 500, 502, 504 -> retry with exponential backoff + random jitter
          lastErr = new Error(
            'GREENY is temporarily unable to connect to the Plant Doctor. Your uploaded image is safe. Please try again.'
          );
          if (attempt < maxClientRetries) {
            const backoffMs = Math.min(6000, 900 * Math.pow(2, attempt) + Math.floor(Math.random() * 400));
            setScanStage('Checking plant health...');
            setScanProgress(Math.min(92, 60 + attempt * 10));
            await new Promise((r) => window.setTimeout(r, backoffMs));
            continue;
          }
        } catch (fetchErr: any) {
          window.clearTimeout(timeoutId);
          if (fetchErr?.nonRetryable) {
            throw fetchErr;
          }
          lastErr = fetchErr;
          if (attempt < maxClientRetries) {
            const backoffMs = Math.min(6000, 900 * Math.pow(2, attempt) + Math.floor(Math.random() * 400));
            await new Promise((r) => window.setTimeout(r, backoffMs));
            continue;
          }
        }
      }

      if (!data || !data.analysis) {
        throw (
          lastErr ||
          new Error(
            'GREENY is temporarily unable to connect to the Plant Doctor. Your uploaded image is safe. Please try again.'
          )
        );
      }

      const mergedResult = {
        ...INITIAL_ANALYSIS_REPORT,
        ...data.analysis,
        careSummary: {
          ...INITIAL_ANALYSIS_REPORT.careSummary,
          ...(data.analysis.careSummary || {}),
        },
        rescuePlan: {
          ...INITIAL_ANALYSIS_REPORT.rescuePlan,
          ...(data.analysis.rescuePlan || {}),
        },
      };
      setAnalysisResult(mergedResult);
      setScannedPhotoUrl(previewImage);
      setHasVerifiedScanResult(true);
      setScanStatus('SUCCESS');
      if (data.savedGardenInfo) setSavedGardenContextInfo(data.savedGardenInfo);
      if (data.generalCareAdvice) setGeneralCareAdviceInfo(data.generalCareAdvice);
      setScanProgress(100);

      // Emit contextual emotional reaction to GREENY 3D Companion
      const score = Number(mergedResult.healthScore ?? 85);
      const statusLower = String(mergedResult.overallHealthStatus || '').toLowerCase();
      if (score >= 80 && !statusLower.includes('critical') && !statusLower.includes('disease')) {
        emitGreenyAppEvent({
          type: 'USER_SCANNED_HEALTHY_PLANT',
          plantName: mergedResult.commonName,
        });
      } else {
        emitGreenyAppEvent({
          type: 'USER_SCANNED_DISEASED_PLANT',
          plantName: mergedResult.commonName,
        });
      }

      // Persist in localStorage so refreshing the page never loses the scan result
      try {
        localStorage.setItem(
          LAST_SCAN_STORAGE_KEY,
          JSON.stringify({
            analysisResult: mergedResult,
            scannedPhotoUrl: previewImage,
            customPlantName: mergedResult.commonName
              ? `${mergedResult.commonName} (${mergedResult.scientificName || ''})`
              : customPlantName,
            savedAt: new Date().toISOString(),
          })
        );
      } catch {
        // ignore quota error
      }

      onDiagnosisSaved();
    } catch (err: any) {
      // Crucial: When Gemini returns 503 or fails, mark scan as TEMPORARILY_UNAVAILABLE / FAILED
      // and NEVER display saved plant memory as a new scan result!
      setHasVerifiedScanResult(false);
      if (err?.nonRetryable && err?.message) {
        setScanStatus('FAILED');
        setErrorMessage(err.message);
      } else {
        setScanStatus('TEMPORARILY_UNAVAILABLE');
        setErrorMessage(
          'GREENY is temporarily unable to connect to the Plant Doctor. Your uploaded image is safe. Please try again.'
        );
      }
      emitGreenyAppEvent({ type: 'USER_RECEIVED_ERROR' });
    } finally {
      stageTimersRef.current.forEach((id) => window.clearTimeout(id));
      stageTimersRef.current = [];
      setIsScanning(false);
      setScanStage('Idle');
      scanInFlightRef.current = false;
    }
  };

  // Save Scanned Plant + Photo + Identification + Health Report to My Garden
  const handleSaveToMyGarden = async () => {
    if (isSavingToGarden) return;
    setIsSavingToGarden(true);
    setSaveGardenStatus('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/plant/save-scan-to-garden', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          commonName: analysisResult.commonName || customPlantName,
          scientificName: analysisResult.scientificName || '',
          plantCategory: analysisResult.plantCategory || analysisResult.plantFamily || 'Botanical Specimen',
          soilType: analysisResult.careSummary?.soil || 'Well-draining Organic Mix',
          sunlight: analysisResult.careSummary?.sunlight || 'Bright Indirect Light',
          healthScore: analysisResult.healthScore ?? 88,
          overallHealthStatus: analysisResult.overallHealthStatus || analysisResult.severity || 'Healthy',
          possibleCondition: analysisResult.possibleCondition,
          confidence: analysisResult.confidence ?? 92,
          visibleSymptoms: analysisResult.visibleSymptoms || [],
          possibleCauses: analysisResult.possibleCauses || [],
          safeTreatments: analysisResult.safeTreatments || [],
          preventionStrategy: analysisResult.preventionStrategy || '',
          imageUrl: scannedPhotoUrl || previewImage,
          reportData: analysisResult,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save to My Garden');
      setSaveGardenStatus(data.message || 'Saved plant, photograph, and health report to My Garden!');
      onDiagnosisSaved();
    } catch (err: any) {
      setSaveGardenStatus(`Error: ${err?.message || 'Could not save to My Garden'}`);
    } finally {
      setIsSavingToGarden(false);
    }
  };

  // Download structured botanical & health report
  const handleDownloadReport = () => {
    const reportLines = [
      '====================================================================',
      'MYPLANTCARE — AI BOTANICAL IDENTIFICATION & PLANT HEALTH REPORT',
      'Tagline: Grow Better. Care Smarter. Live Greener.',
      `Scan Date: ${analysisResult.scannedDate || new Date().toISOString().slice(0, 10)}`,
      '====================================================================',
      '',
      '1. PLANT IDENTIFICATION',
      `• Common Name: ${analysisResult.commonName}`,
      `• Scientific Name: ${analysisResult.scientificName}`,
      `• Plant Category: ${analysisResult.plantCategory || analysisResult.plantFamily}`,
      `• Plant Family: ${analysisResult.plantFamily}`,
      `• Identification Confidence: ${analysisResult.confidence}%`,
      `• Visible Characteristics:`,
      ...(analysisResult.visibleCharacteristics || []).map((c: string) => `   - ${c}`),
      '',
      '2. PLANT CARE REQUIREMENTS',
      `• Sunlight Requirements: ${analysisResult.careSummary?.sunlight}`,
      `• Watering Requirements: ${analysisResult.careSummary?.watering}`,
      `• Soil Type: ${analysisResult.careSummary?.soil}`,
      `• Temperature Requirements: ${analysisResult.careSummary?.temperature || '18°C – 28°C'}`,
      `• Growth Characteristics: ${analysisResult.careSummary?.growthCharacteristics || analysisResult.careSummary?.suitability}`,
      '',
      '3. AI PLANT DOCTOR — PLANT HEALTH REPORT',
      `• Overall Health Status: ${analysisResult.overallHealthStatus || analysisResult.severity}`,
      `• Plant Health Score: ${analysisResult.healthScore}/100`,
      `• Diagnosis Confidence: ${analysisResult.diagnosisConfidence || analysisResult.confidence}%`,
      `• Primary Visual Hypothesis: ${analysisResult.possibleCondition}`,
      '',
      '• Observed Symptoms (Visually Detected on Specimen):',
      ...(analysisResult.visibleSymptoms || []).map((s: string) => `   - ${s}`),
      '',
      '• Possible Causes (Hypothesized Biotic / Abiotic Factors):',
      ...(analysisResult.possibleCauses || []).map((c: string) => `   - ${c}`),
      '',
      '• Recommended Immediate Actions:',
      ...(analysisResult.immediateActions || []).map((a: string) => `   - ${a}`),
      '',
      `• Watering Adjustments: ${analysisResult.wateringAdjustments || analysisResult.rescuePlan?.wateringAdjustment}`,
      `• Sunlight Adjustments: ${analysisResult.sunlightAdjustments || analysisResult.rescuePlan?.sunlightAdjustment}`,
      `• Soil Recommendations: ${analysisResult.soilRecommendations || analysisResult.rescuePlan?.soilRecoverySteps}`,
      '',
      '• Safe Bio-Rational Treatment Options:',
      ...(analysisResult.safeTreatments || []).map((t: string) => `   - ${t}`),
      '',
      `• Follow-Up Inspection: ${analysisResult.followUpRecommendations || analysisResult.preventionStrategy}`,
      '',
      '4. SCIENTIFIC DISCLAIMER',
      analysisResult.disclaimer ||
        'Visual AI analysis distinguishes observed symptoms from possible causes and does not replace laboratory pathology or soil testing.',
      '====================================================================',
    ];

    const blob = new Blob([reportLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = String(analysisResult.commonName || 'plant-scan')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `myplantcare-report-${safeName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load a saved historical scan into the Results Dashboard
  const handleLoadPreviousScan = (diagRecord: any) => {
    try {
      if (diagRecord.reportJson && diagRecord.reportJson !== '{}') {
        const parsedReport = JSON.parse(diagRecord.reportJson);
        setAnalysisResult((prev: any) => ({ ...prev, ...parsedReport }));
      } else {
        setAnalysisResult((prev: any) => ({
          ...prev,
          commonName: diagRecord.plantName,
          scientificName: diagRecord.scientificName || diagRecord.plantName,
          plantCategory: diagRecord.plantCategory || 'Botanical Specimen',
          confidence: diagRecord.confidence || 90,
          healthScore: diagRecord.healthScore || 80,
          overallHealthStatus: diagRecord.severity || 'Moderate',
          possibleCondition: diagRecord.possibleCondition,
          visibleSymptoms: String(diagRecord.symptoms || '').split('; ').filter(Boolean),
          possibleCauses: String(diagRecord.causes || '').split('; ').filter(Boolean),
          safeTreatments: String(diagRecord.recommendations || '').split('; ').filter(Boolean),
          preventionStrategy: diagRecord.prevention || '',
          scannedDate: diagRecord.scannedDate || '2026-11-12',
        }));
      }
      if (diagRecord.imageUrl) {
        setScannedPhotoUrl(diagRecord.imageUrl);
        setPreviewImage(diagRecord.imageUrl);
      }
      setCustomPlantName(diagRecord.plantName);
      setHasVerifiedScanResult(true);
      setScanStatus('SUCCESS');
      setErrorMessage('');
    } catch {
      // ignore parse error
    }
  };

  const handleScanAgain = () => {
    setErrorMessage('');
    setSaveGardenStatus('');
    setComparisonScan(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Sub-module Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {activeSubMode === 'identify'
              ? 'AI Plant Identification Studio'
              : activeSubMode === 'pest'
              ? 'AI Pest Detection & Bio-Rational IPM Lab'
              : activeSubMode === 'nutrient'
              ? 'AI Nutrient Deficiency Detector'
              : activeSubMode === 'rescue'
              ? 'AI Emergency Plant Rescue & 9-Step Recovery System'
              : 'AI Plant Scanner & Plant Doctor — Identification & Disease Intelligence'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
            Live Camera & Multi-Format Image Scanner · Multimodal Gemini AI · Scientific Pathology & Care Report
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#071B12] rounded-xl border border-slate-200 dark:border-[#123D2A]">
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
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeSubMode === id
                  ? 'bg-[#00C878] text-[#071B12]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scientific Safety Notice Banner */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Scientific Diagnostic Transparency:</span> Photographs provide{' '}
          <strong>observed visual symptoms</strong> and <strong>possible AI hypotheses</strong> rather than confirmed laboratory pathogen proofs or soil tests. All treatment recommendations prioritize safe organic and bio-rational horticulture.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: SMART SCANNER VIEWPORT, CAMERA & UPLOAD CONTROLS */}
        <div className="lg:col-span-5 space-y-4">
          {/* 5. SMART SCANNING INTERFACE VIEWPORT */}
          <div
            onClick={(e) => {
              if (!cameraActive) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              window.setTimeout(() => setFocusPoint(null), 1200);
            }}
            className="relative rounded-2xl overflow-hidden border-2 border-[#123D2A] bg-[#071B12] h-[360px] flex items-center justify-center select-none group"
          >
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={previewImage}
                alt={customPlantName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300"
              />
            )}

            {/* Animated Corner Brackets */}
            <div className="pointer-events-none absolute inset-4">
              <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-[#00C878] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-[#00C878] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-[#00C878] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-[#00C878] rounded-br-lg" />
            </div>

            {/* Animated Circular Scanning Frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`w-48 h-48 rounded-full border-2 border-dashed transition-all duration-500 flex items-center justify-center ${
                  isScanning
                    ? 'border-[#B7F76B] scale-105 animate-spin'
                    : cameraActive
                    ? 'border-[#00C878]/80 scale-100'
                    : 'border-[#00C878]/45 scale-95'
                }`}
              >
                <div className="w-36 h-36 rounded-full border border-[#00C878]/30" />
              </div>
            </div>

            {/* Moving Green Laser Scanning Line */}
            <div className="pointer-events-none absolute inset-x-4 top-4 bottom-14 overflow-hidden">
              <div
                className={`w-full h-1 bg-gradient-to-r from-transparent via-[#00C878] to-transparent shadow-[0_0_16px_#00C878] animate-scanline ${
                  isScanning ? 'opacity-100' : 'opacity-65'
                }`}
              />
            </div>

            {/* Floating Botanical Leaf Particles Overlay */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <span className="absolute top-8 left-10 w-2 h-2 rounded-full bg-[#B7F76B]/60 animate-ping" />
              <span className="absolute top-16 right-12 w-1.5 h-1.5 rounded-full bg-[#00C878]/70 animate-pulse" />
              <span className="absolute bottom-20 left-16 w-2 h-2 rounded-full bg-[#00C878]/50 animate-bounce" />
              <span className="absolute bottom-24 right-14 w-1.5 h-1.5 rounded-full bg-[#B7F76B]/70 animate-ping" />
            </div>

            {/* Camera Tap-to-Focus Reticle Animation */}
            {focusPoint && (
              <div
                style={{ left: focusPoint.x - 24, top: focusPoint.y - 24 }}
                className="pointer-events-none absolute w-12 h-12 border-2 border-[#B7F76B] rounded-full animate-ping"
              />
            )}

            {/* Active Processing / Stage Overlay when Scanning */}
            {(isScanning || scanStage !== 'Idle') && (
              <div className="absolute inset-0 bg-[#071B12]/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="w-14 h-14 rounded-full border-2 border-[#00C878] border-t-[#B7F76B] animate-spin flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-[#B7F76B]" />
                </div>
                <div className="text-sm font-bold text-white tracking-wide">{scanStage}</div>
                <div className="text-xs text-[#B7F76B] mt-1 font-mono">
                  Multimodal Gemini Vision · {scanProgress}%
                </div>
                <div className="w-56 h-2 bg-[#123D2A] rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-gradient-to-r from-[#00C878] to-[#B7F76B] transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Top Badge: Camera Mode / Image Source */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-[#071B12]/85 border border-[#123D2A] text-[11px] font-mono text-[#00C878]">
                {cameraActive
                  ? `LIVE CAMERA (${cameraFacingMode === 'environment' ? 'REAR' : 'FRONT'})`
                  : `SOURCE: ${imageSourceType.toUpperCase()}`}
              </span>
              {cameraActive && (
                <span className="px-2.5 py-1 rounded-lg bg-[#071B12]/85 border border-[#123D2A] text-[11px] text-[#B7F76B]">
                  Tap preview to focus
                </span>
              )}
            </div>

            {/* Bottom Status Bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-[#071B12]/90 px-3 py-2 rounded-xl border border-[#123D2A] text-xs text-[#F7F9F2]">
              <span className="truncate font-medium">{imageMetaInfo}</span>
              <span className="font-mono text-[#B7F76B] shrink-0 ml-2">
                {isScanning ? scanStage : `MODE: ${activeSubMode.toUpperCase()}`}
              </span>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress > 0 && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#0B2419] border border-slate-200 dark:border-[#123D2A] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#00C878]">
                <span>Validating & Compressing Plant Image...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#071B12] overflow-hidden">
                <div
                  className="h-full bg-[#00C878] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* 1. CAMERA CONTROLS & 2. IMAGE UPLOAD CONTROLS */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              aria-label="Upload Plant Photo (JPG, JPEG, PNG, WEBP)"
              className="hidden"
            />

            {/* Primary Camera & Upload Action Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => startCamera(cameraFacingMode)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#123D2A] text-[#F7F9F2] text-xs font-semibold hover:bg-[#00C878] hover:text-[#071B12] transition-colors"
                >
                  <Camera className="w-4 h-4" /> Open Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureCameraFrame}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#00C878] text-[#071B12] text-xs font-bold hover:bg-[#B7F76B] transition-colors"
                >
                  <Camera className="w-4 h-4" /> Capture Photo
                </button>
              )}

              {cameraActive ? (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-slate-900 dark:text-white text-xs font-semibold hover:border-[#00C878] transition-colors"
                >
                  <SwitchCamera className="w-4 h-4 text-[#00C878]" />
                  Switch ({cameraFacingMode === 'environment' ? 'Rear→Front' : 'Front→Rear'})
                </button>
              ) : capturedFromCamera ? (
                <button
                  type="button"
                  onClick={handleRetakeCamera}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Retake Photo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera(cameraFacingMode === 'environment' ? 'user' : 'environment')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-slate-900 dark:text-white text-xs font-semibold hover:border-[#00C878] transition-colors"
                >
                  <SwitchCamera className="w-4 h-4 text-[#00C878]" />
                  {cameraFacingMode === 'environment' ? 'Rear Cam Preferred' : 'Front Cam Preferred'}
                </button>
              )}

              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-semibold hover:bg-red-500/25 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Close Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123D2A] text-slate-900 dark:text-white text-xs font-semibold hover:bg-[#00C878] hover:text-[#071B12] transition-colors"
                >
                  <Upload className="w-4 h-4" /> {uploadedBase64 ? 'Replace Photo' : 'Upload Photo'}
                </button>
              )}
            </div>

            {/* Image Manipulation Toolbar: Rotate, Crop, Remove */}
            {!cameraActive && (
              <div className="pt-2 border-t border-slate-200 dark:border-[#123D2A] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRotateImage(-90)}
                    title="Rotate 90° Counter-Clockwise"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs font-medium text-slate-700 dark:text-[#F7F9F2] hover:border-[#00C878] flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#00C878]" /> Rotate Left
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateImage(90)}
                    title="Rotate 90° Clockwise"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs font-medium text-slate-700 dark:text-[#F7F9F2] hover:border-[#00C878] flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#00C878]" /> Rotate Right
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <Crop className="w-3.5 h-3.5 text-[#B7F76B] mr-0.5" />
                  {(['full', 'square', '4:3'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleCropImage(preset)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                        cropPreset === preset
                          ? 'bg-[#00C878] text-[#071B12] border-[#00C878] font-bold'
                          : 'bg-slate-100 dark:bg-[#071B12] border-slate-200 dark:border-[#123D2A] text-slate-600 dark:text-[#F7F9F2]/75'
                      }`}
                    >
                      {preset === 'full' ? 'Full' : preset === 'square' ? '1:1 Crop' : '4:3 Crop'}
                    </button>
                  ))}
                  {(uploadedBase64 || capturedFromCamera) && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      title="Remove uploaded/captured photo"
                      className="ml-1 p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/60 flex items-center justify-between">
              <span>Supported formats: JPG, JPEG, PNG, WEBP (Auto-compressed)</span>
              <span>HTTPS Camera Ready</span>
            </div>

            {/* Meaningful Camera Error Alert */}
            {cameraError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-900 dark:text-amber-200 space-y-1"
              >
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Camera Access Notice
                </div>
                <p>{cameraError}</p>
              </div>
            )}
          </div>

          {/* Quick-Select from My Garden or Lab Presets + Scan Button */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3">
            {plants.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700 dark:text-[#00C878]">
                  Quick-Select Registered Plant from My Garden:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {plants.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectGardenPlant(p)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] hover:border-[#00C878] text-slate-800 dark:text-[#F7F9F2]"
                    >
                      {p.name} ({p.healthScore}%)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs font-semibold text-slate-700 dark:text-[#B7F76B]">
              Or Select a Calibration Specimen to Test Scanner:
            </div>
            <div className="space-y-1.5">
              {DIAGNOSTIC_SAMPLES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors border ${
                    selectedSample.id === preset.id && imageSourceType === 'preset'
                      ? 'bg-[#00C878]/15 border-[#00C878] text-slate-900 dark:text-white font-semibold'
                      : 'border-slate-200 dark:border-[#123D2A] text-slate-600 dark:text-[#F7F9F2]/75'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <label htmlFor="diag-plant-name" className="block text-xs font-medium text-slate-700 dark:text-[#F7F9F2]/80">
                Optional Plant Name / Context Hint
              </label>
              <input
                id="diag-plant-name"
                type="text"
                value={customPlantName}
                onChange={(e) => setCustomPlantName(e.target.value)}
                placeholder="Leave blank or enter plant hint..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-slate-900 dark:text-white"
              />
              <label htmlFor="diag-symptoms-notes" className="block text-xs font-medium text-slate-700 dark:text-[#F7F9F2]/80">
                Observed Leaf / Stem / Soil Notes (Optional)
              </label>
              <textarea
                id="diag-symptoms-notes"
                rows={2}
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-slate-900 dark:text-white"
              />
            </div>

            {/* Primary Scan Button (Protected against duplicate submissions) */}
            <button
              type="button"
              onClick={handleRunGeminiAnalysis}
              disabled={isScanning}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 shadow-md"
            >
              <Scan className="w-4 h-4" />
              {isScanning
                ? `${scanStage} (${scanProgress}%)`
                : 'Scan Plant Now (AI Identification & Health Diagnosis)'}
            </button>

            {errorMessage && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-[#071B12] border-2 border-[#D4B56A]/60 text-[#F7F9F2] space-y-3 shadow-lg"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#D4B56A] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-mono uppercase tracking-wider text-[#B7F76B]">
                      GREENY BOTANICAL CONNECTION NOTICE
                    </div>
                    <p className="text-xs leading-relaxed text-[#F7F9F2]/95 font-medium">
                      {errorMessage}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRunGeminiAnalysis}
                    disabled={isScanning}
                    className="px-3.5 py-2 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="px-3.5 py-2 rounded-xl bg-[#123D2A] text-[#F7F9F2] border border-[#00C878]/30 font-semibold text-xs hover:bg-[#00C878] hover:text-[#071B12] transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Change Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      onSubModeChange('doctor');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800/80 text-[#F7F9F2]/85 border border-[#123D2A] font-semibold text-xs hover:text-white transition-colors"
                  >
                    Return to Plant Doctor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 6. RESULTS DASHBOARD (SEPARATED SOURCES: AI IMAGE ANALYSIS vs SAVED GARDEN INFORMATION vs GENERAL PLANT CARE ADVICE) */}
        <div className="lg:col-span-7 space-y-5">
          {/* SOURCE 1: AI IMAGE ANALYSIS SECTION */}
          {hasVerifiedScanResult && scanStatus === 'SUCCESS' ? (
            <div
              data-testid="ai-image-analysis-section"
              className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#123D2A]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#00C878]/15 border border-[#00C878]/40 text-[11px] font-mono font-bold text-[#00C878] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Image Analysis
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-[#B7F76B]">
                      {analysisResult.resolvedModel
                        ? `MODEL: ${String(analysisResult.resolvedModel).toUpperCase()}${
                            analysisResult.usedBackupModel ? ' (BACKUP FAILOVER)' : ''
                          }`
                        : 'VERIFIED MULTIMODAL SCAN'}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                    {analysisResult.commonName}{' '}
                    <span className="italic font-normal text-slate-500 dark:text-[#B7F76B]">
                      ({analysisResult.scientificName})
                    </span>
                  </h3>
                </div>

                {/* Action Buttons: Save to My Garden, Download Report, Scan Again */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveToMyGarden}
                    disabled={isSavingToGarden}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors disabled:opacity-50"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    {isSavingToGarden ? 'Saving...' : 'Save to My Garden'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#123D2A] text-slate-900 dark:text-white font-semibold text-xs hover:bg-[#00C878] hover:text-[#071B12] transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download Report
                  </button>
                  <button
                    type="button"
                    onClick={handleScanAgain}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-slate-700 dark:text-[#F7F9F2] font-semibold text-xs hover:border-[#00C878] transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Scan Again
                  </button>
                </div>
              </div>

              {saveGardenStatus && (
                <div className="p-3 rounded-xl bg-[#00C878]/15 border border-[#00C878]/40 text-xs font-semibold text-emerald-900 dark:text-[#B7F76B] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00C878] shrink-0" />
                  <span>{saveGardenStatus}</span>
                </div>
              )}

              {/* Scanned Photograph + Core Identification Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                <div className="md:col-span-4 rounded-xl overflow-hidden border border-slate-200 dark:border-[#123D2A] bg-[#071B12] relative min-h-[180px]">
                  <img
                    src={scannedPhotoUrl || previewImage}
                    alt={analysisResult.commonName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover max-h-[220px]"
                  />
                  <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-lg bg-[#071B12]/85 text-[10px] font-mono text-[#B7F76B] flex items-center justify-between">
                    <span>Scanned Photograph</span>
                    <span>{analysisResult.scannedDate || '2026-11-12'}</span>
                  </div>
                </div>

                <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/60">Plant Category</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                      {analysisResult.plantCategory || analysisResult.plantFamily || 'Tropical Botanical'}
                    </div>
                    <div className="text-[10px] text-[#00C878] font-mono mt-0.5">
                      Family: {analysisResult.plantFamily || 'Botanical'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/60">ID Confidence</div>
                    <div className="text-2xl font-extrabold font-mono text-[#00C878] mt-0.5 tabular-nums">
                      {analysisResult.confidence ?? 92}%
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-[#F7F9F2]/60">
                      Taxonomy Match
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/60">Plant Health Score</div>
                    <div className="text-2xl font-extrabold font-mono text-[#B7F76B] mt-0.5 tabular-nums">
                      {analysisResult.healthScore ?? 80}/100
                    </div>
                    <div className="text-[10px] text-amber-500 font-semibold">
                      {analysisResult.overallHealthStatus || analysisResult.severity}
                    </div>
                  </div>

                  {/* Visible Characteristics */}
                  <div className="col-span-2 sm:col-span-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#00C878] mb-1">
                      Observed Morphological Characteristics
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-[#F7F9F2]/85">
                      {(
                        analysisResult.visibleCharacteristics || [
                          'Distinctive foliar lamina and venation pattern matching identified species',
                        ]
                      ).map((char: string, idx: number) => (
                        <li key={idx}>• {char}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. CARE REQUIREMENTS MATRIX (Sunlight, Watering, Soil, Temperature, Growth) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#B7F76B]">
                  Species Care Requirements & Growth Profile (From AI Image Analysis)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-[11px] text-[#00C878] font-semibold flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5" /> Sunlight Requirements
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-white mt-1">
                      {analysisResult.careSummary?.sunlight || 'Bright Indirect Light (4–6 hrs)'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-[11px] text-[#00C878] font-semibold flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5" /> Watering Requirements
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-white mt-1">
                      {analysisResult.careSummary?.watering || 'Water when top 4–5 cm of soil is dry'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-[11px] text-[#00C878] font-semibold flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5" /> Soil Type & pH
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-white mt-1">
                      {analysisResult.careSummary?.soil || 'Well-draining loamy organic mix (pH 6.0–6.8)'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-[11px] text-[#00C878] font-semibold flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5" /> Temperature Requirements
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-white mt-1">
                      {analysisResult.careSummary?.temperature || '18°C – 29°C (65°F – 85°F)'}
                    </div>
                  </div>

                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-[11px] text-[#00C878] font-semibold flex items-center gap-1">
                      <Sprout className="w-3.5 h-3.5" /> Growth Characteristics & Similar Species
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-white mt-1">
                      {analysisResult.careSummary?.growthCharacteristics ||
                        analysisResult.careSummary?.suitability ||
                        'Moderate to vigorous seasonal foliar growth.'}
                      {Array.isArray(analysisResult.similarSpecies) && analysisResult.similarSpecies.length > 0 && (
                        <span className="block text-[11px] text-slate-500 dark:text-[#F7F9F2]/65 mt-0.5">
                          Lookalike Species: {analysisResult.similarSpecies.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. AI PLANT DOCTOR — STRUCTURED PLANT HEALTH REPORT */}
              <div className="pt-4 border-t border-slate-200 dark:border-[#123D2A] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-[#B7F76B]">
                      PLANT HEALTH REPORT · DISEASE, PEST & NUTRIENT SCANNING
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {analysisResult.possibleCondition}
                    </h4>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-[#00C878]/15 border border-[#00C878]/40 text-xs font-mono font-bold text-[#00C878]">
                    Diagnosis Confidence: {analysisResult.diagnosisConfidence ?? analysisResult.confidence ?? 88}%
                  </span>
                </div>

                {/* Detected Anomalies Tags */}
                {Array.isArray(analysisResult.detectedAnomalies) && analysisResult.detectedAnomalies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.detectedAnomalies.map((anomaly: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                      >
                        {anomaly}
                      </span>
                    ))}
                  </div>
                )}

                {/* Observed Symptoms vs. Possible Causes (Clearly Distinguished) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" /> Observed Symptoms (Visual Evidence)
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-[#F7F9F2]/85">
                      {(analysisResult.visibleSymptoms || []).map((s: string, i: number) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-4 h-4 text-[#D4B56A]" /> Possible Causes (Unconfirmed Hypotheses)
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-[#F7F9F2]/85">
                      {(analysisResult.possibleCauses || []).map((c: string, i: number) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Immediate Actions & Possible Treatment Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                      <HeartPulse className="w-4 h-4 text-[#00C878]" /> Recommended Immediate Actions
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-[#F7F9F2]/85">
                      {(
                        analysisResult.immediateActions ||
                        [analysisResult.rescuePlan?.immediateActions].filter(Boolean)
                      ).map((act: string, i: number) => (
                        <li key={i}>• {act}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00C878]" /> Possible Safe Treatment Options
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-[#F7F9F2]/85">
                      {(analysisResult.safeTreatments || []).map((t: string, i: number) => (
                        <li key={i}>• {t}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Watering, Sunlight, Soil Adjustments & Follow-up Inspection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="font-mono text-[11px] text-[#00C878]">WATERING ADJUSTMENTS</div>
                    <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">
                      {analysisResult.wateringAdjustments || analysisResult.rescuePlan?.wateringAdjustment}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="font-mono text-[11px] text-[#00C878]">SUNLIGHT ADJUSTMENTS</div>
                    <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">
                      {analysisResult.sunlightAdjustments || analysisResult.rescuePlan?.sunlightAdjustment}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="font-mono text-[11px] text-[#00C878]">SOIL RECOMMENDATIONS</div>
                    <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">
                      {analysisResult.soilRecommendations || analysisResult.rescuePlan?.soilRecoverySteps}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="font-mono text-[11px] text-[#B7F76B]">FOLLOW-UP INSPECTION</div>
                    <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">
                      {analysisResult.followUpRecommendations || analysisResult.preventionStrategy}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* WHEN NO VERIFIED IMAGE SCAN EXISTS OR HTTP 503 OCCURRED: DO NOT CLAIM PLANT WAS IDENTIFIED */
            <div
              data-testid="ai-image-analysis-status-card"
              className={`p-6 rounded-2xl border space-y-4 ${
                scanStatus === 'TEMPORARILY_UNAVAILABLE' || scanStatus === 'FAILED'
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 ${
                      scanStatus === 'TEMPORARILY_UNAVAILABLE' || scanStatus === 'FAILED'
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'bg-[#00C878]/15 border border-[#00C878]/40 text-[#00C878]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> AI Image Analysis:{' '}
                    {scanStatus === 'TEMPORARILY_UNAVAILABLE'
                      ? 'TEMPORARILY UNAVAILABLE (HTTP 503)'
                      : scanStatus === 'FAILED'
                      ? 'ANALYSIS FAILED'
                      : scanStatus === 'SCANNING'
                      ? 'ANALYSING PHOTOGRAPH...'
                      : 'READY TO SCAN PHOTOGRAPH'}
                  </span>
                </div>

                {(scanStatus === 'TEMPORARILY_UNAVAILABLE' || scanStatus === 'FAILED') && (
                  <button
                    type="button"
                    onClick={() => handleRunGeminiAnalysis()}
                    disabled={isScanning}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-[#071B12] font-bold text-xs hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    Retry Scan
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4 rounded-xl overflow-hidden border border-slate-200 dark:border-[#123D2A] bg-[#071B12] relative">
                  <img
                    src={scannedPhotoUrl || previewImage}
                    alt="Uploaded plant photograph"
                    referrerPolicy="no-referrer"
                    className="w-full h-40 object-cover"
                  />
                  <div className="px-2.5 py-1 bg-[#071B12]/90 text-[10px] font-mono text-[#B7F76B] flex items-center justify-between">
                    <span>Uploaded Photograph Preserved</span>
                    <span>Ready</span>
                  </div>
                </div>

                <div className="md:col-span-8 space-y-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {scanStatus === 'TEMPORARILY_UNAVAILABLE'
                      ? 'AI Image Analysis Is Temporarily Unavailable (HTTP 503)'
                      : scanStatus === 'FAILED'
                      ? 'Uploaded Plant Photograph Could Not Be Analysed'
                      : 'Capture or Upload a Plant Photo to Run Real AI Image Analysis'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
                    {scanStatus === 'TEMPORARILY_UNAVAILABLE' || scanStatus === 'FAILED'
                      ? 'Neither the primary Gemini model nor the configured backup model could complete the visual analysis right now. Your uploaded photograph is preserved above—no plant identification or disease diagnosis has been fabricated from saved memory.'
                      : 'Click "Scan & Diagnose Plant Now" on the left to send your photograph to the multimodal Gemini vision backend for species identification and foliar health analysis.'}
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRunGeminiAnalysis()}
                      disabled={isScanning}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {scanStatus === 'TEMPORARILY_UNAVAILABLE' || scanStatus === 'FAILED'
                        ? 'Retry Scan Now'
                        : 'Run AI Image Analysis'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SOURCE 2: SAVED GARDEN INFORMATION (INDEPENDENT CONTEXTUAL ASSISTANCE) */}
          <div
            data-testid="saved-garden-info-section"
            className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#D4B56A]/15 border border-[#D4B56A]/40 text-[11px] font-mono font-bold text-[#D4B56A] flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5" /> Saved Garden Information
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/60">
                Contextual Memory Only · Not a New Image Scan Result
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/75">
              {savedGardenContextInfo?.note ||
                'Saved plant records from your My Garden sanctuary are shown below strictly for contextual reference and are never substituted for live AI photograph analysis.'}
            </p>
            {(savedGardenContextInfo?.plants || plants).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {(savedGardenContextInfo?.plants || plants).slice(0, 3).map((p: any, idx: number) => (
                  <div
                    key={p.id || idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs"
                  >
                    <div className="font-bold text-slate-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-[11px] italic text-slate-500 dark:text-[#B7F76B] truncate">
                      {p.species || p.scientificName}
                    </div>
                    <div className="text-[10px] font-mono text-[#00C878] mt-1">
                      Saved Status: {p.healthStatus || `${p.healthScore ?? 92}% Healthy`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">
                No saved plants in My Garden yet.
              </div>
            )}
          </div>

          {/* SOURCE 3: GENERAL PLANT CARE ADVICE (INDEPENDENT RELIABLE HORTICULTURAL GUIDANCE) */}
          <div
            data-testid="general-plant-care-section"
            className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-[11px] font-mono font-bold text-sky-600 dark:text-sky-300 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5" /> General Plant Care Advice
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/60">
                Standard Botanical Checklist · Independent of Image Scan
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {generalCareAdviceInfo?.title ||
                'General Plant Care Checklist (Safe Baseline Maintenance)'}
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-[#F7F9F2]/85">
              {(
                generalCareAdviceInfo?.checklist || [
                  'Check the top 3–5 cm of soil moisture with your finger before watering to prevent root hypoxia.',
                  'Provide bright, filtered indirect light and avoid sudden temperature drafts.',
                  'Inspect the undersides of leaves weekly for early signs of spider mites, aphids, or scale.',
                  'Ensure pots have unobstructed drainage holes so excess water never pools at the root crown.',
                ]
              ).map((tip: string, idx: number) => (
                <li
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]"
                >
                  • {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* 7. PREVIOUS SCANS HISTORY & LONGITUDINAL SCAN COMPARISON */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#00C878]" /> Saved Scan History & Longitudinal Comparison ({diagnoses.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Reload any previous scan or compare an earlier scan side-by-side with your current results.
                </p>
              </div>
              {comparisonScan && (
                <button
                  type="button"
                  onClick={() => setComparisonScan(null)}
                  className="text-xs font-semibold text-amber-500 hover:underline"
                >
                  Close Comparison
                </button>
              )}
            </div>

            {/* Side-by-Side Comparison View */}
            {comparisonScan && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border-2 border-[#00C878]/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-[#00C878] flex items-center gap-1.5">
                    <GitCompare className="w-4 h-4" /> SIDE-BY-SIDE SCAN COMPARISON
                  </div>
                  <span className="text-xs font-mono font-bold text-[#B7F76B]">
                    Health Delta:{' '}
                    {(analysisResult.healthScore ?? 80) - (comparisonScan.healthScore ?? 76) >= 0 ? '+' : ''}
                    {(analysisResult.healthScore ?? 80) - (comparisonScan.healthScore ?? 76)} pts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0B2419] border border-slate-200 dark:border-[#123D2A] space-y-1.5">
                    <div className="text-[10px] font-mono text-slate-400">
                      EARLIER SCAN · {comparisonScan.scannedDate || 'Previous'}
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">{comparisonScan.plantName}</div>
                    <div className="text-[#00C878] font-mono">
                      Health Score: {comparisonScan.healthScore}/100 · Confidence: {comparisonScan.confidence}%
                    </div>
                    <div className="text-amber-500 font-medium">{comparisonScan.possibleCondition}</div>
                    <p className="text-slate-500 dark:text-[#F7F9F2]/70">{comparisonScan.symptoms}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#0B2419] border border-[#00C878]/40 space-y-1.5">
                    <div className="text-[10px] font-mono text-[#00C878]">
                      CURRENT SCAN · {analysisResult.scannedDate || 'Today'}
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {analysisResult.commonName} ({analysisResult.scientificName})
                    </div>
                    <div className="text-[#B7F76B] font-mono">
                      Health Score: {analysisResult.healthScore}/100 · Confidence: {analysisResult.confidence}%
                    </div>
                    <div className="text-amber-500 font-medium">{analysisResult.possibleCondition}</div>
                    <p className="text-slate-500 dark:text-[#F7F9F2]/70">
                      {(analysisResult.visibleSymptoms || []).join('; ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {diagnoses.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">
                No previous scans stored yet. Run a scan above or click "Save to My Garden" to build your history.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {diagnoses.slice(0, 6).map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white truncate">{d.plantName}</span>
                        <span className="font-mono text-[#00C878] shrink-0">Health {d.healthScore}/100</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Scanned: {d.scannedDate || '2026-11-12'} · Confidence {d.confidence}%
                      </div>
                      <div className="text-amber-600 dark:text-[#D4B56A] font-medium">{d.possibleCondition}</div>
                      <p className="text-slate-500 dark:text-[#F7F9F2]/70 line-clamp-2">{d.recommendations}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-[#123D2A]">
                      <button
                        type="button"
                        onClick={() => handleLoadPreviousScan(d)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-200/70 dark:bg-[#123D2A] text-slate-900 dark:text-white font-semibold text-[11px] hover:bg-[#00C878] hover:text-[#071B12] transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View Scan
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparisonScan(d)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#00C878]/15 border border-[#00C878]/40 text-[#00C878] font-semibold text-[11px] hover:bg-[#00C878] hover:text-[#071B12] transition-colors"
                      >
                        <GitCompare className="w-3 h-3" /> Compare
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plant Rescue AI 9-Point Structured Recovery Protocol */}
          {(activeSubMode === 'rescue' || analysisResult.rescuePlan) && (
            <div className="p-6 rounded-2xl border border-[#00C878]/40 bg-white dark:bg-[#0B2419] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-[#00C878] flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4" /> PLANT RESCUE AI · 9-POINT EMERGENCY RECOVERY PROTOCOL
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Step-by-Step Critical Rehabilitation Plan for {analysisResult.commonName}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-mono text-[11px] text-[#00C878]">01. IMMEDIATE ACTIONS</div>
                  <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">{analysisResult.rescuePlan?.immediateActions}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-mono text-[11px] text-[#00C878]">02. PRUNING ADVICE</div>
                  <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">{analysisResult.rescuePlan?.pruningAdvice}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-mono text-[11px] text-[#00C878]">03. WATERING ADJUSTMENT</div>
                  <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">{analysisResult.rescuePlan?.wateringAdjustment}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-mono text-[11px] text-[#00C878]">04. SUNLIGHT ADJUSTMENT</div>
                  <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">{analysisResult.rescuePlan?.sunlightAdjustment}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-mono text-[11px] text-[#00C878]">05. SOIL RECOVERY STEPS</div>
                  <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">{analysisResult.rescuePlan?.soilRecoverySteps}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-mono text-[11px] text-[#00C878]">06. BIO-FERTILIZER CARE</div>
                  <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">{analysisResult.rescuePlan?.fertilizerRecommendation}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-mono text-[11px] text-[#B7F76B]">07. RECOVERY TIMELINE</div>
                  <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">{analysisResult.rescuePlan?.recoveryTimeline}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-mono text-[11px] text-[#B7F76B]">08. DAILY CHECK ROUTINE</div>
                  <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">{analysisResult.rescuePlan?.dailyCheckRoutine}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-mono text-[11px] text-amber-400">09. CRITICAL WARNING SIGNS</div>
                  <p className="text-slate-700 dark:text-[#F7F9F2]/85 mt-1">{analysisResult.rescuePlan?.warningSigns}</p>
                </div>
              </div>
            </div>
          )}

          {/* 8-Pest Entomological Reference & IPM Matrix */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bug className="w-4 h-4 text-[#00C878]" /> 8-Pest Entomological Detection & Organic IPM Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                Inspect Aphids, Mealybugs, Spider Mites, Whiteflies, Thrips, Caterpillars, Scale Insects, and Leaf Miners.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PEST_PROFILES.map((pest) => (
                <button
                  key={pest.name}
                  type="button"
                  onClick={() => setSelectedPest(pest)}
                  className={`p-2.5 rounded-xl border text-left transition-colors text-xs ${
                    selectedPest.name === pest.name
                      ? 'bg-[#00C878] text-[#071B12] border-[#00C878] font-bold'
                      : 'bg-slate-50 dark:bg-[#071B12] border-slate-200 dark:border-[#123D2A] text-slate-800 dark:text-[#F7F9F2]'
                  }`}
                >
                  <div className="truncate">{pest.name.split(' (')[0]}</div>
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-1.5 text-xs">
              <div className="font-bold text-sm text-slate-900 dark:text-white">{selectedPest.name}</div>
              <p className="text-slate-600 dark:text-[#F7F9F2]/80">
                <strong>Primary Target Zone:</strong> {selectedPest.target}
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                <strong>Visible Symptoms:</strong> {selectedPest.symptoms}
              </p>
              <p className="text-emerald-700 dark:text-[#B7F76B]">
                <strong>Bio-Rational Organic IPM Control:</strong> {selectedPest.organicControl}
              </p>
            </div>
          </div>

          {/* 8-Element Nutrient Deficiency Interactive Matrix */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-[#00C878]" /> 8-Element Foliar Nutrient Deficiency Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Inspect N, P, K, Mg, Fe, Ca, S, and Zn symptom profiles. Note: Visual symptoms overlap; confirm with a soil test.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {NUTRIENT_PROFILES.map((np) => (
                <button
                  key={np.symbol}
                  type="button"
                  onClick={() => setSelectedNutrient(np)}
                  className={`p-2.5 rounded-xl border text-center transition-colors ${
                    selectedNutrient.symbol === np.symbol
                      ? 'bg-[#00C878] text-[#071B12] border-[#00C878] font-bold'
                      : 'bg-slate-50 dark:bg-[#071B12] border-slate-200 dark:border-[#123D2A] text-slate-800 dark:text-[#F7F9F2]'
                  }`}
                >
                  <div className="text-sm font-mono font-bold">{np.symbol}</div>
                  <div className="text-[10px] truncate">{np.element}</div>
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedNutrient.element} ({selectedNutrient.symbol}) — {selectedNutrient.mobility}
                </span>
                <span className="font-mono text-[#00C878]">
                  Sanctuary Baseline: {selectedNutrient.healthyLevelPercent}%
                </span>
              </div>
              <p className="text-slate-700 dark:text-[#F7F9F2]/85">
                <strong>Visual Symptoms:</strong> {selectedNutrient.visualSymptoms}
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                <strong>Symptom Overlap Warning:</strong> {selectedNutrient.overlapWarning}
              </p>
              <p className="text-emerald-700 dark:text-[#B7F76B]">
                <strong>Recommended Organic Correction:</strong> {selectedNutrient.organicCorrection}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
