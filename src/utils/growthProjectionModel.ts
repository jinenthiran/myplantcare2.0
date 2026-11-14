/**
 * Deterministic 30-day botanical growth projection model shared by:
 * - VirtualGarden3D AR 30-Day Growth Time-Slider
 * - GrowthTimeLapseModal Real-World Photo vs. Projected Model Comparison Overlay
 * - GrowthProjectionChart & PredictiveGrowthCard
 */

export type VirtualSpeciesType = 'monstera' | 'tulsi' | 'ficus' | 'palm' | 'snake';

export interface GrowthProjectionInput {
  baseHeightCm: number;
  baseLeafCount: number;
  healthScore: number;
  speciesType?: VirtualSpeciesType | string;
  dayOffset: number; // 0..30
}

export interface GrowthProjectionAtDay {
  dayOffset: number;
  projectedHeightCm: number;
  projectedLeafCount: number;
  scaleMultiplier: number;
  canopySpreadMultiplier: number;
  newLeafRatio: number; // 0..1 fraction of new leaves unfurled
  estimatedGainCm: number;
  estimatedGainLeaves: number;
  milestoneLabel: string;
}

export interface CapturedPlantPhotoFrame {
  id: string;
  dataUrl: string;
  capturedDate: string; // YYYY-MM-DD
  dayOffset: number; // 0..30+
  measuredHeightCm?: number;
  measuredLeafCount?: number;
  note?: string;
  isBaselineReference?: boolean;
}

export interface GrowthComparisonPoint {
  frameId: string;
  dayOffset: number;
  capturedDate: string;
  actualHeightCm: number;
  projectedHeightCm: number;
  actualLeafCount: number;
  projectedLeafCount: number;
  varianceCm: number;
  variancePercent: number;
  status: 'Ahead of Projection' | 'On Track' | 'Needs Boost';
}

const SPECIES_GROWTH_RATES: Record<VirtualSpeciesType, { heightGainRate30d: number; leafGainRate30d: number; spreadFactor: number }> = {
  tulsi: { heightGainRate30d: 0.28, leafGainRate30d: 0.35, spreadFactor: 1.15 },
  monstera: { heightGainRate30d: 0.18, leafGainRate30d: 0.22, spreadFactor: 1.18 },
  palm: { heightGainRate30d: 0.16, leafGainRate30d: 0.18, spreadFactor: 1.14 },
  ficus: { heightGainRate30d: 0.14, leafGainRate30d: 0.2, spreadFactor: 1.12 },
  snake: { heightGainRate30d: 0.1, leafGainRate30d: 0.14, spreadFactor: 1.08 },
};

export function resolveSpeciesCategory(species?: string | null): VirtualSpeciesType {
  const q = String(species || '').toLowerCase();
  if (q.includes('tulsi') || q.includes('basil') || q.includes('herb') || q.includes('mint')) return 'tulsi';
  if (q.includes('ficus') || q.includes('fig') || q.includes('banyan') || q.includes('neem')) return 'ficus';
  if (q.includes('palm') || q.includes('areca') || q.includes('fern')) return 'palm';
  if (q.includes('snake') || q.includes('sansevieria') || q.includes('aloe') || q.includes('succulent')) return 'snake';
  return 'monstera';
}

export function computeProjectedGrowthAtDay(input: GrowthProjectionInput): GrowthProjectionAtDay {
  const clampedDay = Math.max(0, Math.min(30, Number.isFinite(input.dayOffset) ? input.dayOffset : 0));
  const safeHeight = Math.max(5, Number(input.baseHeightCm) || 35);
  const safeLeaves = Math.max(2, Math.round(Number(input.baseLeafCount) || 12));
  const healthFactor = Math.max(0.35, Math.min(1.15, (Number(input.healthScore) || 90) / 100));

  const speciesKey = resolveSpeciesCategory(input.speciesType);
  const rate = SPECIES_GROWTH_RATES[speciesKey];

  // Smooth botanical sigmoidal-like curve over 30 days (t in 0..1)
  const t = clampedDay / 30;
  const curveProgress = t === 0 ? 0 : Math.pow(t, 0.92);

  const maxHeightGain = Math.max(1.2, safeHeight * rate.heightGainRate30d * healthFactor);
  const estimatedGainCm = Number((maxHeightGain * curveProgress).toFixed(1));
  const projectedHeightCm = Number((safeHeight + estimatedGainCm).toFixed(1));

  const maxLeafGain = Math.max(1, Math.round(safeLeaves * rate.leafGainRate30d * healthFactor));
  const estimatedGainLeaves = Math.round(maxLeafGain * curveProgress);
  const projectedLeafCount = safeLeaves + estimatedGainLeaves;

  // 3D canopy scale multiplier (1.0 at day 0 -> up to ~1.35 at day 30 depending on species & health)
  const scaleMultiplier = Number((1 + rate.heightGainRate30d * 1.15 * healthFactor * curveProgress).toFixed(3));
  const canopySpreadMultiplier = Number((1 + (rate.spreadFactor - 1) * healthFactor * curveProgress).toFixed(3));

  let milestoneLabel = 'Day 0 · Current Baseline';
  if (clampedDay >= 25) {
    milestoneLabel = `Day ${Math.round(clampedDay)} · 30-Day Canopy Maturity`;
  } else if (clampedDay >= 15) {
    milestoneLabel = `Day ${Math.round(clampedDay)} · Mid-Cycle Foliar Expansion`;
  } else if (clampedDay >= 5) {
    milestoneLabel = `Day ${Math.round(clampedDay)} · Active Shoot Emergence`;
  } else if (clampedDay > 0) {
    milestoneLabel = `Day ${Math.round(clampedDay)} · Early Turgor & Root Push`;
  }

  return {
    dayOffset: Math.round(clampedDay * 10) / 10,
    projectedHeightCm,
    projectedLeafCount,
    scaleMultiplier,
    canopySpreadMultiplier,
    newLeafRatio: Number(curveProgress.toFixed(3)),
    estimatedGainCm,
    estimatedGainLeaves,
    milestoneLabel,
  };
}

export function computeGrowthComparisonTimeline(params: {
  frames: CapturedPlantPhotoFrame[];
  baseHeightCm: number;
  baseLeafCount: number;
  healthScore: number;
  speciesType?: string;
}): GrowthComparisonPoint[] {
  const sorted = [...params.frames].sort((a, b) => a.dayOffset - b.dayOffset);
  return sorted.map((frame) => {
    const proj = computeProjectedGrowthAtDay({
      baseHeightCm: params.baseHeightCm,
      baseLeafCount: params.baseLeafCount,
      healthScore: params.healthScore,
      speciesType: params.speciesType,
      dayOffset: frame.dayOffset,
    });

    const actualHeightCm =
      frame.measuredHeightCm !== undefined && Number.isFinite(frame.measuredHeightCm)
        ? Number(Number(frame.measuredHeightCm).toFixed(1))
        : proj.projectedHeightCm;

    const actualLeafCount =
      frame.measuredLeafCount !== undefined && Number.isFinite(frame.measuredLeafCount)
        ? Math.round(Number(frame.measuredLeafCount))
        : proj.projectedLeafCount;

    const varianceCm = Number((actualHeightCm - proj.projectedHeightCm).toFixed(1));
    const variancePercent =
      proj.projectedHeightCm > 0
        ? Number(((varianceCm / proj.projectedHeightCm) * 100).toFixed(1))
        : 0;

    let status: GrowthComparisonPoint['status'] = 'On Track';
    if (variancePercent >= 3) {
      status = 'Ahead of Projection';
    } else if (variancePercent <= -3) {
      status = 'Needs Boost';
    }

    return {
      frameId: frame.id,
      dayOffset: frame.dayOffset,
      capturedDate: frame.capturedDate,
      actualHeightCm,
      projectedHeightCm: proj.projectedHeightCm,
      actualLeafCount,
      projectedLeafCount: proj.projectedLeafCount,
      varianceCm,
      variancePercent,
      status,
    };
  });
}
