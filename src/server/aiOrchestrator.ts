import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { and, desc, eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.ts';
import {
  aiToolRuns,
  careTasks,
  growthRecords,
  plantDiagnoses,
  soilRecords,
  userPlants,
} from '../db/schema.ts';

export const ACTIVE_PRIMARY_MODEL = 'gemini-4-hydrogen';
export const ACTIVE_BACKUP_MODEL = 'gemini-3.1-flash-lite';

export const ALLOWED_FREE_GEMINI_MODELS = new Set([
  ACTIVE_PRIMARY_MODEL,
  ACTIVE_BACKUP_MODEL,
]);

let cachedOrchestratorClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

export function getOrchestratorClient(): GoogleGenAI {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!cachedOrchestratorClient || cachedApiKey !== currentKey) {
    cachedOrchestratorClient = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = currentKey;
  }
  return cachedOrchestratorClient;
}

export function resolvePrimaryModel(): string {
  const configured = (process.env.GEMINI_PRIMARY_MODEL || '').trim();
  return ALLOWED_FREE_GEMINI_MODELS.has(configured) ? configured : ACTIVE_PRIMARY_MODEL;
}

export function resolveBackupModels(primary: string): string[] {
  const candidates: string[] = [];
  const envBackup = (process.env.GEMINI_BACKUP_MODEL || '').trim();
  if (envBackup && ALLOWED_FREE_GEMINI_MODELS.has(envBackup) && envBackup !== primary) {
    candidates.push(envBackup);
  }
  for (const m of [ACTIVE_BACKUP_MODEL, ACTIVE_PRIMARY_MODEL]) {
    if (m !== primary && !candidates.includes(m)) {
      candidates.push(m);
    }
  }
  return candidates;
}

export function isPermanentAiError(err: any): boolean {
  const status = Number(err?.status || err?.statusCode || err?.code || 0);
  const msg = String(err?.message || '');
  if (status === 400 || status === 401 || status === 403) return true;
  return (
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('INVALID_ARGUMENT') ||
    msg.includes('UNAUTHENTICATED')
  );
}

export function isRetryableAiError(err: any): boolean {
  if (isPermanentAiError(err)) return false;
  const status = Number(err?.status || err?.statusCode || err?.code || 0);
  const msg = String(err?.message || '').toLowerCase();
  if ([503, 429, 500, 502, 504].includes(status)) return true;
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('timed out') ||
    msg.includes('deadline_exceeded') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset')
  );
}

async function sleepBackoff(attempt: number, baseMs = 240): Promise<void> {
  const waitMs = Math.min(2400, baseMs * Math.pow(2, attempt) + Math.floor(Math.random() * 180));
  await new Promise((r) => setTimeout(r, waitMs));
}

const modelCooldown = new Map<string, number>();

export async function generateStructuredWithFailover(params: {
  parts: any[];
  responseSchema: any;
  systemInstruction?: string;
  thinkingLevel?: ThinkingLevel;
  simulateTransient503Count?: number;
  timeoutMs?: number;
}): Promise<{ parsed: any; resolvedModel: string; usedBackupModel: boolean; totalAttempts: number }> {
  const ai = getOrchestratorClient();
  const primary = resolvePrimaryModel();
  const backups = resolveBackupModels(primary);
  const timeoutMs = params.timeoutMs ?? 18000;
  let remainingSim = Math.max(0, Number(params.simulateTransient503Count) || 0);
  let totalAttempts = 0;
  let lastErr: any = null;

  const callSingle = async (model: string) => {
    if (remainingSim > 0) {
      remainingSim -= 1;
      const sim: any = new Error(
        '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary.","status":"UNAVAILABLE"}}'
      );
      sim.status = 503;
      throw sim;
    }

    const config: any = {
      responseMimeType: 'application/json',
      responseSchema: params.responseSchema,
    };
    if (params.systemInstruction) {
      config.systemInstruction = params.systemInstruction;
    }
    if (model === ACTIVE_PRIMARY_MODEL && params.thinkingLevel) {
      config.thinkingConfig = { thinkingLevel: params.thinkingLevel };
    }

    const geminiPromise = ai.models.generateContent({
      model,
      contents: { parts: params.parts },
      config,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const tErr: any = new Error(`AI model ${model} timed out after ${Math.round(timeoutMs / 1000)}s`);
        tErr.status = 504;
        reject(tErr);
      }, timeoutMs);
    });

    const resp = await Promise.race([geminiPromise, timeoutPromise]);
    const raw = (resp.text ?? '{}').trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
  };

  const primaryCooling = remainingSim === 0 && (modelCooldown.get(primary) || 0) > Date.now();
  if (!primaryCooling) {
    for (let i = 0; i <= 2; i++) {
      totalAttempts += 1;
      try {
        const parsed = await callSingle(primary);
        modelCooldown.delete(primary);
        return { parsed, resolvedModel: primary, usedBackupModel: false, totalAttempts };
      } catch (err: any) {
        lastErr = err;
        if (isPermanentAiError(err)) throw err;
        if (i < 2 && isRetryableAiError(err)) {
          await sleepBackoff(i);
          continue;
        }
        break;
      }
    }
    if (lastErr && isRetryableAiError(lastErr) && !params.simulateTransient503Count) {
      modelCooldown.set(primary, Date.now() + 45000);
    }
  }

  for (const backup of backups) {
    for (let i = 0; i <= 1; i++) {
      totalAttempts += 1;
      try {
        const parsed = await callSingle(backup);
        return { parsed, resolvedModel: backup, usedBackupModel: true, totalAttempts };
      } catch (err: any) {
        lastErr = err;
        if (isPermanentAiError(err)) throw err;
        if (i < 1 && isRetryableAiError(err)) {
          await sleepBackoff(i);
          continue;
        }
        break;
      }
    }
  }

  throw lastErr || new Error('Gemini AI orchestration service temporarily unavailable.');
}

export interface IncomingScanImage {
  angle?: string;
  imageBase64?: string;
  imageUrl?: string;
  mimeType?: string;
}

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function resolveImageInlineData(img: IncomingScanImage): {
  base64: string;
  mimeType: string;
  angle: string;
  error?: string;
} | null {
  const angle = String(img.angle || 'full');
  const normMime = String(img.mimeType || 'image/jpeg').toLowerCase().trim();
  const safeMime = normMime === 'image/jpg' ? 'image/jpeg' : normMime;

  if (img.imageBase64) {
    if (!ALLOWED_MIMES.has(normMime)) {
      return { base64: '', mimeType: safeMime, angle, error: `Unsupported image format (${normMime}). Use JPG, PNG, or WEBP.` };
    }
    const clean = img.imageBase64.includes(',') ? img.imageBase64.split(',')[1].trim() : img.imageBase64.trim();
    const bytes = Math.ceil((clean.length * 3) / 4);
    if (bytes > 10 * 1024 * 1024) {
      return { base64: '', mimeType: safeMime, angle, error: 'Image exceeds 10 MB limit. Please resize or crop before scanning.' };
    }
    if (clean.length < 32) {
      return { base64: '', mimeType: safeMime, angle, error: 'Image payload appears empty or corrupted.' };
    }
    return { base64: clean, mimeType: safeMime, angle };
  }

  if (img.imageUrl && (img.imageUrl.startsWith('/images/') || img.imageUrl.startsWith('/src/assets/'))) {
    const cleanRel = img.imageUrl.split('?')[0].replace(/^\//, '');
    const fileName = path.basename(cleanRel);
    const webpName = fileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const candidates = [
      path.join(process.cwd(), cleanRel),
      path.join(process.cwd(), 'public', cleanRel),
      path.join(process.cwd(), 'public', 'images', fileName),
      path.join(process.cwd(), 'public', 'images', webpName),
      path.join(process.cwd(), 'public', 'images', 'plants', fileName),
      path.join(process.cwd(), 'public', 'images', 'plants', webpName),
      path.join(process.cwd(), 'dist', cleanRel),
      path.join(process.cwd(), 'dist', 'images', fileName),
      path.join(process.cwd(), 'dist', 'images', webpName),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        const buf = fs.readFileSync(candidate);
        const mime = candidate.endsWith('.png')
          ? 'image/png'
          : candidate.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';
        return { base64: buf.toString('base64'), mimeType: mime, angle };
      }
    }
  }

  return null;
}

export async function getUserPlantContextBundle(uid: string, plantId?: number | null) {
  const [plants, diagnoses, tasks, soils, growth] = await Promise.all([
    db.select().from(userPlants).where(eq(userPlants.userUid, uid)).orderBy(desc(userPlants.id)),
    db.select().from(plantDiagnoses).where(eq(plantDiagnoses.userUid, uid)).orderBy(desc(plantDiagnoses.id)).limit(12),
    db.select().from(careTasks).where(eq(careTasks.userUid, uid)).orderBy(careTasks.dueDate).limit(20),
    db.select().from(soilRecords).where(eq(soilRecords.userUid, uid)).orderBy(desc(soilRecords.id)).limit(8),
    db.select().from(growthRecords).where(eq(growthRecords.userUid, uid)).orderBy(desc(growthRecords.id)).limit(16),
  ]);

  const selectedPlant = plantId ? plants.find((p) => p.id === Number(plantId)) || null : null;
  const plantDiagnosesList = selectedPlant
    ? diagnoses.filter((d) => d.plantId === selectedPlant.id || d.plantName.toLowerCase().includes(selectedPlant.name.toLowerCase()))
    : diagnoses.slice(0, 5);
  const plantTasksList = selectedPlant
    ? tasks.filter((t) => t.plantId === selectedPlant.id || t.plantName.toLowerCase() === selectedPlant.name.toLowerCase())
    : tasks.slice(0, 8);
  const plantGrowthList = selectedPlant
    ? growth.filter((g) => g.plantId === selectedPlant.id || g.plantName.toLowerCase() === selectedPlant.name.toLowerCase())
    : growth.slice(0, 6);

  return {
    plants,
    selectedPlant,
    plantDiagnosesList,
    plantTasksList,
    soils,
    plantGrowthList,
  };
}

export const ADVANCED_SCAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    qualityCheck: {
      type: Type.OBJECT,
      properties: {
        qualityPassed: { type: Type.BOOLEAN },
        qualityScore: { type: Type.INTEGER },
        isPlantDetected: { type: Type.BOOLEAN },
        visibleOrgans: { type: Type.ARRAY, items: { type: Type.STRING } },
        issues: { type: Type.ARRAY, items: { type: Type.STRING } },
        retakeGuidance: { type: Type.STRING },
      },
    },
    isPlantDetected: { type: Type.BOOLEAN },
    commonName: { type: Type.STRING },
    scientificName: { type: Type.STRING },
    plantCategory: { type: Type.STRING },
    plantFamily: { type: Type.STRING },
    nativeRegion: { type: Type.STRING },
    confidence: { type: Type.INTEGER },
    isUncertain: { type: Type.BOOLEAN },
    topCandidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          commonName: { type: Type.STRING },
          scientificName: { type: Type.STRING },
          confidence: { type: Type.INTEGER },
          reason: { type: Type.STRING },
        },
      },
    },
    visibleCharacteristics: { type: Type.ARRAY, items: { type: Type.STRING } },
    overallHealthStatus: { type: Type.STRING },
    healthScore: { type: Type.INTEGER },
    diagnosisConfidence: { type: Type.INTEGER },
    possibleCondition: { type: Type.STRING },
    severity: { type: Type.STRING },
    symptomChecklist: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          symptom: { type: Type.STRING },
          detected: { type: Type.BOOLEAN },
          severity: { type: Type.STRING },
          observation: { type: Type.STRING },
        },
      },
    },
    detectedAnomalies: { type: Type.ARRAY, items: { type: Type.STRING } },
    visibleSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
    possibleCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
    pestAnalysis: { type: Type.STRING },
    nutrientAnalysis: { type: Type.STRING },
    immediateActions: { type: Type.ARRAY, items: { type: Type.STRING } },
    longTermCarePlan: { type: Type.ARRAY, items: { type: Type.STRING } },
    wateringAdjustments: { type: Type.STRING },
    sunlightAdjustments: { type: Type.STRING },
    soilRecommendations: { type: Type.STRING },
    safeTreatments: { type: Type.ARRAY, items: { type: Type.STRING } },
    followUpRecommendations: { type: Type.STRING },
    preventionStrategy: { type: Type.STRING },
    similarSpecies: { type: Type.ARRAY, items: { type: Type.STRING } },
    careSummary: {
      type: Type.OBJECT,
      properties: {
        sunlight: { type: Type.STRING },
        watering: { type: Type.STRING },
        soil: { type: Type.STRING },
        temperature: { type: Type.STRING },
        growthCharacteristics: { type: Type.STRING },
        matureSize: { type: Type.STRING },
        suitability: { type: Type.STRING },
      },
    },
    rescuePlan: {
      type: Type.OBJECT,
      properties: {
        immediateActions: { type: Type.STRING },
        pruningAdvice: { type: Type.STRING },
        wateringAdjustment: { type: Type.STRING },
        sunlightAdjustment: { type: Type.STRING },
        soilRecoverySteps: { type: Type.STRING },
        fertilizerRecommendation: { type: Type.STRING },
        recoveryTimeline: { type: Type.STRING },
        dailyCheckRoutine: { type: Type.STRING },
        warningSigns: { type: Type.STRING },
      },
    },
    disclaimer: { type: Type.STRING },
  },
};

import {
  AI_TOOLS_CATALOG,
  getToolBySlug,
  normalizeToolAnalysisResult,
  normalizeToolSlug,
} from '../data/aiToolsCatalog.ts';

export const BOTANICAL_AI_TOOLS = AI_TOOLS_CATALOG;

const BASE_TOOL_SCHEMA_PROPERTIES = {
  headline: {
    type: Type.STRING,
    description: 'Concise 1-line botanical verdict or species headline',
  },
  plant_identification: {
    type: Type.OBJECT,
    required: ['common_name', 'scientific_name', 'confidence', 'is_uncertain'],
    properties: {
      common_name: { type: Type.STRING },
      scientific_name: { type: Type.STRING },
      confidence: {
        type: Type.INTEGER,
        description: 'Integer 1-100 confidence score (use <70 when uncertain)',
      },
      is_uncertain: { type: Type.BOOLEAN },
    },
  },
  observations: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: '2 to 5 concrete visual or contextual observations',
  },
  possible_causes: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: '2 to 4 likely physiological, environmental, or diagnostic causes',
  },
  severity: {
    type: Type.STRING,
    description: 'One of: Low, Moderate, High, Critical, Informational',
  },
  recommendations: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: '3 to 6 concrete, safe, actionable next steps',
  },
  follow_up: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: '1 to 3 monitoring or follow-up check steps',
  },
  limitations: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: '1 to 3 honest scientific limitations of visual/context-only analysis',
  },
  scheduleSuggestions: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        taskType: { type: Type.STRING },
        frequency: { type: Type.STRING },
        dueInDays: { type: Type.INTEGER },
        notes: { type: Type.STRING },
      },
    },
  },
};

export function buildToolResponseSchema(slug: string) {
  const properties: Record<string, any> = { ...BASE_TOOL_SCHEMA_PROPERTIES };
  const required: string[] = [
    'headline',
    'plant_identification',
    'observations',
    'possible_causes',
    'severity',
    'recommendations',
    'follow_up',
    'limitations',
  ];

  if (slug === 'plant-identifier' || slug === 'weed-identifier') {
    properties.alternatives = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          common_name: { type: Type.STRING },
          scientific_name: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
      },
    };
    properties.growing_requirements = {
      type: Type.OBJECT,
      properties: {
        light: { type: Type.STRING },
        watering: { type: Type.STRING },
        soil: { type: Type.STRING },
        humidity: { type: Type.STRING },
        temperature: { type: Type.STRING },
      },
    };
  }

  if (slug === 'watering-doctor') {
    properties.watering_diagnosis = {
      type: Type.OBJECT,
      properties: {
        moisture_assessment: { type: Type.STRING },
        suggested_interval_days: { type: Type.INTEGER },
        suggested_volume_ml: { type: Type.STRING },
        next_check_rule: { type: Type.STRING },
      },
    };
    required.push('watering_diagnosis');
  }

  if (slug === 'soil-doctor' || slug === 'repotting-assistant') {
    properties.soil_recommendations = {
      type: Type.OBJECT,
      properties: {
        drainage_status: { type: Type.STRING },
        ideal_mix_ratio: { type: Type.STRING },
        amendments: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    };
    required.push('soil_recommendations');
  }

  if (
    slug === 'plant-rescue' ||
    slug === 'disease-detector' ||
    slug === 'pest-detector' ||
    slug === 'root-health'
  ) {
    properties.recovery_timeline = {
      type: Type.OBJECT,
      properties: {
        first_24h: { type: Type.STRING },
        hours_72: { type: Type.STRING },
        days_14: { type: Type.STRING },
      },
    };
  }

  if (slug === 'pruning-assistant') {
    properties.pruning_zones = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          target: { type: Type.STRING },
          why_before_cut: { type: Type.STRING },
          how_to_cut: { type: Type.STRING },
        },
      },
    };
    required.push('pruning_zones');
  }

  if (slug === 'plant-safety') {
    properties.toxicity_and_precautions = {
      type: Type.OBJECT,
      properties: {
        pet_safety: { type: Type.STRING },
        human_safety: { type: Type.STRING },
        toxic_compounds: { type: Type.STRING },
        emergency_guidance: { type: Type.STRING },
      },
    };
    required.push('toxicity_and_precautions');
  }

  if (slug === 'plant-propagation') {
    properties.propagation_plan = {
      type: Type.OBJECT,
      properties: {
        best_method: { type: Type.STRING },
        node_guidance: { type: Type.STRING },
        rooting_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    };
    required.push('propagation_plan');
  }

  if (slug === 'plant-growth') {
    properties.growth_comparison = {
      type: Type.OBJECT,
      properties: {
        measured_summary: { type: Type.STRING },
        visual_estimate: { type: Type.STRING },
        bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    };
    required.push('growth_comparison');
  }

  if (slug === 'garden-coach') {
    properties.garden_action_plan = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          priority: { type: Type.STRING },
          target: { type: Type.STRING },
          action: { type: Type.STRING },
        },
      },
    };
    required.push('garden_action_plan');
  }

  return {
    type: Type.OBJECT,
    required,
    properties,
  };
}

export const TOOL_RESPONSE_SCHEMA = buildToolResponseSchema('plant-identifier');

export async function executeUnifiedBotanicalTool(params: {
  uid: string;
  toolId: string;
  plantId?: number | null;
  userInput: string;
  extraParams?: Record<string, any>;
  images?: Array<IncomingScanImage & { label?: string; capturedDate?: string }>;
  weatherSummary?: string;
  simulateTransient503Count?: number;
}) {
  const canonicalSlug = normalizeToolSlug(params.toolId);
  const toolSpec = canonicalSlug ? getToolBySlug(canonicalSlug) : null;
  if (!toolSpec || !canonicalSlug) {
    throw new Error(`Unknown AI tool: ${params.toolId}`);
  }

  const ctx = await getUserPlantContextBundle(params.uid, params.plantId);
  const parts: any[] = [];
  const attachedMeta: string[] = [];

  if (Array.isArray(params.images)) {
    for (const [idx, img] of params.images.slice(0, toolSpec.maxImages || 4).entries()) {
      const resolved = resolveImageInlineData(img);
      if (resolved?.error) {
        throw new Error(resolved.error);
      }
      if (resolved?.base64) {
        attachedMeta.push(
          `Image ${idx + 1}: ${img.label || resolved.angle || 'plant-view'}${
            img.capturedDate ? ` (Date: ${img.capturedDate})` : ''
          }`
        );
        parts.push({
          inlineData: {
            mimeType: resolved.mimeType,
            data: resolved.base64,
          },
        });
      }
    }
  }

  const gardenSummaryText =
    ctx.plants.length > 0
      ? ctx.plants
          .map(
            (p) =>
              `[ID:${p.id}] ${p.name} (${p.species} / ${p.scientificName || 'N/A'}) | Location: ${p.location} | Pot: ${p.potSize} | Soil: ${p.soilType} | Light: ${p.sunlight} | Health: ${p.healthScore}% (${p.status}) | LastWatered: ${p.lastWatered} | NextWater: ${p.nextWatering} | LastFert: ${p.lastFertilized} | Height: ${p.heightCm}cm | Notes: ${p.notes}`
          )
          .join('\n')
      : 'No saved plants in My Garden yet.';

  const scanHistoryText =
    ctx.plantDiagnosesList.length > 0
      ? ctx.plantDiagnosesList
          .slice(0, 5)
          .map((d) => `${d.scannedDate}: ${d.plantName} -> ${d.possibleCondition} (${d.severity}, Health ${d.healthScore}%)`)
          .join('\n')
      : 'No prior scans recorded for this scope.';

  const tasksText =
    ctx.plantTasksList.length > 0
      ? ctx.plantTasksList
          .slice(0, 6)
          .map((t) => `${t.completed ? '[DONE]' : '[DUE ' + t.dueDate + ']'} ${t.plantName} - ${t.title} (${t.taskType})`)
          .join('\n')
      : 'No active care tasks.';

  const growthText =
    ctx.plantGrowthList.length > 0
      ? ctx.plantGrowthList
          .slice(0, 6)
          .map((g) => `${g.recordedDate}: ${g.plantName} H=${g.heightCm}cm, Leaves=${g.leafCount}, Health=${g.healthScore}% (${g.observation})`)
          .join('\n')
      : 'No growth logs recorded yet.';

  const soilText =
    ctx.soils.length > 0
      ? ctx.soils
          .slice(0, 4)
          .map((s) => `${s.plantName}: ${s.soilType}, pH ${s.ph}, Moisture ${s.moisture}%, Temp ${s.temperature}°C, N/P/K=${s.nitrogen}/${s.phosphorus}/${s.potassium}`)
          .join('\n')
      : 'No lab/meter soil logs saved yet.';

  const prompt = `Execute tool: ${toolSpec.name} (slug: ${toolSpec.slug})
Attached Camera/Uploaded Photographs (${attachedMeta.length}): ${attachedMeta.join(' | ') || 'NONE — user did not attach a photo; do NOT claim visual inspection occurred.'}
Selected Target Plant from My Garden: ${ctx.selectedPlant ? `${ctx.selectedPlant.name} (${ctx.selectedPlant.species})` : 'General / Unlinked Specimen'}
User Prompt / Symptoms: ${params.userInput || toolSpec.quickPrompts[0]}
Tool Context Inputs JSON: ${JSON.stringify(params.extraParams || {})}
Weather / Microclimate Telemetry: ${params.weatherSummary || 'Not supplied — state if live local weather is needed rather than inventing readings.'}

MY GARDEN CONTEXT (REAL DATABASE RECORDS):
${gardenSummaryText}

RECENT SCAN HISTORY:
${scanHistoryText}

CARE TASKS:
${tasksText}

GROWTH RECORDS:
${growthText}

SOIL RECORDS:
${soilText}

REQUIRED OUTPUT COMPLETENESS:
- Do NOT return empty arrays for observations, possible_causes, recommendations, follow_up, or limitations.
- Always provide 2-4 specific observations, 2-3 possible_causes, 3-5 concrete recommendations, 1-3 follow_up items, and 1-2 limitations.
- Set plant_identification.confidence to an honest integer 1-100 (never leave 0 when a plant is identified; if no plant is visible or confidence < 70, set is_uncertain: true and explain ambiguity in alternatives & limitations).
- Keep scientific_name strictly to clean binomial/cultivar Latin names with NO parenthetical editorial commentary or self-corrections.

MANDATORY SCIENTIFIC & SAFETY GUARDRAILS:
- Tool Guardrail: ${toolSpec.scientificGuardrail}
- Strictly separate direct visual "observations" from hypothesized "possible_causes".
- For "disease-detector": explicitly note visual results are preliminary and NOT laboratory confirmation.
- For "watering-doctor": explicitly state photos alone cannot measure internal soil moisture; factor in lastWateredDate, potSize, soilType, and placement.
- For "soil-doctor": NEVER claim photos measure exact soil pH, NPK, or moisture; only cite manual pH/test values if supplied in Tool Context Inputs JSON or Soil Records.
- For "root-health": NEVER claim to diagnose hidden underground roots from leaf-only photos; check whether roots are actually visible.
- For "plant-growth": clearly separate measured height/leaf logs in database or user inputs from visual estimates on before/after photos.
- For "pruning-assistant": populate "pruning_zones" explaining WHY before telling where to cut.
- For "weed-identifier": NEVER recommend pulling/removing an unidentified plant with certainty.
- For "plant-safety": NEVER declare a plant safe when identification is uncertain; populate "toxicity_and_precautions" and direct suspected ingestion to medical/veterinary help.
- For "plant-propagation": populate "propagation_plan" with node guidance.
- For "garden-coach": populate "garden_action_plan" strictly grounded in real My Garden plants, tasks, scans, and supplied weather.
- Populate 1-3 realistic "scheduleSuggestions" when follow-up care tasks make sense.
Return complete, detailed JSON matching the schema.`;

  parts.push({ text: prompt });

  const { parsed, resolvedModel, usedBackupModel, totalAttempts } = await generateStructuredWithFailover({
    parts,
    responseSchema: buildToolResponseSchema(canonicalSlug),
    systemInstruction: toolSpec.systemRole,
    thinkingLevel: ThinkingLevel.LOW,
    simulateTransient503Count: params.simulateTransient503Count,
  });

  const normalized = normalizeToolAnalysisResult(
    {
      ...parsed,
      resolvedModel,
      usedBackupModel,
      executedAtIso: new Date().toISOString(),
    },
    canonicalSlug,
    toolSpec.name
  );

  const [runRecord] = await db
    .insert(aiToolRuns)
    .values({
      userUid: params.uid,
      toolId: toolSpec.slug,
      toolName: toolSpec.name,
      plantId: ctx.selectedPlant?.id ?? null,
      plantName:
        ctx.selectedPlant?.name ||
        (normalized.plant_identification.common_name !== 'Unidentified / General Specimen'
          ? normalized.plant_identification.common_name
          : String(params.extraParams?.plantName || 'General Garden')),
      inputSummary: String(params.userInput || toolSpec.name).slice(0, 280),
      resultJson: JSON.stringify(normalized),
      modelUsed: resolvedModel,
    })
    .returning();

  return {
    toolId: toolSpec.slug,
    toolName: toolSpec.name,
    category: toolSpec.category,
    result: normalized,
    runRecord,
    meta: { resolvedModel, usedBackupModel, totalAttempts },
  };
}
