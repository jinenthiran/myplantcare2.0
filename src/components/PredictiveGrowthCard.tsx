import React, { useState } from 'react';
import { TrendingUp, Sparkles, ArrowUpRight, Calendar } from 'lucide-react';
import { ObservatoryCard } from './ui/ObservatoryPrimitives';

interface PlantItem {
  id: number | string;
  name: string;
  species?: string;
  heightCm?: number;
  leafCount?: number;
  healthScore?: number;
}

interface PredictiveGrowthCardProps {
  plants: PlantItem[];
}

export const PredictiveGrowthCard: React.FC<PredictiveGrowthCardProps> = ({ plants = [] }) => {
  const [selectedPlantId, setSelectedPlantId] = useState<string | number>(plants[0]?.id || '');

  const activePlant = plants.find((p) => String(p.id) === String(selectedPlantId)) || plants[0];

  const currentHeight = Number(activePlant?.heightCm || 35);
  const currentLeaves = Number(activePlant?.leafCount || 12);
  const healthFactor = Number(activePlant?.healthScore || 90) / 100;

  const monthlyHeightGain = Math.round(Math.max(1, currentHeight * 0.08 * healthFactor) * 10) / 10;
  const monthlyLeafGain = Math.max(1, Math.round(currentLeaves * 0.12 * healthFactor));

  const projectedHeight = Math.round((currentHeight + monthlyHeightGain) * 10) / 10;
  const projectedLeaves = currentLeaves + monthlyLeafGain;

  return (
    <ObservatoryCard padding="lg" className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A]">
            <TrendingUp className="w-4 h-4" />
            <span>Botanical Growth Modeling</span>
          </p>
          <h3 className="text-lg sm:text-xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
            30-Day Growth Projection
          </h3>
        </div>

        {plants.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="forecast-plant-select" className="text-xs text-[#4A665B] dark:text-[#B6CDB4] font-medium">
              Specimen:
            </label>
            <select
              id="forecast-plant-select"
              value={activePlant?.id ?? ''}
              onChange={(e) => setSelectedPlantId(e.target.value)}
              className="bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/18 dark:border-[#B6CDB4]/20 text-[#10251D] dark:text-[#FAF7EE] text-xs rounded-xl px-3 py-1.5 font-semibold focus:outline-none focus:border-[#00D69A]"
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {plants.length === 0 ? (
        <div className="py-8 text-center text-[#4A665B] dark:text-[#B6CDB4] text-sm">
          Register plants in My Garden to calculate 30-day height and foliage projections from real measurements.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Current Specimen Baseline */}
          <div className="rounded-2xl p-5 bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="uppercase tracking-wider text-[#4A665B] dark:text-[#B6CDB4]">Baseline</span>
              <span className="font-bold text-[#0F6B50] dark:text-[#00D69A]">
                Health {activePlant?.healthScore ?? 90}%
              </span>
            </div>

            <div>
              <h4 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                {activePlant?.name}
              </h4>
              <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] italic">
                {activePlant?.species || 'Botanical Specimen'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/14 text-xs">
              <div>
                <div className="text-[#4A665B] dark:text-[#B6CDB4]">Height</div>
                <div className="text-base font-mono font-bold text-[#10251D] dark:text-[#FAF7EE] tabular-nums">
                  {currentHeight} cm
                </div>
              </div>
              <div>
                <div className="text-[#4A665B] dark:text-[#B6CDB4]">Leaf Count</div>
                <div className="text-base font-mono font-bold text-[#10251D] dark:text-[#FAF7EE] tabular-nums">
                  {currentLeaves}
                </div>
              </div>
            </div>
          </div>

          {/* 30-Day Horizon */}
          <div className="md:col-span-2 rounded-2xl p-5 bg-[#F1ECE0]/70 dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 flex flex-col justify-between space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#174C38] dark:text-[#C7F36B] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00D69A]" />
                30-Day Forecast Horizon
              </span>
              <span className="text-xs font-mono font-bold text-[#0F6B50] dark:text-[#00D69A] flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{monthlyHeightGain} cm est.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl p-4 bg-white dark:bg-[#153026] border border-[#174C38]/12 dark:border-[#B6CDB4]/14">
                <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mb-1 flex items-center justify-between">
                  <span>Projected Height (30d)</span>
                  <span className="font-mono font-bold text-[#0F6B50] dark:text-[#00D69A]">+{monthlyHeightGain} cm</span>
                </div>
                <div className="text-2xl font-display font-extrabold font-mono text-[#10251D] dark:text-[#FAF7EE] tabular-nums">
                  {projectedHeight} cm
                </div>
                <div className="w-full bg-[#E9F0E6] dark:bg-[#10251D] rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#00D69A] to-[#C7F36B] h-full rounded-full"
                    style={{ width: `${Math.min(100, (projectedHeight / (projectedHeight + 20)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl p-4 bg-white dark:bg-[#153026] border border-[#174C38]/12 dark:border-[#B6CDB4]/14">
                <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mb-1 flex items-center justify-between">
                  <span>Projected Leaf Count (30d)</span>
                  <span className="font-mono font-bold text-[#56C7C0]">+{monthlyLeafGain} leaves</span>
                </div>
                <div className="text-2xl font-display font-extrabold font-mono text-[#10251D] dark:text-[#FAF7EE] tabular-nums">
                  {projectedLeaves} leaves
                </div>
                <div className="w-full bg-[#E9F0E6] dark:bg-[#10251D] rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#56C7C0] to-[#00D69A] h-full rounded-full"
                    style={{ width: `${Math.min(100, (projectedLeaves / (projectedLeaves + 10)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] flex items-center gap-1.5 pt-2 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/12">
              <Sparkles className="w-3.5 h-3.5 text-[#00D69A] shrink-0" />
              <span>Estimated from current specimen height, leaf count, and latest health score.</span>
            </div>
          </div>
        </div>
      )}
    </ObservatoryCard>
  );
};
