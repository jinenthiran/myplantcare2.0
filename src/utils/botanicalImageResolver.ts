export const BOTANICAL_IMAGE_FILES = [
  'diagnostic_botanical_lab_1794532595815.webp',
  'garden_conservatory_backdrop_1794532597538.webp',
  'hero_botanical_sanctuary_1794482113239.webp',
  'library_herbarium_studio_1794532595655.webp',
  'plant_areca_palm_1794534018337.webp',
  'plant_areca_pothos_collection_1794532597731.webp',
  'plant_curry_leaf_1794534019231.webp',
  'plant_fiddle_leaf_fig_1794482115866.webp',
  'plant_golden_pothos_1794534018954.webp',
  'plant_hibiscus_red_1794534019959.webp',
  'plant_monstera_deliciosa_1794482112942.webp',
  'plant_snake_plant_1794534019015.webp',
  'plant_tulsi_holy_basil_1794482114261.webp',
] as const;

export const BOTANICAL_IMAGES = {
  diagnosticLab: '/images/diagnostic_botanical_lab_1794532595815.webp',
  gardenConservatory: '/images/garden_conservatory_backdrop_1794532597538.webp',
  heroSanctuary: '/images/hero_botanical_sanctuary_1794482113239.webp',
  libraryHerbarium: '/images/library_herbarium_studio_1794532595655.webp',
  arecaPalm: '/images/plant_areca_palm_1794534018337.webp',
  arecaPothosCollection: '/images/plant_areca_pothos_collection_1794532597731.webp',
  curryLeaf: '/images/plant_curry_leaf_1794534019231.webp',
  fiddleLeafFig: '/images/plant_fiddle_leaf_fig_1794482115866.webp',
  goldenPothos: '/images/plant_golden_pothos_1794534018954.webp',
  hibiscusRed: '/images/plant_hibiscus_red_1794534019959.webp',
  monsteraDeliciosa: '/images/plant_monstera_deliciosa_1794482112942.webp',
  snakePlant: '/images/plant_snake_plant_1794534019015.webp',
  tulsiHolyBasil: '/images/plant_tulsi_holy_basil_1794482114261.webp',
} as const;

const KNOWN_FILE_MAP: Record<string, string> = Object.fromEntries(
  BOTANICAL_IMAGE_FILES.map((file) => {
    const stem = file.replace(/\.webp$/i, '').toLowerCase();
    return [stem, `/images/${file}`];
  })
);

const LEGACY_FILE_REMAP: Record<string, string> = {
  plant_fiddle_leaf_fig_1794482114191: BOTANICAL_IMAGES.fiddleLeafFig,
};

/**
 * Picks a verified local botanical asset ONLY when the query explicitly matches
 * one of the 8 dedicated local species assets. Returns '' for unmatched species
 * so no unrelated species photograph is ever substituted silently.
 */
export function getSpeciesFallbackImage(speciesOrName?: string | null): string {
  const query = String(speciesOrName || '').trim().toLowerCase();
  if (!query) return '';
  if (query.includes('monstera') || query.includes('swiss cheese')) {
    return BOTANICAL_IMAGES.monsteraDeliciosa;
  }
  if (query.includes('tulsi') || query.includes('holy basil') || query.includes('ocimum tenuiflorum') || query.includes('ocimum sanctum')) {
    return BOTANICAL_IMAGES.tulsiHolyBasil;
  }
  if (query.includes('ficus lyrata') || query.includes('fiddle leaf')) {
    return BOTANICAL_IMAGES.fiddleLeafFig;
  }
  if (query.includes('golden pothos') || query.includes('epipremnum aureum') || query.includes('devil’s ivy') || query.includes("devil's ivy") || query.includes('money plant')) {
    return BOTANICAL_IMAGES.goldenPothos;
  }
  if (query.includes('areca palm') || query.includes('dypsis lutescens') || query.includes('golden cane palm')) {
    return BOTANICAL_IMAGES.arecaPalm;
  }
  if (query.includes('hibiscus rosa-sinensis') || query.includes('crimson hibiscus') || query.includes('shoe flower') || query.includes('sembaruthi')) {
    return BOTANICAL_IMAGES.hibiscusRed;
  }
  if (query.includes('curry leaf') || query.includes('murraya koenigii') || query.includes('kariveppilai')) {
    return BOTANICAL_IMAGES.curryLeaf;
  }
  if (query.includes('snake plant') || query.includes('sansevieria') || query.includes('dracaena trifasciata')) {
    return BOTANICAL_IMAGES.snakePlant;
  }
  return '';
}

/**
 * Resolves any image source (data URLs, blob URLs, HTTPS URLs, legacy /src/assets/images/*.jpg,
 * or /images/*.webp paths) into a verified, production-safe URL without substituting an unrelated species.
 */
export function resolveBotanicalImageUrl(
  rawSrc?: string | null,
  speciesHint?: string | null
): string {
  const trimmed = String(rawSrc || '').trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return speciesHint ? getSpeciesFallbackImage(speciesHint) : '';
  }

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Upgrade http:// external URLs to https:// to avoid mixed-content blocks in production
  if (/^http:\/\//i.test(trimmed) && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
    return trimmed.replace(/^http:\/\//i, 'https://');
  }

  if (/^https:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Normalize local asset paths (both legacy /src/assets/images/... and /images/...)
  const cleanedPath = trimmed.split('?')[0].split('#')[0];
  const filename = cleanedPath.split('/').pop() || '';
  const stem = filename.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '').toLowerCase();

  if (stem && LEGACY_FILE_REMAP[stem]) {
    return LEGACY_FILE_REMAP[stem];
  }

  if (stem && KNOWN_FILE_MAP[stem]) {
    return KNOWN_FILE_MAP[stem];
  }

  // Preserve valid root-relative /images/ or /favicon paths
  if (cleanedPath.startsWith('/images/') || cleanedPath.startsWith('/favicon')) {
    return cleanedPath;
  }

  // Remap unbundled /src/assets/images/ or relative assets/ paths strictly if species matches
  if (cleanedPath.includes('/src/assets/images/') || cleanedPath.startsWith('assets/images/')) {
    return speciesHint ? getSpeciesFallbackImage(speciesHint) : '';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

