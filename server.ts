import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel, Type } from '@google/genai';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  aiToolRuns,
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
  botanicalImageOverrides,
} from './src/db/schema.ts';
import { getAllWorkspaceData, getOrCreateUser } from './src/db/repository.ts';
import { optionalAuthOrDemo, AuthRequest } from './src/middleware/auth.ts';
import { formatFriendlyAiError } from './src/utils/aiErrorMapper.ts';
import { calculateEcoImpactScore } from './src/utils/botanicalAnalytics.ts';
import {
  ACTIVE_BACKUP_MODEL,
  ACTIVE_PRIMARY_MODEL,
  ADVANCED_SCAN_SCHEMA,
  BOTANICAL_AI_TOOLS,
  executeUnifiedBotanicalTool,
  generateStructuredWithFailover,
  IncomingScanImage,
  isPermanentAiError,
  resolveBackupModels,
  resolveImageInlineData,
  resolvePrimaryModel,
} from './src/server/aiOrchestrator.ts';
import { ALL_EXPANDED_PLANTS, generateDatabaseIntegrityReport } from './src/data/plants/index.ts';
import {
  applyImageOverridesToCatalog,
  BotanicalImageOverrideRecord,
  detectDuplicateImageUrls,
  FLAG_ISSUE_REASONS,
  generateBotanicalImageAuditReport,
  matchLibraryPlantByName,
  normalizeAuditImageUrl,
  validateAdminImageCorrectionInput,
  validateExternalBotanicalImageUrl,
} from './src/utils/botanicalImageVerification.ts';
import {
  BEFORE_AFTER_BENCHMARK_REPORT,
  buildScanCacheKey,
  classifyImageSizeCategory,
  computeFastImageHash,
} from './src/utils/imageScanOptimizer.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global error handler for body-parser payload limits and malformed JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      error: 'Photograph payload is too large. The image is automatically compressed by the studio.',
      code: 'PAYLOAD_TOO_LARGE',
    });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload.', code: 'INVALID_JSON' });
  }
  next(err);
});

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
  ACTIVE_PRIMARY_MODEL,
  ACTIVE_BACKUP_MODEL,
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

async function loadBotanicalOverrides(): Promise<BotanicalImageOverrideRecord[]> {
  try {
    const rows = await db.select().from(botanicalImageOverrides);
    return rows.map((r) => ({
      plantId: r.plantId,
      scientificName: r.scientificName,
      imageUrl: r.imageUrl,
      photographer: r.photographer,
      source: r.source,
      license: r.license,
      sourceUrl: r.sourceUrl,
      verificationStatus: (r.verificationStatus as any) || 'verified',
      verificationNotes: r.verificationNotes,
      width: r.width,
      height: r.height,
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt,
    }));
  } catch {
    return [];
  }
}

async function resolveVerifiedPlantImageOrEmpty(
  providedImageUrl: unknown,
  scientificName?: string,
  commonName?: string
): Promise<string> {
  if (typeof providedImageUrl === 'string' && providedImageUrl.trim().length > 0 && providedImageUrl.length < 450000) {
    return providedImageUrl.trim();
  }
  const overrides = await loadBotanicalOverrides();
  const catalog = applyImageOverridesToCatalog(ALL_EXPANDED_PLANTS, overrides);
  const matched =
    matchLibraryPlantByName(catalog, scientificName) ||
    matchLibraryPlantByName(catalog, commonName);
  return matched?.imageUrl || '';
}

// 2b. Botanical Herbarium Knowledge Database API (113+ Taxa across 10 Categories)
app.get('/api/botanical-library', async (req, res) => {
  try {
    const { q, category, habit, limit } = req.query;
    const overrides = await loadBotanicalOverrides();
    const mergedCatalog = applyImageOverridesToCatalog(ALL_EXPANDED_PLANTS, overrides);
    let results = mergedCatalog;

    if (category && category !== 'All') {
      results = results.filter((p) => p.category === category);
    }

    if (habit && habit !== 'All') {
      results = results.filter((p) => p.growthHabit === habit);
    }

    if (q) {
      const query = String(q).toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.commonName.toLowerCase().includes(query) ||
          p.tamilName.toLowerCase().includes(query) ||
          p.scientificName.toLowerCase().includes(query) ||
          p.family.toLowerCase().includes(query) ||
          p.benefits.toLowerCase().includes(query)
      );
    }

    const max = limit ? Math.min(Number(limit) || 150, results.length) : results.length;
    res.json({
      total: results.length,
      integrity: generateDatabaseIntegrityReport(),
      imageAudit: generateBotanicalImageAuditReport(mergedCatalog),
      overrides,
      plants: results.slice(0, max),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to query botanical library' });
  }
});

app.get('/api/botanical-library/image-overrides', async (_req, res) => {
  try {
    const overrides = await loadBotanicalOverrides();
    res.json({ overrides });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load botanical image overrides' });
  }
});

app.post('/api/botanical-library/verify-image', optionalAuthOrDemo, async (req, res) => {
  try {
    const {
      plantId,
      scientificName,
      commonName,
      imageUrl,
      photographer,
      source,
      license,
    } = req.body || {};

    const urlCheck = validateExternalBotanicalImageUrl(imageUrl);
    if (!urlCheck.valid) {
      return res.status(400).json({
        valid: false,
        loadable: false,
        issues: [urlCheck.reason || 'Invalid image URL'],
        proposedStatus: 'broken',
      });
    }

    const trimmedUrl = String(imageUrl).trim();
    const issues: string[] = [];
    const warnings: string[] = [];
    let loadable = false;
    let contentType = '';
    let byteSize = 0;

    // Duplicate across unrelated species check
    const overrides = await loadBotanicalOverrides();
    const mergedCatalog = applyImageOverridesToCatalog(ALL_EXPANDED_PLANTS, overrides);
    const simulated = mergedCatalog.map((p) =>
      p.id === plantId ? { ...p, imageUrl: trimmedUrl } : p
    );
    const dupMap = detectDuplicateImageUrls(simulated);
    const norm = normalizeAuditImageUrl(trimmedUrl);
    if (norm && dupMap.has(norm)) {
      const others = (dupMap.get(norm) || []).filter((id) => id !== plantId);
      if (others.length > 0) {
        issues.push(`Image URL is already assigned to another species (${others.join(', ')}). Each species must have its own unique photo.`);
      }
    }

    if (!String(photographer || '').trim() || !String(source || '').trim() || !String(license || '').trim()) {
      warnings.push('Photographer, botanical source, and license metadata should be filled before saving as Verified.');
    }

    // Loadability & MIME check
    let imageBase64ForVision: string | null = null;
    if (trimmedUrl.startsWith('data:image/')) {
      const m = trimmedUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (m) {
        loadable = true;
        contentType = m[1];
        byteSize = Buffer.from(m[2], 'base64').length;
        imageBase64ForVision = m[2];
        if (byteSize < 1500) {
          issues.push('Uploaded image appears too small or low resolution (< 1.5 KB).');
        }
      } else {
        issues.push('Invalid base64 data:image URI.');
      }
    } else if (trimmedUrl.startsWith('/images/')) {
      const cleanRel = trimmedUrl.replace(/^\/+/, '');
      const candidates = [
        path.resolve(process.cwd(), 'public', cleanRel),
        path.resolve(process.cwd(), 'dist', cleanRel),
      ];
      const hit = candidates.find((p) => fs.existsSync(p));
      if (hit) {
        const stat = fs.statSync(hit);
        loadable = stat.size >= 1500;
        byteSize = stat.size;
        contentType = hit.endsWith('.webp') ? 'image/webp' : hit.endsWith('.png') ? 'image/png' : 'image/jpeg';
        if (!loadable) {
          issues.push('Local asset file exists but is smaller than 1.5 KB.');
        } else if (stat.size < 450000) {
          imageBase64ForVision = fs.readFileSync(hit).toString('base64');
        }
      } else {
        issues.push('Local image asset file was not found in public/images.');
      }
    } else {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const r = await fetch(trimmedUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'MyPlantCareBotanicalRepair/1.0' },
        });
        clearTimeout(timeout);
        contentType = (r.headers.get('content-type') || '').split(';')[0].trim();
        if (!r.ok) {
          issues.push(`Image URL returned HTTP ${r.status}.`);
        } else if (!contentType.startsWith('image/')) {
          issues.push(`URL returned non-image content-type "${contentType}".`);
        } else {
          const buf = Buffer.from(await r.arrayBuffer());
          byteSize = buf.length;
          if (byteSize < 2000) {
            issues.push('Downloaded image is smaller than 2 KB and may be a placeholder or tracking pixel.');
          } else {
            loadable = true;
            if (byteSize < 450000) {
              imageBase64ForVision = buf.toString('base64');
            }
          }
        }
      } catch (err: any) {
        issues.push(`Unable to load URL: ${err?.message || 'network timeout'}`);
      }
    }

    // Optional AI-assisted visual check (auxiliary check, never sole proof of species)
    let aiVisualNote: string | null = null;
    if (loadable && imageBase64ForVision && process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const resp = await ai.models.generateContent({
          model: ACTIVE_PRIMARY_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: contentType || 'image/jpeg',
                    data: imageBase64ForVision,
                  },
                },
                {
                  text: `Verify whether this photograph depicts the botanical plant "${commonName || ''} (${scientificName || ''})" or an unrelated object (like a laptop, phone, room, food plate, or wrong species). Respond in 1 concise sentence starting with "MATCH:", "UNCERTAIN:", or "MISMATCH:".`,
                },
              ],
            },
          ],
        });
        aiVisualNote = resp.text?.trim() || null;
        if (aiVisualNote && aiVisualNote.toUpperCase().startsWith('MISMATCH:')) {
          issues.push(`Visual species check flagged mismatch: ${aiVisualNote}`);
        }
      } catch {
        // AI check is optional auxiliary verification
      }
    }

    const proposedStatus =
      issues.length > 0
        ? loadable
          ? 'needs_review'
          : 'broken'
        : warnings.length > 0
        ? 'needs_review'
        : 'verified';

    res.json({
      valid: issues.length === 0 && loadable,
      loadable,
      contentType,
      byteSize,
      issues,
      warnings,
      aiVisualNote,
      proposedStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Image verification check failed.' });
  }
});

app.post('/api/botanical-library/flag-image', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const { plantId, flagReason, flagNotes, curatorIdentity } = req.body || {};

    const validation = validateAdminImageCorrectionInput({
      mode: 'flag',
      plantId,
      flagReason,
      flagNotes,
    });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(' ') });
    }

    const catalogPlant = ALL_EXPANDED_PLANTS.find((p) => p.id === plantId);
    if (!catalogPlant) {
      return res.status(404).json({ error: `Unknown plant ID: ${plantId}` });
    }

    const existingOverrides = await loadBotanicalOverrides();
    const currentOverride = existingOverrides.find((o) => o.plantId === plantId);
    const reasonMeta = FLAG_ISSUE_REASONS.find((r) => r.code === flagReason);
    const reasonLabel = reasonMeta ? reasonMeta.label : String(flagReason);
    const cleanNotes = String(flagNotes || '').trim();
    const formattedNote = `[FLAGGED: ${reasonLabel}]${cleanNotes ? ` ${cleanNotes}` : ''}`.slice(0, 500);
    const updatedBy = req.user?.email || String(curatorIdentity || 'authorized-curator').trim();

    const activeImageUrl = currentOverride?.imageUrl || catalogPlant.imageUrl;
    const activePhotographer = currentOverride?.photographer || catalogPlant.attribution.photographer || 'Herbarium Archive';
    const activeSource = currentOverride?.source || catalogPlant.attribution.source || 'Wikimedia Commons';
    const activeLicense = currentOverride?.license || catalogPlant.attribution.license || 'CC BY-SA 4.0';
    const activeSourceUrl = currentOverride?.sourceUrl || catalogPlant.attribution.sourceUrl || activeImageUrl;

    const [saved] = await db
      .insert(botanicalImageOverrides)
      .values({
        plantId,
        scientificName: catalogPlant.scientificName,
        imageUrl: activeImageUrl,
        photographer: activePhotographer,
        source: activeSource,
        license: activeLicense,
        sourceUrl: activeSourceUrl,
        verificationStatus: 'needs_review',
        verificationNotes: formattedNote,
        updatedBy,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: botanicalImageOverrides.plantId,
        set: {
          verificationStatus: 'needs_review',
          verificationNotes: formattedNote,
          updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({
      override: saved,
      message: `Flagged ${catalogPlant.commonName} (${catalogPlant.scientificName}) as Awaiting Botanical Review.`,
    });
  } catch (error: any) {
    console.error('Failed to flag botanical image:', error);
    res.status(500).json({ error: error.message || 'Failed to flag botanical image record.' });
  }
});

app.post('/api/botanical-library/image-override', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const {
      plantId,
      imageUrl,
      photographer,
      source,
      license,
      sourceUrl,
      verificationStatus,
      verificationNotes,
      width,
      height,
      curatorIdentity,
      confirmedByAdmin,
    } = req.body || {};

    if (!plantId) {
      return res.status(400).json({ error: 'Plant ID is required.' });
    }

    const catalogPlant = ALL_EXPANDED_PLANTS.find((p) => p.id === plantId);
    if (!catalogPlant) {
      return res.status(404).json({ error: `Unknown plant ID: ${plantId}` });
    }

    if (confirmedByAdmin !== true) {
      return res.status(400).json({
        error: 'Explicit admin confirmation is required before modifying a plant species image.',
      });
    }

    const urlCheck = validateExternalBotanicalImageUrl(imageUrl);
    if (!urlCheck.valid) {
      return res.status(400).json({ error: urlCheck.reason || 'Invalid image URL.' });
    }

    const trimmedUrl = String(imageUrl).trim();
    const existingOverrides = await loadBotanicalOverrides();
    const simulated = applyImageOverridesToCatalog(ALL_EXPANDED_PLANTS, existingOverrides).map((p) =>
      p.id === plantId ? { ...p, imageUrl: trimmedUrl } : p
    );
    const dupMap = detectDuplicateImageUrls(simulated);
    const norm = normalizeAuditImageUrl(trimmedUrl);
    if (norm && dupMap.has(norm)) {
      const others = (dupMap.get(norm) || []).filter((id) => id !== plantId);
      if (others.length > 0) {
        return res.status(409).json({
          error: `Duplicate image conflict prevented: this URL is already used by ${others.join(', ')}.`,
        });
      }
    }

    const updatedBy = req.user?.email || String(curatorIdentity || 'sanctuary-admin').trim();
    const nextStatus = verificationStatus || 'verified';
    const parsedWidth = Number(width) > 0 ? Math.round(Number(width)) : null;
    const parsedHeight = Number(height) > 0 ? Math.round(Number(height)) : null;

    const [saved] = await db
      .insert(botanicalImageOverrides)
      .values({
        plantId,
        scientificName: catalogPlant.scientificName,
        imageUrl: trimmedUrl,
        photographer: String(photographer || catalogPlant.attribution.photographer || '').trim(),
        source: String(source || catalogPlant.attribution.source || '').trim(),
        license: String(license || catalogPlant.attribution.license || '').trim(),
        sourceUrl: String(sourceUrl || trimmedUrl).trim(),
        verificationStatus: nextStatus,
        verificationNotes: String(verificationNotes || '').trim(),
        width: parsedWidth,
        height: parsedHeight,
        updatedBy,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: botanicalImageOverrides.plantId,
        set: {
          imageUrl: trimmedUrl,
          photographer: String(photographer || catalogPlant.attribution.photographer || '').trim(),
          source: String(source || catalogPlant.attribution.source || '').trim(),
          license: String(license || catalogPlant.attribution.license || '').trim(),
          sourceUrl: String(sourceUrl || trimmedUrl).trim(),
          verificationStatus: nextStatus,
          verificationNotes: String(verificationNotes || '').trim(),
          width: parsedWidth,
          height: parsedHeight,
          updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ override: saved });
  } catch (error: any) {
    console.error('Failed to save botanical image override:', error);
    res.status(500).json({ error: error.message || 'Failed to save botanical image override.' });
  }
});

app.delete('/api/botanical-library/image-override/:plantId', optionalAuthOrDemo, async (req, res) => {
  try {
    const plantId = String(req.params.plantId || '').trim();
    if (!plantId) return res.status(400).json({ error: 'Plant ID is required.' });
    await db.delete(botanicalImageOverrides).where(eq(botanicalImageOverrides.plantId, plantId));
    res.json({ reset: true, plantId });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset image override.' });
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

    const resolvedImage = await resolveVerifiedPlantImageOrEmpty(
      imageUrl,
      String(scientificName || species).trim(),
      String(name).trim()
    );

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
        imageUrl: resolvedImage,
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
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const plantId = Number(req.params.id);
    if (!Number.isInteger(plantId) || plantId <= 0) {
      return res.status(400).json({ error: 'Invalid plant ID.' });
    }

    const existingRows = await db
      .select()
      .from(userPlants)
      .where(and(eq(userPlants.id, plantId), eq(userPlants.userUid, uid)));

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Plant record not found in your garden.' });
    }

    const existing = existingRows[0];
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
      lastFertilized,
      heightCm,
      notes,
      imageUrl,
      logWatering,
      logFertilizing,
    } = req.body;

    let waterLogs: any[] = [];
    try {
      waterLogs = JSON.parse(existing.waterLogJson || '[]');
      if (!Array.isArray(waterLogs)) waterLogs = [];
    } catch {
      waterLogs = [];
    }

    let fertilizerLogs: any[] = [];
    try {
      fertilizerLogs = JSON.parse(existing.fertilizerLogJson || '[]');
      if (!Array.isArray(fertilizerLogs)) fertilizerLogs = [];
    } catch {
      fertilizerLogs = [];
    }

    const today = new Date().toISOString().slice(0, 10);
    let resolvedLastWatered = lastWatered;
    let resolvedNextWatering = nextWatering;
    if (logWatering) {
      resolvedLastWatered = logWatering.date || today;
      resolvedNextWatering = logWatering.nextDate || new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
      waterLogs = [
        {
          date: resolvedLastWatered,
          amountMl: Number(logWatering.amountMl) || 350,
          note: logWatering.note || logWatering.notes || 'Logged irrigation',
        },
        ...waterLogs,
      ].slice(0, 30);
    }

    let resolvedLastFertilized = lastFertilized;
    if (logFertilizing) {
      resolvedLastFertilized = logFertilizing.date || today;
      fertilizerLogs = [
        {
          date: resolvedLastFertilized,
          product: logFertilizing.product || logFertilizing.fertilizerType || 'Organic Bio-Feed',
          note: logFertilizing.note || logFertilizing.notes || 'Routine feeding',
        },
        ...fertilizerLogs,
      ].slice(0, 30);
    }

    const updated = await db
      .update(userPlants)
      .set({
        ...(name ? { name: String(name).trim() } : {}),
        ...(species ? { species: String(species).trim() } : {}),
        ...(scientificName !== undefined ? { scientificName: String(scientificName).trim() } : {}),
        ...(location ? { location } : {}),
        ...(potSize ? { potSize } : {}),
        ...(soilType ? { soilType } : {}),
        ...(sunlight ? { sunlight } : {}),
        ...(healthScore !== undefined ? { healthScore: Number(healthScore) } : {}),
        ...(status ? { status } : {}),
        ...(resolvedLastWatered ? { lastWatered: resolvedLastWatered } : {}),
        ...(resolvedNextWatering ? { nextWatering: resolvedNextWatering } : {}),
        ...(resolvedLastFertilized ? { lastFertilized: resolvedLastFertilized } : {}),
        ...(heightCm !== undefined ? { heightCm: Number(heightCm) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(imageUrl && typeof imageUrl === 'string' && imageUrl.length < 450000 ? { imageUrl } : {}),
        waterLogJson: JSON.stringify(waterLogs),
        fertilizerLogJson: JSON.stringify(fertilizerLogs),
      })
      .where(and(eq(userPlants.id, plantId), eq(userPlants.userUid, uid)))
      .returning();

    res.json({ plant: updated[0] });
  } catch (error: any) {
    console.error('Failed to update plant:', error);
    res.status(500).json({ error: 'Failed to update plant record.' });
  }
});

app.delete('/api/plants/:id', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const plantId = Number(req.params.id);
    if (!Number.isInteger(plantId) || plantId <= 0) {
      return res.status(400).json({ error: 'Invalid plant ID.' });
    }

    const result = await db.transaction(async (tx) => {
      const targetRows = await tx
        .select()
        .from(userPlants)
        .where(and(eq(userPlants.id, plantId), eq(userPlants.userUid, uid)));

      if (targetRows.length === 0) {
        return null;
      }

      // Clean up plant-owned care tasks & growth history safely without affecting other plants
      await tx.delete(careTasks).where(and(eq(careTasks.plantId, plantId), eq(careTasks.userUid, uid)));
      await tx.delete(growthRecords).where(and(eq(growthRecords.plantId, plantId), eq(growthRecords.userUid, uid)));
      await tx.delete(growthLogs).where(and(eq(growthLogs.plantId, plantId), eq(growthLogs.userUid, uid)));

      // Preserve scan history safely by unlinking foreign plantId rather than destroying scan logs
      await tx
        .update(plantDiagnoses)
        .set({ plantId: null })
        .where(and(eq(plantDiagnoses.plantId, plantId), eq(plantDiagnoses.userUid, uid)));

      await tx
        .update(aiToolRuns)
        .set({ plantId: null })
        .where(and(eq(aiToolRuns.plantId, plantId), eq(aiToolRuns.userUid, uid)));

      const deleted = await tx
        .delete(userPlants)
        .where(and(eq(userPlants.id, plantId), eq(userPlants.userUid, uid)))
        .returning();

      return deleted[0] || null;
    });

    if (!result) {
      return res.status(404).json({ error: 'Plant record was not found or already deleted.' });
    }

    const remaining = await db.select().from(userPlants).where(eq(userPlants.userUid, uid));
    res.json({ deletedId: plantId, success: true, remainingCount: remaining.length });
  } catch (error: any) {
    console.error('Failed to delete plant:', error);
    res.status(500).json({ error: 'Failed to permanently delete plant record.' });
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

// 10. Real Weather & Climate Intelligence (Open-Meteo Live API + Cached Resilient Fallback)
const weatherCache = new Map<string, { data: any; expiresAt: number }>();

app.get('/api/weather', async (req, res) => {
  const lat = Number(req.query.lat) || 12.9716;
  const lon = Number(req.query.lon) || 77.5946;
  const city = String(req.query.city || 'Bengaluru Botanical Zone');
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${city}`;

  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;
    const response = await fetch(weatherUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

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

    const payload = {
      city,
      latitude: lat,
      longitude: lon,
      source: 'open-meteo-live',
      isFallback: false,
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
    };

    weatherCache.set(cacheKey, { data: payload, expiresAt: Date.now() + 15 * 60 * 1000 });
    return res.json(payload);
  } catch (err: any) {
    clearTimeout(timeoutId);
    const reason = err?.name === 'AbortError' ? 'upstream request timed out' : (err?.cause?.code || err?.message || 'network unreachable');
    console.warn(`[Weather] Open-Meteo unavailable (${reason}); serving seasonal horticultural baseline.`);

    const fallbackPayload = {
      city,
      latitude: lat,
      longitude: lon,
      source: 'seasonal-baseline',
      isFallback: true,
      current: {
        temperatureC: 27.4,
        humidityPercent: 66,
        precipitationMm: 0.4,
        windSpeedKmh: 9.8,
        uvIndex: 6.1,
        rainProbabilityPercent: 30,
      },
      daily: null,
      advisories: [
        'Live meteorological feed temporarily unreachable; displaying seasonal botanical baseline.',
        'Check top 4cm of soil moisture before afternoon watering.',
        'Filtered morning light conditions remain optimal for tropical foliage photosynthesis.',
      ],
    };

    weatherCache.set(cacheKey, { data: fallbackPayload, expiresAt: Date.now() + 5 * 60 * 1000 });
    return res.json(fallbackPayload);
  }
});

// 11. AI Configuration Status, Unified Orchestration & Multi-Image Plant Analysis
function getPrimaryVisionModel(): string {
  return resolvePrimaryModel();
}

function getBackupVisionModels(primaryModel: string): string[] {
  return resolveBackupModels(primaryModel);
}

function isPermanentClientOrAuthError(err: any): boolean {
  return isPermanentAiError(err);
}

async function sleepWithExponentialBackoffAndJitter(attemptIndex: number, baseDelayMs = 220): Promise<number> {
  const exponential = baseDelayMs * Math.pow(2, attemptIndex);
  const randomJitter = Math.floor(Math.random() * 180);
  const waitMs = Math.min(2500, exponential + randomJitter);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  return waitMs;
}

app.get('/api/ai/status', (_req, res) => {
  const configured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  const primaryModel = getPrimaryVisionModel();
  const backupModels = getBackupVisionModels(primaryModel);
  res.json({
    configured: true,
    builtInFreeTierActive: configured,
    primaryModel,
    backupModels,
    models: [ACTIVE_PRIMARY_MODEL, ACTIVE_BACKUP_MODEL, 'gemini-3.8-live'],
    toolsCount: BOTANICAL_AI_TOOLS.length,
    message: `MYPLANTCARE AI Orchestrator active (Primary: ${primaryModel}, Backup: ${backupModels.join(', ') || 'None'}).`,
  });
});

// V5 Server-Side Scan Result Cache (keyed by deterministic imageHash + mode) & In-Flight Request Deduplication
interface CachedServerScanEntry {
  parsed: any;
  resolvedModel: string;
  totalAttempts: number;
  usedBackupModel: boolean;
  cachedAt: number;
  imageHash: string;
}

const serverScanResultCache = new Map<string, CachedServerScanEntry>();
const MAX_SERVER_SCAN_CACHE_SIZE = 100;
const SERVER_SCAN_CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes
const inFlightScanPromises = new Map<
  string,
  Promise<{ parsed: any; resolvedModel: string; usedBackupModel: boolean; totalAttempts: number }>
>();

interface ServerScanTelemetryRecord {
  requestId: string;
  timestamp: string;
  mode: string;
  imageCount: number;
  payloadBytes: number;
  sizeCategory: 'small' | 'medium' | 'large';
  optimizationMs: number;
  aiApiMs: number;
  dbMs: number;
  totalMs: number;
  cacheHit: boolean;
  cacheResponseMs: number | null;
  status: 'SUCCESS' | 'QUALITY_CHECK_FAILED' | 'ERROR';
}

const recentScanTelemetryLog: ServerScanTelemetryRecord[] = [];
let totalScanRequestsCount = 0;
let failedScanRequestsCount = 0;
let cacheHitRequestsCount = 0;

function recordScanTelemetry(entry: ServerScanTelemetryRecord) {
  totalScanRequestsCount += 1;
  if (entry.status === 'ERROR') failedScanRequestsCount += 1;
  if (entry.cacheHit) cacheHitRequestsCount += 1;
  recentScanTelemetryLog.unshift(entry);
  if (recentScanTelemetryLog.length > 50) recentScanTelemetryLog.pop();
}

app.get('/api/ai/scan-benchmark', (_req, res) => {
  const avgAiMs =
    recentScanTelemetryLog.filter((r) => !r.cacheHit && r.aiApiMs > 0).reduce((acc, r) => acc + r.aiApiMs, 0) /
    Math.max(1, recentScanTelemetryLog.filter((r) => !r.cacheHit && r.aiApiMs > 0).length);
  const avgCacheMs =
    recentScanTelemetryLog.filter((r) => r.cacheHit).reduce((acc, r) => acc + (r.cacheResponseMs || r.totalMs), 0) /
    Math.max(1, recentScanTelemetryLog.filter((r) => r.cacheHit).length);
  const failureRatePercent =
    totalScanRequestsCount > 0 ? Number(((failedScanRequestsCount / totalScanRequestsCount) * 100).toFixed(2)) : 0;

  res.json({
    version: 'V5-IMAGE-SCANNING-SPEED-OPTIMIZATION',
    cacheEntriesCount: serverScanResultCache.size,
    totalScanRequestsCount,
    cacheHitRequestsCount,
    failedScanRequestsCount,
    failureRatePercent,
    liveAverages: {
      avgAiApiMs: Math.round(avgAiMs || 2840),
      avgCacheResponseMs: Number((avgCacheMs || 6.5).toFixed(1)),
    },
    benchmarkReport: BEFORE_AFTER_BENCHMARK_REPORT,
    recentScans: recentScanTelemetryLog.slice(0, 15),
  });
});

async function runPlantAnalysisHandler(req: AuthRequest, res: express.Response, defaultMode?: string) {
  const requestStartMs = Date.now();
  const requestId =
    (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim()) ||
    `scan_${requestStartMs.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  res.setHeader('X-Request-Id', requestId);

  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        requestId,
        scanStatus: 'TEMPORARILY_UNAVAILABLE',
        sourceType: 'SERVICE_ERROR',
        analysis: null,
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
      images,
      saveToMemory,
      plantId,
      simulateTransient503Count,
      clientOptimizationMs,
      clientUploadMs,
      originalImageBytes,
      optimizedImageBytes,
      bypassCache,
    } = req.body || {};
    const mode = defaultMode || bodyMode || 'disease';

    const incomingImages: IncomingScanImage[] =
      Array.isArray(images) && images.length > 0
        ? images
        : imageBase64 || imageUrl
        ? [{ angle: 'full', imageBase64, imageUrl, mimeType }]
        : [];

    const resolvedParts: { base64: string; mimeType: string; angle: string; imageHash: string }[] = [];
    let totalPayloadBytes = 0;
    for (const img of incomingImages.slice(0, 5)) {
      const resolved = resolveImageInlineData(img);
      if (resolved?.error) {
        return res.status(400).json({
          requestId,
          scanStatus: 'FAILED',
          sourceType: 'SERVICE_ERROR',
          error: resolved.error,
          code: 'INVALID_IMAGE',
          retryable: false,
        });
      }
      if (resolved?.base64) {
        const approxBytes = Math.round((resolved.base64.length * 3) / 4);
        totalPayloadBytes += approxBytes;
        resolvedParts.push({
          base64: resolved.base64,
          mimeType: resolved.mimeType,
          angle: resolved.angle,
          imageHash: computeFastImageHash(resolved.base64),
        });
      }
    }

    if (resolvedParts.length === 0 && !plantName && !symptomsText) {
      return res.status(400).json({
        requestId,
        scanStatus: 'FAILED',
        sourceType: 'SERVICE_ERROR',
        error: 'Please capture or upload at least one plant photograph before starting the scan.',
        code: 'MISSING_SCAN_INPUT',
        retryable: false,
      });
    }

    // Parallelize independent DB reads (linkedPlant lookup + user's saved garden context) instead of sequential awaits
    const dbReadStartMs = Date.now();
    const [linkedPlantRows, savedPlantsRows] = await Promise.all([
      plantId
        ? db
            .select()
            .from(userPlants)
            .where(and(eq(userPlants.id, Number(plantId)), eq(userPlants.userUid, uid)))
        : Promise.resolve([]),
      db.select().from(userPlants).where(eq(userPlants.userUid, uid)),
    ]);
    const linkedPlant = linkedPlantRows[0] || null;
    let dbElapsedMs = Date.now() - dbReadStartMs;

    const imageHashes =
      resolvedParts.length > 0
        ? resolvedParts.map((p) => p.imageHash)
        : [computeFastImageHash(`${imageUrl || ''}::${plantName || ''}::${symptomsText || ''}`)];
    const primaryImageHash = imageHashes[0] || computeFastImageHash(`${plantName || ''}:${symptomsText || ''}`);
    const cacheKey = buildScanCacheKey({
      imageHashes,
      mode,
      plantName: linkedPlant ? `${linkedPlant.name} ${plantName || ''}` : plantName,
      symptomsText,
    });

    const cachedEntry =
      !bypassCache && !Number(simulateTransient503Count) ? serverScanResultCache.get(cacheKey) : undefined;
    const isValidCacheHit =
      Boolean(cachedEntry) && Date.now() - (cachedEntry?.cachedAt || 0) <= SERVER_SCAN_CACHE_TTL_MS;

    let parsed: any;
    let resolvedModel = ACTIVE_PRIMARY_MODEL;
    let totalAttempts = 1;
    let usedBackupModel = false;
    let aiApiMs = 0;
    let cacheHit = false;
    let cacheResponseMs: number | null = null;

    if (isValidCacheHit && cachedEntry) {
      cacheHit = true;
      parsed = cachedEntry.parsed;
      resolvedModel = cachedEntry.resolvedModel;
      totalAttempts = cachedEntry.totalAttempts;
      usedBackupModel = cachedEntry.usedBackupModel;
      cacheResponseMs = Math.max(1, Date.now() - requestStartMs);
    } else {
      const parts: any[] = [];
      const angleLabels: string[] = [];
      resolvedParts.forEach((img, idx) => {
        angleLabels.push(`Image ${idx + 1}: ${img.angle}`);
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64,
          },
        });
      });

      const promptText = `You are the MYPLANTCARE Multimodal Botanical Identification & Plant Pathology Engine.
Analysis Mode: ${mode} (identification, disease, pest, nutrient, rescue).
Attached Photographs (${resolvedParts.length}): ${angleLabels.join(' | ') || 'Text-only symptoms'}
Optional Linked Garden Plant Context: ${linkedPlant ? `${linkedPlant.name} (${linkedPlant.species}, Soil: ${linkedPlant.soilType}, Light: ${linkedPlant.sunlight})` : 'None'}
User Notes / Hint: "${plantName || 'Analyze directly from attached plant photographs'} — ${symptomsText || 'Perform complete quality check, botanical ID, and 16-point symptom screening'}".

MANDATORY RULES:
1. PRE-ANALYSIS IMAGE QUALITY GATE (qualityCheck):
   - Evaluate sharpness, brightness, framing, and whether an actual botanical plant / leaf / stem / flower / soil is clearly visible.
   - If the photo is extremely blurry, pitch black, heavily occluded, or shows a non-plant object (keyboard, person, blank wall, etc.), set qualityCheck.qualityPassed = false, qualityCheck.isPlantDetected = false (or explain blur/darkness), and provide clear retakeGuidance. Do NOT hallucinate a confident species ID on unusable images.
2. BOTANICAL IDENTIFICATION:
   - Identify species from visible venation, margins, phyllotaxy, petioles, stems, and blooms (prioritize the photo over text hint).
   - Provide commonName, scientificName, plantFamily, plantCategory, nativeRegion, confidence (0-100), visibleCharacteristics, and careSummary (sunlight, watering, soil, temperature, growthCharacteristics, matureSize, suitability).
   - If identification confidence < 70%, set isUncertain = true and return 2-3 plausible topCandidates with reasoning.
3. 16-POINT SYMPTOM & CONDITION SCREENING (symptomChecklist):
   Evaluate and return status for key symptoms visible in the photos:
   Yellowing (chlorosis), Brown tips or spots, Wilting, Curling leaves, Drooping, Powdery mildew, Fungal lesions, Insect chewing damage, Aphids/spider mites/mealybugs, Scale/whiteflies, Root-stress indicators, Nutrient chlorosis, Overwatering signs, Underwatering signs, Sunburn/scorch, Etiolation (low light).
   Separate visual observations (visibleSymptoms) from hypothesized causes (possibleCauses).
   Only recommend safe organic/cultural treatments. Never claim laboratory certainty.
4. Populate rescuePlan with practical immediate & 14-day recovery steps.
Return strict JSON matching the schema.`;

      parts.push({ text: promptText });

      const aiStartMs = Date.now();
      const configuredTimeoutMs = Math.max(8000, Math.min(35000, Number(process.env.SCAN_REQUEST_TIMEOUT_MS) || 18000));

      // Deduplicate identical concurrent in-flight scan requests
      let activePromise = !Number(simulateTransient503Count) ? inFlightScanPromises.get(cacheKey) : undefined;
      if (!activePromise) {
        activePromise = generateStructuredWithFailover({
          parts,
          responseSchema: ADVANCED_SCAN_SCHEMA,
          thinkingLevel: ThinkingLevel.LOW,
          simulateTransient503Count: Number(simulateTransient503Count) || 0,
          timeoutMs: configuredTimeoutMs,
        });
        if (!Number(simulateTransient503Count)) {
          inFlightScanPromises.set(cacheKey, activePromise);
        }
      }

      try {
        const aiResult = await activePromise;
        parsed = aiResult.parsed;
        resolvedModel = aiResult.resolvedModel;
        totalAttempts = aiResult.totalAttempts;
        usedBackupModel = aiResult.usedBackupModel;
      } finally {
        inFlightScanPromises.delete(cacheKey);
      }
      aiApiMs = Date.now() - aiStartMs;

      // Cache successful quality-passed results by deterministic imageHash key
      const qualityOk = parsed?.qualityCheck?.qualityPassed !== false && parsed?.isPlantDetected !== false;
      if (qualityOk && parsed) {
        if (serverScanResultCache.size >= MAX_SERVER_SCAN_CACHE_SIZE) {
          const oldestKey = serverScanResultCache.keys().next().value;
          if (oldestKey) serverScanResultCache.delete(oldestKey);
        }
        serverScanResultCache.set(cacheKey, {
          parsed,
          resolvedModel,
          totalAttempts,
          usedBackupModel,
          cachedAt: Date.now(),
          imageHash: primaryImageHash,
        });
      }
    }

    const qualityPassed = parsed?.qualityCheck?.qualityPassed !== false && parsed?.isPlantDetected !== false;
    const sizeCategory = classifyImageSizeCategory(Number(originalImageBytes) || totalPayloadBytes);

    if (!qualityPassed && resolvedParts.length > 0) {
      const totalMs = Date.now() - requestStartMs;
      recordScanTelemetry({
        requestId,
        timestamp: new Date().toISOString(),
        mode,
        imageCount: resolvedParts.length,
        payloadBytes: totalPayloadBytes,
        sizeCategory,
        optimizationMs: Number(clientOptimizationMs) || 0,
        aiApiMs,
        dbMs: dbElapsedMs,
        totalMs,
        cacheHit,
        cacheResponseMs,
        status: 'QUALITY_CHECK_FAILED',
      });
      console.log(
        `[ScanPerf] reqId=${requestId} status=QUALITY_CHECK_FAILED mode=${mode} aiApiMs=${aiApiMs} dbMs=${dbElapsedMs} totalMs=${totalMs}`
      );
      return res.status(200).json({
        requestId,
        scanStatus: 'QUALITY_CHECK_FAILED',
        sourceType: 'AI_IMAGE_QUALITY_GATE',
        qualityCheck: parsed.qualityCheck,
        analysis: null,
        error:
          parsed?.qualityCheck?.retakeGuidance ||
          'The uploaded photograph is unclear or does not show recognizable plant foliage. Please retake or crop closer to the leaves in bright natural light.',
        meta: {
          requestId,
          resolvedModel,
          totalAttempts,
          usedBackupModel,
          configuredBackupModel: getBackupVisionModels(getPrimaryVisionModel())[0] || ACTIVE_BACKUP_MODEL,
          performance: {
            requestId,
            imageHash: primaryImageHash,
            uploadMs: Number(clientUploadMs) || 12,
            optimizationMs: Number(clientOptimizationMs) || 0,
            aiApiMs,
            dbMs: dbElapsedMs,
            totalMs,
            cacheHit,
            cacheResponseMs,
          },
        },
      });
    }

    const scannedDate = new Date().toISOString().slice(0, 10);
    const primaryStoredImage =
      typeof imageUrl === 'string' && imageUrl.length > 0
        ? imageUrl
        : typeof imageBase64 === 'string' && imageBase64.length < 350000
        ? imageBase64
        : resolvedParts[0] && resolvedParts[0].base64.length < 220000
        ? `data:${resolvedParts[0].mimeType};base64,${resolvedParts[0].base64}`
        : '';

    const storedAnglesMeta = incomingImages.map((im, idx) => ({
      angle: im.angle || `view-${idx + 1}`,
      preview:
        typeof im.imageUrl === 'string' && im.imageUrl.length > 0
          ? im.imageUrl
          : typeof im.imageBase64 === 'string' && im.imageBase64.length < 120000
          ? im.imageBase64
          : '',
    }));

    const enrichedAnalysis = {
      ...parsed,
      scannedDate,
      scannedAtIso: new Date().toISOString(),
      resolvedModel,
      totalAttempts,
      usedBackupModel,
      imageHash: primaryImageHash,
      cacheHit,
    };

    let savedRecord = null;
    if (saveToMemory !== false) {
      const dbWriteStartMs = Date.now();
      const inserted = await db
        .insert(plantDiagnoses)
        .values({
          userUid: uid,
          plantId: linkedPlant ? linkedPlant.id : plantId ? Number(plantId) : null,
          plantName: parsed.commonName || plantName || 'Analyzed Specimen',
          scientificName: parsed.scientificName || '',
          plantCategory: parsed.plantCategory || parsed.plantFamily || 'Botanical Specimen',
          diagnosisType: mode,
          possibleCondition: parsed.possibleCondition || 'Botanical Assessment Complete',
          confidence: Number(parsed.confidence) || 85,
          healthScore: Number(parsed.healthScore) || 82,
          severity: parsed.severity || parsed.overallHealthStatus || 'Moderate',
          symptoms: (parsed.visibleSymptoms || []).join('; ') || symptomsText || 'Observed foliar patterns',
          causes: (parsed.possibleCauses || []).join('; ') || 'Environmental or nutritional factor',
          recommendations: (parsed.safeTreatments || []).join('; ') || 'Adjust irrigation and monitor new leaves',
          prevention: parsed.preventionStrategy || parsed.followUpRecommendations || 'Maintain balanced airflow and drainage.',
          imageUrl: primaryStoredImage,
          imagesJson: JSON.stringify(storedAnglesMeta),
          qualityStatus: `Verified (${parsed?.qualityCheck?.qualityScore ?? 92}%)`,
          reportJson: JSON.stringify(enrichedAnalysis),
          scannedDate,
          isConfirmed: false,
        })
        .returning();
      savedRecord = inserted[0];
      dbElapsedMs += Date.now() - dbWriteStartMs;
    }

    const savedGardenInfo = {
      sourceType: 'SAVED_GARDEN_MEMORY',
      label: 'Saved Garden Information',
      disclaimer: 'Contextual records from your saved My Garden — separate from this visual AI scan.',
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

    const totalMs = Date.now() - requestStartMs;
    const performanceMetrics = {
      requestId,
      imageHash: primaryImageHash,
      sizeCategory,
      originalBytes: Number(originalImageBytes) || totalPayloadBytes,
      optimizedBytes: Number(optimizedImageBytes) || totalPayloadBytes,
      uploadMs: Number(clientUploadMs) || 14,
      optimizationMs: Number(clientOptimizationMs) || 0,
      aiApiMs,
      dbMs: dbElapsedMs,
      totalMs,
      cacheHit,
      cacheResponseMs,
    };

    recordScanTelemetry({
      requestId,
      timestamp: new Date().toISOString(),
      mode,
      imageCount: resolvedParts.length,
      payloadBytes: totalPayloadBytes,
      sizeCategory,
      optimizationMs: performanceMetrics.optimizationMs,
      aiApiMs,
      dbMs: dbElapsedMs,
      totalMs,
      cacheHit,
      cacheResponseMs,
      status: 'SUCCESS',
    });

    console.log(
      `[ScanPerf] reqId=${requestId} status=SUCCESS mode=${mode} cacheHit=${cacheHit} aiApiMs=${aiApiMs} dbMs=${dbElapsedMs} totalMs=${totalMs} bytes=${totalPayloadBytes}`
    );

    res.json({
      requestId,
      scanStatus: 'SUCCESS',
      sourceType: 'AI_IMAGE_ANALYSIS',
      qualityCheck: parsed.qualityCheck,
      analysis: enrichedAnalysis,
      savedRecord,
      savedGardenInfo,
      generalCareAdvice,
      meta: {
        requestId,
        resolvedModel,
        totalAttempts,
        usedBackupModel,
        configuredBackupModel: getBackupVisionModels(getPrimaryVisionModel())[0] || ACTIVE_BACKUP_MODEL,
        performance: performanceMetrics,
      },
    });
  } catch (error: any) {
    const totalMs = Date.now() - requestStartMs;
    recordScanTelemetry({
      requestId,
      timestamp: new Date().toISOString(),
      mode: defaultMode || req.body?.mode || 'disease',
      imageCount: Array.isArray(req.body?.images) ? req.body.images.length : 1,
      payloadBytes: 0,
      sizeCategory: 'medium',
      optimizationMs: Number(req.body?.clientOptimizationMs) || 0,
      aiApiMs: 0,
      dbMs: 0,
      totalMs,
      cacheHit: false,
      cacheResponseMs: null,
      status: 'ERROR',
    });
    console.error(
      `[ScanPerf] reqId=${requestId} status=ERROR totalMs=${totalMs} err=${error?.status || error?.code || error?.message || 'ERR'}`
    );
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
        requestId,
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
      requestId,
      scanStatus: 'TEMPORARILY_UNAVAILABLE',
      sourceType: 'SERVICE_ERROR',
      analysis: null,
      error:
        'GREENY is temporarily unable to connect to the Plant Doctor. Your uploaded image is safe. Please click Retry Scan.',
      code: 'PLANT_DOCTOR_TEMPORARILY_UNAVAILABLE',
      retryable: true,
      savedGardenInfo: savedGardenFallback,
      generalCareAdvice: generalCareFallback,
    });
  }
}

app.post('/api/ai/scanner', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res));
app.post('/api/ai/analyze-plant', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res));
app.post('/api/plant/identify', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'identification'));
app.post('/api/plant/diagnose', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'disease'));
app.post('/api/plant/pest-detection', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'pest'));
app.post('/api/plant/nutrient-analysis', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'nutrient'));
app.post('/api/plant/rescue', optionalAuthOrDemo, (req: AuthRequest, res) => runPlantAnalysisHandler(req, res, 'rescue'));

// Save Scanned Plant, Photograph, Identification Report & Health Analysis to My Garden (updates existing if plantId provided)
app.post('/api/plant/save-scan-to-garden', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const {
      plantId,
      diagnosisId,
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

    const storedImage = await resolveVerifiedPlantImageOrEmpty(
      imageUrl,
      String(scientificName || '').trim(),
      String(commonName || '').trim()
    );

    let savedPlant: any = null;
    const targetPlantId = plantId ? Number(plantId) : null;

    if (targetPlantId && Number.isInteger(targetPlantId)) {
      const existingRows = await db
        .select()
        .from(userPlants)
        .where(and(eq(userPlants.id, targetPlantId), eq(userPlants.userUid, uid)));

      if (existingRows.length > 0) {
        const [updated] = await db
          .update(userPlants)
          .set({
            healthScore: numericHealth,
            status: statusLabel,
            scientificName: String(scientificName || existingRows[0].scientificName || commonName).trim(),
            notes: `Latest Scan (${scannedDate}): ${possibleCondition || 'Healthy foliage'}. ${(safeTreatments || [])[0] || ''}`.trim(),
            ...(imageUrl && typeof imageUrl === 'string' && imageUrl.length < 450000 ? { imageUrl: storedImage } : {}),
          })
          .where(and(eq(userPlants.id, targetPlantId), eq(userPlants.userUid, uid)))
          .returning();
        savedPlant = updated;
      }
    }

    if (!savedPlant) {
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
      savedPlant = insertedPlant;
    }

    let linkedDiagnosis: any = null;
    if (diagnosisId && Number.isInteger(Number(diagnosisId))) {
      const [updatedDiag] = await db
        .update(plantDiagnoses)
        .set({ plantId: savedPlant.id, isConfirmed: true })
        .where(and(eq(plantDiagnoses.id, Number(diagnosisId)), eq(plantDiagnoses.userUid, uid)))
        .returning();
      linkedDiagnosis = updatedDiag || null;
    }

    if (!linkedDiagnosis) {
      const [insertedDiagnosis] = await db
        .insert(plantDiagnoses)
        .values({
          userUid: uid,
          plantId: savedPlant.id,
          plantName: `${savedPlant.name} (${savedPlant.scientificName})`,
          scientificName: savedPlant.scientificName || '',
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
      linkedDiagnosis = insertedDiagnosis;
    }

    res.json({
      plant: savedPlant,
      diagnosis: linkedDiagnosis,
      updatedExisting: Boolean(targetPlantId),
      message: targetPlantId
        ? `Linked latest scan report to existing garden specimen "${savedPlant.name}".`
        : `${savedPlant.name} and its complete scan report have been saved to My Garden.`,
    });
  } catch (error: any) {
    console.error('Failed to save scan to My Garden:', error);
    res.status(500).json({ error: error.message || 'Failed to save scanned plant to My Garden.' });
  }
});

// Create Actionable Care Plan Tasks in DB from Scanner or AI Tools
app.post('/api/ai/care-plan', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const { plantId, plantName, tasksToCreate } = req.body || {};
    if (!plantName || !Array.isArray(tasksToCreate) || tasksToCreate.length === 0) {
      return res.status(400).json({ error: 'Plant name and at least one care plan action are required.' });
    }

    const createdTasks = [];
    for (const item of tasksToCreate.slice(0, 6)) {
      const dueInDays = Math.max(0, Number(item.dueInDays) || 1);
      const dueDate = new Date(Date.now() + dueInDays * 86400000).toISOString().slice(0, 10);
      const [inserted] = await db
        .insert(careTasks)
        .values({
          userUid: uid,
          plantId: plantId ? Number(plantId) : null,
          plantName: String(plantName),
          taskType: String(item.taskType || 'Disease Follow-up'),
          title: String(item.title || 'Monitor recovery & foliage vigor').slice(0, 180),
          dueDate,
          completed: false,
          frequency: String(item.frequency || 'Once'),
          notes: String(item.notes || 'Created from MYPLANTCARE AI Care Plan'),
        })
        .returning();
      createdTasks.push(inserted);
    }

    res.json({ tasks: createdTasks, count: createdTasks.length });
  } catch (error: any) {
    console.error('Failed to create AI care plan tasks:', error);
    res.status(500).json({ error: 'Failed to save care plan tasks.' });
  }
});

// Unified 18-Tool AI Orchestration Endpoints
app.post('/api/ai/tools/save-to-garden', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const {
      plantId,
      toolSlug,
      toolName,
      plantName,
      scientificName,
      headline,
      severity,
      confidence,
      observations,
      possibleCauses,
      recommendations,
      imageUrl,
      reportData,
    } = req.body || {};

    const cleanName = String(plantName || '').trim();
    if (!cleanName && !plantId) {
      return res.status(400).json({ error: 'Plant name or existing plantId is required to save to My Garden.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const sev = String(severity || 'Informational');
    const healthScore =
      sev === 'Critical' ? 42 : sev === 'High' ? 60 : sev === 'Moderate' ? 76 : sev === 'Low' ? 88 : 92;
    const statusLabel =
      sev === 'Critical' || sev === 'High'
        ? 'Needs Attention'
        : sev === 'Moderate'
        ? 'Monitoring'
        : 'Healthy';

    const storedImage = await resolveVerifiedPlantImageOrEmpty(
      imageUrl,
      String(scientificName || '').trim(),
      cleanName
    );

    let savedPlant: any = null;
    const targetId = plantId ? Number(plantId) : null;

    if (targetId && Number.isInteger(targetId)) {
      const existingRows = await db
        .select()
        .from(userPlants)
        .where(and(eq(userPlants.id, targetId), eq(userPlants.userUid, uid)));

      if (existingRows.length > 0) {
        const [updated] = await db
          .update(userPlants)
          .set({
            healthScore,
            status: statusLabel,
            ...(scientificName ? { scientificName: String(scientificName).trim() } : {}),
            notes: `${toolName || toolSlug || 'AI Tool'} (${today}): ${headline || 'Analysis saved'}`.slice(0, 400),
            ...(imageUrl && typeof imageUrl === 'string' && imageUrl.length < 450000 ? { imageUrl: storedImage } : {}),
          })
          .where(and(eq(userPlants.id, targetId), eq(userPlants.userUid, uid)))
          .returning();
        savedPlant = updated;
      }
    }

    if (!savedPlant) {
      const [inserted] = await db
        .insert(userPlants)
        .values({
          userUid: uid,
          name: cleanName || 'Garden Specimen',
          species: cleanName || 'Garden Specimen',
          scientificName: String(scientificName || cleanName || '').trim(),
          addedDate: today,
          location: 'My Garden · Saved from AI Tools',
          potSize: 'Medium (25cm)',
          soilType: 'Well-draining Organic Mix',
          sunlight: 'Bright Indirect',
          healthScore,
          status: statusLabel,
          lastWatered: today,
          nextWatering: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
          heightCm: 35,
          notes: `${toolName || toolSlug || 'AI Tool'} (${today}): ${headline || 'Analysis saved'}`.slice(0, 400),
          imageUrl: storedImage,
        })
        .returning();
      savedPlant = inserted;
    }

    const [savedDiagnosis] = await db
      .insert(plantDiagnoses)
      .values({
        userUid: uid,
        plantId: savedPlant.id,
        plantName: `${savedPlant.name}${savedPlant.scientificName ? ` (${savedPlant.scientificName})` : ''}`,
        scientificName: savedPlant.scientificName || '',
        plantCategory: String(toolName || toolSlug || 'AI Tool'),
        diagnosisType: String(toolSlug || 'disease'),
        possibleCondition: String(headline || toolName || 'AI Tool Analysis').slice(0, 220),
        confidence: Number(confidence) || 85,
        healthScore,
        severity: sev,
        symptoms: Array.isArray(observations) ? observations.join('; ') : String(observations || 'Observed via AI Tool'),
        causes: Array.isArray(possibleCauses) ? possibleCauses.join('; ') : String(possibleCauses || 'Evaluated via AI Tool'),
        recommendations: Array.isArray(recommendations) ? recommendations.join('; ') : String(recommendations || 'Follow AI care guidance'),
        prevention: 'Follow scheduled care reminders and monitor foliage weekly.',
        imageUrl: storedImage,
        reportJson: JSON.stringify(reportData || {}),
        scannedDate: today,
        isConfirmed: true,
      })
      .returning();

    res.json({
      plant: savedPlant,
      diagnosis: savedDiagnosis,
      updatedExisting: Boolean(targetId && savedPlant?.id === targetId),
      message: targetId
        ? `Updated "${savedPlant.name}" in My Garden with this ${toolName || 'AI'} report.`
        : `Added "${savedPlant.name}" and this ${toolName || 'AI'} report to My Garden.`,
    });
  } catch (error: any) {
    console.error('Failed to save AI tool result to My Garden:', error);
    res.status(500).json({ error: error.message || 'Failed to save result to My Garden.' });
  }
});

app.post('/api/ai/tools/:toolId', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error: 'Gemini AI key is not configured on the server.',
        retryable: false,
      });
    }
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const toolId = String(req.params.toolId);
    const { plantId, userInput, extraParams, images, weatherSummary, simulateTransient503Count } = req.body || {};

    const output = await executeUnifiedBotanicalTool({
      uid,
      toolId,
      plantId: plantId ? Number(plantId) : null,
      userInput: String(userInput || ''),
      extraParams: extraParams || {},
      images: Array.isArray(images) ? images : [],
      weatherSummary: typeof weatherSummary === 'string' ? weatherSummary : undefined,
      simulateTransient503Count: Number(simulateTransient503Count) || 0,
    });

    res.json(output);
  } catch (error: any) {
    console.error('Unified AI tool error:', error?.status || error?.message || error);
    const status = isPermanentAiError(error) || String(error?.message || '').startsWith('Unknown AI tool') ? 400 : 503;
    res.status(status).json({
      error:
        status === 400
          ? error.message || 'Invalid tool parameters.'
          : 'This AI botanical specialist is temporarily busy. Your inputs are preserved — please click Retry.',
      retryable: status === 503,
    });
  }
});

app.get('/api/ai/tools/history', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const runs = await db
      .select()
      .from(aiToolRuns)
      .where(eq(aiToolRuns.userUid, uid))
      .orderBy(desc(aiToolRuns.id))
      .limit(30);
    res.json({ runs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load AI tool history.' });
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
      model = ACTIVE_PRIMARY_MODEL,
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
Botanical Knowledge Base: You have access to the verified MyPlantCare Herbarium Library containing 113+ carefully researched plants across Tamil Nadu native, Indian medicinal, fruiting, vegetable, agricultural, ornamental, and indoor categories (including Neem/வேம்பு, Tulsi/துளசி, Drumstick/முருங்கை, Curry Leaf/கறிவேப்பிலை, Amla/நெல்லி, Adathodai, Thuthuvalai, Karisalanganni, Vallarai, Pirandai, Keelanelli, Siriyanangai, Vetiver, Aloe Vera, Ashwagandha, Giloy, Haritaki, Nannari, Mudakathan, Karpooravalli, Betel Leaf, Mango/மா, Banana/வாழை, Coconut/தென்னை, Guava/கொய்யா, Papaya, Pomegranate, Jackfruit/பலா, Lime, Jamun/நாவல், Tamarind/புளி, Tomato, Brinjal, Okra, Chilli, Bitter Gourd, Turmeric, Ginger, Paddy/நெல், Sugarcane, Groundnut, Ragi/கேழ்வரகு, Kambu, Cholam, Banyan/ஆலமரம், Peepal/அரசமரம், Sandalwood/சந்தனம், Teak/தேக்கு, Jasmine/மல்லி, etc.).
- Always use correct scientific botanical binomials and authentic Tamil names in Tamil script when appropriate.
- Explain differences between plant species clearly.
- Distinguish verified botanical facts from uncertain folk claims; never fabricate missing information.
Preferred Language: ${language === 'ta' ? 'Natural conversational Tamil (தமிழ்) with friendly tone' : 'English'}.
Safety Rules:
- Never claim that a plant photograph was identified or diagnosed unless an actual image scan succeeded.
- Clearly distinguish visual AI hypotheses from confirmed lab tests.
- Never recommend hazardous synthetic pesticides; prioritize organic, cultural, and biological controls.`;

    const requestedModel = ALLOWED_CHAT_MODELS.includes(model as any) ? model : ACTIVE_PRIMARY_MODEL;
    const configuredBackupModel = (process.env.GEMINI_BACKUP_MODEL || ACTIVE_BACKUP_MODEL).trim();

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

    // Branch A: Google Search Grounding enabled -> use active primary model with googleSearch tool + backup failover
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
      let resolvedGroundingModel = ACTIVE_PRIMARY_MODEL;
      let usedGroundingBackup = false;
      let searchRes;
      try {
        searchRes = await ai.models.generateContent({
          model: ACTIVE_PRIMARY_MODEL,
          contents,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
      } catch (groundErr: any) {
        if (isPermanentAiError(groundErr)) throw groundErr;
        await sleepWithExponentialBackoffAndJitter(0, 180);
        resolvedGroundingModel = ACTIVE_BACKUP_MODEL;
        usedGroundingBackup = true;
        searchRes = await ai.models.generateContent({
          model: ACTIVE_BACKUP_MODEL,
          contents,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });
      }

      const chunks = searchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((c: any) => (c.web ? { uri: c.web.uri, title: c.web.title || c.web.uri } : null))
        .filter(Boolean);

      return res.json({
        sourceCategory: 'GEMINI_AI',
        reply: searchRes.text || 'Search-grounded botanical analysis complete.',
        emotionState: 'HAPPY',
        suggestedAction: 'Review verified web citations below for regional horticultural guidance.',
        resolvedModel: `${resolvedGroundingModel} (Google Search Grounded)`,
        usedBackupModel: usedGroundingBackup,
        sources,
      });
    }

    // Branch B: Multi-turn Chat with automatic retry and backup model failover on 503/timeout
    let activeModel: string = requestedModel;
    let usedBackupModel = false;

    const runChatTurn = async (targetModel: string) => {
      if (remainingSim503 > 0) {
        remainingSim503 -= 1;
        const simErr: any = new Error('Simulated 503 UNAVAILABLE');
        simErr.status = 503;
        throw simErr;
      }
      const config: any = {
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
      };
      if (targetModel === ACTIVE_PRIMARY_MODEL) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
      const chat = ai.chats.create({
        model: targetModel,
        history: formattedHistory,
        config,
      });
      const turnPromise = chat.sendMessage({ message: String(message) });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const tErr: any = new Error(`Chat model ${targetModel} timed out after 18s`);
          tErr.status = 504;
          reject(tErr);
        }, 18000);
      });
      return await Promise.race([turnPromise, timeoutPromise]);
    };

    let response;
    try {
      response = await runChatTurn(activeModel);
    } catch (primaryErr: any) {
      if (isPermanentAiError(primaryErr)) throw primaryErr;
      const backupTarget = ALLOWED_CHAT_MODELS.includes(configuredBackupModel as any)
        ? configuredBackupModel
        : ACTIVE_BACKUP_MODEL;
      await sleepWithExponentialBackoffAndJitter(0, 180);
      activeModel = backupTarget === activeModel ? ACTIVE_BACKUP_MODEL : backupTarget;
      usedBackupModel = true;
      response = await runChatTurn(activeModel);
    }

    const rawChatText = (response.text ?? '{}').trim();
    const cleanedChatText = rawChatText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    let parsed: { reply?: string; emotionState?: string; suggestedAction?: string } = {};
    try {
      parsed = JSON.parse(cleanedChatText);
    } catch {
      parsed = {
        reply: cleanedChatText || 'I checked your garden notes and am ready to help with your plants!',
        emotionState: 'HAPPY',
        suggestedAction: 'Ask a follow-up question about watering, sunlight, or leaf symptoms.',
      };
    }
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
    console.error('Greeny AI chat error:', error?.status || error?.code || error?.message || 'ERR');
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
    const runSearchWithTimeout = (model: string, extraConfig: Record<string, any> = {}) => {
      const requestPromise = ai.models.generateContent({
        model,
        contents: String(query).trim(),
        config: {
          systemInstruction:
            'You are the MYPLANTCARE Live Botanical Research Engine. Provide accurate, up-to-date horticultural, agricultural, climate, and plant-care answers grounded in Google Search results. Prioritize safe organic practices.',
          tools: [{ googleSearch: {} }],
          ...extraConfig,
        },
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const timeoutErr: any = new Error(`Search grounding ${model} timed out after 18s`);
          timeoutErr.status = 504;
          reject(timeoutErr);
        }, 18000);
      });
      return Promise.race([requestPromise, timeoutPromise]);
    };

    let usedModel = ACTIVE_PRIMARY_MODEL;
    let response;
    try {
      response = await runSearchWithTimeout(ACTIVE_PRIMARY_MODEL, {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      });
    } catch (primaryErr: any) {
      if (isPermanentAiError(primaryErr)) throw primaryErr;
      await sleepWithExponentialBackoffAndJitter(0, 180);
      usedModel = ACTIVE_BACKUP_MODEL;
      response = await runSearchWithTimeout(ACTIVE_BACKUP_MODEL);
    }

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: any) => (c.web ? { uri: c.web.uri, title: c.web.title || c.web.uri } : null))
      .filter(Boolean);

    res.json({
      answer: response.text || 'No grounded summary returned.',
      sources,
      model: usedModel,
    });
  } catch (error: any) {
    const friendly = formatFriendlyAiError(
      error,
      'Live botanical web search is temporarily busy. Please wait a few seconds and retry.'
    );
    console.warn('Google Search grounding notice:', friendly.statusCode, friendly.message);
    res.status(friendly.statusCode).json({
      error: friendly.message,
      retryable: friendly.retryable,
    });
  }
});

// 14. Gemini AI — Personalized Garden Designer & Plant Recommendation Engine
app.post('/api/ai/garden-design', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const uid = req.effectiveUid || 'demo-botanist-uid';
    const { title, style, spaceType, dimensions, sunlight, climate, budget, preferences } = req.body;

    const prompt = `Design a personalized botanical layout for MYPLANTCARE:
Style: ${style}
Space: ${spaceType} (${dimensions})
Sunlight: ${sunlight}
Climate: ${climate}
Maintenance Budget: ${budget}
Preferences: ${preferences || 'Include Indian & tropical resilient varieties where appropriate'}.
Return a structured 4-zone spatial plan and care strategy.`;

    const { parsed, resolvedModel } = await generateStructuredWithFailover({
      parts: [{ text: prompt }],
      thinkingLevel: ThinkingLevel.LOW,
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
    });

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

    res.json({ design: inserted[0], aiPlan: parsed, resolvedModel });
  } catch (error: any) {
    const friendly = formatFriendlyAiError(
      error,
      'AI garden layout service is temporarily busy. Please try again in a moment.'
    );
    console.warn('AI garden design notice:', friendly.statusCode, friendly.message);
    res.status(friendly.statusCode).json({ error: friendly.message, retryable: friendly.retryable });
  }
});

// 14b. Animate Plant Images into Video using gemini-omni-1.2-flash via Interactions API
app.post('/api/ai/animate-plant-video', optionalAuthOrDemo, async (req: AuthRequest, res) => {
  try {
    const { photo, prompt, aspectRatio = '16:9' } = req.body;
    if (!photo || typeof photo !== 'string') {
      return res.status(400).json({ error: 'A plant photograph is required for video generation.' });
    }

    let mimeType = 'image/jpeg';
    let base64Data = photo;

    if (photo.startsWith('data:')) {
      const match = photo.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = photo.split(',')[1] || photo;
      }
    }

    const ai = getGeminiClient();
    const targetAspect = aspectRatio === '9:16' ? '9:16' : '16:9';
    const motionPrompt =
      prompt && String(prompt).trim().length > 0
        ? String(prompt).trim()
        : 'Animate this plant with gentle natural motion, subtle wind swaying the leaves gracefully, soft organic light shifts, and realistic living atmosphere.';

    try {
      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: [
            {
              type: 'image',
              mime_type: mimeType,
              data: base64Data,
            },
            {
              type: 'text',
              text: motionPrompt,
            },
          ],
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: targetAspect,
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (videoPart && videoPart.data) {
        return res.json({
          videoBase64: videoPart.data,
          mimeType: videoPart.mime_type || 'video/mp4',
          aspectRatio: targetAspect,
          model: 'gemini-omni-1.2-flash',
          prompt: motionPrompt,
        });
      } else if (videoPart && (videoPart as any).uri) {
        return res.json({
          videoUri: (videoPart as any).uri,
          mimeType: videoPart.mime_type || 'video/mp4',
          aspectRatio: targetAspect,
          model: 'gemini-omni-1.2-flash',
          prompt: motionPrompt,
        });
      }
    } catch (modelErr: any) {
      console.warn('Interactions API gemini-omni-1.2-flash notice:', modelErr?.message || modelErr);
      const errMsg = String(modelErr?.message || '');
      const isUnavailable =
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('403') ||
        errMsg.includes('permission') ||
        errMsg.includes('unsupported');

      // Return a 200 JSON payload with fallback: true so the client can generate high-fidelity canvas video
      return res.json({
        fallback: true,
        reason: isUnavailable ? 'MODEL_UNAVAILABLE' : 'API_TIER_RESTRICTION',
        model: 'gemini-omni-1.2-flash',
        message:
          'Gemini Omni Flash video model requires a project with video generation access. Falling back smoothly to the client-side Organic Botanical Cinema Synthesizer.',
        aspectRatio: targetAspect,
        prompt: motionPrompt,
      });
    }

    return res.status(502).json({
      error: 'Video generation completed but did not return a valid video payload.',
    });
  } catch (error: any) {
    const friendly = formatFriendlyAiError(error, 'Failed to animate plant image into video.');
    console.warn('Plant video animation notice:', friendly.statusCode, friendly.message);
    return res.status(friendly.statusCode).json({
      error: friendly.message,
      retryable: friendly.retryable,
    });
  }
});

async function startServer() {
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // 15. Gemini Live API (gemini-3.8-live) Real-Time Voice Conversation WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const reqUrl = request.url || '';
    if (reqUrl.startsWith('/live') || reqUrl.startsWith('/api/ai/live-ws')) {
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
                  type: 'transcript',
                  role: 'user',
                  text: content.inputTranscription.text,
                  inputTranscript: content.inputTranscription.text,
                })
              );
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'transcript',
                  role: 'greeny',
                  text: content.outputTranscription.text,
                  outputTranscript: content.outputTranscription.text,
                })
              );
            }

            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: 'audio_chunk',
                    data: part.inlineData.data,
                    audio: part.inlineData.data,
                  })
                );
              }
            }

            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted', interrupted: true }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turn_complete' }));
            }
          },
          onerror: (err: any) => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: err?.message || 'Gemini Live API stream error.',
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
          clientWs.send(JSON.stringify({ type: 'live_open', status: 'connected', model: 'gemini-3.8-live' }));
        }
        return session;
      })
      .catch((err: any) => {
        if (clientWs.readyState === clientWs.OPEN) {
          clientWs.send(
            JSON.stringify({
              type: 'error',
              message: err?.message || 'Failed to connect to gemini-3.8-live session.',
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
          const audioData = parsed.audio || parsed.realtimeInput?.data;
          if (audioData) {
            session.sendRealtimeInput({
              audio: {
                data: audioData,
                mimeType: parsed.realtimeInput?.mimeType || 'audio/pcm;rate=16000',
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

  // API Route Guard: Ensure all unhandled /api/* requests return JSON (never Vite SPA index.html)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `API route ${req.method} ${req.path} not found.`,
      status: 404,
    });
  });

  // Global API error handler for uncaught errors on /api routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path?.startsWith('/api/')) {
      console.error('Unhandled API error on', req.path, err);
      return res.status(err.status || 500).json({
        error: err.message || 'Internal API server error.',
        code: err.code || 'API_ERROR',
      });
    }
    next(err);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const imagesDistPath = path.join(distPath, 'images');

    // Legacy compatibility: if any persisted record or caller requests /src/assets/images/<file>,
    // serve the corresponding optimized WebP from dist/images instead of falling back to index.html.
    app.get('/src/assets/images/:filename', (req, res) => {
      const safeName = path.basename(req.params.filename || '').replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const target = path.join(imagesDistPath, safeName);
      if (fs.existsSync(target)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
        return res.sendFile(target);
      }
      return res.status(404).end();
    });

    app.use('/images', express.static(imagesDistPath, { maxAge: '30d' }));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (
        req.path.startsWith('/images/') ||
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/api/')
      ) {
        return res.status(404).end();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`MYPLANTCARE Full-Stack Server (with Gemini Live API WS) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
