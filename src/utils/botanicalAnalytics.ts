/**
 * Pure botanical intelligence & analytics calculations for MYPLANTCARE.
 * Decoupled for deterministic verification and unit testing.
 */

export interface WateringInput {
  speciesCategory: 'Tropical' | 'Succulent' | 'Herb' | 'Flowering' | 'Tree';
  potSizeCm: number;
  soilMoisturePercent: number;
  temperatureC: number;
  humidityPercent: number;
  rainfallMm: number;
  sunlightHours: number;
  season: 'Spring' | 'Summer' | 'Monsoon' | 'Autumn' | 'Winter';
}

export interface WateringRecommendation {
  status: 'Overwatering Warning' | 'Needs Watering Now' | 'Optimal Moisture' | 'Monitor Closely';
  recommendedMl: number;
  nextCheckHours: number;
  intervalDays: number;
  waterSavingTip: string;
  explanation: string;
}

export function calculateWateringIntelligence(input: WateringInput): WateringRecommendation {
  const {
    speciesCategory,
    potSizeCm,
    soilMoisturePercent,
    temperatureC,
    humidityPercent,
    rainfallMm,
    sunlightHours,
    season,
  } = input;

  const thresholds: Record<WateringInput['speciesCategory'], { min: number; max: number; baseInterval: number }> = {
    Tropical: { min: 40, max: 75, baseInterval: 4 },
    Succulent: { min: 15, max: 45, baseInterval: 10 },
    Herb: { min: 45, max: 78, baseInterval: 3 },
    Flowering: { min: 42, max: 76, baseInterval: 3 },
    Tree: { min: 35, max: 70, baseInterval: 6 },
  };

  const spec = thresholds[speciesCategory] || thresholds.Tropical;

  // Base volume scales with pot diameter squared
  const baseVolumeMl = Math.round(Math.pow(Math.max(10, potSizeCm) / 10, 1.8) * 120);

  // Climate adjustments
  const tempFactor = temperatureC > 32 ? 1.3 : temperatureC < 18 ? 0.75 : 1.0;
  const humidityFactor = humidityPercent > 75 ? 0.8 : humidityPercent < 35 ? 1.2 : 1.0;
  const seasonFactor = season === 'Summer' ? 1.25 : season === 'Monsoon' || season === 'Winter' ? 0.7 : 1.0;
  const sunFactor = sunlightHours > 6 ? 1.15 : 0.95;

  let intervalDays = Math.max(1, Math.round(spec.baseInterval / (tempFactor * humidityFactor * seasonFactor)));

  if (soilMoisturePercent >= spec.max || (rainfallMm > 12 && soilMoisturePercent > 55)) {
    return {
      status: 'Overwatering Warning',
      recommendedMl: 0,
      nextCheckHours: 48,
      intervalDays: intervalDays + 2,
      waterSavingTip: 'Skip scheduled irrigation and allow top 4cm of substrate to aerate.',
      explanation: `Soil moisture (${soilMoisturePercent}%) exceeds the ${spec.max}% threshold for ${speciesCategory.toLowerCase()} species${rainfallMm > 12 ? ` with ${rainfallMm}mm recent rainfall` : ''}. Excess water risks root hypoxia.`,
    };
  }

  if (soilMoisturePercent < spec.min) {
    const deficitRatio = Math.min(1.5, (spec.min - soilMoisturePercent + 15) / 30);
    const recommendedMl = Math.round(baseVolumeMl * tempFactor * sunFactor * deficitRatio);
    return {
      status: 'Needs Watering Now',
      recommendedMl,
      nextCheckHours: 12,
      intervalDays,
      waterSavingTip: 'Water at dawn or dusk near the root collar to reduce evaporation by up to 35%.',
      explanation: `Soil moisture (${soilMoisturePercent}%) has dropped below the ${spec.min}% minimum threshold for ${speciesCategory.toLowerCase()} plants at ${temperatureC}°C.`,
    };
  }

  if (soilMoisturePercent < spec.min + 8) {
    const lightDose = Math.round(baseVolumeMl * 0.65);
    return {
      status: 'Monitor Closely',
      recommendedMl: lightDose,
      nextCheckHours: 24,
      intervalDays,
      waterSavingTip: 'Apply a 2cm organic cocopeat or bark mulch layer to retain root-zone moisture.',
      explanation: `Moisture (${soilMoisturePercent}%) is approaching the lower comfort band (${spec.min}%). Plan a ${lightDose}ml hydration cycle within 24 hours.`,
    };
  }

  return {
    status: 'Optimal Moisture',
    recommendedMl: 0,
    nextCheckHours: 36,
    intervalDays,
    waterSavingTip: 'Harvest rainwater or reuse cooled RO/vegetable rinse water for your next cycle.',
    explanation: `Root-zone moisture (${soilMoisturePercent}%) is balanced inside the ${spec.min}%–${spec.max}% ideal range for ${speciesCategory.toLowerCase()} growth.`,
  };
}

export interface EcoImpactInput {
  waterSavedLiters: number;
  compostKg: number;
  plantsMaintained: number;
  wasteRecycledKg: number;
  sustainableActions: number;
}

export interface EcoImpactResult {
  ecoScore: number;
  tier: 'Seedling Guardian' | 'Canopy Steward' | 'Biosphere Architect';
  co2OffsetEstimateKg: number;
  breakdown: {
    waterPoints: number;
    compostPoints: number;
    plantPoints: number;
    recyclePoints: number;
    actionPoints: number;
  };
  formulaExplanation: string;
}

export function calculateEcoImpactScore(input: EcoImpactInput): EcoImpactResult {
  const waterPoints = Math.min(25, Math.round((Math.max(0, input.waterSavedLiters) / 200) * 25));
  const compostPoints = Math.min(25, Math.round((Math.max(0, input.compostKg) / 40) * 25));
  const plantPoints = Math.min(20, Math.round((Math.max(0, input.plantsMaintained) / 12) * 20));
  const recyclePoints = Math.min(15, Math.round((Math.max(0, input.wasteRecycledKg) / 25) * 15));
  const actionPoints = Math.min(15, Math.round((Math.max(0, input.sustainableActions) / 20) * 15));

  const ecoScore = Math.min(100, waterPoints + compostPoints + plantPoints + recyclePoints + actionPoints);
  const co2OffsetEstimateKg = Number(
    (input.plantsMaintained * 1.8 + input.compostKg * 0.5 + input.wasteRecycledKg * 0.35).toFixed(1)
  );

  const tier =
    ecoScore >= 80 ? 'Biosphere Architect' : ecoScore >= 50 ? 'Canopy Steward' : 'Seedling Guardian';

  return {
    ecoScore,
    tier,
    co2OffsetEstimateKg,
    breakdown: {
      waterPoints,
      compostPoints,
      plantPoints,
      recyclePoints,
      actionPoints,
    },
    formulaExplanation:
      'Score = Water Conservation (max 25 pts @ 200L) + Organic Composting (max 25 pts @ 40kg) + Active Living Plants (max 20 pts @ 12 plants) + Biomass Recycling (max 15 pts @ 25kg) + Logged Eco Actions (max 15 pts @ 20 actions).',
  };
}

export interface SoilAssessmentInput {
  soilType: string;
  ph: number;
  moisture: number;
  temperature: number;
  nitrogen: 'Low' | 'Optimal' | 'High';
  phosphorus: 'Low' | 'Optimal' | 'High';
  potassium: 'Low' | 'Optimal' | 'High';
}

export function evaluateSoilCondition(input: SoilAssessmentInput) {
  const phStatus =
    input.ph < 5.5
      ? 'Strongly Acidic'
      : input.ph <= 6.8
      ? 'Slightly Acidic (Ideal for Most Botanicals)'
      : input.ph <= 7.4
      ? 'Neutral'
      : 'Alkaline';

  const deficiencies: string[] = [];
  if (input.nitrogen === 'Low') deficiencies.push('Nitrogen (leaf chlorosis & stunted shoots)');
  if (input.phosphorus === 'Low') deficiencies.push('Phosphorus (weak root establishment & dull foliage)');
  if (input.potassium === 'Low') deficiencies.push('Potassium (marginal leaf scorch & reduced drought resilience)');

  let score = 88;
  if (input.ph < 5.2 || input.ph > 7.8) score -= 18;
  if (input.moisture < 20 || input.moisture > 85) score -= 14;
  score -= deficiencies.length * 10;

  return {
    soilHealthScore: Math.max(25, Math.min(99, score)),
    phStatus,
    imbalances: deficiencies.length > 0 ? deficiencies : ['Balanced N-P-K macronutrient profile'],
    amendmentAdvice:
      input.ph < 5.5
        ? 'Incorporate agricultural dolomitic limestone and aged leaf mold to buffer acidity.'
        : input.ph > 7.5
        ? 'Amend with elemental sulfur, rich vermicompost, and coco peat to gently lower pH.'
        : 'Maintain structure with 20% organic vermicompost, 15% perlite/pumice for aeration, and neem cake.',
  };
}

export function buildPlantImageHistory(
  plant: {
    id?: number | string;
    name?: string;
    imageUrl?: string | null;
    photoGalleryJson?: string | null;
  } | null | undefined,
  diagnoses: Array<{
    plantId?: number | null;
    plantName?: string | null;
    imageUrl?: string | null;
    imagesJson?: string | null;
  }> = []
): string[] {
  if (!plant) return [];
  const urls: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };

  const parseArrayEntries = (rawJson: string | null | undefined) => {
    if (!rawJson) return;
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') pushUnique(item);
          else if (item && typeof item.url === 'string') pushUnique(item.url);
          else if (item && typeof item.imageUrl === 'string') pushUnique(item.imageUrl);
          else if (item && typeof item.dataUrl === 'string') pushUnique(item.dataUrl);
        }
      }
    } catch {
      // ignore malformed JSON
    }
  };

  parseArrayEntries(plant.photoGalleryJson);

  const normalizedName = String(plant.name || '').trim().toLowerCase();
  const matchingDiagnoses = diagnoses.filter((d) => {
    if (plant.id != null && d.plantId != null && Number(d.plantId) === Number(plant.id)) return true;
    return Boolean(normalizedName && String(d.plantName || '').trim().toLowerCase() === normalizedName);
  });

  // Oldest diagnosis first -> current plant photo last for natural time-lapse progression
  for (const diag of [...matchingDiagnoses].reverse()) {
    pushUnique(diag.imageUrl);
    parseArrayEntries(diag.imagesJson);
  }

  pushUnique(plant.imageUrl);
  return urls;
}

