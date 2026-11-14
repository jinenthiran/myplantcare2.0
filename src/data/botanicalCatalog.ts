import { ALL_EXPANDED_PLANTS, LibraryPlant } from './plants';
import { BOTANICAL_IMAGES } from '../utils/botanicalImageResolver';

export { ALL_EXPANDED_PLANTS };
export type { LibraryPlant };

export const PLANT_LIBRARY: LibraryPlant[] = ALL_EXPANDED_PLANTS;


export const REPAIRED_IMAGE_REFERENCES = [
  { species: 'Coriander (Coriandrum sativum) & Spider Plant', previous: 'images.unsplash.com/photo-1588879460618 (Dell Laptop)', repaired: '/images/plants/coriandrum-sativum.webp' },
  { species: '8 Plant Taxa (Jasmine, Crossandra, Sapota, etc.)', previous: 'images.unsplash.com/photo-1509198397868 (Game Controller)', repaired: '/images/plants/jasminum-sambac.webp' },
  { species: 'Jackfruit Tree (Artocarpus heterophyllus)', previous: 'images.unsplash.com/photo-1589308078059 (Plated Food)', repaired: '/images/plants/artocarpus-heterophyllus.webp' },
  { species: 'Black Gram & Cluster Beans', previous: 'images.unsplash.com/photo-1567306226416 (Red Apples)', repaired: '/images/plants/vigna-mungo.webp' },
  { species: '11+ Broken 404 Stock URLs (Key Lime, Chili, Cassava, etc.)', previous: '4x HTTP 404 Unsplash URLs', repaired: '/images/plants/citrus-aurantiifolia.webp' },
  { species: 'Golden Pothos Cascade (User DB Plant #4)', previous: 'hero_botanical_sanctuary_1794482113239.jpg', repaired: '/images/plant_golden_pothos_1794534018954.webp' },
  { species: 'Marketplace Compost, Seaweed & Secateurs', previous: 'Misapplied Fiddle Leaf Fig / Monstera / Tulsi photos', repaired: '/images/marketplace/vermicompost.webp' },
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
    imageUrl: BOTANICAL_IMAGES.fiddleLeafFig,
    symptomsText: 'Two lower leaves showing interveinal yellowing with tiny reddish-brown pinpoint speckles near margins after irregular watering.',
  },
  {
    id: 'monstera-id',
    label: 'Monstera deliciosa — Species & Fenestration Scan',
    plantName: 'Swiss Cheese Plant (Monstera deliciosa)',
    mode: 'identification',
    imageUrl: BOTANICAL_IMAGES.monsteraDeliciosa,
    symptomsText: 'Large cordate glossy emerald leaves with natural fenestrations, thick petioles, and aerial roots.',
  },
  {
    id: 'tulsi-nutrient',
    label: 'Krishna Tulsi — Purple Stem & Leaf Vigour Check',
    plantName: 'Holy Basil (Ocimum tenuiflorum)',
    mode: 'nutrient',
    imageUrl: BOTANICAL_IMAGES.tulsiHolyBasil,
    symptomsText: 'Aromatic serrated green leaves with purple inflorescences in terracotta pot; checking N-P-K and micronutrient balance.',
  },
];

export interface AcademyModule {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Masterclass';
  duration: string;
  visualType: 'Real Photograph' | 'Botanical Illustration / Diagram';
  imageUrl?: string;
  diagramId?: 'root-respiration-aeration' | 'leaf-anatomy-stomata' | 'disease-vs-chlorosis';
  caption: string;
  sourceCredit: string;
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
    visualType: 'Botanical Illustration / Diagram',
    diagramId: 'root-respiration-aeration',
    caption: 'Rhizosphere diagram comparing oxygenated macropores (25% air pockets) against waterlogged anaerobic hypoxia.',
    sourceCredit: 'MyPlantCare Botanical Academy Scientific Vector Diagram',
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
    visualType: 'Real Photograph',
    imageUrl: BOTANICAL_IMAGES.monsteraDeliciosa,
    caption: 'Monstera deliciosa specimen thriving under filtered Bright Indirect light to develop mature leaf fenestrations.',
    sourceCredit: 'MyPlantCare Botanical Archive (Verified Species Photo)',
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
    visualType: 'Real Photograph',
    imageUrl: '/images/plants/azadirachta-indica.webp',
    caption: 'Azadirachta indica (Neem) foliage — natural source of azadirachtin for pollinator-safe evening IPM sprays.',
    sourceCredit: 'iNaturalist Research Grade (Mark McVeigh, CC0 1.0)',
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
  {
    id: 'leaf-morphology-stomata',
    title: '04. Leaf Anatomy & Stomatal Guard Cells: How Plants Breathe & Transpire',
    level: 'Beginner',
    duration: '7 min interactive lesson',
    visualType: 'Botanical Illustration / Diagram',
    diagramId: 'leaf-anatomy-stomata',
    caption: 'Annotated botanical diagram showing lamina, midrib, petiole, and lower-epidermis stomatal guard cells.',
    sourceCredit: 'MyPlantCare Botanical Academy Morphology Diagram',
    summary: 'Understanding leaf venation and stomatal density explains why dust blocks photosynthesis, why misting only briefly raises boundary humidity, and why foliar feeds enter best through undersides.',
    greenySimpleExplanation: 'Think of stomata as tiny adjustable mouths underneath each leaf! Keeping leaves clean helps them inhale carbon dioxide effortlessly.',
    keySteps: [
      'Wipe broad tropical leaves (Ficus, Monstera, Rubber Plant) gently with a damp soft cloth every 10–14 days.',
      'Apply organic foliar sprays lightly to leaf undersides during early morning when stomata are open.',
      'Provide gentle air circulation so humid boundary layers refresh around stomatal pores.',
    ],
    quizQuestion: 'Where are microscopic stomatal pores most densely concentrated on most broadleaf plants?',
    quizOptions: [
      'Inside woody bark fissures',
      'On the abaxial (underside) leaf epidermis',
      'Strictly along the root tips',
    ],
    correctIndex: 1,
  },
  {
    id: 'chlorosis-vs-pathogens',
    title: '05. Diagnostic Field Guide: Distinguishing Nutrient Chlorosis from Fungal Leaf Spot',
    level: 'Intermediate',
    duration: '9 min interactive lesson',
    visualType: 'Botanical Illustration / Diagram',
    diagramId: 'disease-vs-chlorosis',
    caption: 'Comparative diagnostic diagram: concentric necrotic fungal spots with yellow halos vs symmetric interveinal chlorosis.',
    sourceCredit: 'MyPlantCare Plant Pathology Reference Diagram',
    summary: 'Misreading magnesium or iron chlorosis as a fungal blight leads to unnecessary spraying, while mistaking fungal leaf spots for nutrient hunger delays isolation.',
    greenySimpleExplanation: 'Nutrient hunger draws neat symmetric yellow patterns between leaf veins, whereas infections leave irregular dark bullseye spots that spread from splashy water!',
    keySteps: [
      'Check symmetry first: older-leaf symmetric interveinal yellowing points to mobile Magnesium (Mg) deficit; young shoots point to Iron (Fe).',
      'Inspect dark lesions for yellow halos, sunken necrotic rings, or fungal spores—those indicate infectious pathology.',
      'Prune actively sporulating leaves using alcohol-sanitized secateurs before treating.',
    ],
    quizQuestion: 'Symmetric yellow tissue between bright green veins on older lower leaves most strongly indicates:',
    quizOptions: [
      'Magnesium deficiency rather than contagious leaf-spot fungus',
      'Acute mechanical wind tearing',
      'Excessive potassium toxicity',
    ],
    correctIndex: 0,
  },
  {
    id: 'tamil-pollinator-guilds',
    title: '06. Tamil Heritage Pollinator & Companion Guilds (Tulsi, Hibiscus & Curry Leaf)',
    level: 'Masterclass',
    duration: '8 min interactive lesson',
    visualType: 'Real Photograph',
    imageUrl: BOTANICAL_IMAGES.hibiscusRed,
    caption: 'Hibiscus rosa-sinensis (Semparuthi / செம்பருத்தி) blossom serving as a high-nectar pollinator beacon in tropical courtyard gardens.',
    sourceCredit: 'MyPlantCare Botanical Archive (Verified Species Photo)',
    summary: 'Poly-cropping sacred herbs like Krishna Tulsi alongside flowering Hibiscus and Citrus recruits solitary bees, hoverflies, and lacewings that naturally suppress aphids and whiteflies.',
    greenySimpleExplanation: 'Pairing blooming Semparuthi with aromatic Thulasi invites friendly bees and hoverflies that protect your whole balcony garden for free!',
    keySteps: [
      'Group flowering nectar plants (Hibiscus, Marigold, Jasmine) beside fruiting kitchen crops for higher pollination rates.',
      'Let 15–20% of Tulsi flower spikes (Manjari) bloom specifically for native stingless bees.',
      'Avoid broad-spectrum neem drenches on open petals during morning pollinator peak hours.',
    ],
    quizQuestion: 'Why does planting Tagetes (Marigold) and Ocimum (Tulsi) near vegetable beds reduce pest outbreaks?',
    quizOptions: [
      'Aromatic volatiles confuse herbivore host-finding while attracting predatory hoverflies and parasitic wasps',
      'Their roots freeze the surrounding topsoil',
      'They absorb all nitrogen so aphids starve immediately',
    ],
    correctIndex: 0,
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
    imageUrl: BOTANICAL_IMAGES.monsteraDeliciosa,
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
    imageUrl: BOTANICAL_IMAGES.tulsiHolyBasil,
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
    imageUrl: BOTANICAL_IMAGES.heroSanctuary,
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
    imageUrl: '/images/marketplace/vermicompost.webp',
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
    imageUrl: '/images/marketplace/seaweed.webp',
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
    imageUrl: '/images/marketplace/secateurs.webp',
  },
];
