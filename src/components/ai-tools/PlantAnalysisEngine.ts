import {
  AiToolSlug,
  NormalizedToolAnalysisResult,
  normalizeToolAnalysisResult,
} from '../../data/aiToolsCatalog';
import {
  buildScanCacheKey,
  computeFastImageHash,
  getClientCachedScanResult,
  setClientCachedScanResult,
} from '../../utils/imageScanOptimizer';

export interface ToolImageSlot {
  id: string;
  label: string;
  dataUrl: string;
  mimeType: string;
  source: 'empty' | 'camera' | 'upload';
  capturedDate?: string;
  metaText?: string;
  qualityWarnings?: string[];
  qualityScore?: number;
}

export type AnalysisStageText =
  | 'Preparing botanical inputs & garden context...'
  | 'Inspecting uploaded / captured plant visuals...'
  | 'Running Gemini horticultural intelligence...'
  | 'Validating scientific guardrails & care steps...';

export async function runPlantToolAnalysis(params: {
  slug: AiToolSlug;
  authToken?: string | null;
  plantId?: number | null;
  userInput: string;
  extraParams?: Record<string, any>;
  images: ToolImageSlot[];
  weatherSummary?: string;
  onStageChange?: (stage: AnalysisStageText) => void;
  signal?: AbortSignal;
  bypassCache?: boolean;
}): Promise<{
  result: NormalizedToolAnalysisResult;
  runRecord: any;
  meta: any;
}> {
  params.onStageChange?.('Preparing botanical inputs & garden context...');

  const activeImages = params.images
    .filter((slot) => Boolean(slot.dataUrl))
    .map((slot) => ({
      angle: slot.id,
      label: slot.label,
      capturedDate: slot.capturedDate,
      imageBase64: slot.dataUrl,
      mimeType: slot.mimeType || 'image/jpeg',
      imageHash: computeFastImageHash(slot.dataUrl),
    }));

  const imageHashes = activeImages.map((img) => img.imageHash);
  const primaryImageHash = imageHashes[0] || '';
  const cacheKey = buildScanCacheKey({
    imageHashes,
    mode: `tool_${params.slug}`,
    plantName: String(params.extraParams?.plantName || params.plantId || ''),
    symptomsText: `${params.userInput.trim()}::${JSON.stringify(params.extraParams || {})}`,
  });

  if (!params.bypassCache && activeImages.length > 0) {
    const cachedPayload = getClientCachedScanResult(cacheKey, {
      imageHash: primaryImageHash,
      mode: `tool_${params.slug}`,
    });
    if (cachedPayload && cachedPayload.result) {
      return {
        result: normalizeToolAnalysisResult(cachedPayload.result, params.slug, cachedPayload.toolName),
        runRecord: cachedPayload.runRecord || null,
        meta: {
          ...(cachedPayload.meta || {}),
          cacheHit: true,
          cacheSource: 'localStorage',
          imageHash: primaryImageHash,
        },
      };
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (params.authToken) {
    headers['Authorization'] = `Bearer ${params.authToken}`;
  }

  const stageTimer1 = window.setTimeout(() => {
    params.onStageChange?.(
      activeImages.length > 0
        ? 'Inspecting uploaded / captured plant visuals...'
        : 'Running Gemini horticultural intelligence...'
    );
  }, 450);

  const stageTimer2 = window.setTimeout(() => {
    params.onStageChange?.('Validating scientific guardrails & care steps...');
  }, 1600);

  try {
    const res = await fetch(`/api/ai/tools/${params.slug}`, {
      method: 'POST',
      headers,
      signal: params.signal,
      body: JSON.stringify({
        plantId: params.plantId || undefined,
        userInput: params.userInput,
        extraParams: params.extraParams || {},
        images: activeImages,
        weatherSummary: params.weatherSummary,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.result) {
      throw new Error(
        data.error ||
          'The AI botanical specialist could not complete analysis right now. Your photo and inputs are preserved — please click Retry.'
      );
    }

    if (activeImages.length > 0 && primaryImageHash) {
      setClientCachedScanResult(cacheKey, data, primaryImageHash, {
        mode: `tool_${params.slug}`,
      });
    }

    return {
      result: normalizeToolAnalysisResult(data.result, params.slug, data.toolName),
      runRecord: data.runRecord,
      meta: data.meta,
    };
  } finally {
    window.clearTimeout(stageTimer1);
    window.clearTimeout(stageTimer2);
  }
}
