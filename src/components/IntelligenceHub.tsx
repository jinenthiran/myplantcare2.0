import React, { useState, useEffect } from 'react';
import {
  Droplets,
  CloudSun,
  TrendingUp,
  Compass,
  Layers,
  ShieldCheck,
  Sparkles,
  Check,
  MapPin,
} from 'lucide-react';
import {
  calculateWateringIntelligence,
  evaluateSoilCondition,
  WateringInput,
} from '../utils/botanicalAnalytics';
import { PLANT_LIBRARY } from '../data/botanicalCatalog';

export type IntelligenceTool =
  | 'soil'
  | 'water'
  | 'weather'
  | 'growth'
  | 'predictive'
  | 'designer'
  | 'recommender'
  | 'compatibility'
  | 'comparison'
  | 'leaf-root'
  | 'seasonal';

interface IntelligenceHubProps {
  activeTool: IntelligenceTool;
  onToolChange: (tool: IntelligenceTool) => void;
  workspaceData: any;
  onRefreshWorkspace: () => void;
  authToken?: string | null;
}

export const IntelligenceHub: React.FC<IntelligenceHubProps> = ({
  activeTool,
  onToolChange,
  workspaceData,
  onRefreshWorkspace,
  authToken,
}) => {
  // 1. Soil Intelligence State
  const [soilPlant, setSoilPlant] = useState('Emerald Fenestra (Monstera)');
  const [soilType, setSoilType] = useState('Chunky Aroid Bark Mix');
  const [soilPh, setSoilPh] = useState(6.3);
  const [soilMoisture, setSoilMoisture] = useState(56);
  const [soilTemp, setSoilTemp] = useState(24);
  const [soilN, setSoilN] = useState<'Low' | 'Optimal' | 'High'>('Optimal');
  const [soilP, setSoilP] = useState<'Low' | 'Optimal' | 'High'>('Optimal');
  const [soilK, setSoilK] = useState<'Low' | 'Optimal' | 'High'>('Optimal');
  const [soilSavedMsg, setSoilSavedMsg] = useState('');

  const soilAssessment = evaluateSoilCondition({
    soilType,
    ph: soilPh,
    moisture: soilMoisture,
    temperature: soilTemp,
    nitrogen: soilN,
    phosphorus: soilP,
    potassium: soilK,
  });

  const handleSaveSoilRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    await fetch('/api/soil', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        plantName: soilPlant,
        soilType,
        ph: soilPh,
        moisture: soilMoisture,
        temperature: soilTemp,
        nitrogen: soilN,
        phosphorus: soilP,
        potassium: soilK,
        aiSummary: `${soilAssessment.phStatus} (Score ${soilAssessment.soilHealthScore}/100)`,
        recommendations: soilAssessment.amendmentAdvice,
      }),
    });
    setSoilSavedMsg('Soil report saved to Cloud SQL database.');
    onRefreshWorkspace();
    setTimeout(() => setSoilSavedMsg(''), 3000);
  };

  // 2. Water Intelligence State
  const [waterInput, setWaterInput] = useState<WateringInput>({
    speciesCategory: 'Tropical',
    potSizeCm: 25,
    soilMoisturePercent: 34,
    temperatureC: 29,
    humidityPercent: 58,
    rainfallMm: 0,
    sunlightHours: 5,
    season: 'Summer',
  });
  const waterResult = calculateWateringIntelligence(waterInput);

  // 3. Weather Intelligence State
  const [weatherCity, setWeatherCity] = useState('Bengaluru');
  const [weatherCoords, setWeatherCoords] = useState({ lat: 12.9716, lon: 77.5946 });
  const [weatherData, setWeatherData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/weather?lat=${weatherCoords.lat}&lon=${weatherCoords.lon}&city=${encodeURIComponent(weatherCity)}`)
      .then((r) => r.json())
      .then((d) => setWeatherData(d))
      .catch(() => {});
  }, [weatherCoords, weatherCity]);

  const cityPresets = [
    { name: 'Bengaluru (Tropical Highland)', lat: 12.9716, lon: 77.5946 },
    { name: 'Chennai (Coastal Tropical)', lat: 13.0827, lon: 80.2707 },
    { name: 'Mumbai (Humid Monsoon Coast)', lat: 19.076, lon: 72.8777 },
    { name: 'New Delhi (Subtropical Semi-Arid)', lat: 28.6139, lon: 77.209 },
  ];

  // 4. Growth Tracker State
  const [growthPlantName, setGrowthPlantName] = useState('Emerald Fenestra');
  const [growthHeight, setGrowthHeight] = useState(71);
  const [growthLeaves, setGrowthLeaves] = useState(14);
  const [growthNotes, setGrowthNotes] = useState('New 36cm fenestrated leaf blade unfurled with strong turgor.');

  const handleLogGrowth = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    await fetch('/api/growth', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        plantName: growthPlantName,
        heightCm: growthHeight,
        leafCount: growthLeaves,
        observation: growthNotes,
        healthScore: 96,
      }),
    });
    onRefreshWorkspace();
  };

  // 5. AI Garden Designer State
  const [designStyle, setDesignStyle] = useState('Tropical Garden');
  const [designSpace, setDesignSpace] = useState('Balcony Garden');
  const [designDims, setDesignDims] = useState('4.0m × 2.0m');
  const [designSun, setDesignSun] = useState('Morning Direct Sun (4–5 hrs)');
  const [designBudget, setDesignBudget] = useState('Moderate (₹15,000)');
  const [isDesigning, setIsDesigning] = useState(false);

  const handleGenerateGardenPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDesigning(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      await fetch('/api/ai/garden-design', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `${designStyle} (${designSpace})`,
          style: designStyle,
          spaceType: designSpace,
          dimensions: designDims,
          sunlight: designSun,
          climate: 'Tropical Warm',
          budget: designBudget,
        }),
      });
      onRefreshWorkspace();
    } finally {
      setIsDesigning(false);
    }
  };

  // 6. Plant Recommendation Filter State
  const [recSpace, setRecSpace] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
  const [recWater, setRecWater] = useState<'All' | 'Low' | 'Moderate' | 'High'>('All');
  const filteredRecommendations = PLANT_LIBRARY.filter((p) => {
    const spaceMatch = recSpace === 'All' || p.spaceSuitability === recSpace || p.spaceSuitability === 'Both';
    const waterMatch = recWater === 'All' || p.waterNeed === recWater;
    return spaceMatch && waterMatch;
  });

  // 8. Plant Compatibility & Companion Planting State
  const [compPlantA, setCompPlantA] = useState(PLANT_LIBRARY[0].id);
  const [compPlantB, setCompPlantB] = useState(PLANT_LIBRARY[1].id);

  // 9. Side-by-Side Plant Comparison State
  const [compareLeftId, setCompareLeftId] = useState(PLANT_LIBRARY[0].id);
  const [compareRightId, setCompareRightId] = useState(PLANT_LIBRARY[2].id);

  // 10. Seasonal & Fertilizer Planner State
  const [selectedSeasonPlan, setSelectedSeasonPlan] = useState<'Spring' | 'Summer' | 'Monsoon' | 'Autumn' | 'Winter'>('Monsoon');

  const toolTabs = [
    { id: 'soil', label: 'Soil Intelligence', icon: Layers },
    { id: 'water', label: 'Water Intelligence', icon: Droplets },
    { id: 'weather', label: 'Weather & Climate', icon: CloudSun },
    { id: 'growth', label: 'Growth Tracker', icon: TrendingUp },
    { id: 'predictive', label: 'Predictive Health', icon: ShieldCheck },
    { id: 'designer', label: 'AI Garden & Space Optimizer', icon: Compass },
    { id: 'recommender', label: 'Plant Recommender', icon: Sparkles },
    { id: 'compatibility', label: 'Companion & Compatibility', icon: Check },
    { id: 'comparison', label: 'Plant Comparison', icon: Layers },
    { id: 'leaf-root', label: 'Leaf & Root Educator', icon: ShieldCheck },
    { id: 'seasonal', label: 'Seasonal & Fertilizer Guide', icon: CloudSun },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar for AI Tools */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-2 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
        {toolTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToolChange(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTool === t.id
                  ? 'bg-[#00C878] text-[#071B12]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. SOIL INTELLIGENCE */}
      {activeTool === 'soil' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveSoilRecord}
            className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Soil Intelligence & Rhizosphere Analyzer
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
              Enter real probe measurements or laboratory soil report figures. Never fabricates lab data from photos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Target Plant / Plot</label>
                <input
                  type="text"
                  value={soilPlant}
                  onChange={(e) => setSoilPlant(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Substrate / Soil Type</label>
                <input
                  type="text"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Soil pH: <span className="font-mono font-bold text-[#00C878]">{soilPh}</span>
                </label>
                <input
                  type="range"
                  min="4.5"
                  max="8.5"
                  step="0.1"
                  value={soilPh}
                  onChange={(e) => setSoilPh(Number(e.target.value))}
                  className="w-full accent-[#00C878]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Moisture: <span className="font-mono font-bold text-[#00C878]">{soilMoisture}%</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="95"
                  step="1"
                  value={soilMoisture}
                  onChange={(e) => setSoilMoisture(Number(e.target.value))}
                  className="w-full accent-[#00C878]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Temp: <span className="font-mono font-bold text-[#00C878]">{soilTemp}°C</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="38"
                  step="0.5"
                  value={soilTemp}
                  onChange={(e) => setSoilTemp(Number(e.target.value))}
                  className="w-full accent-[#00C878]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {([
                ['Nitrogen (N)', soilN, setSoilN],
                ['Phosphorus (P)', soilP, setSoilP],
                ['Potassium (K)', soilK, setSoilK],
              ] as const).map(([label, val, setter]) => (
                <div key={label}>
                  <label className="block text-xs font-medium mb-1">{label}</label>
                  <select
                    value={val}
                    onChange={(e) => setter(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                  >
                    <option value="Low">Low</option>
                    <option value="Optimal">Optimal</option>
                    <option value="High">High</option>
                  </select>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors"
            >
              Save Soil Intelligence Log to Database
            </button>
            {soilSavedMsg && <p className="text-xs text-[#00C878] font-medium">{soilSavedMsg}</p>}
          </form>

          <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#123D2A] pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Soil Health Assessment</h4>
                <p className="text-xs text-slate-500 dark:text-[#B7F76B]">{soilAssessment.phStatus}</p>
              </div>
              <div className="text-3xl font-extrabold font-mono text-[#00C878] tabular-nums">
                {soilAssessment.soilHealthScore}/100
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">Nutrient Balance Findings:</div>
              {soilAssessment.imbalances.map((item, i) => (
                <p key={i} className="text-slate-600 dark:text-[#F7F9F2]/80">
                  • {item}
                </p>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-[#B7F76B]">Compost & Drainage Prescription</div>
              <p className="text-slate-700 dark:text-[#F7F9F2]/85">{soilAssessment.amendmentAdvice}</p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white">Saved Soil Reports ({workspaceData?.soils?.length || 0})</div>
              {(workspaceData?.soils || []).slice(0, 3).map((s: any) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{s.plantName}</div>
                    <div className="text-slate-500 dark:text-[#F7F9F2]/65">
                      {s.soilType} · pH {s.ph} · Moisture {s.moisture}%
                    </div>
                  </div>
                  <span className="font-mono text-[#00C878]">N:{s.nitrogen}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. WATER INTELLIGENCE */}
      {activeTool === 'water' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Water Intelligence & Evapotranspiration Engine
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Species Category</label>
                <select
                  value={waterInput.speciesCategory}
                  onChange={(e) => setWaterInput({ ...waterInput, speciesCategory: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                >
                  <option value="Tropical">Tropical Foliage (Monstera, Ficus)</option>
                  <option value="Herb">Sacred & Culinary Herbs (Tulsi, Mint)</option>
                  <option value="Succulent">Succulent / CAM (Snake Plant, Aloe)</option>
                  <option value="Flowering">Tropical Flowering (Hibiscus)</option>
                  <option value="Tree">Container Tree (Curry Leaf, Neem)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Growing Season</label>
                <select
                  value={waterInput.season}
                  onChange={(e) => setWaterInput({ ...waterInput, season: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                >
                  <option value="Spring">Spring</option>
                  <option value="Summer">Summer</option>
                  <option value="Monsoon">Monsoon</option>
                  <option value="Autumn">Autumn</option>
                  <option value="Winter">Winter</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Current Soil Moisture: <span className="font-mono font-bold text-[#00C878]">{waterInput.soilMoisturePercent}%</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={waterInput.soilMoisturePercent}
                  onChange={(e) => setWaterInput({ ...waterInput, soilMoisturePercent: Number(e.target.value) })}
                  className="w-full accent-[#00C878]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Pot Diameter: <span className="font-mono font-bold text-[#00C878]">{waterInput.potSizeCm} cm</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={waterInput.potSizeCm}
                  onChange={(e) => setWaterInput({ ...waterInput, potSizeCm: Number(e.target.value) })}
                  className="w-full accent-[#00C878]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Temp ({waterInput.temperatureC}°C)</label>
                <input
                  type="range"
                  min="12"
                  max="42"
                  value={waterInput.temperatureC}
                  onChange={(e) => setWaterInput({ ...waterInput, temperatureC: Number(e.target.value) })}
                  className="w-full accent-[#00C878]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Humidity ({waterInput.humidityPercent}%)</label>
                <input
                  type="range"
                  min="20"
                  max="95"
                  value={waterInput.humidityPercent}
                  onChange={(e) => setWaterInput({ ...waterInput, humidityPercent: Number(e.target.value) })}
                  className="w-full accent-[#00C878]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Rainfall ({waterInput.rainfallMm}mm)</label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={waterInput.rainfallMm}
                  onChange={(e) => setWaterInput({ ...waterInput, rainfallMm: Number(e.target.value) })}
                  className="w-full accent-[#00C878]"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#00C878]">HYDRATION TELEMETRY</div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{waterResult.status}</h4>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">Recommended Dose</div>
                <div className="text-3xl font-extrabold font-mono text-[#00C878] tabular-nums">
                  {waterResult.recommendedMl} ml
                </div>
              </div>
            </div>

            {/* Moisture Bar Visualization */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Root-Zone Moisture Saturation</span>
                <span className="font-mono font-bold">{waterInput.soilMoisturePercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-[#071B12] overflow-hidden border border-slate-200 dark:border-[#123D2A]">
                <div
                  className="h-full bg-gradient-to-r from-[#00C878] to-[#B7F76B] transition-all duration-300"
                  style={{ width: `${waterInput.soilMoisturePercent}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-[#F7F9F2]/85 leading-relaxed">
              {waterResult.explanation}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="text-slate-500 dark:text-[#F7F9F2]/60">Recommended Cadence</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  Every {waterResult.intervalDays} Days
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="text-slate-500 dark:text-[#F7F9F2]/60">Next Moisture Check</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  In {waterResult.nextCheckHours} Hours
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#00C878]/10 border border-[#00C878]/30 text-xs text-slate-800 dark:text-[#B7F76B]">
              <strong>Water-Saving Strategy:</strong> {waterResult.waterSavingTip}
            </div>
          </div>
        </div>
      )}

      {/* 3. WEATHER & CLIMATE INTELLIGENCE */}
      {activeTool === 'weather' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#00C878]" /> Live Weather & Microclimate Intelligence
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Powered by Open-Meteo Real-Time Meteorological Telemetry · Automated Botanical Care Advisories
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {cityPresets.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setWeatherCity(c.name);
                      setWeatherCoords({ lat: c.lat, lon: c.lon });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      weatherCity === c.name
                        ? 'bg-[#00C878] text-[#071B12] border-[#00C878] font-bold'
                        : 'border-slate-200 dark:border-[#123D2A] text-slate-700 dark:text-[#F7F9F2]/80'
                    }`}
                  >
                    {c.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {weatherData && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">Temperature</div>
                    <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                      {weatherData.current?.temperatureC}°C
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">Humidity</div>
                    <div className="text-2xl font-bold font-mono text-[#00C878] mt-1 tabular-nums">
                      {weatherData.current?.humidityPercent}%
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">Rain Probability</div>
                    <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                      {weatherData.current?.rainProbabilityPercent}%
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">Wind Speed</div>
                    <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                      {weatherData.current?.windSpeedKmh} km/h
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">UV Index</div>
                    <div className="text-2xl font-bold font-mono text-[#D4B56A] mt-1 tabular-nums">
                      {weatherData.current?.uvIndex}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                    <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">Precipitation</div>
                    <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                      {weatherData.current?.precipitationMm} mm
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-[#B7F76B]">
                    AI Weather-Driven Plant Protection Advisories for {weatherData.city}
                  </div>
                  {(weatherData.advisories || []).map((adv: string, idx: number) => (
                    <p key={idx} className="text-xs text-slate-700 dark:text-[#F7F9F2]/85">
                      • {adv}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. PLANT GROWTH TRACKER */}
      {activeTool === 'growth' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleLogGrowth}
            className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Log Plant Growth & Scale Observation
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
              Track leaf count and estimated height (when a scale reference is present). Provides observational trends rather than exact future guarantees.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1">Specimen Name</label>
              <input
                type="text"
                value={growthPlantName}
                onChange={(e) => setGrowthPlantName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Estimated Height (cm)</label>
                <input
                  type="number"
                  value={growthHeight}
                  onChange={(e) => setGrowthHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Active Leaf Count</label>
                <input
                  type="number"
                  value={growthLeaves}
                  onChange={(e) => setGrowthLeaves(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Morphological Observation</label>
              <textarea
                rows={2}
                value={growthNotes}
                onChange={(e) => setGrowthNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors"
            >
              Record Growth Milestone
            </button>
          </form>

          <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Monthly Growth Trajectory & Timeline
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(workspaceData?.growth || []).map((g: any) => (
                <div
                  key={g.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-1"
                >
                  <div className="text-[11px] font-mono text-slate-500 dark:text-[#B7F76B]">{g.recordedDate}</div>
                  <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    {g.heightCm} cm
                  </div>
                  <div className="text-xs text-[#00C878] font-mono">{g.leafCount} leaves</div>
                  <p className="text-[11px] text-slate-600 dark:text-[#F7F9F2]/70 line-clamp-2">{g.observation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. PREDICTIVE PLANT HEALTH */}
      {activeTool === 'predictive' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <div className="text-xs font-mono text-amber-500">OBSERVED HISTORICAL ISSUES (FROM PLANT MEMORY)</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Confirmed & Logged Observations
            </h3>
            <div className="space-y-3">
              {(workspaceData?.diagnoses || []).map((d: any) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-1 text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-white">{d.plantName}</div>
                  <div className="text-amber-600 dark:text-amber-300">{d.possibleCondition}</div>
                  <p className="text-slate-600 dark:text-[#F7F9F2]/75">Symptoms: {d.symptoms}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <div className="text-xs font-mono text-[#00C878]">PREDICTED ENVIRONMENTAL & CARE RISKS (NEXT 14 DAYS)</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Early-Warning Predictive Intelligence
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-1">
                <div className="font-bold text-slate-900 dark:text-[#B7F76B]">
                  Predicted Risk 01: Afternoon Vapor Pressure Deficit (VPD) Spike on Balcony Herbs
                </div>
                <p className="text-slate-600 dark:text-[#F7F9F2]/80">
                  Forecasted UV 6+ combined with warm afternoon breeze may dry out terracotta Tulsi pots 24 hours faster than baseline.
                </p>
                <p className="text-[#00C878] font-medium">
                  Preventive Action: Apply 2cm cocopeat mulch collar and check moisture at 8:00 AM daily.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-1">
                <div className="font-bold text-slate-900 dark:text-[#B7F76B]">
                  Predicted Risk 02: Dust Accumulation Reducing Indoor Monstera Photosynthesis
                </div>
                <p className="text-slate-600 dark:text-[#F7F9F2]/80">
                  Indoor fine particulate settling over 14 days can reduce stomatal light absorption by 18%.
                </p>
                <p className="text-[#00C878] font-medium">
                  Preventive Action: Schedule damp microfiber foliar wipe every second Sunday.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. AI PERSONALIZED GARDEN DESIGNER */}
      {activeTool === 'designer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleGenerateGardenPlan}
            className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Personalized Garden Designer Studio
            </h3>
            <div>
              <label className="block text-xs font-medium mb-1">Preferred Garden Style</label>
              <select
                value={designStyle}
                onChange={(e) => setDesignStyle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              >
                <option value="Tropical Garden">Tropical Garden</option>
                <option value="Balcony Garden">Balcony Garden</option>
                <option value="Vertical Garden">Vertical Biophilic Wall</option>
                <option value="Medicinal Garden">Ayurvedic & Medicinal Sanctuary</option>
                <option value="Kitchen Garden">Organic Kitchen & Culinary Garden</option>
                <option value="Indoor Garden">Indoor Air-Purifying Sanctuary</option>
                <option value="Modern Garden">Modern Architectural Garden</option>
                <option value="Minimalist Garden">Minimalist Zen Courtyard</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Space Type</label>
                <input
                  type="text"
                  value={designSpace}
                  onChange={(e) => setDesignSpace(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Dimensions</label>
                <input
                  type="text"
                  value={designDims}
                  onChange={(e) => setDesignDims(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Sunlight</label>
                <input
                  type="text"
                  value={designSun}
                  onChange={(e) => setDesignSun(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Maintenance Budget</label>
                <input
                  type="text"
                  value={designBudget}
                  onChange={(e) => setDesignBudget(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isDesigning}
              className="w-full py-2.5 px-4 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors"
            >
              {isDesigning ? 'Generating Spatial Blueprint with Gemini AI...' : 'Generate & Save Personalized Garden Blueprint'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-4">
            {(workspaceData?.designs || []).map((d: any) => {
              let zones: any[] = [];
              try {
                zones = JSON.parse(d.layoutJson || '[]');
              } catch {
                zones = [];
              }
              return (
                <div
                  key={d.id}
                  className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-[#00C878]">
                        {d.style} · {d.dimensions} · {d.sunlight}
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{d.title}</h4>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80">{d.aiRecommendations}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {zones.map((z: any, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs"
                      >
                        <div className="font-mono text-[#B7F76B]">{z.zone}</div>
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5">{z.plant}</div>
                        <div className="text-slate-500 dark:text-[#F7F9F2]/65">{z.role}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. PLANT RECOMMENDATION ENGINE */}
      {activeTool === 'recommender' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                AI Indian & Tropical Plant Recommendation Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                Filter by space availability and hydration requirements to match your microclimate.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['All', 'Indoor', 'Outdoor'] as const).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setRecSpace(sp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    recSpace === sp
                      ? 'bg-[#00C878] text-[#071B12]'
                      : 'bg-slate-100 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2]/80'
                  }`}
                >
                  Space: {sp}
                </button>
              ))}
              {(['All', 'Low', 'Moderate', 'High'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setRecWater(w)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    recWater === w
                      ? 'bg-[#D4B56A] text-[#071B12]'
                      : 'bg-slate-100 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2]/80'
                  }`}
                >
                  Water: {w}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredRecommendations.map((plant) => (
              <div
                key={plant.id}
                className="rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] overflow-hidden flex flex-col"
              >
                <img
                  src={plant.imageUrl}
                  alt={plant.commonName}
                  referrerPolicy="no-referrer"
                  className="w-full h-40 object-cover"
                />
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-[#B7F76B]">
                      {plant.category} · {plant.difficulty}
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{plant.commonName}</h4>
                    <p className="text-xs italic text-slate-500 dark:text-[#F7F9F2]/65">{plant.scientificName}</p>
                    <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 mt-2">{plant.benefits}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-[#123D2A] text-[11px] text-slate-500 dark:text-[#F7F9F2]/70 flex items-center justify-between">
                    <span>Sun: {plant.sunlight}</span>
                    <span>Water: {plant.waterNeed}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. PLANT COMPATIBILITY CHECKER & COMPANION PLANTING GUIDE */}
      {activeTool === 'compatibility' && (() => {
        const plantA = PLANT_LIBRARY.find((p) => p.id === compPlantA) || PLANT_LIBRARY[0];
        const plantB = PLANT_LIBRARY.find((p) => p.id === compPlantB) || PLANT_LIBRARY[1];
        const waterCompatible = plantA.waterNeed === plantB.waterNeed;
        const spaceCompatible =
          plantA.spaceSuitability === plantB.spaceSuitability ||
          plantA.spaceSuitability === 'Both' ||
          plantB.spaceSuitability === 'Both';
        const score = (waterCompatible ? 50 : 25) + (spaceCompatible ? 45 : 20);

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                AI Plant Compatibility & Companion Planting Checker
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                Evaluate shared pot/bed microclimate synergy, root-zone hydration overlap, and allelopathic or pest-repelling companion benefits.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Primary Specimen</label>
                  <select
                    value={compPlantA}
                    onChange={(e) => setCompPlantA(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                  >
                    {PLANT_LIBRARY.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.commonName} ({p.scientificName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Companion Candidate</label>
                  <select
                    value={compPlantB}
                    onChange={(e) => setCompPlantB(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                  >
                    {PLANT_LIBRARY.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.commonName} ({p.scientificName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#123D2A] pb-3">
                <div>
                  <div className="text-xs font-mono text-[#00C878]">COMPANION SYNERGY INDEX</div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {plantA.commonName} + {plantB.commonName}
                  </h4>
                </div>
                <div className="text-3xl font-extrabold font-mono text-[#00C878] tabular-nums">{score}%</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-bold text-slate-900 dark:text-white">Hydration Alignment</div>
                  <p className="text-slate-600 dark:text-[#F7F9F2]/80 mt-1">
                    {waterCompatible
                      ? `Both thrive on ${plantA.waterNeed} moisture regimes — safe to group on the same irrigation line.`
                      : `${plantA.commonName} prefers ${plantA.waterNeed} water while ${plantB.commonName} requires ${plantB.waterNeed}. Use separate containers to prevent root stress.`}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                  <div className="font-bold text-slate-900 dark:text-white">Light & Canopy Stratification</div>
                  <p className="text-slate-600 dark:text-[#F7F9F2]/80 mt-1">
                    {plantA.commonName} ({plantA.sunlight}) paired with {plantB.commonName} ({plantB.sunlight}). Position taller canopy on the north/east side to avoid shading sun-lovers.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#00C878]/10 border border-[#00C878]/30 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-[#B7F76B]">
                  Verified Companion Planting Guild Matrix
                </div>
                <p className="text-slate-700 dark:text-[#F7F9F2]/85">
                  • <strong>Krishna Tulsi + Curry Leaf / Hibiscus:</strong> Tulsi’s eugenol aromatic volatiles naturally deter whiteflies and aphids from neighboring hibiscus and citrus foliage.
                </p>
                <p className="text-slate-700 dark:text-[#F7F9F2]/85">
                  • <strong>Monstera + Areca Palm + Peace Lily:</strong> Shared tropical humidity guild (60%+ RH) creating a self-humidifying indoor transpiration microclimate.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 9. SIDE-BY-SIDE AI PLANT COMPARISON */}
      {activeTool === 'comparison' && (() => {
        const leftPlant = PLANT_LIBRARY.find((p) => p.id === compareLeftId) || PLANT_LIBRARY[0];
        const rightPlant = PLANT_LIBRARY.find((p) => p.id === compareRightId) || PLANT_LIBRARY[2];

        return (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Side-by-Side Botanical Species Comparison Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Compare light, hydration, soil pH, growth rate, pet safety, and ecological benefits across two species.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={compareLeftId}
                  onChange={(e) => setCompareLeftId(e.target.value)}
                  aria-label="Compare First Plant"
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                >
                  {PLANT_LIBRARY.map((p) => (
                    <option key={p.id} value={p.id}>
                      Specimen A: {p.commonName}
                    </option>
                  ))}
                </select>
                <select
                  value={compareRightId}
                  onChange={(e) => setCompareRightId(e.target.value)}
                  aria-label="Compare Second Plant"
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                >
                  {PLANT_LIBRARY.map((p) => (
                    <option key={p.id} value={p.id}>
                      Specimen B: {p.commonName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[leftPlant, rightPlant].map((p, idx) => (
                <div
                  key={`${p.id}-${idx}`}
                  className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={p.imageUrl}
                      alt={p.commonName}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />
                    <div>
                      <span className="text-xs font-mono text-[#00C878]">SPECIMEN 0{idx + 1} · {p.category}</span>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">{p.commonName}</h4>
                      <p className="text-xs italic text-slate-500 dark:text-[#F7F9F2]/65">{p.scientificName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                      <div className="text-slate-500 dark:text-[#F7F9F2]/60">Difficulty & Growth</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {p.difficulty} · {p.growthRate}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                      <div className="text-slate-500 dark:text-[#F7F9F2]/60">Water Need & Max Height</div>
                      <div className="font-bold text-[#00C878] mt-0.5">
                        {p.waterNeed} · {p.maxHeight}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                      <div className="text-slate-500 dark:text-[#F7F9F2]/60">Sunlight</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{p.sunlight}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                      <div className="text-slate-500 dark:text-[#F7F9F2]/60">Climate & Substrate</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{p.climate}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80">
                    <strong>Primary Benefits:</strong> {p.benefits}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 10. AI LEAF & ROOT HEALTH EDUCATOR */}
      {activeTool === 'leaf-root' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <div className="text-xs font-mono text-[#00C878]">FOLIAR MORPHOLOGY & STOMATAL DIAGNOSTICS</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Leaf Surface & Margin Pattern Educator
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-bold text-slate-900 dark:text-white">Crispy Brown Leaf Tips & Margins</div>
                <p className="text-slate-600 dark:text-[#F7F9F2]/80 mt-1">
                  Indicates low ambient relative humidity (&lt;40%), fluoride/chloramine salt buildup in tap water, or inconsistent underwatering. Flush substrate with rainwater and group plants on a wet pebble tray.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-bold text-slate-900 dark:text-white">Basal Yellowing with Soft Petioles</div>
                <p className="text-slate-600 dark:text-[#F7F9F2]/80 mt-1">
                  Classic sign of rhizosphere hypoxia (overwatering / compacted peat). Allow top 5cm to dry and aerate root ball gently.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-bold text-slate-900 dark:text-white">Concentric Halo Spots on Lamina</div>
                <p className="text-slate-600 dark:text-[#F7F9F2]/80 mt-1">
                  Possible Alternaria or Cercospora foliar spotting hypothesis. Prune affected leaves with alcohol-wiped shears and stop overhead evening misting.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <div className="text-xs font-mono text-[#D4B56A]">RHIZOSPHERE & ROOT HEALTH EDUCATOR</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Root-Bound, Root Rot & Repotting Triage Guide
            </h3>
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
              <strong>Scientific Transparency Disclaimer:</strong> Subterranean root health cannot be diagnosed from above-ground foliage photos alone unless roots are physically exposed during repotting.
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-bold text-slate-900 dark:text-white">Healthy Feeder Roots vs. Pythium Root Rot</div>
                <p className="text-slate-600 dark:text-[#F7F9F2]/80 mt-1">
                  Healthy roots are firm, white/cream or tan with active root hairs. Rotting roots appear dark brown/black, mushy, hollow, and slip off when touched. Trim mushy roots with sterile shears and dust with cinnamon or Trichoderma viride bio-fungicide.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-bold text-slate-900 dark:text-white">When to Upsize Your Planter</div>
                <p className="text-slate-600 dark:text-[#F7F9F2]/80 mt-1">
                  Repot only 2–4cm wider in diameter during active spring/monsoon growth when roots circle the drainage holes or water runs straight through within seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. SEASONAL PLANNER & ORGANIC FERTILIZER GUIDE */}
      {activeTool === 'seasonal' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  AI Seasonal Horticulture Planner & Organic Bio-Fertilizer Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Calibrate feeding schedules, pruning windows, and monsoon drainage protection across all 5 Indian & global seasons.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['Spring', 'Summer', 'Monsoon', 'Autumn', 'Winter'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSeasonPlan(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      selectedSeasonPlan === s
                        ? 'bg-[#00C878] text-[#071B12]'
                        : 'bg-slate-100 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2]/80'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-1.5">
                <div className="font-mono text-[#00C878]">{selectedSeasonPlan.toUpperCase()} · IRRIGATION & HUMIDITY</div>
                <p className="text-slate-700 dark:text-[#F7F9F2]/85">
                  {selectedSeasonPlan === 'Monsoon'
                    ? 'Reduce manual watering by 50–70%. Elevate outdoor pots on terracotta feet and clear drainage holes to prevent anaerobic waterlogging.'
                    : selectedSeasonPlan === 'Summer'
                    ? 'Irrigate before 7:30 AM. Apply 3cm cocopeat or dry leaf mulch collar to cut topsoil evaporation by 40%.'
                    : selectedSeasonPlan === 'Winter'
                    ? 'Extend intervals by 3–5 days as metabolic transpiration slows. Use lukewarm water (22°C) to avoid cold root shock.'
                    : 'Balanced active growth hydration. Check top 4cm moisture before each deep soak.'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-1.5">
                <div className="font-mono text-[#B7F76B]">ORGANIC BIO-FERTILIZER PROTOCOL</div>
                <p className="text-slate-700 dark:text-[#F7F9F2]/85">
                  {selectedSeasonPlan === 'Winter'
                    ? 'Suspend heavy nitrogen feeding during dormancy. Apply only mild potassium-rich banana peel ferment or kelp trace mist monthly.'
                    : 'Top-dress 150g enriched vermicompost + 1 tbsp neem cake powder per 25cm pot every 21 days, alternating with 3ml/L liquid seaweed extract.'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] space-y-1.5">
                <div className="font-mono text-[#D4B56A]">PRUNING, SOWING & IPM FOCUS</div>
                <p className="text-slate-700 dark:text-[#F7F9F2]/85">
                  {selectedSeasonPlan === 'Spring'
                    ? 'Prime window for structural pruning, air-layering Ficus, dividing Snake Plants, and repotting root-bound Monstera.'
                    : selectedSeasonPlan === 'Monsoon'
                    ? 'Dust soil surface with Trichoderma viride and spray prophylactic 0.5% neem hydrosol every 10 days against fungal leaf spot.'
                    : 'Pinch apical tips on Tulsi and Curry Leaf to encourage dense lateral branching.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
