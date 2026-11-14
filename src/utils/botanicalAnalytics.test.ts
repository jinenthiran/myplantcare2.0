import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWateringIntelligence,
  calculateEcoImpactScore,
  evaluateSoilCondition,
  buildPlantImageHistory,
} from './botanicalAnalytics';

test('calculateWateringIntelligence detects overwatering accurately', () => {
  const res = calculateWateringIntelligence({
    speciesCategory: 'Succulent',
    potSizeCm: 15,
    soilMoisturePercent: 65,
    temperatureC: 26,
    humidityPercent: 60,
    rainfallMm: 0,
    sunlightHours: 6,
    season: 'Summer',
  });
  assert.equal(res.status, 'Overwatering Warning');
  assert.equal(res.recommendedMl, 0);
});

test('calculateWateringIntelligence calculates hydration dose when dry', () => {
  const res = calculateWateringIntelligence({
    speciesCategory: 'Tropical',
    potSizeCm: 25,
    soilMoisturePercent: 22,
    temperatureC: 33,
    humidityPercent: 45,
    rainfallMm: 0,
    sunlightHours: 5,
    season: 'Summer',
  });
  assert.equal(res.status, 'Needs Watering Now');
  assert.ok(res.recommendedMl > 200);
});

test('calculateEcoImpactScore produces transparent bounded 0-100 score', () => {
  const res = calculateEcoImpactScore({
    waterSavedLiters: 160,
    compostKg: 32,
    plantsMaintained: 10,
    wasteRecycledKg: 20,
    sustainableActions: 16,
  });
  assert.equal(res.ecoScore, 20 + 20 + 17 + 12 + 12);
  assert.equal(res.tier, 'Biosphere Architect');
  assert.ok(res.co2OffsetEstimateKg > 30);
});

test('evaluateSoilCondition identifies pH and N-P-K imbalances', () => {
  const res = evaluateSoilCondition({
    soilType: 'Red Laterite',
    ph: 5.1,
    moisture: 48,
    temperature: 24,
    nitrogen: 'Low',
    phosphorus: 'Optimal',
    potassium: 'Low',
  });
  assert.equal(res.phStatus, 'Strongly Acidic');
  assert.equal(res.imbalances.length, 2);
  assert.ok(res.soilHealthScore < 75);
});

test('buildPlantImageHistory aggregates unique frames from gallery, diagnoses, and current photo', () => {
  const history = buildPlantImageHistory(
    {
      id: 7,
      name: 'Krishna Tulsi',
      imageUrl: '/images/tulsi-current.webp',
      photoGalleryJson: JSON.stringify(['/images/tulsi-day1.webp', { url: '/images/tulsi-current.webp' }]),
    },
    [
      { plantId: 7, plantName: 'Krishna Tulsi', imageUrl: '/images/tulsi-scan-new.webp' },
      { plantId: 7, plantName: 'Krishna Tulsi', imageUrl: '/images/tulsi-scan-old.webp' },
      { plantId: 99, plantName: 'Other Plant', imageUrl: '/images/other.webp' },
    ]
  );
  assert.deepEqual(history, [
    '/images/tulsi-day1.webp',
    '/images/tulsi-current.webp',
    '/images/tulsi-scan-old.webp',
    '/images/tulsi-scan-new.webp',
  ]);
});

