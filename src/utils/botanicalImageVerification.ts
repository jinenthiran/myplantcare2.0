import { ImageVerificationStatus, LibraryPlant, PlantImageAttribution } from '../data/plants/types';

export type BotanicalImageIssueCode =
  | 'missing_image'
  | 'broken_url'
  | 'duplicate_across_species'
  | 'unverified_generic_stock'
  | 'attribution_mismatch_or_missing'
  | 'needs_review'
  | 'non_botanical_keyword';

export interface PlantImageAuditItem {
  plantId: string;
  commonName: string;
  tamilName: string;
  scientificName: string;
  category: string;
  imageUrl: string;
  status: ImageVerificationStatus;
  issues: BotanicalImageIssueCode[];
  issueLabels: string[];
  attribution: PlantImageAttribution;
}

export interface BotanicalImageAuditReport {
  generatedAt: string;
  totalRecords: number;
  verifiedCount: number;
  awaitingVerificationCount: number;
  brokenCount: number;
  missingCount: number;
  duplicateConflictCount: number;
  suspiciousStockCount: number;
  attributionGapCount: number;
  items: PlantImageAuditItem[];
  flaggedItems: PlantImageAuditItem[];
}

export interface BotanicalImageOverrideRecord {
  plantId: string;
  scientificName: string;
  imageUrl: string;
  photographer: string;
  source: string;
  license: string;
  sourceUrl: string;
  verificationStatus: ImageVerificationStatus;
  verificationNotes?: string;
  width?: number | null;
  height?: number | null;
  updatedBy?: string;
  updatedAt?: string | Date | null;
}

const KNOWN_GENERIC_STOCK_DOMAINS = [
  'images.unsplash.com',
  'unsplash.com',
  'pexels.com',
  'images.pexels.com',
  'pixabay.com',
  'shutterstock.com',
  'istockphoto.com',
  'gettyimages.com',
  'dreamstime.com',
];

const NON_BOTANICAL_URL_PATTERNS = [
  /placeholder/i,
  /no[-_]?image/i,
  /not[-_]?found/i,
  /default[-_]?thumb/i,
  /laptop/i,
  /smartphone/i,
  /computer/i,
  /keyboard/i,
  /\/hero_botanical_sanctuary_/i,
  /\/library_herbarium_studio_/i,
  /\/diagnostic_botanical_lab_/i,
  /\/garden_conservatory_backdrop_/i,
];

const ISSUE_LABELS: Record<BotanicalImageIssueCode, string> = {
  missing_image: 'Missing image URL',
  broken_url: 'Broken or unreachable image URL',
  duplicate_across_species: 'Duplicate image URL shared across unrelated species',
  unverified_generic_stock: 'Unverified generic stock photo URL',
  attribution_mismatch_or_missing: 'Missing or inconsistent source attribution/license',
  needs_review: 'Marked as awaiting botanical review',
  non_botanical_keyword: 'Suspicious non-species or scene backdrop asset',
};

export function normalizeAuditImageUrl(url?: string | null): string {
  return String(url || '').trim().split('?')[0].toLowerCase();
}

export function isSuspiciousGenericStockUrl(url?: string | null): boolean {
  const raw = String(url || '').trim().toLowerCase();
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('/')) {
    return false;
  }
  return KNOWN_GENERIC_STOCK_DOMAINS.some((domain) => raw.includes(domain));
}

export function hasNonBotanicalUrlSignal(url?: string | null): boolean {
  const raw = String(url || '').trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return false;
  return NON_BOTANICAL_URL_PATTERNS.some((rx) => rx.test(raw));
}

export function validateExternalBotanicalImageUrl(url?: string | null): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    return { valid: false, reason: 'Image URL is empty.' };
  }
  if (trimmed.startsWith('data:image/')) {
    return { valid: true };
  }
  if (trimmed.startsWith('/images/')) {
    return { valid: true };
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return { valid: false, reason: 'URL must begin with https:// or be a verified /images/ asset.' };
  }
  if (/\.(html|htm|php|js|css|json|txt)(\?|#|$)/i.test(trimmed)) {
    return { valid: false, reason: 'URL points to a web page or script instead of an image file.' };
  }
  if (hasNonBotanicalUrlSignal(trimmed)) {
    return { valid: false, reason: 'URL matches a placeholder or non-botanical asset pattern.' };
  }
  return { valid: true };
}

export function detectDuplicateImageUrls(
  plants: Pick<LibraryPlant, 'id' | 'commonName' | 'scientificName' | 'imageUrl'>[]
): Map<string, string[]> {
  const urlToSpecies = new Map<string, Set<string>>();
  const urlToIds = new Map<string, string[]>();

  for (const plant of plants) {
    const norm = normalizeAuditImageUrl(plant.imageUrl);
    if (!norm) continue;
    if (!urlToSpecies.has(norm)) urlToSpecies.set(norm, new Set());
    if (!urlToIds.has(norm)) urlToIds.set(norm, []);
    urlToSpecies.get(norm)!.add(plant.scientificName.trim().toLowerCase());
    urlToIds.get(norm)!.push(plant.id);
  }

  const conflicts = new Map<string, string[]>();
  for (const [normUrl, speciesSet] of urlToSpecies.entries()) {
    if (speciesSet.size > 1) {
      conflicts.set(normUrl, urlToIds.get(normUrl) || []);
    }
  }
  return conflicts;
}

export function auditSinglePlantImage(
  plant: LibraryPlant,
  duplicateConflicts: Map<string, string[]>,
  runtimeBrokenIds?: Set<string>
): PlantImageAuditItem {
  const issues: BotanicalImageIssueCode[] = [];
  const rawUrl = String(plant.imageUrl || '').trim();
  const normUrl = normalizeAuditImageUrl(rawUrl);

  if (!rawUrl) {
    issues.push('missing_image');
  }
  if (runtimeBrokenIds?.has(plant.id) || plant.verificationStatus === 'broken') {
    issues.push('broken_url');
  }
  if (normUrl && duplicateConflicts.has(normUrl)) {
    issues.push('duplicate_across_species');
  }
  if (rawUrl && isSuspiciousGenericStockUrl(rawUrl)) {
    issues.push('unverified_generic_stock');
  }
  if (rawUrl && hasNonBotanicalUrlSignal(rawUrl)) {
    issues.push('non_botanical_keyword');
  }

  const attr = plant.attribution || { photographer: '', source: '', license: '' };
  const sourceClaimsWikimediaOrGbif = /wikimedia|gbif/i.test(attr.source || '');
  const pointsToUnsplash = /unsplash\.com/i.test(rawUrl);
  if (
    !attr.photographer?.trim() ||
    !attr.source?.trim() ||
    !attr.license?.trim() ||
    (sourceClaimsWikimediaOrGbif && pointsToUnsplash)
  ) {
    issues.push('attribution_mismatch_or_missing');
  }

  if (plant.verificationStatus === 'needs_review') {
    issues.push('needs_review');
  }

  let status: ImageVerificationStatus = plant.verificationStatus || 'verified';
  if (issues.includes('broken_url')) {
    status = 'broken';
  } else if (
    issues.includes('missing_image') ||
    issues.includes('needs_review') ||
    issues.includes('duplicate_across_species') ||
    issues.includes('unverified_generic_stock') ||
    issues.includes('non_botanical_keyword')
  ) {
    status = 'needs_review';
  } else if (issues.includes('attribution_mismatch_or_missing')) {
    status = 'unverified';
  }

  return {
    plantId: plant.id,
    commonName: plant.commonName,
    tamilName: plant.tamilName,
    scientificName: plant.scientificName,
    category: plant.category,
    imageUrl: rawUrl,
    status,
    issues,
    issueLabels: issues.map((code) => ISSUE_LABELS[code]),
    attribution: attr,
  };
}

export function generateBotanicalImageAuditReport(
  plants: LibraryPlant[],
  runtimeBrokenIds?: Set<string>
): BotanicalImageAuditReport {
  const duplicateConflicts = detectDuplicateImageUrls(plants);
  const items = plants.map((plant) => auditSinglePlantImage(plant, duplicateConflicts, runtimeBrokenIds));

  return {
    generatedAt: new Date().toISOString(),
    totalRecords: items.length,
    verifiedCount: items.filter((i) => i.status === 'verified').length,
    awaitingVerificationCount: items.filter((i) => i.status === 'needs_review' || i.status === 'unverified').length,
    brokenCount: items.filter((i) => i.issues.includes('broken_url')).length,
    missingCount: items.filter((i) => i.issues.includes('missing_image')).length,
    duplicateConflictCount: items.filter((i) => i.issues.includes('duplicate_across_species')).length,
    suspiciousStockCount: items.filter(
      (i) => i.issues.includes('unverified_generic_stock') || i.issues.includes('non_botanical_keyword')
    ).length,
    attributionGapCount: items.filter((i) => i.issues.includes('attribution_mismatch_or_missing')).length,
    items,
    flaggedItems: items.filter((i) => i.status !== 'verified' || i.issues.length > 0),
  };
}

/**
 * Strict plant-to-catalog matching following Section 2 priority:
 * 1. Exact scientific name
 * 2. Accepted botanical synonym
 * 3. Exact common name
 * 4. Exact Tamil name
 * Never falls back to loose substring similarity across unrelated species.
 */
export function matchLibraryPlantByName(plants: LibraryPlant[], query?: string | null): LibraryPlant | null {
  const cleaned = String(query || '').trim().toLowerCase();
  if (!cleaned) return null;

  // 1. Exact scientific name match
  const exactSci = plants.find((p) => p.scientificName.trim().toLowerCase() === cleaned);
  if (exactSci) return exactSci;

  // 2. Accepted botanical synonym
  const synonymMatch = plants.find((p) =>
    (p.synonyms || []).some((syn) => syn.trim().toLowerCase() === cleaned)
  );
  if (synonymMatch) return synonymMatch;

  // 3. Exact common name (or primary common name before parenthetical)
  const exactCommon = plants.find((p) => {
    const full = p.commonName.trim().toLowerCase();
    const primary = full.split('(')[0].trim();
    return full === cleaned || primary === cleaned;
  });
  if (exactCommon) return exactCommon;

  // 4. Exact Tamil name (or Tamil script / transliteration inside parens)
  const exactTamil = plants.find((p) => {
    const full = p.tamilName.trim().toLowerCase();
    const scriptPart = full.split('(')[0].trim();
    return full === cleaned || scriptPart === cleaned;
  });
  if (exactTamil) return exactTamil;

  return null;
}

export function applyImageOverridesToCatalog(
  plants: LibraryPlant[],
  overrides: BotanicalImageOverrideRecord[]
): LibraryPlant[] {
  if (!overrides || overrides.length === 0) return plants;
  const overrideMap = new Map<string, BotanicalImageOverrideRecord>();
  for (const ov of overrides) {
    if (ov.plantId) {
      overrideMap.set(ov.plantId, ov);
    }
  }

  return plants.map((plant) => {
    const ov = overrideMap.get(plant.id);
    if (!ov) return plant;
    return {
      ...plant,
      imageUrl: ov.imageUrl,
      verificationStatus: ov.verificationStatus || 'verified',
      verificationNotes: ov.verificationNotes || plant.verificationNotes,
      attribution: {
        ...plant.attribution,
        photographer: ov.photographer || plant.attribution.photographer,
        source: ov.source || plant.attribution.source,
        license: ov.license || plant.attribution.license,
        sourceUrl: ov.sourceUrl || plant.attribution.sourceUrl,
        verifiedAt: ov.updatedAt ? new Date(ov.updatedAt).toISOString() : plant.attribution.verifiedAt,
        verificationMethod: 'admin-override',
      },
    };
  });
}

export type FlagIssueReasonCode =
  | 'unrelated_object'
  | 'wrong_species'
  | 'duplicate_image'
  | 'broken_or_low_res'
  | 'missing_attribution';

export interface FlagIssueReasonOption {
  code: FlagIssueReasonCode;
  label: string;
  description: string;
}

export const FLAG_ISSUE_REASONS: FlagIssueReasonOption[] = [
  {
    code: 'unrelated_object',
    label: 'Unrelated Object (Laptop, Phone, Computer, Furniture)',
    description: 'Image displays a non-botanical object instead of the plant specimen.',
  },
  {
    code: 'wrong_species',
    label: 'Wrong Plant Species / Taxonomic Mismatch',
    description: 'Image shows a plant, but it does not match the scientific name of this record.',
  },
  {
    code: 'duplicate_image',
    label: 'Duplicate Image Reused Across Different Plants',
    description: 'This exact photo is already assigned to another unrelated species.',
  },
  {
    code: 'broken_or_low_res',
    label: 'Broken URL, Placeholder, or Low Resolution',
    description: 'Image fails to load, is heavily pixelated, or is a generic placeholder.',
  },
  {
    code: 'missing_attribution',
    label: 'Missing or Inaccurate Source / License Attribution',
    description: 'Botanical repository source, photographer credit, or license requires correction.',
  },
];

export const VERIFIED_SOURCE_PRESETS: string[] = [
  'Wikimedia Commons',
  'iNaturalist Research Grade Observation',
  'GBIF / Royal Botanic Gardens, Kew',
  'Botanical Survey of India (BSI)',
  'Tamil Nadu Horticulture Herbarium',
  'University Botanical Collection',
];

export const VERIFIED_LICENSE_PRESETS: string[] = [
  'CC0 1.0 Public Domain',
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'CC BY-SA 3.0',
  'Public Domain',
];

export const AUTHORIZED_ADMIN_EMAILS = ['jenasanjay17@gmail.com'];

export function isAuthorizedImageCurator(
  user?: { email?: string | null; emailVerified?: boolean | null; role?: string | null } | null,
  curatorSessionEnabled = false
): { authorized: boolean; roleLabel: string; identityLabel: string } {
  const email = String(user?.email || '').trim().toLowerCase();
  if (email && AUTHORIZED_ADMIN_EMAILS.includes(email)) {
    return {
      authorized: true,
      roleLabel: 'Lead Botanical Administrator',
      identityLabel: user?.email || email,
    };
  }
  if (user?.role === 'admin' || user?.role === 'curator') {
    return {
      authorized: true,
      roleLabel: 'Authorized Herbarium Curator',
      identityLabel: user?.email || 'Verified Curator',
    };
  }
  if (curatorSessionEnabled) {
    return {
      authorized: true,
      roleLabel: 'Authorized Sanctuary Curator Session',
      identityLabel: user?.email || 'Sanctuary Curator (Active)',
    };
  }
  return {
    authorized: false,
    roleLabel: 'Read-Only Visitor',
    identityLabel: user?.email || 'Unauthenticated Session',
  };
}

export interface AdminImageCorrectionValidationInput {
  mode: 'flag' | 'replace';
  plantId: string;
  flagReason?: string;
  flagNotes?: string;
  imageUrl?: string;
  photographer?: string;
  source?: string;
  license?: string;
  sourceUrl?: string;
  verificationNotes?: string;
  confirmedByAdmin?: boolean;
}

export function validateAdminImageCorrectionInput(
  input: AdminImageCorrectionValidationInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const plantId = String(input.plantId || '').trim();
  if (!plantId || !/^[a-zA-Z0-9_\-]+$/.test(plantId) || plantId.length > 128) {
    errors.push('A valid species-locked Plant ID is required.');
  }

  if (input.mode === 'flag') {
    const reason = String(input.flagReason || '').trim();
    const validCodes = new Set<string>(FLAG_ISSUE_REASONS.map((r) => r.code));
    if (!reason || !validCodes.has(reason)) {
      errors.push('Please select a valid image issue classification reason.');
    }
    const notes = String(input.flagNotes || '').trim();
    if (notes.length > 500) {
      errors.push('Flag observation notes must be 500 characters or fewer.');
    }
    return { valid: errors.length === 0, errors };
  }

  const urlCheck = validateExternalBotanicalImageUrl(input.imageUrl);
  if (!urlCheck.valid) {
    errors.push(urlCheck.reason || 'A valid verified botanical image URL or uploaded image is required.');
  }

  const photographer = String(input.photographer || '').trim();
  if (!photographer) {
    errors.push('Photographer / Author credit is required for botanical attribution.');
  } else if (photographer.length > 120) {
    errors.push('Photographer credit must be 120 characters or fewer.');
  }

  const source = String(input.source || '').trim();
  if (!source) {
    errors.push('Botanical source repository (e.g., Wikimedia Commons, GBIF, iNaturalist) is required.');
  } else if (source.length > 120) {
    errors.push('Botanical source must be 120 characters or fewer.');
  }

  const license = String(input.license || '').trim();
  if (!license) {
    errors.push('Image license (e.g., CC0 1.0, CC BY 4.0, CC BY-SA 4.0) is required.');
  } else if (license.length > 80) {
    errors.push('License string must be 80 characters or fewer.');
  }

  const sourceUrl = String(input.sourceUrl || '').trim();
  if (sourceUrl && sourceUrl.length > 500) {
    errors.push('Canonical source URL must be 500 characters or fewer.');
  } else if (sourceUrl && !/^https?:\/\//i.test(sourceUrl) && !sourceUrl.startsWith('/images/')) {
    errors.push('Canonical source URL must start with https:// or /images/.');
  }

  if (input.confirmedByAdmin !== true) {
    errors.push('Explicit curator confirmation that the image matches the exact plant species is required.');
  }

  return { valid: errors.length === 0, errors };
}

