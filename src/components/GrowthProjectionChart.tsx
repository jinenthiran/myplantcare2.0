import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, Sparkles, Droplets } from 'lucide-react';
import { ClimateLogEntry } from './ClimateTrackerCard';
import { ObservatoryCard } from './ui/ObservatoryPrimitives';

interface GrowthProjectionChartProps {
  plants?: any[];
  growthRecords?: any[];
  climateLogs?: ClimateLogEntry[];
}

export const GrowthProjectionChart: React.FC<GrowthProjectionChartProps> = ({
  plants = [],
  climateLogs = [],
}) => {
  const [selectedPlantId, setSelectedPlantId] = useState<string | number>(plants[0]?.id || 'all');
  const [showClimateOverlay, setShowClimateOverlay] = useState<boolean>(true);

  const activePlant = plants.find((p) => String(p.id) === String(selectedPlantId)) || plants[0];
  const currentHeight = Number(activePlant?.heightCm || 40);
  const currentLeaves = Number(activePlant?.leafCount || 14);
  const healthScore = Number(activePlant?.healthScore || 92) / 100;

  const chartData: any[] = [];
  const today = new Date();

  for (let i = -15; i <= 0; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayStr = d.toISOString().slice(5, 10);
    const progressFactor = (i + 15) / 15;
    const h = Math.round(currentHeight * (0.85 + 0.15 * progressFactor) * 10) / 10;
    const l = Math.max(4, Math.round(currentLeaves * (0.8 + 0.2 * progressFactor)));
    const matchingClimate = climateLogs.length > 0 ? climateLogs[Math.abs(i) % climateLogs.length] : null;

    chartData.push({
      day: dayStr,
      height: h,
      leaves: l,
      humidity: matchingClimate ? matchingClimate.humidity : 60,
      lightLux: matchingClimate ? Math.round(matchingClimate.lightLux / 100) : 12,
    });
  }

  for (let i = 3; i <= 30; i += 3) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayStr = d.toISOString().slice(5, 10);
    const growthRate = Math.max(0.5, currentHeight * 0.05 * healthScore);
    const h = Math.round((currentHeight + growthRate * (i / 30)) * 10) / 10;
    const l = Math.round(currentLeaves + currentLeaves * 0.15 * healthScore * (i / 30));

    chartData.push({
      day: `+${i}d (${dayStr})`,
      height: h,
      leaves: l,
      humidity: climateLogs[0]?.humidity ?? 64,
      lightLux: climateLogs[0] ? Math.round(climateLogs[0].lightLux / 100) : 14,
    });
  }

  return (
    <ObservatoryCard padding="lg" className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A]">
            <TrendingUp className="w-4 h-4" />
            <span>Time-Series Growth & Climate Overlay</span>
          </p>
          <h3 className="text-lg sm:text-xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
            Growth Trajectory & Microclimate Correlation
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowClimateOverlay(!showClimateOverlay)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
              showClimateOverlay
                ? 'bg-[#56C7C0]/16 border-[#56C7C0]/45 text-[#136E68] dark:text-[#56C7C0]'
                : 'bg-[#FAF7EE] dark:bg-[#10251D] border-[#174C38]/16 dark:border-[#B6CDB4]/18 text-[#4A665B] dark:text-[#B6CDB4]'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Climate Overlay: {showClimateOverlay ? 'ON' : 'OFF'}</span>
          </button>

          {plants.length > 0 && (
            <select
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
          )}
        </div>
      </div>

      {plants.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#4A665B] dark:text-[#B6CDB4]">
          Add plants to My Garden to visualize their projected height, leaf count, and microclimate correlation.
        </div>
      ) : (
        <div className="h-72 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#B6CDB4" opacity={0.25} />
              <XAxis dataKey="day" stroke="#687D73" fontSize={11} tickLine={false} />
              <YAxis yAxisId="left" stroke="#00D69A" fontSize={11} tickLine={false} unit=" cm" />
              <YAxis yAxisId="right" orientation="right" stroke="#56C7C0" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#10251D',
                  borderColor: '#00D69A',
                  borderRadius: '12px',
                  color: '#FAF7EE',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="height"
                name="Height (cm)"
                stroke="#00D69A"
                strokeWidth={3}
                dot={{ r: 3, fill: '#00D69A' }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="leaves"
                name="Leaf Count"
                stroke="#BBA8F5"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: '#BBA8F5' }}
              />
              {showClimateOverlay && (
                <>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity (% RH)"
                    stroke="#56C7C0"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="lightLux"
                    name="Light (x100 Lux)"
                    stroke="#F5CA62"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4A665B] dark:text-[#B6CDB4] pt-3 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/12">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#00D69A]" />
          <span>Emerald = height · Lavender = leaf count · Teal = humidity · Gold = light intensity.</span>
        </span>
        <span className="font-mono text-[#0F6B50] dark:text-[#00D69A]">
          Climate Logs Linked: {climateLogs.length}
        </span>
      </div>
    </ObservatoryCard>
  );
};
