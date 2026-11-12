export interface LibraryPlant {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  origin: string;
  category: 'Indoor Foliage' | 'Sacred & Medicinal' | 'Air Purifying' | 'Tropical Flowering' | 'Kitchen & Culinary';
  spaceSuitability: 'Indoor' | 'Outdoor' | 'Both';
  sunlight: 'Low to Medium' | 'Bright Indirect' | 'Direct Morning Sun' | 'Full Sun';
  waterNeed: 'Low' | 'Moderate' | 'High';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  climate: 'Tropical & Humid' | 'Warm Subtropical' | 'Adaptable All-India';
  growthRate: string;
  maxHeight: string;
  leafStructure: string;
  flowerInfo: string;
  soilMix: string;
  imageUrl: string;
  benefits: string;
}

export const PLANT_LIBRARY: LibraryPlant[] = [
  {
    id: 'monstera-deliciosa',
    commonName: 'Swiss Cheese Plant',
    scientificName: 'Monstera deliciosa',
    family: 'Araceae',
    origin: 'Southern Mexico & Tropical Americas',
    category: 'Indoor Foliage',
    spaceSuitability: 'Indoor',
    sunlight: 'Bright Indirect',
    waterNeed: 'Moderate',
    difficulty: 'Beginner',
    climate: 'Tropical & Humid',
    growthRate: 'Fast (30–45 cm/year indoors)',
    maxHeight: '2.4m indoors (with moss pole)',
    leafStructure: 'Cordate, deeply fenestrated leathery emerald blades with long petioles',
    flowerInfo: 'Creamy spadix enclosed by a velvety hood (rarely blooms indoors)',
    soilMix: '40% coco chips, 30% pine bark, 20% vermicompost, 10% perlite (pH 5.8–6.5)',
    imageUrl: '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg',
    benefits: 'Iconic architectural foliage; high stomatal transpiration improves indoor micro-humidity.',
  },
  {
    id: 'ocimum-tenuiflorum',
    commonName: 'Krishna Tulsi (Holy Basil)',
    scientificName: 'Ocimum tenuiflorum',
    family: 'Lamiaceae',
    origin: 'Indian Subcontinent',
    category: 'Sacred & Medicinal',
    spaceSuitability: 'Both',
    sunlight: 'Direct Morning Sun',
    waterNeed: 'Moderate',
    difficulty: 'Beginner',
    climate: 'Adaptable All-India',
    growthRate: 'Fast (bushy branching in 60 days)',
    maxHeight: '60–90 cm',
    leafStructure: 'Aromatic decussate serrated leaves rich in eugenol and rosmarinic essential oils',
    flowerInfo: 'Elongated purple-violet verticillaster racemes (Manjari)',
    soilMix: '60% fertile garden loam, 25% cow dung / vermicompost, 15% river sand (pH 6.0–7.2)',
    imageUrl: '/src/assets/images/plant_tulsi_holy_basil_1794482114261.jpg',
    benefits: 'Revered adaptogenic herb; attracts native pollinators and repels mosquitoes naturally.',
  },
  {
    id: 'ficus-lyrata',
    commonName: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    family: 'Moraceae',
    origin: 'Western African Lowland Rainforests',
    category: 'Indoor Foliage',
    spaceSuitability: 'Indoor',
    sunlight: 'Bright Indirect',
    waterNeed: 'Moderate',
    difficulty: 'Intermediate',
    climate: 'Tropical & Humid',
    growthRate: 'Moderate (25–35 cm/year)',
    maxHeight: '3.0m indoors',
    leafStructure: 'Lyrate (violin-shaped), heavily veined, glossy dark forest-green leaves up to 45cm long',
    flowerInfo: 'Enclosed syconium figs (non-flowering in home interiors)',
    soilMix: '50% peat/coco coir, 25% composted pine bark, 25% perlite/pumice (pH 6.0–6.8)',
    imageUrl: '/src/assets/images/plant_fiddle_leaf_fig_1794482115866.jpg',
    benefits: 'Statement sculptural tree canopy for modern living spaces and sunlit studios.',
  },
  {
    id: 'epipremnum-aureum',
    commonName: 'Golden Pothos (Money Plant)',
    scientificName: 'Epipremnum aureum',
    family: 'Araceae',
    origin: 'Moorea (French Polynesia) & South Asia',
    category: 'Air Purifying',
    spaceSuitability: 'Both',
    sunlight: 'Low to Medium',
    waterNeed: 'Low',
    difficulty: 'Beginner',
    climate: 'Adaptable All-India',
    growthRate: 'Very Fast (trailing vines 15–25 cm/month)',
    maxHeight: '2.5m trailing or climbing',
    leafStructure: 'Heart-shaped glossy leaves variegated with golden-chartreuse marbling',
    flowerInfo: 'Shy spathe (almost never flowers in cultivation)',
    soilMix: '50% cocopeat, 30% vermicompost, 20% perlite; also thrives in clean hydroponic water jars',
    imageUrl: '/src/assets/images/hero_botanical_sanctuary_1794482113239.jpg',
    benefits: 'Extremely resilient bio-filter for formaldehyde, benzene, and xylene in indoor rooms.',
  },
  {
    id: 'dypsis-lutescens',
    commonName: 'Areca Palm (Golden Cane Palm)',
    scientificName: 'Dypsis lutescens',
    family: 'Arecaceae',
    origin: 'Madagascar & Tropical India',
    category: 'Air Purifying',
    spaceSuitability: 'Both',
    sunlight: 'Bright Indirect',
    waterNeed: 'Moderate',
    difficulty: 'Beginner',
    climate: 'Tropical & Humid',
    growthRate: 'Moderate (20–30 cm/year)',
    maxHeight: '1.8–2.4m indoors',
    leafStructure: 'Arching pinnate fronds with 40–60 narrow emerald leaflets on golden-yellow canes',
    flowerInfo: 'Panicles of yellow unisexual flowers below the crownshaft on mature outdoor specimens',
    soilMix: '45% loamy soil, 30% cocopeat, 25% composted manure + sand (pH 6.1–6.8)',
    imageUrl: '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg',
    benefits: 'Natural humidifier releasing up to 1 liter of clean water vapor every 24 hours.',
  },
  {
    id: 'hibiscus-rosa-sinensis',
    commonName: 'Shoe Flower (Desi Gudhal / Hibiscus)',
    scientificName: 'Hibiscus rosa-sinensis',
    family: 'Malvaceae',
    origin: 'Tropical Asia',
    category: 'Tropical Flowering',
    spaceSuitability: 'Outdoor',
    sunlight: 'Full Sun',
    waterNeed: 'High',
    difficulty: 'Beginner',
    climate: 'Warm Subtropical',
    growthRate: 'Fast',
    maxHeight: '1.5–2.5m shrub',
    leafStructure: 'Ovate, glossy dark green leaves with coarsely toothed margins',
    flowerInfo: 'Showy 10–15cm crimson, gold, or coral 5-petaled blooms with prominent staminal column',
    soilMix: '50% red/alluvial soil, 35% aged vermicompost, 15% neem cake + bone meal (pH 5.8–6.8)',
    imageUrl: '/src/assets/images/plant_tulsi_holy_basil_1794482114261.jpg',
    benefits: 'Year-round tropical blooms rich in anthocyanins for herbal hair and tea infusions.',
  },
  {
    id: 'murraya-koenigii',
    commonName: 'Curry Leaf Tree (Kadi Patta)',
    scientificName: 'Murraya koenigii',
    family: 'Rutaceae',
    origin: 'Indian Subcontinent',
    category: 'Kitchen & Culinary',
    spaceSuitability: 'Outdoor',
    sunlight: 'Full Sun',
    waterNeed: 'Moderate',
    difficulty: 'Beginner',
    climate: 'Adaptable All-India',
    growthRate: 'Moderate to Fast in warm months',
    maxHeight: '1.2–2.0m in balcony containers',
    leafStructure: 'Pinnately compound aromatic leaves with 11–21 glossy lance-shaped leaflets',
    flowerInfo: 'Fragrant white cymose clusters in spring followed by dark purple berries',
    soilMix: '50% well-draining garden soil, 30% compost, 20% sand; loves fermented buttermilk drench',
    imageUrl: '/src/assets/images/plant_fiddle_leaf_fig_1794482115866.jpg',
    benefits: 'Essential fresh culinary herb packed with iron, calcium, and carbazole alkaloids.',
  },
  {
    id: 'dracaena-trifasciata',
    commonName: 'Snake Plant (Mother-in-Law’s Tongue)',
    scientificName: 'Dracaena trifasciata',
    family: 'Asparagaceae',
    origin: 'West Africa',
    category: 'Air Purifying',
    spaceSuitability: 'Both',
    sunlight: 'Low to Medium',
    waterNeed: 'Low',
    difficulty: 'Beginner',
    climate: 'Adaptable All-India',
    growthRate: 'Slow to Moderate',
    maxHeight: '60–110 cm upright swords',
    leafStructure: 'Stiff, succulent vertical sword blades with banded dark green centers and gold margins',
    flowerInfo: 'Fragrant greenish-white night-blooming racemes under mild root-bound conditions',
    soilMix: '50% cactus/succulent grit, 30% coarse sand/perlite, 20% compost (pH 6.0–7.5)',
    imageUrl: '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg',
    benefits: 'Performs Crassulacean Acid Metabolism (CAM), releasing oxygen throughout the night.',
  },
];

export interface NutrientDeficiencyProfile {
  symbol: string;
  element: string;
  mobility: 'Mobile (Older Leaves First)' | 'Immobile (New Shoots First)';
  visualSymptoms: string;
  overlapWarning: string;
  organicCorrection: string;
  prevention: string;
  healthyLevelPercent: number;
}

export const NUTRIENT_PROFILES: NutrientDeficiencyProfile[] = [
  {
    symbol: 'N',
    element: 'Nitrogen',
    mobility: 'Mobile (Older Leaves First)',
    visualSymptoms: 'Uniform pale-green to lemon-yellow chlorosis starting on lower, older leaves; spindly petioles and slowed vegetative growth.',
    overlapWarning: 'Can resemble overwatering root hypoxia or insufficient light on lower canopy leaves.',
    organicCorrection: 'Top-dress with 200g rich vermicompost or apply diluted fish amino acid / compost tea (1:20).',
    prevention: 'Incorporate slow-release organic neem cake and worm castings every 6–8 weeks during active growth.',
    healthyLevelPercent: 88,
  },
  {
    symbol: 'P',
    element: 'Phosphorus',
    mobility: 'Mobile (Older Leaves First)',
    visualSymptoms: 'Dull dark-green foliage with purplish or bronze undersides along veins; delayed bud formation and weak root branching.',
    overlapWarning: 'Cold root-zone temperatures (<14°C) temporarily lock out phosphorus even when soil P is adequate.',
    organicCorrection: 'Work steamed bone meal or rock phosphate + phosphate-solubilizing microbes into top 3cm of soil.',
    prevention: 'Maintain soil pH between 6.0 and 6.8 where orthophosphate ions remain bio-available.',
    healthyLevelPercent: 84,
  },
  {
    symbol: 'K',
    element: 'Potassium',
    mobility: 'Mobile (Older Leaves First)',
    visualSymptoms: 'Marginal leaf scorch (yellowing then necrotic brown edges) on mature leaves with pinhead necrotic flecking.',
    overlapWarning: 'High salinity or fluoride/chlorine buildup from hard tap water mimics marginal potassium burn.',
    organicCorrection: 'Apply liquid kelp/seaweed extract or fermented banana peel potassium bio-enzyme.',
    prevention: 'Avoid excessive ammonium nitrogen fertilizers that antagonize potassium uptake.',
    healthyLevelPercent: 91,
  },
  {
    symbol: 'Mg',
    element: 'Magnesium',
    mobility: 'Mobile (Older Leaves First)',
    visualSymptoms: 'Distinctive Christmas-tree interveinal chlorosis on older leaves—veins stay deep emerald while lamina turns yellow.',
    overlapWarning: 'Excess potassium or low pH (<5.4) competitively inhibits root magnesium absorption.',
    organicCorrection: 'Foliar spray or root drench with 1 teaspoon Agricultural Epsom Salt (MgSO4·7H2O) per 2 liters of water.',
    prevention: 'Buffer acidic potting mixes with dolomitic lime.',
    healthyLevelPercent: 76,
  },
  {
    symbol: 'Fe',
    element: 'Iron',
    mobility: 'Immobile (New Shoots First)',
    visualSymptoms: 'Sharp interveinal yellowing on the newest emerging apical leaves while fine veins remain bright green; severe cases turn ivory white.',
    overlapWarning: 'Frequently caused by alkaline soil/water (pH > 7.4) or waterlogged roots rather than lack of iron in soil.',
    organicCorrection: 'Chelated iron (Fe-EDDHA) drench paired with liquid humic/fulvic acid to acidify the rhizosphere.',
    prevention: 'Use rainwater or pH-balanced irrigation water (pH 6.0–6.5) for acid-loving plants like Hibiscus and Gardenia.',
    healthyLevelPercent: 89,
  },
  {
    symbol: 'Ca',
    element: 'Calcium',
    mobility: 'Immobile (New Shoots First)',
    visualSymptoms: 'Hooked, crinkled, or cupped young leaf tips; blossom-end rot on fruiting tomatoes/peppers; stunted root tips.',
    overlapWarning: 'Irregular watering and high humidity (low transpiration) halt xylem calcium transport even in calcium-rich soil.',
    organicCorrection: 'Apply water-soluble eggshell calcium acetate (boiled crushed eggshells in apple cider vinegar diluted 1:500) or gypsum.',
    prevention: 'Maintain consistent soil moisture and gentle airflow to drive steady transpiration.',
    healthyLevelPercent: 92,
  },
  {
    symbol: 'S',
    element: 'Sulfur',
    mobility: 'Immobile (New Shoots First)',
    visualSymptoms: 'Uniform pale lime-green yellowing across young upper leaves including veins; thin, woody stems.',
    overlapWarning: 'Looks similar to Nitrogen deficiency, except Sulfur starts on young upper leaves rather than old lower leaves.',
    organicCorrection: 'Add aged compost, gypsum (calcium sulfate), or Epsom salt.',
    prevention: 'Replenish organic matter annually to sustain microbial sulfur mineralization.',
    healthyLevelPercent: 94,
  },
  {
    symbol: 'Zn',
    element: 'Zinc',
    mobility: 'Immobile (New Shoots First)',
    visualSymptoms: 'Rosetting (shortened internodes), abnormally small narrow leaves ("little leaf"), and banded interveinal chlorosis.',
    overlapWarning: 'Over-application of phosphorus fertilizers precipitates zinc in the root zone.',
    organicCorrection: 'Foliar application of kelp extract or chelated micronutrient seaweed blend.',
    prevention: 'Keep soil pH slightly acidic and avoid excessive phosphorus dosing.',
    healthyLevelPercent: 90,
  },
];

export interface DiagnosticSamplePreset {
  id: string;
  label: string;
  plantName: string;
  mode: 'disease' | 'identification' | 'nutrient';
  imageUrl: string;
  symptomsText: string;
}

export const DIAGNOSTIC_SAMPLES: DiagnosticSamplePreset[] = [
  {
    id: 'ficus-chlorosis',
    label: 'Ficus lyrata — Lower Leaf Yellowing & Edema',
    plantName: 'Fiddle Leaf Fig (Ficus lyrata)',
    mode: 'disease',
    imageUrl: '/src/assets/images/plant_fiddle_leaf_fig_1794482115866.jpg',
    symptomsText: 'Two lower leaves showing interveinal yellowing with tiny reddish-brown pinpoint speckles near margins after irregular watering.',
  },
  {
    id: 'monstera-id',
    label: 'Monstera deliciosa — Species & Fenestration Scan',
    plantName: 'Swiss Cheese Plant (Monstera deliciosa)',
    mode: 'identification',
    imageUrl: '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg',
    symptomsText: 'Large cordate glossy emerald leaves with natural fenestrations, thick petioles, and aerial roots.',
  },
  {
    id: 'tulsi-nutrient',
    label: 'Krishna Tulsi — Purple Stem & Leaf Vigour Check',
    plantName: 'Holy Basil (Ocimum tenuiflorum)',
    mode: 'nutrient',
    imageUrl: '/src/assets/images/plant_tulsi_holy_basil_1794482114261.jpg',
    symptomsText: 'Aromatic serrated green leaves with purple inflorescences in terracotta pot; checking N-P-K and micronutrient balance.',
  },
];

export interface AcademyModule {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Masterclass';
  duration: string;
  summary: string;
  greenySimpleExplanation: string;
  keySteps: string[];
  quizQuestion: string;
  quizOptions: string[];
  correctIndex: number;
}

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: 'soil-aeration-science',
    title: '01. The Root Respiration Secret: Why Overwatering Suffocates Plants',
    level: 'Beginner',
    duration: '6 min interactive lesson',
    summary: 'Plant roots require gaseous oxygen (O2) in macropores to generate ATP for nutrient uptake. Overwatering isn’t "too much water in one go"—it is watering too frequently so air pockets never refill.',
    greenySimpleExplanation: 'Think of soil like a sponge with tiny air tunnels! Roots breathe through those tunnels. If the sponge stays soggy 24/7, roots run out of breath and beneficial microbes turn anaerobic.',
    keySteps: [
      'Always test the top 4–5cm of soil with your finger or a wooden skewer before watering.',
      'Mix 20–30% perlite, pumice, or pine bark into indoor potting soil to create permanent oxygen channels.',
      'Water thoroughly until 15% drains from the bottom holes, then empty the saucer after 10 minutes.',
    ],
    quizQuestion: 'What is the primary physiological reason roots rot in waterlogged soil?',
    quizOptions: [
      'Roots absorb too much water and burst immediately',
      'Depletion of root-zone oxygen (hypoxia) enables anaerobic pathogens like Pythium',
      'Water washes away all chlorophyll from the leaves',
    ],
    correctIndex: 1,
  },
  {
    id: 'light-par-lux',
    title: '02. Decoding Sunlight: Direct, Bright Indirect & DLI for Home Botanists',
    level: 'Intermediate',
    duration: '8 min interactive lesson',
    summary: 'Human eyes adapt to dim indoor rooms, making a corner look "bright" when it actually receives less than 5% of outdoor Photosynthetically Active Radiation (PAR).',
    greenySimpleExplanation: 'Sunlight is plant food! What looks bright to our eyes inside a living room can feel like twilight to a sun-loving Hibiscus or Tulsi.',
    keySteps: [
      'East-facing windows deliver gentle morning direct sun (ideal for Tulsi, Ferns, Calatheas, and Anthuriums).',
      'South/West windows through sheer curtains provide high-energy Bright Indirect light for Monstera and Fiddle Leaf Figs.',
      'Rotate indoor pots 90° every two weeks for symmetrical phototropic canopy growth.',
    ],
    quizQuestion: 'Why does a plant placed 3 meters away from a window grow leggy with long internodes (etiolation)?',
    quizOptions: [
      'Light intensity drops following the inverse-square law, triggering auxin-driven stem stretching',
      'The room has too much carbon dioxide',
      'The pot is too small for the roots',
    ],
    correctIndex: 0,
  },
  {
    id: 'ipm-organic-defense',
    title: '03. Bio-Rational Integrated Pest Management (IPM) Without Toxic Chemicals',
    level: 'Masterclass',
    duration: '10 min interactive lesson',
    summary: 'Protect beneficial pollinators and indoor air quality using botanical azadirachtin, potassium salts of fatty acids, and predatory biocontrols.',
    greenySimpleExplanation: 'Instead of harsh chemicals that harm bees and pets, we use cold-pressed Neem oil, soap-nut wash, and good ladybugs to stop pests from multiplying!',
    keySteps: [
      'Isolate any newly acquired nursery plant for 14 days before introducing it to your main collection.',
      'Wipe leaf undersides biweekly with a microfiber cloth dampened in 3ml cold-pressed Neem oil + 1ml castile soap per liter.',
      'Use yellow sticky cards at canopy height to monitor early fungus gnat or whitefly activity.',
    ],
    quizQuestion: 'When is the safest time of day to spray emulsified botanical Neem oil on outdoor plants?',
    quizOptions: [
      'At 12:00 PM under intense midday sun',
      'At dusk/evening when foraging bees are inactive and UV leaf-burn risk is zero',
      'During heavy monsoon downpours',
    ],
    correctIndex: 1,
  },
];

export interface MarketplaceItem {
  id: string;
  name: string;
  category: 'Plants' | 'Seeds' | 'Pots' | 'Organic Compost' | 'Fertilizers' | 'Gardening Tools';
  priceInr: number;
  seller: string;
  rating: string;
  stockStatus: string;
  specification: string;
  imageUrl: string;
}

export const MARKETPLACE_CATALOG: MarketplaceItem[] = [
  {
    id: 'mkt-monstera',
    name: 'Monstera deliciosa — Established Fenestrated Specimen (45cm)',
    category: 'Plants',
    priceInr: 890,
    seller: 'Sahyadri Botanical Conservatory (Verified Nursery)',
    rating: '4.9 (142 reviews)',
    stockStatus: 'In Stock • Acclimatized in Aroid Bark Mix',
    specification: 'Rooted in 20cm breathable nursery pot with 5+ fenestrated leaves',
    imageUrl: '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg',
  },
  {
    id: 'mkt-tulsi-kit',
    name: 'Sacred Krishna & Rama Tulsi Heirloom Seed + Terracotta Kit',
    category: 'Seeds',
    priceInr: 340,
    seller: 'Deccan Heirloom Seed Collective',
    rating: '4.8 (218 reviews)',
    stockStatus: 'In Stock • 94% Lab Germination Tested',
    specification: 'Non-GMO open-pollinated seeds (250+ seeds) + cocopeat starter discs',
    imageUrl: '/src/assets/images/plant_tulsi_holy_basil_1794482114261.jpg',
  },
  {
    id: 'mkt-ceramic-pot',
    name: 'Breathable Matte Forest & Brushed Brass Self-Aerating Planter (28cm)',
    category: 'Pots',
    priceInr: 1450,
    seller: 'Auroville Ceramic Artisans',
    rating: '4.9 (89 reviews)',
    stockStatus: 'In Stock • Hand-thrown Stoneware',
    specification: 'Dual drainage ports + matching brass drip reservoir tray',
    imageUrl: '/src/assets/images/hero_botanical_sanctuary_1794482113239.jpg',
  },
  {
    id: 'mkt-vermicompost',
    name: 'Artisanal Eisenia Fetida Black Gold Vermicompost + Neem Cake (5 kg)',
    category: 'Organic Compost',
    priceInr: 420,
    seller: 'Nilgiri Bio-Organics',
    rating: '4.9 (310 reviews)',
    stockStatus: 'In Stock • Lab Certified C:N Ratio 14:1',
    specification: 'Enriched with Trichoderma viride, Pseudomonas & mycorrhizal fungi',
    imageUrl: '/src/assets/images/plant_fiddle_leaf_fig_1794482115866.jpg',
  },
  {
    id: 'mkt-seaweed',
    name: 'Cold-Pressed Kappaphycus Seaweed & Humic Bio-Stimulant (500 ml)',
    category: 'Fertilizers',
    priceInr: 560,
    seller: 'Coastal Marine Bio-Labs',
    rating: '4.8 (176 reviews)',
    stockStatus: 'In Stock • 100% Organic Cytokinins & Auxins',
    specification: 'Dilute 2ml/L for lush leaf fenestrations and root stress recovery',
    imageUrl: '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg',
  },
  {
    id: 'mkt-pruner',
    name: 'High-Carbon SK5 Japanese Steel Botanical Bypass Secateurs',
    category: 'Gardening Tools',
    priceInr: 780,
    seller: 'Precision HortiCraft India',
    rating: '4.9 (124 reviews)',
    stockStatus: 'In Stock • Ergonomic Sap-Groove Blade',
    specification: 'Clean vascular cuts up to 18mm stem diameter without crushing phloem',
    imageUrl: '/src/assets/images/plant_tulsi_holy_basil_1794482114261.jpg',
  },
];
