import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
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
} from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName = 'Botanist') {
  try {
    const adminEmail = 'jenasanjay17@gmail.com';
    const role = email.toLowerCase() === adminEmail || uid === 'demo-botanist-uid' ? 'admin' : 'user';
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email, displayName },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function ensureDemoSeedData(uid: string) {
  try {
    await getOrCreateUser(uid, 'sanctuary@myplantcare.ai', 'Aarav Sharma (Lead Botanist)');

    const existingPlants = await db
      .select()
      .from(userPlants)
      .where(eq(userPlants.userUid, uid));

    if (existingPlants.length === 0) {
      const insertedPlants = await db
        .insert(userPlants)
        .values([
          {
            userUid: uid,
            name: 'Emerald Fenestra',
            species: 'Swiss Cheese Plant',
            scientificName: 'Monstera deliciosa',
            addedDate: '2026-06-14',
            location: 'Living Room South Atrium',
            potSize: '30cm Ceramic Planter',
            soilType: 'Chunky Aroid Bark + Perlite Mix',
            sunlight: 'Bright Indirect (6 hrs)',
            healthScore: 95,
            status: 'Healthy',
            lastWatered: '2026-11-10',
            nextWatering: '2026-11-14',
            lastFertilized: '2026-10-28',
            heightCm: 68,
            notes: 'Unfurled 2 new fenestrated leaves after switching to rainwater + seaweed extract.',
            imageUrl: '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg',
          },
          {
            userUid: uid,
            name: 'Sacred Vrinda Tulsi',
            species: 'Krishna Tulsi (Holy Basil)',
            scientificName: 'Ocimum tenuiflorum',
            addedDate: '2026-07-02',
            location: 'East Sunlit Balcony',
            potSize: '22cm Terracotta Vrindavan Pot',
            soilType: 'Fertile Loam + Vermicompost',
            sunlight: 'Direct Morning Sun (5 hrs)',
            healthScore: 91,
            status: 'Healthy',
            lastWatered: '2026-11-11',
            nextWatering: '2026-11-13',
            lastFertilized: '2026-11-01',
            heightCm: 42,
            notes: 'Pinched apical flower buds last week to encourage bushy lateral branching.',
            imageUrl: '/src/assets/images/plant_tulsi_holy_basil_1794482114261.jpg',
          },
          {
            userUid: uid,
            name: 'Sculpted Ficus Canopy',
            species: 'Fiddle Leaf Fig',
            scientificName: 'Ficus lyrata',
            addedDate: '2026-05-19',
            location: 'Study Corner Window',
            potSize: '35cm Architectural Slate Pot',
            soilType: 'Well-draining Peat + Pine Bark',
            sunlight: 'Filtered East Light',
            healthScore: 76,
            status: 'Needs Attention',
            lastWatered: '2026-11-06',
            nextWatering: '2026-11-12',
            lastFertilized: '2026-10-15',
            heightCm: 112,
            notes: 'Mild lower-leaf interveinal yellowing noted last week; monitoring soil moisture and magnesium.',
            imageUrl: '/src/assets/images/plant_fiddle_leaf_fig_1794482115866.jpg',
          },
          {
            userUid: uid,
            name: 'Golden Pothos Cascade',
            species: 'Money Plant / Golden Pothos',
            scientificName: 'Epipremnum aureum',
            addedDate: '2026-08-10',
            location: 'Bookshelf Vertical Trellis',
            potSize: '20cm Self-Watering Planter',
            soilType: 'Cocopeat + Vermicompost + Perlite',
            sunlight: 'Medium Indirect Light',
            healthScore: 94,
            status: 'Healthy',
            lastWatered: '2026-11-09',
            nextWatering: '2026-11-15',
            lastFertilized: '2026-10-20',
            heightCm: 84,
            notes: 'Showed minor yellow leaf 10 days ago; recovered completely after extending watering interval to 6 days.',
            imageUrl: '/src/assets/images/hero_botanical_sanctuary_1794482113239.jpg',
          },
        ])
        .returning();

      const ficusId = insertedPlants[2]?.id ?? null;
      const monsteraId = insertedPlants[0]?.id ?? null;

      await db.insert(plantDiagnoses).values([
        {
          userUid: uid,
          plantId: ficusId,
          plantName: 'Sculpted Ficus Canopy (Ficus lyrata)',
          scientificName: 'Ficus lyrata',
          plantCategory: 'Tropical Indoor Foliage Tree',
          diagnosisType: 'disease',
          possibleCondition: 'Possible Mild Root Moisture Stress & Early Magnesium Deficiency',
          confidence: 86,
          healthScore: 76,
          severity: 'Low to Moderate',
          symptoms: 'Subtle interveinal chlorosis on two older basal leaves; tiny brown edema speckles near leaf margins.',
          causes: 'Fluctuating root-zone moisture combined with minor magnesium depletion in older potting substrate.',
          recommendations: 'Allow top 5cm of soil to dry before watering. Apply 1 tsp Epsom salt (magnesium sulfate) dissolved in 2L lukewarm water at next irrigation.',
          prevention: 'Ensure drainage holes remain unobstructed and avoid cold drafts near windows.',
          imageUrl: '/src/assets/images/plant_fiddle_leaf_fig_1794482115866.jpg',
          scannedDate: '2026-11-08',
          isConfirmed: false,
        },
        {
          userUid: uid,
          plantId: monsteraId,
          plantName: 'Emerald Fenestra (Monstera deliciosa)',
          scientificName: 'Monstera deliciosa',
          plantCategory: 'Tropical Epiphytic Aroid',
          diagnosisType: 'identification',
          possibleCondition: 'Monstera deliciosa (Swiss Cheese Vine) — Optimal Vigour',
          confidence: 98,
          healthScore: 95,
          severity: 'Healthy',
          symptoms: 'Deep emerald lamina with symmetric fenestrations, turgid petioles, active aerial root tips.',
          causes: 'Balanced indirect PAR lighting and well-aerated aroid substrate.',
          recommendations: 'Provide a damp sphagnum moss pole for aerial root attachment and wipe dust from leaves biweekly.',
          prevention: 'Maintain 55–70% ambient humidity and avoid direct midday scorching sun.',
          imageUrl: '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg',
          scannedDate: '2026-11-10',
          isConfirmed: false,
        },
      ]);

      await db.insert(careTasks).values([
        {
          userUid: uid,
          plantId: ficusId,
          plantName: 'Sculpted Ficus Canopy',
          taskType: 'Watering',
          title: 'Deep Root Hydration + Epsom Salt Micro-Dose (450ml)',
          dueDate: '2026-11-12',
          completed: false,
          frequency: 'Every 6 Days',
          notes: 'Check top 5cm dryness with moisture probe first.',
        },
        {
          userUid: uid,
          plantId: insertedPlants[1]?.id ?? null,
          plantName: 'Sacred Vrinda Tulsi',
          taskType: 'Pruning',
          title: 'Pinch Mature Manjari (Seed Heads) to Boost Essential Oils',
          dueDate: '2026-11-12',
          completed: false,
          frequency: 'Biweekly',
          notes: 'Use sanitized shears above the third leaf node.',
        },
        {
          userUid: uid,
          plantId: monsteraId,
          plantName: 'Emerald Fenestra',
          taskType: 'Growth Photo',
          title: 'Capture Monthly Fenestration & Height Scale Photo',
          dueDate: '2026-11-13',
          completed: false,
          frequency: 'Monthly',
          notes: 'Include 30cm reference ruler beside main stem.',
        },
        {
          userUid: uid,
          plantId: insertedPlants[3]?.id ?? null,
          plantName: 'Golden Pothos Cascade',
          taskType: 'Pest Inspection',
          title: 'Inspect Leaf Undersides & Nodes for Mealybugs',
          dueDate: '2026-11-11',
          completed: true,
          frequency: 'Weekly',
          notes: 'All nodes clean; wiped leaves with diluted neem hydrosol.',
        },
      ]);

      await db.insert(growthLogs).values([
        {
          userUid: uid,
          plantId: monsteraId,
          plantName: 'Emerald Fenestra',
          heightCm: 52,
          leafCount: 7,
          observation: 'Established root system after repotting into 30cm ceramic vessel.',
          healthScore: 89,
          recordedDate: '2026-08-12',
        },
        {
          userUid: uid,
          plantId: monsteraId,
          plantName: 'Emerald Fenestra',
          heightCm: 59,
          leafCount: 9,
          observation: 'Two new leaves with 6 fenestrations each; aerial roots anchored into moss pole.',
          healthScore: 92,
          recordedDate: '2026-09-12',
        },
        {
          userUid: uid,
          plantId: monsteraId,
          plantName: 'Emerald Fenestra',
          heightCm: 64,
          leafCount: 11,
          observation: 'Strong petiole elongation following organic seaweed tonic application.',
          healthScore: 94,
          recordedDate: '2026-10-12',
        },
        {
          userUid: uid,
          plantId: monsteraId,
          plantName: 'Emerald Fenestra',
          heightCm: 68,
          leafCount: 13,
          observation: 'Peak canopy gloss and largest 34cm fenestrated leaf blade yet.',
          healthScore: 95,
          recordedDate: '2026-11-12',
        },
      ]);

      await db.insert(soilRecords).values([
        {
          userUid: uid,
          plantName: 'Emerald Fenestra',
          soilType: 'Chunky Aroid Mix (Orchid Bark, Coco Chips, Perlite, Worm Castings)',
          ph: 6.3,
          moisture: 56,
          temperature: 23.5,
          nitrogen: 'Optimal',
          phosphorus: 'Optimal',
          potassium: 'Optimal',
          aiSummary: 'Slightly acidic (pH 6.3) with optimal 56% moisture and high porosity—ideal for epiphytic aroids.',
          recommendations: 'Top-dress with 150g fresh vermicompost every 6 weeks; maintain fast drainage.',
        },
      ]);

      await db.insert(gardenDesigns).values([
        {
          userUid: uid,
          title: 'Biophilic Urban Balcony Sanctuary',
          style: 'Tropical Garden',
          spaceType: 'Outdoor Balcony',
          dimensions: '3.6m × 1.8m (6.5 sq.m)',
          sunlight: 'East-Facing Morning Sun (4–5 hrs)',
          climate: 'Tropical Warm & Humid',
          budget: 'Moderate (₹12,000 / $150)',
          layoutJson: JSON.stringify([
            { zone: 'North-East Corner', plant: 'Areca Palm (Dypsis lutescens)', role: 'Canopy Privacy Screen' },
            { zone: 'East Rail Planters', plant: 'Krishna Tulsi & Hibiscus rosa-sinensis', role: 'Pollinator & Medicinal Hub' },
            { zone: 'Shaded Lounge Wall', plant: 'Monstera deliciosa & Boston Fern', role: 'Vertical Biophilic Focal Wall' },
            { zone: 'South-East Herb Tier', plant: 'Curry Leaf, Mint & Lemongrass', role: 'Aromatic Kitchen Harvest' },
          ]),
          aiRecommendations:
            'Layer tall Areca Palms along the windward railing to filter harsh afternoon glare, creating a humid microclimate (60%+ RH) for under-story Monstera and ferns.',
        },
      ]);
    }

    const existingGrowthRecords = await db
      .select()
      .from(growthRecords)
      .where(eq(growthRecords.userUid, uid));

    if (existingGrowthRecords.length === 0) {
      await db.insert(growthRecords).values([
        {
          userUid: uid,
          plantName: 'Emerald Fenestra',
          heightCm: 52,
          leafCount: 7,
          observation: 'Established root system after repotting into 30cm ceramic vessel.',
          healthScore: 89,
          recordedDate: '2026-08-12',
        },
        {
          userUid: uid,
          plantName: 'Emerald Fenestra',
          heightCm: 59,
          leafCount: 9,
          observation: 'Two new leaves with 6 fenestrations each; aerial roots anchored into moss pole.',
          healthScore: 92,
          recordedDate: '2026-09-12',
        },
        {
          userUid: uid,
          plantName: 'Emerald Fenestra',
          heightCm: 64,
          leafCount: 11,
          observation: 'Strong petiole elongation following organic seaweed tonic application.',
          healthScore: 94,
          recordedDate: '2026-10-12',
        },
        {
          userUid: uid,
          plantName: 'Emerald Fenestra',
          heightCm: 68,
          leafCount: 13,
          observation: 'Peak canopy gloss and largest 34cm fenestrated leaf blade yet.',
          healthScore: 95,
          recordedDate: '2026-11-12',
        },
      ]);
    }

    const existingEco = await db
      .select()
      .from(ecoActivities)
      .where(eq(ecoActivities.userUid, uid));

    if (existingEco.length === 0) {
      await db.insert(ecoActivities).values({
        userUid: uid,
        waterSavedLiters: 164.0,
        compostKg: 31.5,
        plantsMaintained: 10,
        wasteRecycledKg: 21.0,
        sustainableActions: 17,
        ecoScore: 86,
      });
    }

    const existingPosts = await db.select().from(communityPosts);
    if (existingPosts.length === 0) {
      await db.insert(communityPosts).values([
        {
          userUid: uid,
          authorName: 'Dr. Kavya Nair • Tropical Botanist',
          title: 'How Rainwater Harvesting + Seaweed Extract Transformed My Monstera Fenestrations',
          content:
            'Switching from hard tap water (TDS 420 ppm) to collected monsoon rainwater (TDS 35 ppm) eliminated brown leaf-tip burn within 5 weeks. Pairing it with cold-pressed Kappaphycus seaweed tonic every 21 days triggered double inner fenestrations!',
          category: 'Growth Success',
          plantTag: 'Monstera deliciosa',
          likesCount: 48,
          commentsJson: JSON.stringify([
            {
              author: 'Rohan Verma',
              text: 'Did you dilute the liquid seaweed to 2ml per liter? Trying this on my Philodendron!',
              date: '2h ago',
            },
            {
              author: 'Dr. Kavya Nair',
              text: 'Yes, 2ml/L as a root drench at dawn works wonders without salt buildup.',
              date: '1h ago',
            },
          ]),
          savedByJson: JSON.stringify([uid]),
          moderationStatus: 'Verified Safe',
        },
        {
          userUid: 'community-farmer-2',
          authorName: 'Arjun Krishnan • Terrace Kitchen Gardener',
          title: 'Natural Neem Kernel Extract + Yellow Sticky Traps for Monsoon Whiteflies on Hibiscus & Tulsi',
          content:
            'Instead of synthetic pesticides, emulsify 5ml cold-pressed Neem oil (1500 ppm Azadirachtin) with 2ml soap nut liquid in 1L warm water. Spray leaf undersides at sunset every 5 days for 3 cycles.',
          category: 'Organic Plant Protection',
          plantTag: 'Ocimum tenuiflorum',
          likesCount: 63,
          commentsJson: JSON.stringify([
            {
              author: 'Meera Sundaram',
              text: 'Saved my balcony Hibiscus buds this season. Thank you for the exact ratio!',
              date: '4h ago',
            },
          ]),
          savedByJson: JSON.stringify([]),
          moderationStatus: 'Verified Safe',
        },
      ]);
    }
  } catch (error) {
    console.error('Error seeding initial botanical data:', error);
  }
}

export async function getAllWorkspaceData(uid: string) {
  try {
    await ensureDemoSeedData(uid);
    const [
      plants,
      diagnoses,
      tasks,
      soils,
      growth,
      records,
      designs,
      posts,
      eco,
      orders,
      allUsers,
    ] = await Promise.all([
      db.select().from(userPlants).where(eq(userPlants.userUid, uid)).orderBy(desc(userPlants.id)),
      db.select().from(plantDiagnoses).where(eq(plantDiagnoses.userUid, uid)).orderBy(desc(plantDiagnoses.id)),
      db.select().from(careTasks).where(eq(careTasks.userUid, uid)).orderBy(careTasks.dueDate),
      db.select().from(soilRecords).where(eq(soilRecords.userUid, uid)).orderBy(desc(soilRecords.id)),
      db.select().from(growthLogs).where(eq(growthLogs.userUid, uid)).orderBy(growthLogs.id),
      db.select().from(growthRecords).where(eq(growthRecords.userUid, uid)).orderBy(growthRecords.id),
      db.select().from(gardenDesigns).where(eq(gardenDesigns.userUid, uid)).orderBy(desc(gardenDesigns.id)),
      db.select().from(communityPosts).orderBy(desc(communityPosts.id)),
      db.select().from(ecoActivities).where(eq(ecoActivities.userUid, uid)),
      db.select().from(marketplaceOrders).where(eq(marketplaceOrders.userUid, uid)).orderBy(desc(marketplaceOrders.id)),
      db.select().from(users).orderBy(desc(users.id)),
    ]);

    const resolvedGrowth = records.length > 0 ? records : growth;

    return {
      plants,
      diagnoses,
      tasks,
      soils,
      growth: resolvedGrowth,
      growthRecords: resolvedGrowth,
      designs,
      posts,
      eco: eco[0] || null,
      orders,
      allUsers,
    };
  } catch (error) {
    console.error('Database query failed in getAllWorkspaceData:', error);
    throw new Error('Failed to load workspace data from database.', { cause: error });
  }
}
