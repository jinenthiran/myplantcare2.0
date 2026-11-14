import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_TOOLS_CATALOG,
  buildAiToolsPath,
  computeGrowthDelta,
  evaluateImageQualityMetrics,
  getToolBySlug,
  normalizeToolAnalysisResult,
  normalizeToolSlug,
  parseAiToolsRoute,
} from './aiToolsCatalog.ts';

test('AI Tools Catalog contains all 19 distinct required tools and slugs', () => {
  assert.equal(AI_TOOLS_CATALOG.length, 19);
  const requiredSlugs = [
    'plant-identifier',
    'leaf-health',
    'disease-detector',
    'pest-detector',
    'nutrient-doctor',
    'watering-doctor',
    'soil-doctor',
    'plant-rescue',
    'root-health',
    'flower-health',
    'fruit-health',
    'plant-growth',
    'pruning-assistant',
    'repotting-assistant',
    'weed-identifier',
    'plant-propagation',
    'plant-safety',
    'garden-coach',
    'environment-optimizer',
  ];
  const actualSlugs = AI_TOOLS_CATALOG.map((t) => t.slug);
  assert.deepEqual(new Set(actualSlugs), new Set(requiredSlugs));
  assert.ok(AI_TOOLS_CATALOG.every((t) => t.supportsCamera === true));
  assert.ok(AI_TOOLS_CATALOG.every((t) => t.scientificGuardrail.length > 20));
});

test('parseAiToolsRoute and buildAiToolsPath resolve /ai-tools and /ai-tools/:slug accurately', () => {
  assert.deepEqual(parseAiToolsRoute('/'), {
    isAiToolsRoute: false,
    activeToolSlug: null,
  });
  assert.deepEqual(parseAiToolsRoute('/ai-tools'), {
    isAiToolsRoute: true,
    activeToolSlug: null,
  });
  assert.deepEqual(parseAiToolsRoute('/ai-tools/disease-detector/'), {
    isAiToolsRoute: true,
    activeToolSlug: 'disease-detector',
  });
  assert.equal(buildAiToolsPath(null), '/ai-tools');
  assert.equal(buildAiToolsPath('plant-safety'), '/ai-tools/plant-safety');
  assert.equal(normalizeToolSlug('soil-analyser'), 'soil-doctor');
  assert.equal(getToolBySlug('watering-doctor')?.name, 'AI Watering Doctor');
});

test('normalizeToolAnalysisResult enforces structured fields and attaches tool scientific guardrail', () => {
  const normalized = normalizeToolAnalysisResult(
    {
      headline: 'Early Powdery Mildew Screening',
      plant_identification: {
        common_name: 'Garden Rose',
        scientific_name: 'Rosa spp.',
        confidence: 62,
      },
      observations: ['White powdery patches on upper leaf lamina.'],
      possible_causes: ['High humidity with stagnant air around canopy.'],
      severity: 'Moderate',
      recommendations: ['Isolate pot and apply diluted potassium bicarbonate spray.'],
      follow_up: ['Inspect new leaves after 5 days.'],
      limitations: [],
    },
    'disease-detector'
  );

  assert.equal(normalized.tool, 'disease-detector');
  assert.equal(normalized.plant_identification.is_uncertain, true);
  assert.equal(normalized.severity, 'Moderate');
  assert.ok(
    normalized.limitations.some((l) => l.toLowerCase().includes('not a laboratory')),
    'Expected disease detector limitation warning'
  );
});

test('computeGrowthDelta calculates elapsed days and measurement deltas cleanly', () => {
  const delta = computeGrowthDelta({
    beforeDate: '2026-10-01',
    afterDate: '2026-10-29',
    beforeHeightCm: 42.5,
    afterHeightCm: 51.0,
    beforeLeaves: 10,
    afterLeaves: 15,
  });

  assert.equal(delta.daysElapsed, 28);
  assert.equal(delta.heightChangeCm, 8.5);
  assert.equal(delta.leafCountChange, 5);
});

test('evaluateImageQualityMetrics catches dark or blurry captures while passing crisp daylight images', () => {
  const darkBlur = evaluateImageQualityMetrics({
    width: 640,
    height: 480,
    avgLuminance: 14,
    edgeContrast: 3,
  });
  assert.equal(darkBlur.passed, false);
  assert.ok(darkBlur.warnings.length >= 2);

  const crisp = evaluateImageQualityMetrics({
    width: 1024,
    height: 768,
    avgLuminance: 132,
    edgeContrast: 28,
  });
  assert.equal(crisp.passed, true);
  assert.equal(crisp.warnings.length, 0);
});

test('all 19 AI tools configure camera image slots and CameraPermissionHandler degrades cleanly when unavailable', async () => {
  const { isCameraSupported, requestCameraStream } = await import(
    '../components/ai-tools/CameraPermissionHandler.ts'
  );

  for (const tool of AI_TOOLS_CATALOG) {
    assert.equal(tool.supportsCamera, true, `${tool.slug} must enable PlantCamera`);
    assert.ok(tool.maxImages >= 1, `${tool.slug} must allow at least 1 image`);
    assert.ok(tool.imageSlotLabels.length >= 1, `${tool.slug} must define image slot labels`);
  }

  assert.equal(isCameraSupported(), false);
  const res = await requestCameraStream('environment');
  assert.equal(res.stream, null);
  assert.equal(res.status, 'unavailable');
  assert.ok(res.errorMessage.toLowerCase().includes('upload'));
});
