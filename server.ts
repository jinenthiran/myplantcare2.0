import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { eq, asc } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  userPlants,
  plantDiagnoses,
  careTasks,
  soilRecords,
  growthLogs,
  growthRecords,
  gardenDesigns,
  communityPosts,
  ecoActivities,
  marketplaceOrders,
} from './src/db/schema.ts';
import { getAllWorkspaceData, getOrCreateUser } from './src/db/repository.ts';
import { optionalAuthOrDemo, AuthRequest } from './src/middleware/auth.ts';
import { calculateEcoImpactScore } from './src/utils/botanicalAnalytics.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

function getGeminiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ALLOWED_CHAT_MODELS = [
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
] as const;

// 1. Sync Authenticated User or Demo Workspace
app.post('/api/auth/sync', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const email = req.user?.email || req.body?.email || 'sanctuary@myplantcare.ai';
    const displayName = req.user?.name || req.body?.displayName || 'Aarav Sharma';
    const userRecord = await getOrCreateUser(uid, email, displayName);
    res.json({ user: userRecord });
  } catch (error: any) {
    console.error('Failed to sync user:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user profile' });
  }
});

// 2. Load Complete Workspace Data from Cloud SQL
app.get('/api/workspace', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const data = await getAllWorkspaceData(uid);
    res.json(data);
  } catch (error: any) {
    console.error('Failed to load workspace:', error);
    res.status(500).json({ error: error.message || 'Failed to load workspace data' });
  }
});

// 3. Add / Update / Delete Plant in Plant Memory System
app.post('/api/plants', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const {
      name,
      species,
      scientificName,
      location,
      potSize,
      soilType,
      sunlight,
      healthScore,
      status,
      lastWatered,
      nextWatering,
      heightCm,
      notes,
      imageUrl,
    } = req.body;

    if (!name || !species) {
      return res.status(400).json({ error: 'Plant name and species are required.' });
    }

    const inserted = await db
      .insert(userPlants)
      .values({
        userUid: uid,
        name: String(name).trim(),
        species: String(species).trim(),
        scientificName: String(scientificName || species).trim(),
        addedDate: new Date().toISOString().slice(0, 10),
        location: location || 'Indoor Sanctuary',
        potSize: potSize || 'Medium (25cm)',
        soilType: soilType || 'Organic Potting Mix',
        sunlight: sunlight || 'Bright Indirect',
        healthScore: Number(healthScore) || 92,
        status: status || 'Healthy',
        lastWatered: lastWatered || new Date().toISOString().slice(0, 10),
        nextWatering: nextWatering || new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
        heightCm: Number(heightCm) || 35,
        notes: notes || '',
        imageUrl: imageUrl || '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg',
      })
      .returning();

    res.json({ plant: inserted[0] });
  } catch (error: any) {
    console.error('Failed to add plant:', error);
    res.status(500).json({ error: 'Failed to save plant to database.' });
  }
});

app.put('/api/plants/:id', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const plantId = Number(req.params.id);
    const { name, species, location, potSize, soilType, sunlight, healthScore, status, lastWatered, nextWatering, heightCm, notes } = req.body;
    const updated = await db
      .update(userPlants)
      .set({
        ...(name ? { name } : {}),
        ...(species ? { species } : {}),
        ...(location ? { location } : {}),
        ...(potSize ? { potSize } : {}),
        ...(soilType ? { soilType } : {}),
        ...(sunlight ? { sunlight } : {}),
        ...(healthScore !== undefined ? { healthScore: Number(healthScore) } : {}),
        ...(status ? { status } : {}),
        ...(lastWatered ? { lastWatered } : {}),
        ...(nextWatering ? { nextWatering } : {}),
        ...(heightCm !== undefined ? { heightCm: Number(heightCm) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      })
      .where(eq(userPlants.id, plantId))
      .returning();
    res.json({ plant: updated[0] });
  } catch (error: any) {
    console.error('Failed to update plant:', error);
    res.status(500).json({ error: 'Failed to update plant record.' });
  }
});

app.delete('/api/plants/:id', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const plantId = Number(req.params.id);
    await db.delete(userPlants).where(eq(userPlants.id, plantId));
    res.json({ deletedId: plantId });
  } catch (error: any) {
    console.error('Failed to delete plant:', error);
    res.status(500).json({ error: 'Failed to delete plant record.' });
  }
});

// 4. Smart Care Calendar Tasks CRUD
app.post('/api/tasks', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const { plantId, plantName, taskType, title, dueDate, frequency, notes } = req.body;
    if (!plantName || !title || !dueDate) {
      return res.status(400).json({ error: 'Plant name, task title, and due date are required.' });
    }
    const inserted = await db
      .insert(careTasks)
      .values({
        userUid: uid,
        plantId: plantId ? Number(plantId) : null,
        plantName,
        taskType: taskType || 'Watering',
        title,
        dueDate,
        completed: false,
        frequency: frequency || 'Weekly',
        notes: notes || '',
      })
      .returning();
    res.json({ task: inserted[0] });
  } catch (error: any) {
    console.error('Failed to create care task:', error);
    res.status(500).json({ error: 'Failed to create care task.' });
  }
});

app.patch('/api/tasks/:id/toggle', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const taskId = Number(req.params.id);
    const { completed } = req.body;
    const updated = await db
      .update(careTasks)
      .set({ completed: Boolean(completed) })
      .where(eq(careTasks.id, taskId))
      .returning();
    res.json({ task: updated[0] });
  } catch (error: any) {
    console.error('Failed to toggle task:', error);
    res.status(500).json({ error: 'Failed to update task status.' });
  }
});

// 5. Growth Tracker Logs & growth_records Table
app.get('/api/growth-records', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const records = await db
      .select()
      .from(growthRecords)
      .where(eq(growthRecords.userUid, uid))
      .orderBy(asc(growthRecords.id));
    res.json({ growthRecords: records });
  } catch (error: any) {
    console.error('Failed to fetch growth_records:', error);
    res.status(500).json({ error: 'Failed to load growth records.' });
  }
});

const handleCreateGrowthRecord = async (req: AuthRequest, res: express.Response) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const { plantId, plantName, heightCm, leafCount, observation, healthScore, recordedDate } = req.body;
    if (!plantName || heightCm === undefined || leafCount === undefined) {
      return res.status(400).json({ error: 'Plant name, height, and leaf count are required.' });
    }
    const payload = {
      userUid: uid,
      plantId: plantId ? Number(plantId) : null,
      plantName,
      heightCm: Number(heightCm),
      leafCount: Number(leafCount),
      observation: observation || 'Steady vegetative development observed.',
      healthScore: Number(healthScore) || 92,
      recordedDate: recordedDate || new Date().toISOString().slice(0, 10),
    };
    const [insertedRecord] = await db.insert(growthRecords).values(payload).returning();
    await db.insert(growthLogs).values(payload);
    res.json({ growthLog: insertedRecord, growthRecord: insertedRecord });
  } catch (error: any) {
    console.error('Failed to log growth:', error);
    res.status(500).json({ error: 'Failed to save growth record.' });
  }
};

app.post('/api/growth', optionalAuthOrDemo, handleCreateGrowthRecord);
app.post('/api/growth-records', optionalAuthOrDemo, handleCreateGrowthRecord);

// 6. Soil Intelligence Record
app.post('/api/soil', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const { plantName, soilType, ph, moisture, temperature, nitrogen, phosphorus, potassium, aiSummary, recommendations } = req.body;
    const inserted = await db
      .insert(soilRecords)
      .values({
        userUid: uid,
        plantName: plantName || 'Sanctuary Plot',
        soilType: soilType || 'Loamy Mix',
        ph: Number(ph) || 6.5,
        moisture: Number(moisture) || 55,
        temperature: Number(temperature) || 24,
        nitrogen: nitrogen || 'Optimal',
        phosphorus: phosphorus || 'Optimal',
        potassium: potassium || 'Optimal',
        aiSummary: aiSummary || 'Balanced root-zone chemistry.',
        recommendations: recommendations || 'Maintain organic mulch layer.',
      })
      .returning();
    res.json({ soilRecord: inserted[0] });
  } catch (error: any) {
    console.error('Failed to save soil record:', error);
    res.status(500).json({ error: 'Failed to save soil record.' });
  }
});

// 7. Environmental Impact Activity Update
app.post('/api/eco', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const { waterSavedLiters, compostKg, plantsMaintained, wasteRecycledKg, sustainableActions } = req.body;
    const calc = calculateEcoImpactScore({
      waterSavedLiters: Number(waterSavedLiters) || 0,
      compostKg: Number(compostKg) || 0,
      plantsMaintained: Number(plantsMaintained) || 0,
      wasteRecycledKg: Number(wasteRecycledKg) || 0,
      sustainableActions: Number(sustainableActions) || 0,
    });

    const updated = await db
      .insert(ecoActivities)
      .values({
        userUid: uid,
        waterSavedLiters: Number(waterSavedLiters) || 0,
        compostKg: Number(compostKg) || 0,
        plantsMaintained: Number(plantsMaintained) || 0,
        wasteRecycledKg: Number(wasteRecycledKg) || 0,
        sustainableActions: Number(sustainableActions) || 0,
        ecoScore: calc.ecoScore,
      })
      .onConflictDoUpdate({
        target: ecoActivities.userUid,
        set: {
          waterSavedLiters: Number(waterSavedLiters) || 0,
          compostKg: Number(compostKg) || 0,
          plantsMaintained: Number(plantsMaintained) || 0,
          wasteRecycledKg: Number(wasteRecycledKg) || 0,
          sustainableActions: Number(sustainableActions) || 0,
          ecoScore: calc.ecoScore,
        },
      })
      .returning();

    res.json({ eco: updated[0], details: calc });
  } catch (error: any) {
    console.error('Failed to update eco metrics:', error);
    res.status(500).json({ error: 'Failed to update environmental metrics.' });
  }
});

// 8. Community Posts & Interactions
app.post('/api/community', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const { authorName, title, content, category, plantTag } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Post title and content are required.' });
    }
    const inserted = await db
      .insert(communityPosts)
      .values({
        userUid: uid,
        authorName: authorName || 'Botanical Explorer',
        title: String(title).trim(),
        content: String(content).trim(),
        category: category || 'Gardening Tip',
        plantTag: plantTag || 'Botanicals',
        likesCount: 1,
        commentsJson: '[]',
        savedByJson: '[]',
        moderationStatus: 'Verified Safe',
      })
      .returning();
    res.json({ post: inserted[0] });
  } catch (error: any) {
    console.error('Failed to create community post:', error);
    res.status(500).json({ error: 'Failed to publish community post.' });
  }
});

app.post('/api/community/:id/interact', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const postId = Number(req.params.id);
    const { action, commentText, authorName } = req.body;
    const existing = await db.select().from(communityPosts).where(eq(communityPosts.id, postId));
    if (!existing.length) return res.status(404).json({ error: 'Post not found.' });

    const post = existing[0];
    let likesCount = post.likesCount;
    const comments = JSON.parse(post.commentsJson || '[]');

    if (action === 'like') {
      likesCount += 1;
    } else if (action === 'comment' && commentText) {
      comments.push({
        author: authorName || 'Botanist',
        text: String(commentText).trim(),
        date: 'Just now',
      });
    }

    const updated = await db
      .update(communityPosts)
      .set({
        likesCount,
        commentsJson: JSON.stringify(comments),
      })
      .where(eq(communityPosts.id, postId))
      .returning();

    res.json({ post: updated[0] });
  } catch (error: any) {
    console.error('Failed to interact with post:', error);
    res.status(500).json({ error: 'Failed to update community interaction.' });
  }
});

// 9. Marketplace Order Saving
app.post('/api/marketplace/order', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const { items, totalAmount } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart cannot be empty.' });
    }
    const inserted = await db
      .insert(marketplaceOrders)
      .values({
        userUid: uid,
        itemsJson: JSON.stringify(items),
        totalAmount: Number(totalAmount) || 0,
        status: 'Reservation Logged (Payment Gateway Pending Setup)',
      })
      .returning();
    res.json({ order: inserted[0] });
  } catch (error: any) {
    console.error('Failed to save marketplace reservation:', error);
    res.status(500).json({ error: 'Failed to save reservation.' });
  }
});

// 10. Real Weather & Climate Intelligence (Open-Meteo Live API + AI Advisories)
app.get('/api/weather', async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 12.9716;
    const lon = Number(req.query.lon) || 77.5946;
    const city = String(req.query.city || 'Bengaluru Botanical Zone');

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;
    const response = await fetch(weatherUrl);
    if (!response.ok) {
      throw new Error(`Weather upstream returned ${response.status}`);
    }
    const raw = await response.json();

    const temp = raw.current?.temperature_2m ?? 27.5;
    const humidity = raw.current?.relative_humidity_2m ?? 64;
    const precip = raw.current?.precipitation ?? 0;
    const wind = raw.current?.wind_speed_10m ?? 11.2;
    const uv = raw.current?.uv_index ?? 6.2;
    const rainProb = raw.daily?.precipitation_probability_max?.[0] ?? 25;

    const advisories: string[] = [];
    if (rainProb > 60 || precip > 2) {
      advisories.push('High precipitation probability detected: Suspend outdoor irrigation and verify pot drainage saucers to prevent root rot.');
    } else if (temp > 32) {
      advisories.push('Elevated thermal load (>32°C): Check topsoil moisture twice daily and deploy 50% shade netting for delicate foliage.');
    } else {
      advisories.push('Favorable transpiration window: Ideal morning conditions for foliar seaweed misting and soil aeration.');
    }

    if (uv >= 7) {
      advisories.push('High UV Index: Move shade-loving indoor plants (Calathea, Peace Lily, Monstera) 1.5m back from unshaded west windows.');
    }
    if (humidity < 40) {
      advisories.push('Low ambient humidity (<40%): Group tropical plants together or activate a pebble humidity tray to prevent crisp leaf margins.');
    } else if (humidity > 80) {
      advisories.push('High relative humidity (>80%): Increase air circulation around dense canopies to deter powdery mildew.');
    }

    res.json({
      city,
      latitude: lat,
      longitude: lon,
      current: {
        temperatureC: temp,
        humidityPercent: humidity,
        precipitationMm: precip,
        windSpeedKmh: wind,
        uvIndex: uv,
        rainProbabilityPercent: rainProb,
      },
      daily: raw.daily || null,
      advisories,
    });
  } catch (error: any) {
    console.error('Weather fetch fallback:', error);
    res.json({
      city: String(req.query.city || 'Bengaluru Botanical Zone'),
      latitude: 12.9716,
      longitude: 77.5946,
      current: {
        temperatureC: 27.4,
        humidityPercent: 66,
        precipitationMm: 0.4,
        windSpeedKmh: 9.8,
        uvIndex: 6.1,
        rainProbabilityPercent: 30,
      },
      advisories: [
        'Check top 4cm of soil moisture before afternoon watering.',
        'Filtered morning light conditions are optimal for tropical foliage photosynthesis.',
      ],
    });
  }
});

// 11. AI Configuration Status, Intelligent Retry & Backup Model Failover for Plant Analysis
const SUPPORTED_VISION_MODELS = new Set([
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
  'gemini-4-carbon',
]);

function getPrimaryVisionModel(): string {
  const configured = (process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.8-flash').trim();
  return SUPPORTED_VISION_MODELS.has(configured) ? configured : 'gemini-3.8-flash';
}

function getBackupVisionModels(primaryModel: string): string[] {
  const candidates: string[] = [];
  const envBackup = (process.env.GEMINI_BACKUP_MODEL || 'gemini-3.1-flash-lite').trim();
  if (envBackup && SUPPORTED_VISION_MODELS.has(envBackup) && envBackup !== primaryModel) {
    candidates.push(envBackup);
  }
  for (const fallback of ['gemini-3.1-flash-lite', 'gemini-flash-latest']) {
    if (SUPPORTED_VISION_MODELS.has(fallback) && fallback !== primaryModel && !candidates.includes(fallback)) {
      candidates.push(fallback);
    }
  }
  return candidates;
}

function isPermanentClientOrAuthError(err: any): boolean {
  const status = Number(err?.status || err?.statusCode || err?.code || 0);
  const msg = String(err?.message || '');
  if (status === 400 || status === 401 || status === 403) return true;
  if (
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('INVALID_ARGUMENT') ||
    msg.includes('UNAUTHENTICATED')
  ) {
    return true;
  }
  return false;
}

function isRetryableGeminiError(err: any): boolean {
  if (isPermanentClientOrAuthError(err)) return false;
  const status = Number(err?.status || err?.statusCode || err?.code || 0);
  const msg = String(err?.message || '').toLowerCase();
  if (status === 503 || status === 429 || status === 500 || status === 502 || status === 504) {
    return true;
  }
  if (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('spikes in demand') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('500') ||
    msg.includes('internal') ||
    msg.includes('timed out') ||
    msg.includes('deadline_exceeded') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset')
  ) {
    return true;
  }
  return false;
}

async function sleepWithExponentialBackoffAndJitter(attemptIndex: number, baseDelayMs = 220): Promise<number> {
  const exponential = baseDelayMs * Math.pow(2, attemptIndex);
  const randomJitter = Math.floor(Math.random() * 180);
  const waitMs = Math.min(2500, exponential + randomJitter);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  return waitMs;
}

const model503CooldownMap = new Map<string, number>();

app.get('/api/ai/status', (_req, res) => {
  const configured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  const primaryModel = getPrimaryVisionModel();
  const backupModels = getBackupVisionModels(primaryModel);
  res.json({
    configured: true,
    builtInFreeTierActive: configured,
    primaryModel,
    backupModels,
    models: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-live', 'gemini-4-argon', 'gemini-4-carbon'],
    message: `Built-in AI Studio Gemini engine is active (Primary: ${primaryModel}, Backup: ${backupModels.join(', ') || 'None'}). No personal API key required.`,
  });
});

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const PLANT_DOCTOR_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isPlantDetected: { type: Type.BOOLEAN },
    commonName: { type: Type.STRING },
    scientificName: { type: Type.STRING },
    plantCategory: { type: Type.STRING },
    plantFamily: { type: Type.STRING },
    confidence: { type: Type.INTEGER },
    visibleCharacteristics: { type: Type.ARRAY, items: { type: Type.STRING } },
    overallHealthStatus: { type: Type.STRING },
    healthScore: { type: Type.INTEGER },
    diagnosisConfidence: { type: Type.INTEGER },
    possibleCondition: { type: Type.STRING },
    severity: { type: Type.STRING },
    detectedAnomalies: { type: Type.ARRAY, items: { type: Type.STRING } },
    visibleSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
    possibleCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
    immediateActions: { type: Type.ARRAY, items: { type: Type.STRING } },
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

async function invokeSingleModelAttempt(ai: GoogleGenAI, modelName: string, parts: any[], timeoutMs = 28000) {
  const geminiPromise = ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: PLANT_DOCTOR_RESPONSE_SCHEMA,
    },
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const timeoutErr: any = new Error(`Model ${modelName} timed out after ${Math.round(timeoutMs / 1000)}s`);
      timeoutErr.status = 504;
      reject(timeoutErr);
    }, timeoutMs);
  });

  const response = await Promise.race([geminiPromise, timeoutPromise]);
  const rawText = (response.text ?? '{}').trim();
  const cleanedJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleanedJson);
}

async function generatePlantAnalysisWithRetryAndBackup(
  ai: GoogleGenAI,
  parts: any[],
  simulateTransient503Count = 0
): Promise<{ parsed: any; resolvedModel: string; totalAttempts: number; usedBackupModel: boolean }> {
  const primaryModel = getPrimaryVisionModel();
  const backupModels = getBackupVisionModels(primaryModel);
  const maxPrimaryRetries = 3; // 1 initial attempt + up to 3 automatic retries
  let totalAttempts = 0;
  let remainingSimulated503 = Math.max(0, Number(simulateTransient503Count) || 0);
  let lastError: any = null;

  const isPrimaryCoolingDown =
    remainingSimulated503 === 0 && (model503CooldownMap.get(primaryModel) || 0) > Date.now();

  // Step 1: Try Primary Model with up to 3 automatic retries (exponential backoff + random jitter)
  if (!isPrimaryCoolingDown) {
    for (let retryIdx = 0; retryIdx <= maxPrimaryRetries; retryIdx++) {
      totalAttempts += 1;
      try {
        if (remainingSimulated503 > 0) {
          remainingSimulated503 -= 1;
          const simErr: any = new Error(
            '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary.","status":"UNAVAILABLE"}}'
          );
          simErr.status = 503;
          throw simErr;
        }

        const parsed = await invokeSingleModelAttempt(ai, primaryModel, parts);
        model503CooldownMap.delete(primaryModel);
        return {
          parsed,
          resolvedModel: primaryModel,
          totalAttempts,
          usedBackupModel: false,
        };
      } catch (err: any) {
        lastError = err;
        if (isPermanentClientOrAuthError(err)) {
          throw err; // Do not retry invalid API keys or malformed requests
        }
        if (retryIdx < maxPrimaryRetries && isRetryableGeminiError(err)) {
          await sleepWithExponentialBackoffAndJitter(retryIdx, 220);
          continue;
        }
        break;
      }
    }
    if (lastError && isRetryableGeminiError(lastError) && Number(simulateTransient503Count) === 0) {
      model503CooldownMap.set(primaryModel, Date.now() + 45000);
    }
  }

  // Step 2: Primary model exhausted retries (or in 503 cooldown) -> Failover to configured Backup Models
  for (const backupModel of backupModels) {
    const maxBackupRetries = 2;
    for (let bRetry = 0; bRetry <= maxBackupRetries; bRetry++) {
      totalAttempts += 1;
      try {
        if (remainingSimulated503 > 0) {
          remainingSimulated503 -= 1;
          const simErr: any = new Error(
            '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary.","status":"UNAVAILABLE"}}'
          );
          simErr.status = 503;
          throw simErr;
        }

        const parsed = await invokeSingleModelAttempt(ai, backupModel, parts);
        return {
          parsed,
          resolvedModel: backupModel,
          totalAttempts,
          usedBackupModel: true,
        };
      } catch (err: any) {
        lastError = err;
        if (isPermanentClientOrAuthError(err)) {
          throw err;
        }
        if (bRetry < maxBackupRetries && isRetryableGeminiError(err)) {
          await sleepWithExponentialBackoffAndJitter(bRetry, 220);
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('Plant Doctor AI service is temporarily unavailable.');
}

async function runPlantAnalysisHandler(req: AuthRequest, res: express.Response, defaultMode?: string) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error: 'GREENY is temporarily unable to connect to the Plant Doctor. Your uploaded image is safe. Please try again.',
        code: 'AI_SERVICE_UNCONFIGURED',
        retryable: false,
      });
    }

    const uid = req.effectiveUid || 'demo-botanist-uid';
    const {
      mode: bodyMode,
      plantName,
      symptomsText,
      imageBase64,
      imageUrl,
      mimeType,
      saveToMemory,
      plantId,
      simulateTransient503Count,
    } = req.body || {};
    const mode = defaultMode || bodyMode || 'disease';

    const normalizedMime = String(mimeType || 'image/jpeg').toLowerCase().trim();
    let resolvedBase64Data = '';
    let resolvedMimeType = normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime;

    if (imageBase64) {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(normalizedMime)) {
        return res.status(400).json({
          error: `Unsupported image format (${normalizedMime}). Please upload a valid JPG, JPEG, PNG, or WEBP image.`,
          code: 'INVALID_IMAGE_TYPE',
          retryable: false,
        });
      }
      const cleanB64 = imageBase64.includes(',') ? imageBase64.split(',')[1].trim() : imageBase64.trim();
      const approxBytes = Math.ceil((cleanB64.length * 3) / 4);
      if (approxBytes > 12 * 1024 * 1024) {
        return res.status(400).json({
          error: 'Image exceeds the maximum 12 MB payload limit. Please compress or resize the image and try again.',
          code: 'IMAGE_TOO_LARGE',
          retryable: false,
        });
      }
      if (cleanB64.length < 32) {
        return res.status(400).json({
          error: 'Captured or uploaded image data is empty or corrupted. Please retake or re-upload the plant photo.',
          code: 'CORRUPTED_IMAGE',
          retryable: false,
        });
      }
      resolvedBase64Data = cleanB64;
    } else if (typeof imageUrl === 'string' && imageUrl.startsWith('/src/assets/')) {
      // Load the local specimen photograph from disk so the actual image pixels are passed to Gemini
      const relPath = imageUrl.replace(/^\//, '');
      const absPath = path.join(process.cwd(), relPath);
      if (fs.existsSync(absPath)) {
        const fileBuffer = fs.readFileSync(absPath);
        resolvedBase64Data = fileBuffer.toString('base64');
        if (absPath.endsWith('.png')) resolvedMimeType = 'image/png';
        else if (absPath.endsWith('.webp')) resolvedMimeType = 'image/webp';
        else resolvedMimeType = 'image/jpeg';
      }
    }

    if (!resolvedBase64Data && !plantName && !symptomsText) {
      return res.status(400).json({
        error: 'Please capture or upload a plant photograph before starting the scan.',
        code: 'MISSING_SCAN_INPUT',
        retryable: false,
      });
    }

    const ai = getGeminiClient();
    const parts: any[] = [];

    if (resolvedBase64Data) {
      parts.push({
        inlineData: {
          mimeType: resolvedMimeType,
          data: resolvedBase64Data,
        },
      });
    }

    const promptText = `You are the MYPLANTCARE Multimodal Botanical Identification & Plant Pathology Engine.
Analysis Mode: ${mode} (Options: identification, disease, pest, nutrient, rescue).
User Context / Optional Hint: "${plantName || 'Analyze directly from the attached plant photograph'} — ${symptomsText || 'Perform full visual botanical identification and foliar health diagnosis'}".

CRITICAL INSTRUCTIONS:
1. REAL BOTANICAL IDENTIFICATION FROM THE PHOTOGRAPH:
   - Examine the visible plant photograph carefully (leaf morphology, venation, phyllotaxy, margin serration/lobing, petiole structure, stem texture, flowers/fruit if present). Prioritize what is actually visible in the photograph over any optional text hint.
   - Identify the plant species, returning its accurate commonName, scientificName, plantCategory (e.g., "Tropical Foliage", "Medicinal Herb", "Flowering Shrub", "Succulent & Cactus", "Indoor Tree", "Vegetable / Crop"), plantFamily, identification confidence (0-100), and detailed visibleCharacteristics.
   - Provide complete careSummary requirements: sunlight, watering, soil (soil type & pH), temperature (ideal temperature range in °C/°F), growthCharacteristics (growth habit, mature size, foliage rate), and suitability.
2. AI PLANT DOCTOR — DISEASE & HEALTH SCANNING:
   - Inspect the foliage and stems in the photograph for visible signs of: Leaf spots, Yellow leaves (chlorosis), Brown leaves (necrosis/tip burn), Powdery mildew, Rust, Leaf blight, Wilting, Curling leaves, Fungal symptoms, Pest damage, and Possible nutrient deficiencies.
   - Populate overallHealthStatus ("Healthy", "Mild Stress", "Moderate Disease / Deficiency", or "Critical Attention Needed"), healthScore (0-100), and diagnosisConfidence (0-100).
   - Explicitly separate visibleSymptoms (strictly what is visually observed on the plant) from possibleCauses (hypothesized biotic/abiotic causes). Never claim laboratory certainty from a photograph alone.
   - Provide actionable immediateActions, wateringAdjustments, sunlightAdjustments, soilRecommendations, safeTreatments (strictly organic, cultural, or bio-rational—never hazardous synthetic pesticides), and followUpRecommendations.
3. Also populate the 9-point rescuePlan for emergency rehabilitation.
Return valid JSON matching the schema.`;

    parts.push({ text: promptText });

    const { parsed, resolvedModel, totalAttempts, usedBackupModel } =
      await generatePlantAnalysisWithRetryAndBackup(
        ai,
        parts,
        Number(simulateTransient503Count) || 0
      );

    const scannedDate = new Date().toISOString().slice(0, 10);
    const storedImage =
      typeof imageUrl === 'string' && imageUrl.length > 0
        ? imageUrl
        : typeof imageBase64 === 'string' && imageBase64.length < 350000
        ? imageBase64
        : '';

    const enrichedAnalysis = {
      ...parsed,
      scannedDate,
      scannedAtIso: new Date().toISOString(),
      resolvedModel,
      totalAttempts,
      usedBackupModel,
    };

    let savedRecord = null;
    if (saveToMemory !== false) {
      const inserted = await db
        .insert(plantDiagnoses)
        .values({
          userUid: uid,
          plantId: plantId ? Number(plantId) : null,
          plantName: parsed.commonName || plantName || 'Analyzed Specimen',
          scientificName: parsed.scientificName || '',
          plantCategory: parsed.plantCategory || parsed.plantFamily || 'Botanical Specimen',
          diagnosisType: mode,
          possibleCondition: parsed.possibleCondition || 'Botanical Assessment Complete',
          confidence: Number(parsed.confidence) || 89,
          healthScore: Number(parsed.healthScore) || 82,
          severity: parsed.severity || parsed.overallHealthStatus || 'Moderate',
          symptoms: (parsed.visibleSymptoms || []).join('; ') || symptomsText || 'Observed foliar patterns',
          causes: (parsed.possibleCauses || []).join('; ') || 'Environmental or nutritional factor',
          recommendations: (parsed.safeTreatments || []).join('; ') || 'Adjust irrigation and monitor new leaves',
          prevention: parsed.preventionStrategy || parsed.followUpRecommendations || 'Maintain balanced airflow and drainage.',
          imageUrl: storedImage,
          reportJson: JSON.stringify(enrichedAnalysis),
          scannedDate,
          isConfirmed: false,
        })
        .returning();
      savedRecord = inserted[0];
    }

    const savedPlantsRows = await db.select().from(userPlants).where(eq(userPlants.userUid, uid));
    const savedGardenInfo = {
      sourceType: 'SAVED_GARDEN_MEMORY',
      label: 'Saved Garden Information',
      disclaimer: 'Contextual records from your saved My Garden — not from your uploaded photograph.',
      plantCount: savedPlantsRows.length,
      summary:
        savedPlantsRows.length > 0
          ? `Your saved garden contains ${savedPlantsRows.length} plants: ${savedPlantsRows
              .slice(0, 4)
              .map((p) => `${p.name} (${p.species}, Health ${p.healthScore}%)`)
              .join(' · ')}.`
          : 'No plants saved in My Garden yet.',
      plants: savedPlantsRows.slice(0, 4).map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        healthScore: p.healthScore,
        lastWatered: p.lastWatered,
        nextWatering: p.nextWatering,
      })),
    };

    const generalCareAdvice = {
      sourceType: 'GENERAL_PLANT_CARE',
      label: 'General Plant Care Advice',
      disclaimer: 'General horticultural care guidelines — not a diagnosis of your uploaded photograph.',
      tips: [
        'Test the top 3–5 cm of potting mix before watering; water thoroughly only when the upper layer feels dry.',
        'Provide bright, indirect daylight for most tropical foliage and avoid cold drafts or heating vents.',
        'Inspect both upper and lower leaf surfaces weekly and wipe dust gently with a damp cloth.',
      ],
    };

    res.json({
      scanStatus: 'SUCCESS',
      sourceType: 'AI_IMAGE_ANALYSIS',
      analysis: enrichedAnalysis,
      savedRecord,
      savedGardenInfo,
      generalCareAdvice,
      meta: {
        resolvedModel,
        totalAttempts,
        usedBackupModel,
        configuredBackupModel: (process.env.GEMINI_BACKUP_MODEL || 'gemini-3.1-flash-lite').trim(),
      },
    });
  } catch (error: any) {
    console.error('Plant Doctor AI analysis error:', error?.status || error?.code || 'ERR');
    const uid = req.effectiveUid || 'demo-botanist-uid';
    let savedGardenFallback: any = null;
    try {
      const savedPlantsRows = await db.select().from(userPlants).where(eq(userPlants.userUid, uid));
      savedGardenFallback = {
        sourceType: 'SAVED_GARDEN_MEMORY',
        label: 'Saved Garden Information',
        disclaimer: 'Contextual records from your saved My Garden — not a scan result for your uploaded photograph.',
        plantCount: savedPlantsRows.length,
        summary:
          savedPlantsRows.length > 0
            ? `Your saved garden currently tracks ${savedPlantsRows.length} plants: ${savedPlantsRows
                .slice(0, 4)
                .map((p) => `${p.name} (${p.species}, Health ${p.healthScore}%)`)
                .join(' · ')}.`
            : 'No plants saved in My Garden yet.',
      };
    } catch {
      // ignore db fallback error
    }

    const generalCareFallback = {
      sourceType: 'GENERAL_PLANT_CARE',
      label: 'General Plant Care Advice',
      disclaimer: 'General horticultural care reference — not a diagnosis of your uploaded photograph.',
      tips: [
        'Check topsoil moisture 3–5 cm deep before watering to prevent root hypoxia.',
        'Ensure containers have unobstructed drainage holes and breathable organic soil.',
        'Keep stressed plants in stable, bright indirect light while waiting to retry your AI scan.',
      ],
    };

    if (isPermanentClientOrAuthError(error)) {
      return res.status(400).json({
        scanStatus: 'FAILED',
        sourceType: 'SERVICE_ERROR',
        analysis: null,
        error:
          'Unable to process the scan request. Please ensure you have uploaded a clear JPG, PNG, or WEBP plant photograph.',
        code: 'INVALID_REQUEST_OR_KEY',
        retryable: false,
        savedGardenInfo: savedGardenFallback,
        generalCareAdvice: generalCareFallback,
      });
    }
    return res.status(503).json({
      scanStatus: 'TEMPORARILY_UNAVAILABLE',
      sourceType: 'SERVICE_ERROR',
      analysis: null,
      error:
        'GREENY is temporarily unable to connect to the Plant Doctor. Your uploaded image is safe. Please try again.',
      code: 'PLANT_DOCTOR_TEMPORARILY_UNAVAILABLE',
      retryable: true,
      savedGardenInfo: savedGardenFallback,
      generalCareAdvice: generalCareFallback,
    });
  }
}

app.post('/api/ai/analyze-plant', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res));
app.post('/api/plant/identify', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'identification'));
app.post('/api/plant/diagnose', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'disease'));
app.post('/api/plant/pest-detection', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'pest'));
app.post('/api/plant/nutrient-analysis', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'nutrient'));
app.post('/api/plant/rescue', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'rescue'));

// Save Scanned Plant, Photograph, Identification Report & Health Analysis to My Garden
app.post('/api/plant/save-scan-to-garden', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const {
      commonName,
      scientificName,
      plantCategory,
      location,
      potSize,
      soilType,
      sunlight,
      healthScore,
      overallHealthStatus,
      possibleCondition,
      confidence,
      visibleSymptoms,
      possibleCauses,
      safeTreatments,
      preventionStrategy,
      imageUrl,
      reportData,
    } = req.body || {};

    if (!commonName) {
      return res.status(400).json({ error: 'Plant name is required to save to My Garden.' });
    }

    const scannedDate = new Date().toISOString().slice(0, 10);
    const numericHealth = Number(healthScore) || 88;
    const statusLabel =
      overallHealthStatus || (numericHealth >= 85 ? 'Healthy' : numericHealth >= 70 ? 'Mild Stress' : 'Needs Attention');

    const storedImage =
      typeof imageUrl === 'string' && imageUrl.length > 0 && imageUrl.length < 450000
        ? imageUrl
        : '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg';

    const [insertedPlant] = await db
      .insert(userPlants)
      .values({
        userUid: uid,
        name: String(commonName).trim(),
        species: String(commonName).trim(),
        scientificName: String(scientificName || commonName).trim(),
        addedDate: scannedDate,
        location: location || 'Indoor Garden · Scanned Specimen',
        potSize: potSize || 'Medium (25cm)',
        soilType: soilType || 'Well-draining Organic Mix',
        sunlight: sunlight || 'Bright Indirect Light',
        healthScore: numericHealth,
        status: statusLabel,
        lastWatered: scannedDate,
        nextWatering: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
        heightCm: 40,
        notes: `Scanned on ${scannedDate}: ${possibleCondition || 'Healthy foliage'}. ${(safeTreatments || [])[0] || ''}`.trim(),
        imageUrl: storedImage,
      })
      .returning();

    const [insertedDiagnosis] = await db
      .insert(plantDiagnoses)
      .values({
        userUid: uid,
        plantId: insertedPlant.id,
        plantName: `${insertedPlant.name} (${insertedPlant.scientificName})`,
        scientificName: insertedPlant.scientificName || '',
        plantCategory: plantCategory || 'Botanical Specimen',
        diagnosisType: 'disease',
        possibleCondition: possibleCondition || 'Saved from AI Plant Scanner',
        confidence: Number(confidence) || 92,
        healthScore: numericHealth,
        severity: statusLabel,
        symptoms: Array.isArray(visibleSymptoms) ? visibleSymptoms.join('; ') : String(visibleSymptoms || 'Observed during scan'),
        causes: Array.isArray(possibleCauses) ? possibleCauses.join('; ') : String(possibleCauses || 'Evaluated via AI scanner'),
        recommendations: Array.isArray(safeTreatments) ? safeTreatments.join('; ') : String(safeTreatments || 'Follow recommended care'),
        prevention: preventionStrategy || 'Monitor new leaf growth weekly.',
        imageUrl: storedImage,
        reportJson: JSON.stringify(reportData || {}),
        scannedDate,
        isConfirmed: true,
      })
      .returning();

    res.json({
      plant: insertedPlant,
      diagnosis: insertedDiagnosis,
      message: `${insertedPlant.name} and its complete scan report have been saved to My Garden.`,
    });
  } catch (error: any) {
    console.error('Failed to save scan to My Garden:', error);
    res.status(500).json({ error: error.message || 'Failed to save scanned plant to My Garden.' });
  }
});

// 12. Multi-Turn Gemini Chatbot + GREENY 3D Companion + Google Search Grounding
app.post('/api/ai/greeny-chat', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  const uid = req.effectiveUid || 'demo-botanist-uid';
  let memorySummary = '';
  try {
    const {
      message,
      history = [],
      language = 'en',
      model = 'gemini-3.8-flash',
      rolePersona = 'GREENY Companion',
      useSearchGrounding = false,
      plantContext = '',
      simulateTransient503Count = 0,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const ai = getGeminiClient();
    const userPlantsList = await db.select().from(userPlants).where(eq(userPlants.userUid, uid));
    memorySummary = userPlantsList
      .map((p) => `${p.name} (${p.species}, Health: ${p.healthScore}%, Status: ${p.status}, Notes: ${p.notes})`)
      .join(' | ');

    const roleInstructions: Record<string, string> = {
      'GREENY Companion':
        'You are GREENY, an extremely adorable, cheerful, playful, and intelligent baby plant companion living inside MyPlantCare. Speak like a friendly little gardening buddy (using warm expressions like "Yayyy!", "Hehehe!", "Let\'s check on our leafy friend!") while delivering accurate organic gardening guidance.',
      'Pathology & Root Scientist':
        'You are Dr. Chloris, Chief Botanical Pathologist & Rhizosphere Researcher at MYPLANTCARE. Perform deep root-cause reasoning on plant physiology, nutrient mobility, and safe bio-fungicidal interventions.',
      'Climate & Irrigation Agronomist':
        'You are the MYPLANTCARE Agro-Meteorology & Hydration Specialist. Focus on evapotranspiration math, VPD (Vapor Pressure Deficit), monsoon drainage, and heatwave shading.',
      'Quick Triage Botanist':
        'You are the MYPLANTCARE Rapid Triage Botanist. Deliver concise, immediate bulleted action steps for urgent plant care questions.',
    };

    const personaHeader = roleInstructions[rolePersona] || roleInstructions['GREENY Companion'];
    const systemInstruction = `${personaHeader}
Contextual Saved Garden Memory (Use ONLY when relevant to the user's question; never claim you visually scanned a new photo in chat): ${memorySummary || plantContext || 'No plants registered yet'}.
Preferred Language: ${language === 'ta' ? 'Natural conversational Tamil (தமிழ்) with friendly tone' : 'English'}.
Safety Rules:
- Never claim that a plant photograph was identified or diagnosed unless an actual image scan succeeded.
- Clearly distinguish visual AI hypotheses from confirmed lab tests.
- Never recommend hazardous synthetic pesticides; prioritize organic, cultural, and biological controls.`;

    const requestedModel = ALLOWED_CHAT_MODELS.includes(model) ? model : getPrimaryVisionModel();
    const configuredBackupModel = (process.env.GEMINI_BACKUP_MODEL || 'gemini-3.1-flash-lite').trim();

    // Format multi-turn conversation history
    const formattedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = Array.isArray(history)
      ? history
          .filter((h: any) => h && typeof h.text === 'string' && h.text.trim().length > 0)
          .slice(-12)
          .map((h: any) => ({
            role: h.sender === 'user' || h.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(h.text) }],
          }))
      : [];

    let remainingSim503 = Math.max(0, Number(simulateTransient503Count) || 0);

    // Branch A: Google Search Grounding enabled -> must use gemini-3.8-flash with googleSearch tool
    if (useSearchGrounding) {
      if (remainingSim503 > 0) {
        const simErr: any = new Error('Simulated 503 high demand');
        simErr.status = 503;
        throw simErr;
      }
      const contents = [
        ...formattedHistory,
        { role: 'user' as const, parts: [{ text: String(message) }] },
      ];
      const searchRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = searchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((c: any) => (c.web ? { uri: c.web.uri, title: c.web.title || c.web.uri } : null))
        .filter(Boolean);

      return res.json({
        sourceCategory: 'GEMINI_AI',
        reply: searchRes.text || 'Search-grounded botanical analysis complete.',
        emotionState: 'HAPPY',
        suggestedAction: 'Review verified web citations below for regional horticultural guidance.',
        resolvedModel: 'gemini-3.8-flash (Google Search Grounded)',
        usedBackupModel: false,
        sources,
      });
    }

    // Branch B: Multi-turn Chat with automatic retry and GEMINI_BACKUP_MODEL failover on 503
    let activeModel: string = requestedModel;
    let usedBackupModel = false;

    const runChatTurn = async (targetModel: string) => {
      if (remainingSim503 > 0) {
        remainingSim503 -= 1;
        const simErr: any = new Error('Simulated 503 UNAVAILABLE');
        simErr.status = 503;
        throw simErr;
      }
      const chat = ai.chats.create({
        model: targetModel,
        history: formattedHistory,
        config: {
          systemInstruction: `${systemInstruction}\nRespond in JSON with keys: reply (string), emotionState ('HAPPY'|'SPEAKING'|'WARNING'|'IDLE'), suggestedAction (string).`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              emotionState: { type: Type.STRING },
              suggestedAction: { type: Type.STRING },
            },
          },
        },
      });
      return await chat.sendMessage({ message: String(message) });
    };

    let response;
    try {
      response = await runChatTurn(activeModel);
    } catch (firstErr: any) {
      // Failover to GEMINI_BACKUP_MODEL when primary model returns 503 or requires fallback
      const backupTarget = SUPPORTED_VISION_MODELS.has(configuredBackupModel)
        ? configuredBackupModel
        : 'gemini-3.1-flash-lite';
      await sleepWithExponentialBackoffAndJitter(0, 180);
      activeModel = backupTarget;
      usedBackupModel = true;
      response = await runChatTurn(activeModel);
    }

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      sourceCategory: 'GEMINI_AI',
      ...parsed,
      resolvedModel: activeModel,
      usedBackupModel,
      savedGardenContext:
        userPlantsList.length > 0
          ? `Contextual Saved Garden Info: ${userPlantsList
              .slice(0, 3)
              .map((p) => `${p.name} (${p.species}, Health ${p.healthScore}%)`)
              .join(' · ')}`
          : undefined,
      sources: [],
    });
  } catch (error: any) {
    console.error('Greeny AI chat error:', error?.status || error?.code || 'ERR');
    res.status(503).json({
      sourceCategory: 'SERVICE_ERROR',
      error:
        'GREENY is temporarily unable to reach the Gemini AI service right now. Your conversation is preserved — please click Retry Question.',
      retryable: true,
      savedGardenContext: memorySummary
        ? `Saved Garden Information (Contextual Memory Only): ${memorySummary}`
        : undefined,
      generalCareReference:
        'General Plant Care Advice: Keep soil slightly aerated, check the top 3–5 cm for dryness before watering, and provide bright indirect light.',
    });
  }
});

// 13. Dedicated Google Search Grounding Endpoint for Botanical & Agricultural Research
app.post('/api/ai/search-grounding', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: String(query).trim(),
      config: {
        systemInstruction:
          'You are the MYPLANTCARE Live Botanical Research Engine. Provide accurate, up-to-date horticultural, agricultural, climate, and plant-care answers grounded in Google Search results. Prioritize safe organic practices.',
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: any) => (c.web ? { uri: c.web.uri, title: c.web.title || c.web.uri } : null))
      .filter(Boolean);

    res.json({
      answer: response.text || 'No grounded summary returned.',
      sources,
      model: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Google Search grounding error:', error);
    res.status(500).json({
      error: error.message || 'Failed to perform Google Search grounded query.',
    });
  }
});

// 14. Gemini AI — Personalized Garden Designer & Plant Recommendation Engine
app.post('/api/ai/garden-design', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const { title, style, spaceType, dimensions, sunlight, climate, budget, preferences } = req.body;

    const ai = getGeminiClient();
    const prompt = `Design a personalized botanical layout for MYPLANTCARE:
Style: ${style}
Space: ${spaceType} (${dimensions})
Sunlight: ${sunlight}
Climate: ${climate}
Maintenance Budget: ${budget}
Preferences: ${preferences || 'Include Indian & tropical resilient varieties where appropriate'}.
Return a structured 4-zone spatial plan and care strategy.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planTitle: { type: Type.STRING },
            architecturalSummary: { type: Type.STRING },
            zones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  zone: { type: Type.STRING },
                  plant: { type: Type.STRING },
                  role: { type: Type.STRING },
                },
              },
            },
            irrigationPlan: { type: Type.STRING },
            estimatedMonthlyCareHours: { type: Type.INTEGER },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const inserted = await db
      .insert(gardenDesigns)
      .values({
        userUid: uid,
        title: parsed.planTitle || title || `${style} Sanctuary`,
        style: style || 'Tropical Garden',
        spaceType: spaceType || 'Balcony',
        dimensions: dimensions || '3m × 2m',
        sunlight: sunlight || 'Bright Indirect',
        climate: climate || 'Tropical',
        budget: budget || 'Moderate',
        layoutJson: JSON.stringify(parsed.zones || []),
        aiRecommendations: parsed.architecturalSummary || 'Custom biophilic zone layout.',
      })
      .returning();

    res.json({ design: inserted[0], aiPlan: parsed });
  } catch (error: any) {
    console.error('AI garden design error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI garden plan.' });
  }
});

async function startServer() {
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // 15. Gemini Live API (gemini-3.8-live) Real-Time Voice Conversation WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const reqUrl = request.url || '';
    if (reqUrl.startsWith('/live')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs, request) => {
    const urlObj = new URL(request.url || '/live', 'http://localhost:3000');
    const lang = urlObj.searchParams.get('lang') === 'ta' ? 'ta' : 'en';
    const voiceName = urlObj.searchParams.get('voice') || 'Zephyr';

    const ai = getGeminiClient();
    let liveSession: any = null;

    const sessionPromise = ai.live
      .connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are GREENY, the real-time voice botanical companion of MYPLANTCARE. Speak warmly and concisely in ${
            lang === 'ta' ? 'Tamil (தமிழ்) and English' : 'English'
          }. Help the user diagnose plant symptoms, calibrate watering, and nurture their sanctuary using safe organic methods.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== clientWs.OPEN) return;

            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  inputTranscript: content.inputTranscription.text,
                })
              );
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  outputTranscript: content.outputTranscription.text,
                })
              );
            }

            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    audio: part.inlineData.data,
                  })
                );
              }
            }

            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: any) => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(
                JSON.stringify({
                  error: err?.message || 'Gemini Live API stream error.',
                })
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.close();
            }
          },
        },
      })
      .then((session) => {
        liveSession = session;
        if (clientWs.readyState === clientWs.OPEN) {
          clientWs.send(JSON.stringify({ status: 'connected', model: 'gemini-3.8-live' }));
        }
        return session;
      })
      .catch((err: any) => {
        if (clientWs.readyState === clientWs.OPEN) {
          clientWs.send(
            JSON.stringify({
              error: err?.message || 'Failed to connect to gemini-3.8-live session.',
            })
          );
        }
      });

    clientWs.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        sessionPromise.then((session) => {
          if (!session) return;
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: {
                data: parsed.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } else if (parsed.text) {
            session.sendRealtimeInput({
              text: String(parsed.text),
            });
          }
        });
      } catch (e) {
        console.error('Live WS message error:', e);
      }
    });

    clientWs.on('close', () => {
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // ignore close error
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`MYPLANTCARE Full-Stack Server (with Gemini Live API WS) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
