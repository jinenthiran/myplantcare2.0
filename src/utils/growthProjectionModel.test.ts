import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeProjectedGrowthAtDay,
  computeGrowthComparisonTimeline,
  resolveSpeciesCategory,
} from './growthProjectionModel';

test('resolveSpeciesCategory maps common plant names to 3D botanical archetypes', () => {
  assert.equal(resolveSpeciesCategory('Sacred Krishna Tulsi'), 'tulsi');
  assert.equal(resolveSpeciesCategory('Fiddle Leaf Fig (Ficus)'), 'ficus');
  assert.equal(resolveSpeciesCategory('Golden Cane Areca Palm'), 'palm');
  assert.equal(resolveSpeciesCategory('Sansevieria Snake Plant'), 'snake');
  assert.equal(resolveSpeciesCategory('Monstera deliciosa'), 'monstera');
});

test('computeProjectedGrowthAtDay returns exact baseline at day 0 and scales monotonically to day 30', () => {
  const day0 = computeProjectedGrowthAtDay({
    baseHeightCm: 40,
    baseLeafCount: 12,
    healthScore: 95,
    speciesType: 'monstera',
    dayOffset: 0,
  });
  assert.equal(day0.projectedHeightCm, 40);
  assert.equal(day0.projectedLeafCount, 12);
  assert.equal(day0.scaleMultiplier, 1);
  assert.equal(day0.newLeafRatio, 0);

  const day15 = computeProjectedGrowthAtDay({
    baseHeightCm: 40,
    baseLeafCount: 12,
    healthScore: 95,
    speciesType: 'monstera',
    dayOffset: 15,
  });
  const day30 = computeProjectedGrowthAtDay({
    baseHeightCm: 40,
    baseLeafCount: 12,
    healthScore: 95,
    speciesType: 'monstera',
    dayOffset: 30,
  });

  assert.ok(day15.projectedHeightCm > day0.projectedHeightCm);
  assert.ok(day30.projectedHeightCm > day15.projectedHeightCm);
  assert.ok(day30.scaleMultiplier > day15.scaleMultiplier);
  assert.ok(day30.projectedLeafCount >= day15.projectedLeafCount);
  assert.equal(day30.newLeafRatio, 1);
});

test('computeProjectedGrowthAtDay clamps out-of-range days cleanly', () => {
  const neg = computeProjectedGrowthAtDay({
    baseHeightCm: 30,
    baseLeafCount: 10,
    healthScore: 90,
    dayOffset: -5,
  });
  assert.equal(neg.dayOffset, 0);
  assert.equal(neg.scaleMultiplier, 1);

  const over = computeProjectedGrowthAtDay({
    baseHeightCm: 30,
    baseLeafCount: 10,
    healthScore: 90,
    dayOffset: 45,
  });
  assert.equal(over.dayOffset, 30);
});

test('computeGrowthComparisonTimeline computes variance and status accurately against projected curve', () => {
  const timeline = computeGrowthComparisonTimeline({
    baseHeightCm: 40,
    baseLeafCount: 10,
    healthScore: 90,
    speciesType: 'tulsi',
    frames: [
      {
        id: 'f1',
        dataUrl: 'data:image/png;base64,abc',
        capturedDate: '2026-11-01',
        dayOffset: 0,
        measuredHeightCm: 40,
        measuredLeafCount: 10,
      },
      {
        id: 'f2',
        dataUrl: 'data:image/png;base64,def',
        capturedDate: '2026-11-16',
        dayOffset: 15,
        measuredHeightCm: 52,
        measuredLeafCount: 14,
      },
      {
        id: 'f3',
        dataUrl: 'data:image/png;base64,ghi',
        capturedDate: '2026-11-28',
        dayOffset: 27,
        measuredHeightCm: 41,
        measuredLeafCount: 10,
      },
    ],
  });

  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].status, 'On Track');
  assert.equal(timeline[1].status, 'Ahead of Projection');
  assert.ok(timeline[1].varianceCm > 0);
  assert.equal(timeline[2].status, 'Needs Boost');
  assert.ok(timeline[2].varianceCm < 0);
});
