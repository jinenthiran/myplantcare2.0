import { evaluateImageQualityMetrics } from '../../data/aiToolsCatalog';

export interface ProcessedImagePayload {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeKb: number;
  qualityScore: number;
  qualityPassed: boolean;
  warnings: string[];
}

export const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const MAX_RAW_IMAGE_BYTES = 12 * 1024 * 1024;

function computeCanvasMetrics(canvas: HTMLCanvasElement): {
  avgLuminance: number;
  edgeContrast: number;
} {
  const sampleSize = 96;
  const probe = document.createElement('canvas');
  probe.width = sampleSize;
  probe.height = sampleSize;
  const pCtx = probe.getContext('2d');
  if (!pCtx) return { avgLuminance: 128, edgeContrast: 24 };

  pCtx.drawImage(canvas, 0, 0, sampleSize, sampleSize);
  const { data } = pCtx.getImageData(0, 0, sampleSize, sampleSize);
  const gray = new Float32Array(sampleSize * sampleSize);
  let lumSum = 0;

  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    const g = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    gray[i] = g;
    lumSum += g;
  }

  let gradSum = 0;
  let gradCount = 0;
  for (let y = 1; y < sampleSize - 1; y++) {
    for (let x = 1; x < sampleSize - 1; x++) {
      const idx = y * sampleSize + x;
      const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
      const gy = Math.abs(gray[idx + sampleSize] - gray[idx - sampleSize]);
      gradSum += gx + gy;
      gradCount++;
    }
  }

  return {
    avgLuminance: lumSum / Math.max(1, gray.length),
    edgeContrast: gradSum / Math.max(1, gradCount),
  };
}

export function compressAndEvaluateImageElement(
  source: HTMLImageElement | HTMLVideoElement,
  naturalWidth: number,
  naturalHeight: number,
  maxDimension = 1280
): ProcessedImagePayload {
  const safeW = Math.max(1, naturalWidth);
  const safeH = Math.max(1, naturalHeight);
  const scale = Math.min(1, maxDimension / Math.max(safeW, safeH));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(safeW * scale));
  canvas.height = Math.max(1, Math.round(safeH * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser 2D canvas unavailable for image processing.');
  }

  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const metrics = computeCanvasMetrics(canvas);
  const quality = evaluateImageQualityMetrics({
    width: canvas.width,
    height: canvas.height,
    avgLuminance: metrics.avgLuminance,
    edgeContrast: metrics.edgeContrast,
  });

  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  const sizeKb = Math.max(1, Math.round((dataUrl.length * 0.75) / 1024));

  return {
    dataUrl,
    mimeType: 'image/jpeg',
    width: canvas.width,
    height: canvas.height,
    sizeKb,
    qualityScore: quality.score,
    qualityPassed: quality.passed,
    warnings: quality.warnings,
  };
}

export function processUploadedImageFile(file: File): Promise<ProcessedImagePayload> {
  return new Promise((resolve, reject) => {
    const normalizedType = (file.type || '').toLowerCase();
    const validExt = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!ACCEPTED_IMAGE_MIME_TYPES.has(normalizedType) && !validExt) {
      reject(new Error('Unsupported file format. Please upload a JPG, PNG, or WEBP photograph.'));
      return;
    }
    if (file.size > MAX_RAW_IMAGE_BYTES) {
      reject(new Error('File exceeds 12 MB limit. Please choose a smaller photograph.'));
      return;
    }
    if (file.size < 256) {
      reject(new Error('This image file appears empty or corrupted.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image. Ensure it is a valid JPG, PNG, or WEBP file.'));
      img.onload = () => {
        try {
          const result = compressAndEvaluateImageElement(img, img.width, img.height);
          resolve(result);
        } catch (err: any) {
          reject(err);
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
