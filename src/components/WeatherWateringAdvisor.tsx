import React, { useEffect, useState } from 'react';
import { fetchLocalWeather, WeatherData } from '../services/weatherService';
import {
  CloudSun,
  Droplets,
  Thermometer,
  RefreshCw,
  AlertCircle,
  Flame,
  Snowflake,
  Sun,
  CloudRain,
  Home,
  Trees,
  Building2,
} from 'lucide-react';
import { ObservatoryCard } from './ui/ObservatoryPrimitives';

export const WeatherWateringAdvisor: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLocalWeather();
      setWeather(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  const temp = weather?.temperature ?? 25;
  const isHeatwave = temp >= 35;
  const isFrostWarning = temp <= 3;

  return (
    <ObservatoryCard padding="lg" className="space-y-5">
      {isHeatwave && (
        <div className="rounded-2xl border border-[#FF806B]/45 bg-[#FF806B]/12 p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#FF806B]/20 text-[#C9432C] dark:text-[#FF806B] shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#C9432C] dark:text-[#FF806B]">
              <span>EXTREME HEATWAVE ALERT</span>
              <span>·</span>
              <span>{temp.toFixed(1)}°C</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#10251D] dark:text-[#FAF7EE]">
              Move exposed container plants into filtered shade, mulch topsoil generously, and hydrate early in the morning.
            </p>
          </div>
        </div>
      )}

      {isFrostWarning && (
        <div className="rounded-2xl border border-[#56C7C0]/45 bg-[#56C7C0]/12 p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#56C7C0]/20 text-[#136E68] dark:text-[#56C7C0] shrink-0">
            <Snowflake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#136E68] dark:text-[#56C7C0]">
              <span>FROST & FREEZE WARNING</span>
              <span>·</span>
              <span>{temp.toFixed(1)}°C</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#10251D] dark:text-[#FAF7EE]">
              Bring tender tropical specimens indoors immediately and shield raised outdoor beds with breathable frost cloth.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A]">
            <CloudSun className="w-4 h-4" />
            <span>Meteorological Care Advisor</span>
          </p>
          <h3 className="text-lg sm:text-xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
            Local Conditions & Environment-Specific Care
          </h3>
        </div>
        <button
          type="button"
          onClick={loadWeather}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#174C38]/18 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#193A2E] hover:border-[#00D69A] text-xs font-semibold text-[#10251D] dark:text-[#FAF7EE] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Updating...' : 'Refresh Weather'}</span>
        </button>
      </div>

      {loading && !weather ? (
        <div className="py-10 text-center text-[#4A665B] dark:text-[#B6CDB4] text-sm flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-[#00D69A] border-t-transparent rounded-full animate-spin" />
          <span>Fetching local meteorological conditions & UV index...</span>
        </div>
      ) : error && !weather ? (
        <div className="py-6 text-center text-[#FF806B] text-xs flex items-center justify-center gap-2 bg-[#FF806B]/10 rounded-xl border border-[#FF806B]/30 p-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : weather ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="rounded-xl p-4 bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF806B]/15 text-[#D9553F] dark:text-[#FF806B] flex items-center justify-center shrink-0">
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-display font-bold font-mono text-[#10251D] dark:text-[#FAF7EE] tabular-nums">
                  {weather.temperature.toFixed(1)}°C
                </div>
                <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4]">Temperature</div>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#56C7C0]/18 text-[#136E68] dark:text-[#56C7C0] flex items-center justify-center shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-display font-bold font-mono text-[#10251D] dark:text-[#FAF7EE] tabular-nums">
                  {weather.humidity}%
                </div>
                <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4]">Rel. Humidity</div>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5CA62]/22 text-[#8F6500] dark:text-[#F5CA62] flex items-center justify-center shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-display font-bold font-mono text-[#10251D] dark:text-[#FAF7EE] tabular-nums">
                  UV {weather.uvIndex}
                </div>
                <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4]">Solar UV Index</div>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00D69A]/16 text-[#0F6B50] dark:text-[#00D69A] flex items-center justify-center shrink-0">
                <CloudRain className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-display font-bold font-mono text-[#10251D] dark:text-[#FAF7EE] tabular-nums">
                  {weather.precipitation} mm
                </div>
                <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4]">Precipitation</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-mono font-semibold uppercase tracking-wider text-[#174C38] dark:text-[#C7F36B]">
                Zone Recommendations · {weather.locationName}
              </span>
              <span className="font-mono text-[#4A665B] dark:text-[#B6CDB4]">{weather.condition}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              <div className="rounded-xl p-4 bg-[#F1ECE0]/75 dark:bg-[#10251D] border border-[#174C38]/10 dark:border-[#B6CDB4]/14 space-y-1.5">
                <div className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-[#00D69A]" /> Indoor Sanctuary
                </div>
                <p className="text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                  {weather.environmentRecommendations.indoor}
                </p>
              </div>

              <div className="rounded-xl p-4 bg-[#F1ECE0]/75 dark:bg-[#10251D] border border-[#174C38]/10 dark:border-[#B6CDB4]/14 space-y-1.5">
                <div className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#56C7C0]" /> Balcony Garden
                </div>
                <p className="text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                  {weather.environmentRecommendations.balcony}
                </p>
              </div>

              <div className="rounded-xl p-4 bg-[#F1ECE0]/75 dark:bg-[#10251D] border border-[#174C38]/10 dark:border-[#B6CDB4]/14 space-y-1.5">
                <div className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1.5">
                  <CloudSun className="w-4 h-4 text-[#F5CA62]" /> Greenhouse
                </div>
                <p className="text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                  {weather.environmentRecommendations.greenhouse}
                </p>
              </div>

              <div className="rounded-xl p-4 bg-[#F1ECE0]/75 dark:bg-[#10251D] border border-[#174C38]/10 dark:border-[#B6CDB4]/14 space-y-1.5">
                <div className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1.5">
                  <Trees className="w-4 h-4 text-[#174C38] dark:text-[#C7F36B]" /> Outdoor Beds
                </div>
                <p className="text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                  {weather.environmentRecommendations.outdoor}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ObservatoryCard>
  );
};
