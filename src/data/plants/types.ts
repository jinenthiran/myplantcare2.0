export type PlantCategory =
  | 'Tamil Nadu Native & Heritage'
  | 'Sacred & Medicinal'
  | 'Fruit Trees & Orchards'
  | 'Vegetables & Kitchen Garden'
  | 'Herbs, Spices & Aromatics'
  | 'Agricultural & Field Crops'
  | 'Tropical Flowering & Fragrant'
  | 'Indoor & Air Purifying'
  | 'Succulents & Cacti'
  | 'Shade & Timber Trees';

export type ImageVerificationStatus = 'verified' | 'needs_review' | 'broken' | 'unverified';

export interface PlantImageAttribution {
  photographer: string;
  source: string;
  license: string;
  sourceUrl?: string;
  verifiedAt?: string;
  verificationMethod?: string;
}

export interface LibraryPlant {
  id: string;
  commonName: string;
  tamilName: string;
  scientificName: string;
  synonyms?: string[];
  family: string;
  origin: string;
  category: PlantCategory;
  growthHabit: 'Tree' | 'Shrub' | 'Perennial Herb' | 'Annual Herb' | 'Climber/Vine' | 'Succulent' | 'Aquatic' | 'Palm';
  matureHeight: string;
  spaceSuitability: 'Indoor' | 'Outdoor' | 'Both';
  sunlight: 'Low to Medium' | 'Bright Indirect' | 'Direct Morning Sun' | 'Full Sun' | 'Partial Shade';
  waterNeed: 'Low' | 'Moderate' | 'High';
  soilMix: string;
  temperatureRange: string;
  humidity: string;
  fertilizer: string;
  propagation: string[];
  season: string;
  commonPests: string[];
  commonDiseases: string[];
  toxicity: string;
  careInstructions: string;
  benefits: string;
  imageUrl: string;
  verificationStatus?: ImageVerificationStatus;
  verificationNotes?: string;
  attribution: PlantImageAttribution;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  climate: string;
  isPopular?: boolean;
  isTamilNaduNative?: boolean;
  growthRate?: string;
  maxHeight?: string;
  leafStructure?: string;
  flowerInfo?: string;
}


