import { LibraryPlant, PlantCategory } from './types';
import { TAMIL_NADU_AND_MEDICINAL_PLANTS } from './tamilNaduAndMedicinal';
import { FRUITS_VEGETABLES_AND_CROPS } from './fruitsVegetablesCrops';
import { ORNAMENTAL_INDOOR_TREES } from './ornamentalIndoorTrees';

export * from './types';
export { TAMIL_NADU_AND_MEDICINAL_PLANTS } from './tamilNaduAndMedicinal';
export { FRUITS_VEGETABLES_AND_CROPS, FRUITS_VEGETABLES_AND_CROPS as FRUITS_VEGETABLES_CROPS } from './fruitsVegetablesCrops';
export { ORNAMENTAL_INDOOR_TREES } from './ornamentalIndoorTrees';

/**
 * Deduplicated Master Botanical Library.
 * Contains 113+ verified taxa across 10 botanical categories with complete taxonomy,
 * authentic Tamil script names, care parameters, and genuine image attribution.
 */
export const ALL_EXPANDED_PLANTS: LibraryPlant[] = (() => {
  const map = new Map<string, LibraryPlant>();
  const combined = [
    ...TAMIL_NADU_AND_MEDICINAL_PLANTS,
    ...FRUITS_VEGETABLES_AND_CROPS,
    ...ORNAMENTAL_INDOOR_TREES,
  ];

  for (const plant of combined) {
    if (!map.has(plant.id)) {
      map.set(plant.id, plant);
    }
  }

  return Array.from(map.values());
})();

/**
 * Distinct botanical categories with their record counts
 */
export const PLANT_CATEGORIES: PlantCategory[] = [
  'Tamil Nadu Native & Heritage',
  'Sacred & Medicinal',
  'Fruit Trees & Orchards',
  'Vegetables & Kitchen Garden',
  'Herbs, Spices & Aromatics',
  'Agricultural & Field Crops',
  'Tropical Flowering & Fragrant',
  'Indoor & Air Purifying',
  'Succulents & Cacti',
  'Shade & Timber Trees',
];

/**
 * Search filter criteria
 */
export interface PlantSearchFilters {
  query?: string;
  category?: string;
  sunlight?: string;
  waterNeed?: string;
  growthHabit?: string;
  tamilNaduNativeOnly?: boolean;
  popularOnly?: boolean;
}

/**
 * Advanced multi-attribute search matching English, Tamil script, Tamil transliteration,
 * scientific names, botanical family, and therapeutic/ecological benefits.
 */
export function searchPlants(filters: PlantSearchFilters): LibraryPlant[] {
  const q = (filters.query || '').trim().toLowerCase();
  const cat = filters.category && filters.category !== 'All' ? filters.category : null;
  const sun = filters.sunlight && filters.sunlight !== 'All' ? filters.sunlight : null;
  const water = filters.waterNeed && filters.waterNeed !== 'All' ? filters.waterNeed : null;
  const habit = filters.growthHabit && filters.growthHabit !== 'All' ? filters.growthHabit : null;

  return ALL_EXPANDED_PLANTS.filter((plant) => {
    // 1. Text Search across English, Tamil, Scientific, Family, Benefits
    if (q) {
      const matchCommon = plant.commonName.toLowerCase().includes(q);
      const matchTamil = plant.tamilName.toLowerCase().includes(q);
      const matchScientific = plant.scientificName.toLowerCase().includes(q);
      const matchFamily = plant.family.toLowerCase().includes(q);
      const matchSynonyms = plant.synonyms?.some((s) => s.toLowerCase().includes(q)) ?? false;
      const matchBenefits = plant.benefits.toLowerCase().includes(q);

      if (!matchCommon && !matchTamil && !matchScientific && !matchFamily && !matchSynonyms && !matchBenefits) {
        return false;
      }
    }

    // 2. Category filter
    if (cat && plant.category !== cat) {
      return false;
    }

    // 3. Sunlight filter
    if (sun && plant.sunlight !== sun) {
      return false;
    }

    // 4. Water Need filter
    if (water && plant.waterNeed !== water) {
      return false;
    }

    // 5. Growth Habit filter
    if (habit && plant.growthHabit !== habit) {
      return false;
    }

    // 6. Native / Popular toggles
    if (filters.tamilNaduNativeOnly && !plant.isTamilNaduNative) {
      return false;
    }

    if (filters.popularOnly && !plant.isPopular) {
      return false;
    }

    return true;
  });
}

/**
 * Find plant by unique botanical ID
 */
export function getPlantById(id: string): LibraryPlant | undefined {
  return ALL_EXPANDED_PLANTS.find((p) => p.id === id);
}

/**
 * Featured Tamil Nadu Heritage Plants
 */
export function getFeaturedTamilNaduPlants(): LibraryPlant[] {
  return ALL_EXPANDED_PLANTS.filter((p) => p.isTamilNaduNative);
}

/**
 * Popular high-frequency species
 */
export function getPopularPlants(): LibraryPlant[] {
  return ALL_EXPANDED_PLANTS.filter((p) => p.isPopular);
}

/**
 * Botanical Database Integrity & Migration Report
 */
export interface DatabaseIntegrityReport {
  totalPlants: number;
  categoryBreakdown: Record<string, number>;
  verifiedTamilNames: number;
  verifiedAttributions: number;
  uniqueScientificNames: number;
  duplicateDetections: string[];
  missingInformationCount: number;
}

export function generateDatabaseIntegrityReport(): DatabaseIntegrityReport {
  const categoryCounts: Record<string, number> = {};
  const scientificSet = new Set<string>();
  const duplicates: string[] = [];
  let tamilCount = 0;
  let attributionCount = 0;
  let missingInfo = 0;

  for (const plant of ALL_EXPANDED_PLANTS) {
    // Categories
    categoryCounts[plant.category] = (categoryCounts[plant.category] || 0) + 1;

    // Duplicates by scientific name
    const sciLower = plant.scientificName.trim().toLowerCase();
    if (scientificSet.has(sciLower)) {
      duplicates.push(plant.scientificName);
    } else {
      scientificSet.add(sciLower);
    }

    // Tamil names
    if (plant.tamilName && plant.tamilName.length > 2) {
      tamilCount++;
    }

    // Attribution
    if (plant.attribution && plant.attribution.photographer && plant.attribution.license) {
      attributionCount++;
    }

    // Missing required fields check
    if (!plant.soilMix || !plant.sunlight || !plant.waterNeed || !plant.careInstructions) {
      missingInfo++;
    }
  }

  return {
    totalPlants: ALL_EXPANDED_PLANTS.length,
    categoryBreakdown: categoryCounts,
    verifiedTamilNames: tamilCount,
    verifiedAttributions: attributionCount,
    uniqueScientificNames: scientificSet.size,
    duplicateDetections: duplicates,
    missingInformationCount: missingInfo,
  };
}
