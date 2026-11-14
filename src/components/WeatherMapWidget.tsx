import React, { useState } from 'react';
import { MapPin, Shield, Thermometer, Layers, Eye, RefreshCw } from 'lucide-react';
import { ObservatoryCard } from './ui/ObservatoryPrimitives';

interface WeatherMapWidgetProps {
  temperature?: number;
  humidity?: number;
  locationName?: string;
}

export const WeatherMapWidget: React.FC<WeatherMapWidgetProps> = ({
  temperature = 29.5,
  humidity = 68,
  locationName = 'Local Garden Zone',
}) => {
  const [mapLayer, setMapLayer] = useState<'temperature' | 'hardiness' | 'radar'>('temperature');
  const [isLiveScanning, setIsLiveScanning] = useState(false);

  const isHeat = temperature >= 32;
  const isFrost = temperature <= 3;

  const hardinessZone =
    temperature > 26
      ? 'Zone 10b / 11 (Tropical)'
      : temperature > 18
      ? 'Zone 9a (Subtropical)'
      : 'Zone 6–8 (Temperate)';

  const handleRunRadarScan = () => {
    setIsLiveScanning(true);
    setTimeout(() => setIsLiveScanning(false), 900);
  };

  return (
    <ObservatoryCard padding="md" className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A]">
            <MapPin className="w-3.5 h-3.5" />
            <span>Hardiness & Microclimate Map</span>
          </p>
          <h4 className="text-base sm:text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
            Climate Zone & Moisture Envelope
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg text-xs font-mono bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#B6CDB4]/18 text-[#174C38] dark:text-[#C7F36B]">
            {hardinessZone}
          </span>
          <button
            type="button"
            onClick={handleRunRadarScan}
            disabled={isLiveScanning}
            aria-label="Refresh climate layer"
            className="p-2 rounded-xl bg-[#FAF7EE] dark:bg-[#193A2E] border border-[#174C38]/16 dark:border-[#B6CDB4]/20 text-[#10251D] dark:text-[#FAF7EE] hover:border-[#00D69A] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLiveScanning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Layer selector tabs */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-[#F1ECE0] dark:bg-[#10251D] p-1 rounded-xl border border-[#174C38]/12 dark:border-[#B6CDB4]/14 text-xs font-medium">
        <button
          type="button"
          onClick={() => setMapLayer('temperature')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer ${
            mapLayer === 'temperature'
              ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-bold shadow-xs'
              : 'text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#10251D] dark:hover:text-[#FAF7EE]'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5" />
          <span>Thermal Band</span>
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('hardiness')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer ${
            mapLayer === 'hardiness'
              ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-bold shadow-xs'
              : 'text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#10251D] dark:hover:text-[#FAF7EE]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Hardiness Zone</span>
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('radar')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer ${
            mapLayer === 'radar'
              ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-bold shadow-xs'
              : 'text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#10251D] dark:hover:text-[#FAF7EE]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Moisture Envelope</span>
        </button>
      </div>

      {/* Observatory Map Display Canvas */}
      <div className="relative min-h-[190px] rounded-2xl bg-[#10251D] border border-[#00D69A]/25 overflow-hidden p-5 flex flex-col justify-between text-[#FAF7EE]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(#00D69A_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none"
        />

        {mapLayer === 'temperature' && (
          <div className="relative z-10 flex-1 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#B6CDB4]">THERMAL PROFILE</span>
              <span
                className={`font-semibold ${
                  isHeat ? 'text-[#FF806B]' : isFrost ? 'text-[#56C7C0]' : 'text-[#C7F36B]'
                }`}
              >
                {isHeat ? 'Heat Stress Watch' : isFrost ? 'Frost Risk' : 'Optimal Thermal Band'}
              </span>
            </div>

            <div className="text-center py-2">
              <div className="text-3xl sm:text-4xl font-display font-extrabold font-mono text-[#FAF7EE] tabular-nums">
                {temperature.toFixed(1)}°C
              </div>
              <div className="text-xs text-[#00D69A] font-mono mt-1">{locationName}</div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#B6CDB4] border-t border-[#FAF7EE]/10 pt-2.5">
              <span>Relative Humidity: {humidity}%</span>
              <span>Botanical Envelope Synced</span>
            </div>
          </div>
        )}

        {mapLayer === 'hardiness' && (
          <div className="relative z-10 flex-1 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#B6CDB4]">USDA HARDINESS CLASSIFICATION</span>
              <span className="text-[#BBA8F5] font-semibold">{hardinessZone}</span>
            </div>

            <div className="text-center py-2 space-y-1">
              <div className="text-xl sm:text-2xl font-display font-bold text-[#FAF7EE]">
                Warm-Climate Perennial Zone
              </div>
              <p className="text-xs text-[#B6CDB4] max-w-md mx-auto">
                Suited for tropical foliage, indoor aroids, palms, orchids, and perennial culinary herbs.
              </p>
            </div>

            <div className="text-[11px] font-mono text-[#B6CDB4] text-center border-t border-[#FAF7EE]/10 pt-2.5">
              Derived from current garden temperature baseline
            </div>
          </div>
        )}

        {mapLayer === 'radar' && (
          <div className="relative z-10 flex-1 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#B6CDB4]">ATMOSPHERIC MOISTURE INDEX</span>
              <span className="text-[#56C7C0] font-semibold">{humidity}% RH</span>
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
              <div className="w-12 h-12 rounded-2xl bg-[#00D69A]/15 border border-[#00D69A]/40 flex items-center justify-center text-[#00D69A]">
                <Eye className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-sm font-display font-bold text-[#FAF7EE]">
                  {humidity >= 60 ? 'Humid Tropical Canopy Band' : 'Moderate Evaporation Band'}
                </div>
                <p className="text-xs text-[#B6CDB4]">
                  {humidity >= 60
                    ? 'Reduced transpiration loss; verify topsoil drainage before watering.'
                    : 'Moderate air dryness; mist humidity-loving tropical ferns.'}
                </p>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#B6CDB4] text-center border-t border-[#FAF7EE]/10 pt-2.5">
              Use Weather Advisor above for city-specific forecast
            </div>
          </div>
        )}
      </div>
    </ObservatoryCard>
  );
};
