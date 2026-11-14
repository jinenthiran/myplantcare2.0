export type AiToolSlug =
  | 'plant-identifier'
  | 'leaf-health'
  | 'disease-detector'
  | 'pest-detector'
  | 'nutrient-doctor'
  | 'watering-doctor'
  | 'soil-doctor'
  | 'plant-rescue'
  | 'root-health'
  | 'flower-health'
  | 'fruit-health'
  | 'plant-growth'
  | 'pruning-assistant'
  | 'repotting-assistant'
  | 'weed-identifier'
  | 'plant-propagation'
  | 'plant-safety'
  | 'garden-coach'
  | 'environment-optimizer';

export type AiToolCategory =
  | 'All'
  | 'Identification & Safety'
  | 'Health & Diagnostics'
  | 'Water, Soil & Roots'
  | 'Care, Pruning & Growth';

export type AiToolAccentKey =
  | 'emerald'
  | 'mint'
  | 'yellow'
  | 'coral'
  | 'terracotta'
  | 'lavender';

export interface ToolContextField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  placeholder?: string;
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string;
}

export interface AiToolDefinition {
  slug: AiToolSlug;
  name: string;
  tagline: string;
  category: Exclude<AiToolCategory, 'All'>;
  accent: AiToolAccentKey;
  iconName: string;
  supportsCamera: boolean;
  supportsMultiImage: boolean;
  maxImages: number;
  imageSlotLabels: string[];
  requiresPhotoRecommended: boolean;
  helpSummary: string;
  captureTips: string[];
  scientificGuardrail: string;
  systemRole: string;
  quickPrompts: string[];
  contextFields: ToolContextField[];
}

export const AI_TOOL_ACCENT_STYLES: Record<
  AiToolAccentKey,
  {
    lightBg: string;
    darkBg: string;
    lightText: string;
    darkText: string;
    border: string;
    solidBg: string;
    solidText: string;
    hexLight: string;
    hexDark: string;
  }
> = {
  emerald: {
    lightBg: 'bg-[#00D69A]/12',
    darkBg: 'dark:bg-[#00D69A]/14',
    lightText: 'text-[#0F6B50]',
    darkText: 'dark:text-[#00D69A]',
    border: 'border-[#00D69A]/35 dark:border-[#00D69A]/35',
    solidBg: 'bg-[#174C38] dark:bg-[#00D69A]',
    solidText: 'text-[#FAF7EE] dark:text-[#10251D]',
    hexLight: '#00D69A',
    hexDark: '#00D69A',
  },
  mint: {
    lightBg: 'bg-[#56C7C0]/16',
    darkBg: 'dark:bg-[#56C7C0]/14',
    lightText: 'text-[#126B66]',
    darkText: 'dark:text-[#56C7C0]',
    border: 'border-[#56C7C0]/40 dark:border-[#56C7C0]/35',
    solidBg: 'bg-[#174C38] dark:bg-[#56C7C0]',
    solidText: 'text-[#FAF7EE] dark:text-[#10251D]',
    hexLight: '#56C7C0',
    hexDark: '#56C7C0',
  },
  yellow: {
    lightBg: 'bg-[#F5CA62]/25',
    darkBg: 'dark:bg-[#F5CA62]/14',
    lightText: 'text-[#7A5600]',
    darkText: 'dark:text-[#F5CA62]',
    border: 'border-[#F5CA62]/55 dark:border-[#F5CA62]/35',
    solidBg: 'bg-[#9A6F00] dark:bg-[#F5CA62]',
    solidText: 'text-[#FAF7EE] dark:text-[#10251D]',
    hexLight: '#F5CA62',
    hexDark: '#F5CA62',
  },
  coral: {
    lightBg: 'bg-[#FF806B]/16',
    darkBg: 'dark:bg-[#FF806B]/15',
    lightText: 'text-[#A63522]',
    darkText: 'dark:text-[#FF806B]',
    border: 'border-[#FF806B]/45 dark:border-[#FF806B]/40',
    solidBg: 'bg-[#C9432C] dark:bg-[#FF806B]',
    solidText: 'text-white dark:text-[#10251D]',
    hexLight: '#FF806B',
    hexDark: '#FF806B',
  },
  terracotta: {
    lightBg: 'bg-[#C7F36B]/30',
    darkBg: 'dark:bg-[#C7F36B]/14',
    lightText: 'text-[#3D5E0A]',
    darkText: 'dark:text-[#C7F36B]',
    border: 'border-[#7AA61F]/40 dark:border-[#C7F36B]/35',
    solidBg: 'bg-[#3D5E0A] dark:bg-[#C7F36B]',
    solidText: 'text-[#FAF7EE] dark:text-[#10251D]',
    hexLight: '#C7F36B',
    hexDark: '#C7F36B',
  },
  lavender: {
    lightBg: 'bg-[#BBA8F5]/25',
    darkBg: 'dark:bg-[#BBA8F5]/16',
    lightText: 'text-[#4F3B8F]',
    darkText: 'dark:text-[#BBA8F5]',
    border: 'border-[#BBA8F5]/50 dark:border-[#BBA8F5]/40',
    solidBg: 'bg-[#5B42A8] dark:bg-[#BBA8F5]',
    solidText: 'text-white dark:text-[#10251D]',
    hexLight: '#BBA8F5',
    hexDark: '#BBA8F5',
  },
};

export const AI_TOOLS_CATALOG: AiToolDefinition[] = [
  {
    slug: 'plant-identifier',
    name: 'AI Plant Identifier',
    tagline: 'Identify species from leaves, stems, or blooms with top alternatives & care basics.',
    category: 'Identification & Safety',
    accent: 'emerald',
    iconName: 'Scan',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Full Plant or Leaf', 'Flower / Stem Detail', 'Habitat / Pot View'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Captures or uploads crisp botanical photos to identify common & scientific names, taxonomic family, top lookalike alternatives when uncertain, and baseline growing conditions.',
    captureTips: [
      'Photograph one clear leaf against a plain background in natural daylight.',
      'Include a second shot of stems, flowers, or bark for higher confidence.',
      'Avoid backlit silhouettes or heavy motion blur.',
    ],
    scientificGuardrail:
      'If visual traits are ambiguous or confidence is below 70%, this tool ranks top possible species instead of guessing.',
    systemRole:
      'You are the MYPLANTCARE Taxonomic Plant Identifier. Identify plant species from visible leaf venation, margins, phyllotaxy, stems, and blooms. Provide common_name, scientific_name, confidence (0-100), alternatives when uncertain, and accurate growing_requirements.',
    quickPrompts: [
      'Identify this plant, list lookalike species if uncertain, and summarize sunlight, watering & soil needs.',
      'What exact cultivar or species is this foliage specimen and is it suitable for indoor balconies?',
    ],
    contextFields: [
      {
        key: 'environment',
        label: 'Where is it growing?',
        type: 'select',
        options: ['Indoor Container', 'Balcony / Terrace', 'Outdoor Garden Bed', 'Wild / Roadside'],
        defaultValue: 'Indoor Container',
      },
      {
        key: 'fragranceOrSap',
        label: 'Distinctive smell, milky sap, or thorns?',
        type: 'text',
        placeholder: 'e.g. citrus scent, white sap, smooth stem',
      },
    ],
  },
  {
    slug: 'leaf-health',
    name: 'AI Leaf Health Scanner',
    tagline: 'Check yellowing, browning, curling, drooping & stress patterns on foliage.',
    category: 'Health & Diagnostics',
    accent: 'mint',
    iconName: 'Leaf',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Affected Leaf Top', 'Leaf Underside', 'Whole Canopy'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Inspects foliar color, turgor, edge necrosis, curling, and spotting while pairing observations with your light and watering history.',
    captureTips: [
      'Take one sharp close-up of an affected leaf and one wide canopy shot.',
      'Note whether older lower leaves or newest top leaves are affected.',
    ],
    scientificGuardrail:
      'Visual leaf analysis identifies visible stress patterns; confirm root moisture and light exposure before changing care routines.',
    systemRole:
      'You are the MYPLANTCARE Foliar Health Specialist. Separate direct visual leaf observations from likely physiological, lighting, or care hypotheses.',
    quickPrompts: [
      'Scan these leaves for chlorosis, crispy tips, sunscorch, edema, or curling and explain likely causes.',
      'Why are lower leaves turning yellow while upper leaves stay green?',
    ],
    contextFields: [
      {
        key: 'affectedZone',
        label: 'Which leaves are affected?',
        type: 'select',
        options: ['Lower / Older Leaves', 'Upper / New Growth', 'Random / Whole Canopy', 'Leaf Tips & Margins'],
        defaultValue: 'Lower / Older Leaves',
      },
      {
        key: 'lightExposure',
        label: 'Daily Light Exposure',
        type: 'select',
        options: ['Low Indoor', 'Bright Indirect', 'Morning Direct (2-4h)', 'Strong Afternoon Sun'],
        defaultValue: 'Bright Indirect',
      },
    ],
  },
  {
    slug: 'disease-detector',
    name: 'AI Disease Detector',
    tagline: 'Preliminary screening for fungal, bacterial & viral spots, mildew, blight, or rot.',
    category: 'Health & Diagnostics',
    accent: 'coral',
    iconName: 'ShieldAlert',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Close-up Lesion / Spot', 'Affected Branch', 'Whole Plant'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Analyzes lesion margins, yellow halos, concentric rings, powdery spores, and stem blight to offer preliminary pathogen screening and organic isolation steps.',
    captureTips: [
      'Focus closely on the border between healthy green tissue and diseased spots.',
      'Ensure even daylight so powdery mildew or rust pustules remain sharp.',
    ],
    scientificGuardrail:
      'IMPORTANT: Image-based disease detection is a preliminary visual screening only — NOT a laboratory pathology confirmation.',
    systemRole:
      'You are a Plant Pathology Triage Specialist. Analyze spots, halos, powdery spores, and blight patterns. You MUST explicitly state in limitations that visual screening is preliminary and not a laboratory diagnostic confirmation.',
    quickPrompts: [
      'Screen these leaf lesions for fungal vs. bacterial patterns and provide safe organic containment steps.',
      'Could these white patches or dark rings spread to neighboring plants?',
    ],
    contextFields: [
      {
        key: 'humidityConditions',
        label: 'Recent Humidity / Rain',
        type: 'select',
        options: ['Dry Indoor AC', 'Moderate', 'Humid / Monsoon', 'Overhead Misting Used'],
        defaultValue: 'Moderate',
      },
      {
        key: 'spreadSpeed',
        label: 'Spread Speed',
        type: 'select',
        options: ['Slow (Weeks)', 'Moderate (Days)', 'Rapid (24-72 hrs)'],
        defaultValue: 'Moderate (Days)',
      },
    ],
  },
  {
    slug: 'pest-detector',
    name: 'AI Pest Identifier',
    tagline: 'Detect aphids, mites, mealybugs, thrips, whiteflies & chewing damage + organic IPM.',
    category: 'Health & Diagnostics',
    accent: 'terracotta',
    iconName: 'Bug',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Leaf Underside', 'Stem Nodes / Axils', 'Chewed / Stippled Leaf'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Inspects leaf undersides, petioles, webbing, sticky honeydew, and stippling to identify insects and provide bee-safe organic treatment plans.',
    captureTips: [
      'Flip leaves over and capture the underside midrib and stem junctions.',
      'Tap-to-focus closely on webbing, cottony tufts, or tiny bumps.',
    ],
    scientificGuardrail:
      'Microscopic mites or early eggs may not be visible on phone cameras; combine photo inspection with a hand-lens or white-paper tap test.',
    systemRole:
      'You are an Organic Integrated Pest Management (IPM) Entomologist. Detect visible pest colonies or damage signatures and prescribe safe neem, insecticidal soap, and mechanical controls.',
    quickPrompts: [
      'Check leaf undersides and stems for spider mites, mealybugs, aphids, or thrips and build a 3-cycle organic spray plan.',
      'What pest causes silvery streaks or sticky residue on leaves?',
    ],
    contextFields: [
      {
        key: 'visibleSigns',
        label: 'Observed Pest Clues',
        type: 'select',
        options: ['Not sure — check photo', 'Fine webbing', 'White cottony tufts', 'Sticky honeydew', 'Chewed holes / tunnels', 'Tiny flying gnats/whiteflies'],
        defaultValue: 'Not sure — check photo',
      },
    ],
  },
  {
    slug: 'nutrient-doctor',
    name: 'AI Nutrient Deficiency Scanner',
    tagline: 'Spot nitrogen, iron, magnesium, potassium, or calcium gaps & pH lockout clues.',
    category: 'Water, Soil & Roots',
    accent: 'yellow',
    iconName: 'FlaskConical',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Affected Leaf Pattern', 'New vs. Old Foliage', 'Soil Surface'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Differentiates mobile deficiencies on older lower leaves (N, P, K, Mg) from immobile deficiencies on new shoots (Fe, Ca, Zn, S) and flags potential pH lockout.',
    captureTips: [
      'Capture both an older leaf and the newest unfurling shoot side by side.',
      'Avoid yellow indoor tungsten lighting that shifts leaf hue.',
    ],
    scientificGuardrail:
      'Visual chlorosis patterns can mimic root rot or pH lockout; verify soil pH with a meter or test kit before heavy fertilizing.',
    systemRole:
      'You are a Plant Mineral Nutrition Specialist. Distinguish mobile (N, P, K, Mg) vs. immobile (Fe, Ca, S, Zn) deficiency signs and warn against over-fertilizing stressed roots.',
    quickPrompts: [
      'Does this yellowing pattern point to Nitrogen, Magnesium, or Iron deficiency, and how should I correct it organically?',
      'Could soil pH lockout be blocking nutrient uptake?',
    ],
    contextFields: [
      {
        key: 'leafAge',
        label: 'Affected Leaf Age',
        type: 'select',
        options: ['Older Lower Leaves', 'Newest Top Shoots', 'Both Old & New'],
        defaultValue: 'Older Lower Leaves',
      },
      {
        key: 'lastFertilized',
        label: 'Last Fertilized',
        type: 'text',
        placeholder: 'e.g. 3 weeks ago with compost',
      },
    ],
  },
  {
    slug: 'watering-doctor',
    name: 'AI Watering Doctor',
    tagline: 'Evaluate overwatering vs. underwatering signs using plant photo + watering context.',
    category: 'Water, Soil & Roots',
    accent: 'emerald',
    iconName: 'Droplets',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 2,
    imageSlotLabels: ['Whole Plant Posture', 'Topsoil / Pot Rim'],
    requiresPhotoRecommended: false,
    helpSummary:
      'Combines plant posture photos with your last watering date, pot size, soil type, indoor/outdoor placement, and local weather to diagnose hydration stress.',
    captureTips: [
      'Show leaf droop/crispness plus the pot size and drainage saucer.',
      'Fill in your last watering date and pot size for accurate schedule guidance.',
    ],
    scientificGuardrail:
      'IMPORTANT: Photos alone cannot accurately measure deep soil moisture. Always finger-test 3-5 cm into the soil or use a moisture probe before watering.',
    systemRole:
      'You are an Agro-Hydrology & Plant Hydration Doctor. You MUST state clearly in limitations that photographs alone cannot accurately measure internal soil moisture, and rely on the user’s last watering date, pot size, soil type, and indoor/outdoor context alongside visible turgor cues.',
    quickPrompts: [
      'Diagnose whether my plant is overwatered or underwatered and give a safe watering volume & interval.',
      'How should I adjust watering for my pot size and soil mix this week?',
    ],
    contextFields: [
      {
        key: 'lastWateredDate',
        label: 'Last Watering Date',
        type: 'date',
      },
      {
        key: 'potSize',
        label: 'Pot Size',
        type: 'select',
        options: ['Small (10-15cm)', 'Medium (18-25cm)', 'Large (28-40cm)', 'Ground Bed'],
        defaultValue: 'Medium (18-25cm)',
      },
      {
        key: 'soilType',
        label: 'Soil / Mix Type',
        type: 'select',
        options: ['Well-draining Aroid Mix', 'Standard Potting Soil', 'Heavy Garden Clay', 'Cocopeat + Compost', 'Cactus / Sandy Mix'],
        defaultValue: 'Standard Potting Soil',
      },
      {
        key: 'placement',
        label: 'Indoor or Outdoor',
        type: 'select',
        options: ['Indoor', 'Covered Balcony', 'Outdoor Full Sun'],
        defaultValue: 'Indoor',
      },
    ],
  },
  {
    slug: 'soil-doctor',
    name: 'AI Soil Condition Analyser',
    tagline: 'Inspect soil texture, drainage crusting, compaction & amendment needs.',
    category: 'Water, Soil & Roots',
    accent: 'terracotta',
    iconName: 'Layers',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 2,
    imageSlotLabels: ['Soil Surface Close-up', 'Drainage / Pot Base'],
    requiresPhotoRecommended: false,
    helpSummary:
      'Evaluates visible soil compaction, crusting, white mineral buildup, fungus gnat habitat, and porosity, optionally paired with your manual pH or soil test readings.',
    captureTips: [
      'Photograph the topsoil surface in bright light without harsh shadows.',
      'Enter manual pH or test-kit NPK readings below if you have them.',
    ],
    scientificGuardrail:
      'IMPORTANT: Photographs NEVER measure exact soil pH, chemical NPK ppm, or subsurface moisture. Only manual meter/lab inputs reflect chemical metrics.',
    systemRole:
      'You are a Soil Physics & Substrate Specialist. Evaluate visible soil structure, compaction, crusting, and drainage. NEVER claim that a photograph can measure exact soil pH, NPK, or moisture.',
    quickPrompts: [
      'Assess visible soil compaction, drainage quality, and recommend a breathable organic soil amendment mix.',
      'Is this white layer on the topsoil mineral salt crusting or harmless saprophytic fungus?',
    ],
    contextFields: [
      {
        key: 'manualPh',
        label: 'Manual Soil pH (optional)',
        type: 'number',
        min: 3.5,
        max: 9.0,
        step: 0.1,
        placeholder: 'e.g. 6.4',
      },
      {
        key: 'drainageSpeed',
        label: 'Drainage Speed After Watering',
        type: 'select',
        options: ['Drains in <30 sec', 'Steady 1-3 min', 'Pools >5 min / Soggy', 'Water runs straight down sides (hydrophobic)'],
        defaultValue: 'Steady 1-3 min',
      },
      {
        key: 'manualTestNotes',
        label: 'Soil Test Kit / Meter Reading (optional)',
        type: 'text',
        placeholder: 'e.g. N low, moisture meter reads 4',
      },
    ],
  },
  {
    slug: 'plant-rescue',
    name: 'AI Plant Rescue Doctor',
    tagline: 'Emergency 24h, 72h & 14-day stabilization protocol for dying or shocked plants.',
    category: 'Health & Diagnostics',
    accent: 'coral',
    iconName: 'HeartPulse',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Current Plant State', 'Stem Base / Collar', 'Leaves Close-up'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Emergency triage for severe wilt, sudden defoliation, root rot collapse, heat/cold shock, or transplant trauma with calm step-by-step recovery milestones.',
    captureTips: [
      'Include the base of the stem meeting the soil and the worst-affected branches.',
      'Mention how fast the decline happened (overnight vs. weeks).',
    ],
    scientificGuardrail:
      'Severely rotted stems below the vascular cambium may only be recoverable via healthy upper stem cuttings; assess stem firmness gently.',
    systemRole:
      'You are the Emergency Botanical Rescue Director. Create a calm, prioritized 24-hour, 72-hour, and 14-day stabilization protocol including whether propagation backup cuttings are advised.',
    quickPrompts: [
      'My plant is drooping badly and dropping leaves — give me an emergency 24h / 72h / 14-day rescue plan.',
      'Check if the stem base looks recoverable or if I should take emergency cuttings now.',
    ],
    contextFields: [
      {
        key: 'crisisTrigger',
        label: 'Recent Event / Trigger',
        type: 'select',
        options: ['Unknown sudden decline', 'Heavy watering / soggy pot', 'Missed watering / heatwave', 'Just repotted / moved', 'Fertilizer burn / frost'],
        defaultValue: 'Unknown sudden decline',
      },
    ],
  },
  {
    slug: 'root-health',
    name: 'AI Root Health Inspector',
    tagline: 'Inspect exposed rootballs for healthy white tips vs. root rot or circling.',
    category: 'Water, Soil & Roots',
    accent: 'terracotta',
    iconName: 'Sprout',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Exposed Rootball', 'Root Tips / Rot Check', 'Upper Canopy'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Inspects visible exposed roots for firm pale feeder tips, mushy brown/black root rot, circling rootbound mats, and safe hydrogen-peroxide/cinnamon sanitation.',
    captureTips: [
      'Only photograph roots if the plant is already unpotted or roots protrude from drainage holes.',
      'Gently brush loose soil away so root color and texture are visible.',
    ],
    scientificGuardrail:
      'IMPORTANT: Hidden underground root health CANNOT be diagnosed from leaf-only photos. If only leaves are shown, clearly state that direct root inspection is required.',
    systemRole:
      'You are a Rhizosphere & Root Pathology Specialist. Inspect visible roots if photographed. If only foliage/pot is visible without exposed roots, NEVER claim to diagnose hidden root conditions — explicitly recommend gentle rootball inspection.',
    quickPrompts: [
      'Inspect these exposed roots for healthy growth vs. root rot or rootbound circling and guide trimming & repotting.',
      'Are these brownish roots dead rot or simply soil-stained healthy roots?',
    ],
    contextFields: [
      {
        key: 'rootsVisible',
        label: 'Are actual roots visible in your photo?',
        type: 'select',
        options: ['Yes — rootball unpotted', 'Partial — protruding from drainage holes', 'No — leaves/pot top only'],
        defaultValue: 'Yes — rootball unpotted',
      },
      {
        key: 'odorAndTexture',
        label: 'Root Smell & Feel (if touched)',
        type: 'select',
        options: ['Not checked yet', 'Firm & earthy smell', 'Mushy / slimy / sour odor', 'Dry & papery / brittle'],
        defaultValue: 'Not checked yet',
      },
    ],
  },
  {
    slug: 'flower-health',
    name: 'AI Flower Health Scanner',
    tagline: 'Diagnose bud blast, petal blight, failed blooming, or pollinator/feeding gaps.',
    category: 'Care, Pruning & Growth',
    accent: 'lavender',
    iconName: 'Flower2',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Flower / Bud Close-up', 'Foliage Around Buds', 'Whole Plant'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Analyzes flower buds, petal spotting (Botrytis), thrips distortion, and bud drop to optimize light, potassium/phosphorus balance, and bloom longevity.',
    captureTips: [
      'Take a close-up of unopened buds or spotted petals plus overall plant lighting.',
    ],
    scientificGuardrail:
      'Bud drop frequently stems from abrupt moisture swings, low light, or thrips; inspect inside petals gently if blooms deform.',
    systemRole:
      'You are an Ornamental Floriculture & Bloom Health Specialist. Diagnose bud blast, petal blight, thrips damage, and nitrogen-vs-potassium imbalances.',
    quickPrompts: [
      'Why are flower buds yellowing and dropping before opening, and how do I encourage stronger blooms?',
      'Inspect these petals for Botrytis blight, thrips scarring, or heat fade.',
    ],
    contextFields: [
      {
        key: 'bloomStage',
        label: 'Current Stage',
        type: 'select',
        options: ['No buds forming', 'Buds dropping before opening', 'Deformed / spotted petals', 'Healthy bloom check'],
        defaultValue: 'Buds dropping before opening',
      },
    ],
  },
  {
    slug: 'fruit-health',
    name: 'AI Fruit Health Scanner',
    tagline: 'Check blossom-end rot, splitting, fruit pests, poor fruit set & ripeness cues.',
    category: 'Care, Pruning & Growth',
    accent: 'yellow',
    iconName: 'Apple',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Fruit Close-up', 'Blossom / Stem End', 'Plant Canopy'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Evaluates tomatoes, citrus, chilies, peppers, berries, and patio fruit trees for blossom-end rot, skin cracking, fruit-fly stings, and pollination success.',
    captureTips: [
      'Show the underside/blossom end of the fruit as well as any surface punctures or discoloration.',
    ],
    scientificGuardrail:
      'Blossom-end rot is usually caused by uneven watering blocking calcium transport rather than soil calcium absence alone; avoid synthetic sprays near harvest.',
    systemRole:
      'You are a Fruit Crop & Patio Orchard Specialist. Diagnose blossom-end rot, splitting, fruit-borer holes, anthracnose spots, and harvest readiness safely.',
    quickPrompts: [
      'Check this fruit for blossom-end rot, cracking, fungal spots, or pest punctures and advise harvest/care steps.',
      'Why are small fruits turning yellow and dropping off prematurely?',
    ],
    contextFields: [
      {
        key: 'fruitType',
        label: 'Crop / Fruit Type',
        type: 'text',
        placeholder: 'e.g. Tomato, Lemon, Chili Pepper, Fig',
      },
    ],
  },
  {
    slug: 'plant-growth',
    name: 'AI Growth Monitor',
    tagline: 'Compare before & after date-stamped photos, height/leaf metrics & vigor trends.',
    category: 'Care, Pruning & Growth',
    accent: 'emerald',
    iconName: 'TrendingUp',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 2,
    imageSlotLabels: ['Earlier / Baseline Photo', 'Latest / Today Photo'],
    requiresPhotoRecommended: false,
    helpSummary:
      'Compares date-stamped before/after photographs alongside your logged height and leaf counts in My Garden, cleanly separating measured facts from visual estimates.',
    captureTips: [
      'Use a similar angle and distance for Before and After photos (add a ruler if tracking exact cm).',
      'Set the dates below so the AI knows the exact elapsed days.',
    ],
    scientificGuardrail:
      'IMPORTANT: Measured height/leaf logs come from user/database measurements; visual size estimates from uncalibrated photos are approximate only.',
    systemRole:
      'You are a Botanical Growth & Phenology Analyst. Compare before/after photos and saved growth logs. Explicitly separate measured database numbers from visual estimates.',
    quickPrompts: [
      'Compare my Before and After plant photos and summarize canopy progress, leaf size, and any growth bottlenecks.',
      'Analyze my plant’s logged height & leaf records and suggest the top two improvements for steady growth.',
    ],
    contextFields: [
      {
        key: 'beforeDate',
        label: 'Before Photo Date',
        type: 'date',
      },
      {
        key: 'afterDate',
        label: 'Latest Photo Date',
        type: 'date',
      },
      {
        key: 'measuredHeightCm',
        label: 'Measured Height Today (cm, optional)',
        type: 'number',
        min: 1,
        max: 1000,
        placeholder: 'e.g. 72',
      },
      {
        key: 'measuredLeafCount',
        label: 'Counted Leaves Today (optional)',
        type: 'number',
        min: 0,
        max: 5000,
        placeholder: 'e.g. 16',
      },
    ],
  },
  {
    slug: 'pruning-assistant',
    name: 'AI Pruning Guide',
    tagline: 'Learn WHY and WHERE to prune safely above nodes without over-stressing canopy.',
    category: 'Care, Pruning & Growth',
    accent: 'mint',
    iconName: 'Scissors',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 2,
    imageSlotLabels: ['Full Stem / Canopy Architecture', 'Close-up of Nodes / Dead Wood'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Explains biological reasoning before making any cut, identifies safe pruning zones (dead wood, leggy internodes, crossing branches), and enforces safe <25-30% canopy limits.',
    captureTips: [
      'Capture the entire branching structure against a plain wall so nodes are clearly visible.',
    ],
    scientificGuardrail:
      'Never remove more than 25-30% of healthy foliage at once; always sanitize blades with 70% alcohol between plants.',
    systemRole:
      'You are a Master Horticulturist & Structural Pruning Guide. Explain WHY each cut is beneficial BEFORE telling the user where to cut, describe exact node placement safely, and specify tool sterilization.',
    quickPrompts: [
      'Explain why and where to prune this plant for fuller branching without shocking it.',
      'Which yellow or leggy stems should be trimmed now vs. left alone?',
    ],
    contextFields: [
      {
        key: 'pruningGoal',
        label: 'Pruning Goal',
        type: 'select',
        options: ['Remove dead/diseased foliage', 'Encourage fuller bushy growth', 'Shape leggy/overgrown stems', 'Post-bloom deadheading'],
        defaultValue: 'Encourage fuller bushy growth',
      },
    ],
  },
  {
    slug: 'repotting-assistant',
    name: 'AI Repotting Assistant',
    tagline: 'Assess rootbound signs, exact pot upsize (+2-5cm), soil recipe & shock prevention.',
    category: 'Water, Soil & Roots',
    accent: 'terracotta',
    iconName: 'Package',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Plant & Current Pot', 'Drainage Holes / Surface Roots', 'Optional Rootball'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Checks whether repotting is genuinely needed now vs. better postponed, recommends exact pot step-up sizing, drainage mix ratios, and 14-day aftercare.',
    captureTips: [
      'Include a photo showing the pot-to-canopy proportion and any roots peeking from the top or drainage holes.',
    ],
    scientificGuardrail:
      'Avoid upsizing pots too aggressively (+2 to 5 cm diameter max) or repotting an actively wilting/diseased plant unless treating root rot.',
    systemRole:
      'You are a Container Horticulture & Repotting Specialist. Determine whether repotting is needed now, calculate safe pot upsizing, and give a breathable substrate recipe.',
    quickPrompts: [
      'Should I repot this plant now or wait? Recommend the exact next pot size and soil mix.',
      'How do I repot without causing transplant shock?',
    ],
    contextFields: [
      {
        key: 'currentPotDiameterCm',
        label: 'Current Pot Diameter (cm)',
        type: 'number',
        min: 5,
        max: 120,
        placeholder: 'e.g. 20',
      },
      {
        key: 'monthsInPot',
        label: 'Months Since Last Repot',
        type: 'number',
        min: 1,
        max: 120,
        placeholder: 'e.g. 14',
      },
    ],
  },
  {
    slug: 'weed-identifier',
    name: 'AI Weed Identifier',
    tagline: 'Distinguish invasive garden weeds from beneficial volunteers & wildflowers safely.',
    category: 'Identification & Safety',
    accent: 'yellow',
    iconName: 'Sprout',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 2,
    imageSlotLabels: ['Weed Leaf & Stem Close-up', 'Surrounding Bed / Lawn'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Identifies unwanted garden weeds vs. lookalike seedlings/herbs and recommends non-toxic manual pulling, mulching, or solarization.',
    captureTips: [
      'Photograph true leaves (not only cotyledons) and stem growth habit (creeping runner vs. taproot).',
    ],
    scientificGuardrail:
      'IMPORTANT: Never pull or destroy an unidentified plant with certainty — young desirable seedlings and medicinal herbs often resemble weeds.',
    systemRole:
      'You are a Weed Ecology & Organic Bed Management Specialist. Identify volunteer plants cautiously. NEVER recommend removing an unidentified plant with certainty; state lookalike risks and prefer non-toxic hand removal/mulching.',
    quickPrompts: [
      'Identify whether this volunteer sprout is an aggressive weed or a desirable seedling/herb before I pull it.',
      'What organic, herbicide-free method controls this weed without harming nearby garden plants?',
    ],
    contextFields: [
      {
        key: 'growingContext',
        label: 'Where did it sprout?',
        type: 'select',
        options: ['Vegetable / Herb Pot', 'Lawn / Turf', 'Flower Bed', 'Paver Cracks'],
        defaultValue: 'Vegetable / Herb Pot',
      },
    ],
  },
  {
    slug: 'plant-propagation',
    name: 'AI Propagation Assistant',
    tagline: 'Node-by-node cutting instructions, water vs. sphagnum/perlite rooting & aftercare.',
    category: 'Care, Pruning & Growth',
    accent: 'mint',
    iconName: 'GitBranch',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 2,
    imageSlotLabels: ['Parent Plant Stem & Nodes', 'Cutting / Root Progress'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Guides stem, leaf, division, or air-layering propagation, highlights where a viable node is required, and helps monitor rooting cuttings.',
    captureTips: [
      'Zoom in clearly on stem joints (nodes) and any aerial root bumps.',
    ],
    scientificGuardrail:
      'Many tropical vines require an intact stem node to grow new shoots; leaf-petiole cuttings without a node often root without ever producing a new vine.',
    systemRole:
      'You are a Botanical Propagation & Tissue Specialist. Identify visible stem nodes/offsets and create a step-by-step rooting plan (water, perlite, sphagnum, or division) with rot-prevention checks.',
    quickPrompts: [
      'Show where the viable nodes are on this stem and walk me through propagating it step by step.',
      'Check whether this cutting’s roots are ready to transfer from water into soil.',
    ],
    contextFields: [
      {
        key: 'preferredMedium',
        label: 'Preferred Rooting Medium',
        type: 'select',
        options: ['Recommend best method', 'Water jar', 'Perlite / LECA', 'Sphagnum moss', 'Direct moist potting mix'],
        defaultValue: 'Recommend best method',
      },
    ],
  },
  {
    slug: 'plant-safety',
    name: 'AI Plant Safety Scanner',
    tagline: 'Assess pet (cat/dog) & child toxicity risks, sap irritants & emergency precautions.',
    category: 'Identification & Safety',
    accent: 'lavender',
    iconName: 'ShieldCheck',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Leaf & Stem', 'Berries / Flowers (if any)', 'Full Plant'],
    requiresPhotoRecommended: true,
    helpSummary:
      'Identifies plant species and checks ASPCA/botanical toxicity profiles for cats, dogs, and young children, including calcium oxalate crystals, cardiac glycosides, or skin-irritant sap.',
    captureTips: [
      'Photograph leaves, stems, and any berries or flowers clearly for accurate ID.',
      'If ingestion has already occurred, contact medical or veterinary poison control immediately.',
    ],
    scientificGuardrail:
      'CRITICAL SAFETY RULE: NEVER declare a plant "safe" if species identification is uncertain. For any suspected human or pet ingestion, direct the user immediately to Poison Control / emergency medical or veterinary assistance.',
    systemRole:
      'You are a Botanical Toxicology & Home Safety Screener. NEVER declare a plant non-toxic or safe when identification confidence is below 85% or uncertain. Always include clear precautions and advise immediate medical/veterinary help for suspected ingestion.',
    quickPrompts: [
      'Check if this plant is toxic to cats, dogs, or children, and explain safe placement precautions.',
      'Which parts of this plant (leaves, sap, berries, bulbs) carry irritant or toxic compounds?',
    ],
    contextFields: [
      {
        key: 'householdRisk',
        label: 'Who is in the household?',
        type: 'select',
        options: ['Cats & Dogs', 'Cats only', 'Dogs only', 'Toddlers / Children', 'General Home Safety'],
        defaultValue: 'Cats & Dogs',
      },
    ],
  },
  {
    slug: 'garden-coach',
    name: 'AI Personal Garden Coach',
    tagline: 'Synthesizes camera snapshots, your real My Garden plants, tasks & weather into action.',
    category: 'Care, Pruning & Growth',
    accent: 'lavender',
    iconName: 'UserCheck',
    supportsCamera: true,
    supportsMultiImage: true,
    maxImages: 3,
    imageSlotLabels: ['Garden Space / Balcony', 'Priority Plant Photo', 'Second Corner (optional)'],
    requiresPhotoRecommended: false,
    helpSummary:
      'Your unified garden strategist: inspects optional balcony/plant photos alongside your real My Garden specimens, overdue care tasks, recent scan history, and weather.',
    captureTips: [
      'Optionally snap your balcony, windowsill, or a struggling plant for tailored spatial & care coaching.',
    ],
    scientificGuardrail:
      'Strictly grounded in your real saved My Garden records, attached photos, and supplied weather — never invents plants, sensor readings, or forecast data.',
    systemRole:
      'You are the MYPLANTCARE Personal Garden Coach. Synthesize attached photos, real My Garden plants, overdue care tasks, recent scans, and current weather into a prioritized, realistic weekly care plan.',
    quickPrompts: [
      'Build my prioritized 7-day garden action plan using my real My Garden plants, overdue tasks, and local weather.',
      'Review this balcony/room photo and tell me how to arrange light and care for healthier growth.',
    ],
    contextFields: [
      {
        key: 'weeklyGoal',
        label: 'Primary Goal This Week',
        type: 'select',
        options: ['Overall garden triage & weekly routine', 'Fix struggling/low-health plants first', 'Prepare for seasonal weather shift', 'Optimize balcony sunlight & layout'],
        defaultValue: 'Overall garden triage & weekly routine',
      },
    ],
  },
  {
    slug: 'environment-optimizer',
    name: 'AI Environment Optimizer',
    tagline: 'Analyze your manual humidity and light logs to customize micro-climate advice.',
    category: 'Water, Soil & Roots',
    accent: 'mint',
    iconName: 'Droplets',
    supportsCamera: true,
    supportsMultiImage: false,
    maxImages: 1,
    imageSlotLabels: ['Room / Plant Placement Spot'],
    requiresPhotoRecommended: false,
    helpSummary:
      'Uses your manual humidity and light intensity readings to generate custom micro-climate advice (humidifiers, pebble trays, LED grow light spectrum & distance, draft elimination).',
    captureTips: [
      'Take a photo of your plant in its current room placement or growth nook.',
      'Log your room hygrometer humidity and light meter lux readings.',
    ],
    scientificGuardrail:
      'Micro-climate recommendations are tailored to your logged humidity and light data; adjust gradually to avoid temperature or light shock.',
    systemRole:
      'You are the MYPLANTCARE Environmental Micro-Climate Optimization Specialist. Analyze the user manual humidity and light intensity data against plant species needs. Provide actionable advice for humidity, lighting, and air circulation.',
    quickPrompts: [
      'Analyze my current room humidity and light levels and give me step-by-step micro-climate optimization steps.',
      'How do I increase humidity for tropical specimens without risking fungal leaf issues?',
    ],
    contextFields: [
      {
        key: 'currentHumidity',
        label: 'Current Room Humidity (%)',
        type: 'number',
        placeholder: 'e.g. 45',
        defaultValue: '45',
      },
      {
        key: 'currentLightLux',
        label: 'Current Light Intensity (Lux)',
        type: 'number',
        placeholder: 'e.g. 1200',
        defaultValue: '1200',
      },
      {
        key: 'placementArea',
        label: 'Room / Placement Area',
        type: 'select',
        options: ['Living Room Window', 'Indoor Office Desk', 'Balcony / Terrace', 'Kitchen / Bathroom', 'Dark Hallway'],
        defaultValue: 'Living Room Window',
      },
    ],
  },
];

const SLUG_ALIASES: Record<string, AiToolSlug> = {
  // Exact 19 slugs
  'plant-identifier': 'plant-identifier',
  'leaf-health': 'leaf-health',
  'disease-detector': 'disease-detector',
  'pest-detector': 'pest-detector',
  'nutrient-doctor': 'nutrient-doctor',
  'watering-doctor': 'watering-doctor',
  'soil-doctor': 'soil-doctor',
  'plant-rescue': 'plant-rescue',
  'root-health': 'root-health',
  'flower-health': 'flower-health',
  'fruit-health': 'fruit-health',
  'plant-growth': 'plant-growth',
  'pruning-assistant': 'pruning-assistant',
  'repotting-assistant': 'repotting-assistant',
  'weed-identifier': 'weed-identifier',
  'plant-propagation': 'plant-propagation',
  'plant-safety': 'plant-safety',
  'garden-coach': 'garden-coach',
  'environment-optimizer': 'environment-optimizer',
  // Legacy aliases preserved seamlessly
  identifier: 'plant-identifier',
  'plant-doctor': 'leaf-health',
  'water-intelligence': 'watering-doctor',
  'soil-analyser': 'soil-doctor',
  'fertilizer-intelligence': 'nutrient-doctor',
  'growth-predictor': 'plant-growth',
  'garden-planner': 'garden-coach',
  'plant-compatibility': 'garden-coach',
  'seasonal-advisor': 'garden-coach',
  'flowering-fruiting-coach': 'flower-health',
  'plant-comparison': 'plant-identifier',
  'personal-garden-coach': 'garden-coach',
  soil: 'soil-doctor',
  water: 'watering-doctor',
  weather: 'garden-coach',
  growth: 'plant-growth',
  predictive: 'garden-coach',
  designer: 'garden-coach',
  recommender: 'garden-coach',
  compatibility: 'garden-coach',
  comparison: 'plant-identifier',
  'leaf-root': 'root-health',
  seasonal: 'garden-coach',
};

export function normalizeToolSlug(rawSlug?: string | null): AiToolSlug | null {
  if (!rawSlug) return null;
  const cleaned = String(rawSlug).trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  return SLUG_ALIASES[cleaned] || null;
}

export function getToolBySlug(rawSlug?: string | null): AiToolDefinition | null {
  const slug = normalizeToolSlug(rawSlug);
  if (!slug) return null;
  return AI_TOOLS_CATALOG.find((t) => t.slug === slug) || null;
}

export function buildAiToolsPath(slug?: AiToolSlug | null): string {
  return slug ? `/ai-tools/${slug}` : '/ai-tools';
}

export function parseAiToolsRoute(pathname: string): {
  isAiToolsRoute: boolean;
  activeToolSlug: AiToolSlug | null;
} {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  if (clean === '/ai-tools') {
    return { isAiToolsRoute: true, activeToolSlug: null };
  }
  if (clean.startsWith('/ai-tools/')) {
    const rawSlug = clean.slice('/ai-tools/'.length).split('/')[0];
    const matched = normalizeToolSlug(rawSlug);
    return { isAiToolsRoute: true, activeToolSlug: matched };
  }
  return { isAiToolsRoute: false, activeToolSlug: null };
}

export interface NormalizedToolAnalysisResult {
  tool: AiToolSlug;
  toolName: string;
  headline: string;
  plant_identification: {
    common_name: string;
    scientific_name: string;
    confidence: number;
    is_uncertain: boolean;
  };
  observations: string[];
  possible_causes: string[];
  severity: 'Low' | 'Moderate' | 'High' | 'Critical' | 'Informational';
  recommendations: string[];
  follow_up: string[];
  limitations: string[];
  // Tool-specific optional structured sections
  alternatives?: Array<{ common_name: string; scientific_name: string; reason: string }>;
  growing_requirements?: {
    light?: string;
    watering?: string;
    soil?: string;
    humidity?: string;
    temperature?: string;
  };
  watering_diagnosis?: {
    moisture_assessment?: string;
    suggested_interval_days?: number;
    suggested_volume_ml?: string;
    next_check_rule?: string;
  };
  soil_recommendations?: {
    drainage_status?: string;
    ideal_mix_ratio?: string;
    amendments?: string[];
  };
  recovery_timeline?: {
    first_24h?: string;
    hours_72?: string;
    days_14?: string;
  };
  pruning_zones?: Array<{ target: string; why_before_cut: string; how_to_cut: string }>;
  toxicity_and_precautions?: {
    pet_safety?: string;
    human_safety?: string;
    toxic_compounds?: string;
    emergency_guidance?: string;
  };
  propagation_plan?: {
    best_method?: string;
    node_guidance?: string;
    rooting_steps?: string[];
  };
  growth_comparison?: {
    measured_summary?: string;
    visual_estimate?: string;
    bottlenecks?: string[];
  };
  garden_action_plan?: Array<{ priority: string; target: string; action: string }>;
  scheduleSuggestions?: Array<{
    title: string;
    taskType: string;
    frequency: string;
    dueInDays: number;
    notes: string;
  }>;
  resolvedModel?: string;
  usedBackupModel?: boolean;
  executedAtIso?: string;
}

export function normalizeToolAnalysisResult(
  raw: any,
  toolSlug: AiToolSlug,
  fallbackToolName?: string
): NormalizedToolAnalysisResult {
  const toolDef = getToolBySlug(toolSlug);
  const resolvedToolName = fallbackToolName || toolDef?.name || toolSlug;

  const rawId = raw?.plant_identification || {};
  const confidenceNum = Number(rawId?.confidence ?? raw?.confidence ?? 0);
  const clampedConfidence = Number.isFinite(confidenceNum)
    ? Math.max(0, Math.min(100, Math.round(confidenceNum)))
    : 0;

  const toStringArray = (val: any): string[] => {
    if (Array.isArray(val)) {
      return val.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof val === 'string' && val.trim()) {
      return [val.trim()];
    }
    return [];
  };

  const rawSeverity = String(raw?.severity || 'Informational').trim();
  const normalizedSeverity: NormalizedToolAnalysisResult['severity'] =
    rawSeverity === 'Critical' ||
    rawSeverity === 'High' ||
    rawSeverity === 'Moderate' ||
    rawSeverity === 'Low' ||
    rawSeverity === 'Informational'
      ? rawSeverity
      : /crit|emerg|severe/i.test(rawSeverity)
      ? 'Critical'
      : /high/i.test(rawSeverity)
      ? 'High'
      : /mod|med/i.test(rawSeverity)
      ? 'Moderate'
      : /low|mild/i.test(rawSeverity)
      ? 'Low'
      : 'Informational';

  const limitations = toStringArray(raw?.limitations);
  if (toolDef?.scientificGuardrail && !limitations.some((l) => l.toLowerCase().includes('not a laboratory') || l.toLowerCase().includes(toolDef.scientificGuardrail.slice(0, 20).toLowerCase()))) {
    limitations.push(toolDef.scientificGuardrail);
  }

  return {
    tool: toolSlug,
    toolName: String(raw?.toolName || resolvedToolName),
    headline: String(raw?.headline || `${resolvedToolName} Complete`).trim(),
    plant_identification: {
      common_name: String(rawId?.common_name || raw?.commonName || 'Unidentified / General Specimen').trim(),
      scientific_name: String(rawId?.scientific_name || raw?.scientificName || '').trim(),
      confidence: clampedConfidence,
      is_uncertain: Boolean(rawId?.is_uncertain ?? (clampedConfidence > 0 && clampedConfidence < 70)),
    },
    observations: toStringArray(raw?.observations),
    possible_causes: toStringArray(raw?.possible_causes ?? raw?.possibleCauses),
    severity: normalizedSeverity,
    recommendations: toStringArray(raw?.recommendations ?? raw?.actionSteps),
    follow_up: toStringArray(raw?.follow_up ?? raw?.followUp),
    limitations,
    alternatives: Array.isArray(raw?.alternatives) ? raw.alternatives : undefined,
    growing_requirements: raw?.growing_requirements || undefined,
    watering_diagnosis: raw?.watering_diagnosis || undefined,
    soil_recommendations: raw?.soil_recommendations || undefined,
    recovery_timeline: raw?.recovery_timeline || undefined,
    pruning_zones: Array.isArray(raw?.pruning_zones) ? raw.pruning_zones : undefined,
    toxicity_and_precautions: raw?.toxicity_and_precautions || undefined,
    propagation_plan: raw?.propagation_plan || undefined,
    growth_comparison: raw?.growth_comparison || undefined,
    garden_action_plan: Array.isArray(raw?.garden_action_plan) ? raw.garden_action_plan : undefined,
    scheduleSuggestions: Array.isArray(raw?.scheduleSuggestions) ? raw.scheduleSuggestions : undefined,
    resolvedModel: raw?.resolvedModel,
    usedBackupModel: raw?.usedBackupModel,
    executedAtIso: raw?.executedAtIso,
  };
}

export function computeGrowthDelta(input: {
  beforeHeightCm?: number;
  afterHeightCm?: number;
  beforeLeaves?: number;
  afterLeaves?: number;
  beforeDate?: string;
  afterDate?: string;
}): {
  daysElapsed: number | null;
  heightChangeCm: number | null;
  leafCountChange: number | null;
} {
  let daysElapsed: number | null = null;
  if (input.beforeDate && input.afterDate) {
    const t1 = Date.parse(input.beforeDate);
    const t2 = Date.parse(input.afterDate);
    if (Number.isFinite(t1) && Number.isFinite(t2)) {
      daysElapsed = Math.max(0, Math.round((t2 - t1) / 86400000));
    }
  }
  const heightChangeCm =
    Number.isFinite(input.beforeHeightCm) && Number.isFinite(input.afterHeightCm)
      ? Number((Number(input.afterHeightCm) - Number(input.beforeHeightCm)).toFixed(1))
      : null;
  const leafCountChange =
    Number.isFinite(input.beforeLeaves) && Number.isFinite(input.afterLeaves)
      ? Math.round(Number(input.afterLeaves) - Number(input.beforeLeaves))
      : null;

  return { daysElapsed, heightChangeCm, leafCountChange };
}

export function evaluateImageQualityMetrics(stats: {
  width: number;
  height: number;
  avgLuminance: number;
  edgeContrast: number;
}): {
  passed: boolean;
  warnings: string[];
  score: number;
} {
  const warnings: string[] = [];
  let score = 100;

  if (stats.width < 200 || stats.height < 200) {
    warnings.push('Image resolution is very low (<200px). Move closer or use a higher-resolution photo.');
    score -= 35;
  }
  if (stats.avgLuminance < 26) {
    warnings.push('Photo looks very dark. Try natural daylight or turn on room lighting.');
    score -= 35;
  } else if (stats.avgLuminance > 242) {
    warnings.push('Photo looks overexposed. Avoid harsh direct glare on leaves.');
    score -= 20;
  }
  if (stats.edgeContrast < 6) {
    warnings.push('Image lacks sharp texture detail or appears heavily blurred. Tap to focus before capturing.');
    score -= 35;
  }

  score = Math.max(0, Math.min(100, score));
  return {
    passed: score >= 45,
    warnings,
    score,
  };
}
