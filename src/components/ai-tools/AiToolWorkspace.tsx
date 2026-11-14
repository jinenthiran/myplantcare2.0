import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  HelpCircle,
  History,
  MapPin,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AI_TOOL_ACCENT_STYLES,
  AiToolDefinition,
  NormalizedToolAnalysisResult,
  computeGrowthDelta,
  normalizeToolAnalysisResult,
} from '../../data/aiToolsCatalog';
import { MultiImageSelector } from './MultiImageSelector';
import {
  AnalysisStageText,
  ToolImageSlot,
  runPlantToolAnalysis,
} from './PlantAnalysisEngine';
import { AnalysisProgress } from './AnalysisProgress';
import { PlantAnalysisResult } from './PlantAnalysisResult';
import { emitGreenyAskRequest } from '../greeny/GreenyTypes';

interface AiToolWorkspaceProps {
  tool: AiToolDefinition;
  workspaceData: any;
  authToken?: string | null;
  initialPrefill?: { plantId?: number | null; prompt?: string } | null;
  onClearPrefill?: () => void;
  onRefreshWorkspace: () => void;
  onBackToToolsGrid: () => void;
}

function buildInitialImageSlots(tool: AiToolDefinition): ToolImageSlot[] {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  return tool.imageSlotLabels.slice(0, tool.maxImages).map((label, idx) => ({
    id: `${tool.slug}-slot-${idx}`,
    label,
    dataUrl: '',
    mimeType: 'image/jpeg',
    source: 'empty',
    capturedDate: tool.slug === 'plant-growth' ? (idx === 0 ? weekAgo : today) : undefined,
  }));
}

function buildInitialContextValues(tool: AiToolDefinition): Record<string, string> {
  const out: Record<string, string> = {};
  const today = new Date().toISOString().slice(0, 10);
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  for (const field of tool.contextFields) {
    if (field.defaultValue !== undefined) {
      out[field.key] = field.defaultValue;
    } else if (field.type === 'date') {
      out[field.key] = field.key === 'beforeDate' ? threeDaysAgo : today;
    } else {
      out[field.key] = '';
    }
  }
  return out;
}

export const AiToolWorkspace: React.FC<AiToolWorkspaceProps> = ({
  tool,
  workspaceData,
  authToken,
  initialPrefill,
  onClearPrefill,
  onRefreshWorkspace,
  onBackToToolsGrid,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const accent = AI_TOOL_ACCENT_STYLES[tool.accent];
  const plantsList: any[] = workspaceData?.plants || [];
  const allToolRuns: any[] = workspaceData?.toolRuns || [];
  const toolHistory = useMemo(
    () => allToolRuns.filter((r) => r.toolId === tool.slug).slice(0, 4),
    [allToolRuns, tool.slug]
  );

  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [selectedPlantId, setSelectedPlantId] = useState<number | ''>(
    initialPrefill?.plantId || ''
  );
  const [userPrompt, setUserPrompt] = useState<string>(initialPrefill?.prompt || '');
  const [contextValues, setContextValues] = useState<Record<string, string>>(() =>
    buildInitialContextValues(tool)
  );
  const [slots, setSlots] = useState<ToolImageSlot[]>(() => buildInitialImageSlots(tool));
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);

  // Weather microclimate context
  const [weatherCity, setWeatherCity] = useState('Bengaluru');
  const [weatherCoords, setWeatherCoords] = useState({ lat: 12.9716, lon: 77.5946 });
  const [weatherData, setWeatherData] = useState<any>(null);

  // Analysis lifecycle
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [stageText, setStageText] = useState<AnalysisStageText>(
    'Preparing botanical inputs & garden context...'
  );
  const [analysisError, setAnalysisError] = useState<string>('');
  const [result, setResult] = useState<NormalizedToolAnalysisResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset workspace cleanly whenever tool changes & scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    setSlots(buildInitialImageSlots(tool));
    setActiveSlotIdx(0);
    setContextValues(buildInitialContextValues(tool));
    setAnalysisError('');
    setResult(null);
    setShowHelpModal(false);
    if (initialPrefill?.prompt) {
      setUserPrompt(initialPrefill.prompt);
      onClearPrefill?.();
    } else {
      setUserPrompt('');
    }
    if (initialPrefill?.plantId) {
      setSelectedPlantId(initialPrefill.plantId);
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [tool.slug]);

  useEffect(() => {
    if (!showHelpModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHelpModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelpModal]);

  useEffect(() => {
    let mounted = true;
    fetch(
      `/api/weather?lat=${weatherCoords.lat}&lon=${weatherCoords.lon}&city=${encodeURIComponent(
        weatherCity
      )}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setWeatherData(d);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [weatherCoords, weatherCity]);

  const firstAttachedImage = slots.find((s) => Boolean(s.dataUrl))?.dataUrl;

  const growthDeltaPreview = useMemo(() => {
    if (tool.slug !== 'plant-growth') return null;
    const chosenPlant = plantsList.find((p) => String(p.id) === String(selectedPlantId));
    return computeGrowthDelta({
      beforeDate: slots[0]?.capturedDate || contextValues.beforeDate,
      afterDate: slots[1]?.capturedDate || contextValues.afterDate,
      beforeHeightCm: chosenPlant?.heightCm ? Number(chosenPlant.heightCm) : undefined,
      afterHeightCm: contextValues.measuredHeightCm
        ? Number(contextValues.measuredHeightCm)
        : undefined,
    });
  }, [tool.slug, slots, contextValues, plantsList, selectedPlantId]);

  const handleAnalyse = async (overridePrompt?: string) => {
    if (isAnalyzing) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsAnalyzing(true);
    setAnalysisError('');

    const chosenPlant = plantsList.find((p) => String(p.id) === String(selectedPlantId));
    const weatherSummary = weatherData?.current
      ? `${weatherData.city}: ${weatherData.current.temperatureC}°C, ${weatherData.current.humidityPercent}% RH, Rain Prob ${weatherData.current.rainProbabilityPercent}%, UV ${weatherData.current.uvIndex} (${weatherData.isFallback ? 'Seasonal Baseline' : 'Live Open-Meteo'})`
      : 'Local weather telemetry unavailable; do not invent conditions.';

    try {
      const response = await runPlantToolAnalysis({
        slug: tool.slug,
        authToken,
        plantId: selectedPlantId ? Number(selectedPlantId) : null,
        userInput: (overridePrompt ?? userPrompt).trim() || tool.quickPrompts[0],
        extraParams: {
          plantName: chosenPlant?.name || undefined,
          ...contextValues,
          growthDeltaPreview: growthDeltaPreview || undefined,
        },
        images: slots,
        weatherSummary,
        onStageChange: setStageText,
        signal: controller.signal,
      });

      setResult(response.result);
      onRefreshWorkspace();
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setAnalysisError(
        err?.message ||
          'The AI specialist could not reach Gemini right now. Your photo and parameters are preserved — click Retry.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    setAnalysisError('');
    setSlots(buildInitialImageSlots(tool));
    setActiveSlotIdx(0);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  const handleAskGreeny = (res: NormalizedToolAnalysisResult) => {
    const promptLines = [
      `I just ran ${res.toolName} on ${res.plant_identification.common_name}.`,
      `Result: "${res.headline}" (Severity: ${res.severity}).`,
      res.observations[0] ? `Key observation: ${res.observations[0]}` : '',
      res.recommendations[0] ? `Top recommendation: ${res.recommendations[0]}` : '',
      'Can you help explain this simply and suggest what I should check next?',
    ]
      .filter(Boolean)
      .join(' ');

    emitGreenyAskRequest({
      toolName: res.toolName,
      plantName: res.plant_identification.common_name,
      headline: res.headline,
      severity: res.severity,
      summaryPrompt: promptLines,
    });
  };

  const cityPresets = [
    { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
    { name: 'New Delhi', lat: 28.6139, lon: 77.209 },
  ];

  return (
    <div data-testid={`tool-workspace-${tool.slug}`} className="space-y-6">
      {/* Top Bar: Back Button + Dedicated Tool Header + Help Modal Trigger */}
      <div className="relative overflow-hidden rounded-3xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#10251D] text-[#FAF7EE] p-5 sm:p-7 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            data-testid="back-to-ai-tools-btn"
            onClick={onBackToToolsGrid}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/8 text-xs font-display font-bold text-[#FAF7EE] hover:bg-white/15 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#00D69A]" />
            Back to AI Intelligence Centre
          </button>

          <button
            type="button"
            data-testid="tool-help-btn"
            onClick={() => setShowHelpModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#00D69A]/35 bg-[#00D69A]/14 text-xs font-display font-bold text-[#00D69A] hover:bg-[#00D69A]/24 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            Photo &amp; Tool Guide
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#C7F36B]">
            {tool.category} · Dedicated Camera AI Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#FAF7EE] tracking-tight">
            {tool.name}
          </h1>
          <p className="text-sm text-[#B6CDB4] max-w-3xl">
            {tool.tagline}
          </p>
        </div>

        {/* Scientific Integrity Notice Bar */}
        <div className="p-3.5 rounded-2xl bg-[#153026] border border-white/12 text-xs text-[#EBF2EA] flex items-start gap-2.5">
          <BookOpen className="w-4 h-4 text-[#F5CA62] shrink-0 mt-0.5" />
          <span>{tool.scientificGuardrail}</span>
        </div>
      </div>

      {/* Main Split Console: Left Camera/Context Inputs | Right Processing/Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] p-5 sm:p-6 space-y-5 shadow-sm">
          {/* 1. Camera + Multi-Image Capture / Upload */}
          <MultiImageSelector
            toolSlug={tool.slug}
            slots={slots}
            activeSlotIndex={activeSlotIdx}
            onSelectSlot={setActiveSlotIdx}
            onUpdateSlot={(idx, patch) =>
              setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
            }
            onClearSlot={(idx) =>
              setSlots((prev) =>
                prev.map((s, i) =>
                  i === idx
                    ? {
                        ...s,
                        dataUrl: '',
                        source: 'empty',
                        metaText: undefined,
                        qualityWarnings: undefined,
                        qualityScore: undefined,
                      }
                    : s
                )
              )
            }
          />

          {/* 2. Linked Plant Memory Selector */}
          <div className="space-y-1.5 pt-2 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/12">
            <label
              htmlFor="tool-plant-memory"
              className="block text-xs font-display font-bold text-[#10251D] dark:text-[#FAF7EE]"
            >
              Link Saved Plant from My Garden (Optional)
            </label>
            <select
              id="tool-plant-memory"
              value={selectedPlantId}
              onChange={(e) =>
                setSelectedPlantId(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
            >
              <option value="">New / General Specimen ({plantsList.length} in My Garden)</option>
              {plantsList.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.species}) · Health {p.healthScore}%
                </option>
              ))}
            </select>
          </div>

          {/* 3. Tool-Specific Contextual Fields */}
          {tool.contextFields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {tool.contextFields.map((field) => (
                <div
                  key={field.key}
                  className={field.type === 'text' ? 'sm:col-span-2' : ''}
                >
                  <label
                    htmlFor={`ctx-${tool.slug}-${field.key}`}
                    className="block font-semibold text-[#4A665B] dark:text-[#B6CDB4] mb-1"
                  >
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      id={`ctx-${tool.slug}-${field.key}`}
                      value={contextValues[field.key] || ''}
                      onChange={(e) =>
                        setContextValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`ctx-${tool.slug}-${field.key}`}
                      type={field.type}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                      value={contextValues[field.key] || ''}
                      onChange={(e) =>
                        setContextValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {growthDeltaPreview && growthDeltaPreview.daysElapsed !== null && (
            <div className="p-3 rounded-xl bg-[#00D69A]/12 border border-[#00D69A]/35 text-xs font-mono text-[#0F6B50] dark:text-[#00D69A]">
              Comparison Window: {growthDeltaPreview.daysElapsed} days elapsed
              {growthDeltaPreview.heightChangeCm !== null &&
                ` · Measured Height Δ: ${growthDeltaPreview.heightChangeCm >= 0 ? '+' : ''}${growthDeltaPreview.heightChangeCm} cm`}
            </div>
          )}

          {/* 4. Weather Context Strip */}
          <div className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display font-bold flex items-center gap-1 text-[#10251D] dark:text-[#FAF7EE]">
                <MapPin className="w-3.5 h-3.5 text-[#00D69A]" />
                Local Climate
              </span>
              <div className="flex flex-wrap gap-1">
                {cityPresets.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setWeatherCity(c.name);
                      setWeatherCoords({ lat: c.lat, lon: c.lon });
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                      weatherCity === c.name
                        ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D]'
                        : 'bg-white dark:bg-[#153026] text-[#4A665B] dark:text-[#B6CDB4]'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            {weatherData?.current && (
              <div className="text-[11px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">
                {weatherData.city}: {weatherData.current.temperatureC}°C ·{' '}
                {weatherData.current.humidityPercent}% RH · UV {weatherData.current.uvIndex} ·{' '}
                {weatherData.isFallback ? 'Seasonal Baseline' : 'Live'}
              </div>
            )}
          </div>

          {/* 5. User Question / Symptoms + Quick Starters */}
          <div className="space-y-2 text-xs">
            <label htmlFor="tool-user-prompt" className="block font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
              Symptoms, Notes, or Specific Question
            </label>
            <textarea
              id="tool-user-prompt"
              rows={3}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={tool.quickPrompts[0]}
              className="w-full px-3 py-2.5 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
            />
            <div className="flex flex-wrap gap-1.5">
              {tool.quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setUserPrompt(qp)}
                  className="text-left px-2.5 py-1.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#B6CDB4]/14 text-[11px] text-[#4A665B] dark:text-[#B6CDB4] hover:border-[#00D69A] cursor-pointer"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Primary Analyse Plant Trigger */}
          <button
            type="button"
            data-testid="analyse-plant-btn"
            disabled={isAnalyzing}
            onClick={() => handleAnalyse()}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-extrabold text-sm shadow-md hover:opacity-90 disabled:opacity-55 transition-opacity cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {isAnalyzing ? `Analysing with ${tool.name}...` : 'Analyse Plant'}
          </button>

          {analysisError && (
            <div
              role="alert"
              data-testid="tool-analysis-error"
              className="p-4 rounded-2xl bg-[#FF806B]/12 border border-[#FF806B]/45 space-y-2 text-xs"
            >
              <div className="font-bold text-[#A63522] dark:text-[#FF806B] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Analysis Did Not Complete
              </div>
              <p className="text-[#10251D] dark:text-[#FAF7EE]">{analysisError}</p>
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => handleAnalyse()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C9432C] dark:bg-[#FF806B] text-white dark:text-[#10251D] font-bold text-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Analysis
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Live Progress, Structured Output & Saved Runs */}
        <div className="lg:col-span-7 space-y-5">
          {isAnalyzing && (
            <AnalysisProgress
              toolName={tool.name}
              stageText={stageText}
              previewImageUrl={firstAttachedImage}
            />
          )}

          {!isAnalyzing && result && (
            <PlantAnalysisResult
              result={result}
              plants={plantsList}
              selectedPlantId={selectedPlantId}
              previewImageUrl={firstAttachedImage}
              authToken={authToken}
              onSavedToGarden={onRefreshWorkspace}
              onScanAgain={handleScanAgain}
              onAskGreeny={handleAskGreeny}
              onFollowUpPrompt={(prompt) => {
                setUserPrompt(prompt);
                handleAnalyse(prompt);
              }}
            />
          )}

          {!isAnalyzing && !result && (
            <div className="rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] p-6 sm:p-8 space-y-4 shadow-sm">
              <div className={`text-xs font-mono font-bold uppercase tracking-wider ${accent.lightText} ${accent.darkText}`}>
                Ready · {tool.name}
              </div>
              <h2 className="text-xl font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE]">
                Capture or Upload a Plant Photo &amp; Run {tool.name}
              </h2>
              <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                {tool.helpSummary}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                  <div className="font-display font-bold text-[#10251D] dark:text-[#00D69A] mb-1">
                    Recommended Capture Tips
                  </div>
                  <ul className="space-y-1 text-[#4A665B] dark:text-[#B6CDB4]">
                    {tool.captureTips.map((tip, idx) => (
                      <li key={idx}>• {tip}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                  <div className="font-display font-bold text-[#10251D] dark:text-[#00D69A] mb-1">
                    What You Receive
                  </div>
                  <ul className="space-y-1 text-[#4A665B] dark:text-[#B6CDB4]">
                    <li>• Plant ID &amp; calibrated confidence</li>
                    <li>• Direct observations vs. possible causes</li>
                    <li>• Actionable care recommendations &amp; follow-up</li>
                    <li>• Save to My Garden &amp; Ask GREENY actions</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Previous runs for THIS specific tool */}
          {toolHistory.length > 0 && (
            <div className="rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] p-5 space-y-3">
              <div className="text-xs font-display font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#00D69A]" />
                Recent {tool.name} History ({toolHistory.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {toolHistory.map((run: any) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(run.resultJson || '{}');
                        setResult(normalizeToolAnalysisResult(parsed, tool.slug, tool.name));
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-left p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 hover:border-[#00D69A] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span className="truncate text-[#10251D] dark:text-[#FAF7EE]">{run.plantName || tool.name}</span>
                      <span className="text-[10px] font-mono text-[#0F6B50] dark:text-[#00D69A] shrink-0">
                        {run.modelUsed}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] truncate mt-0.5">
                      {run.inputSummary}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Modal / Drawer */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelpModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251D]/80 backdrop-blur-xs p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`${tool.name} Tool and Camera Guide`}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full rounded-3xl border border-[#174C38]/25 dark:border-[#00D69A]/25 bg-white dark:bg-[#153026] p-6 space-y-4 shadow-2xl text-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono uppercase text-[#0F6B50] dark:text-[#00D69A] font-bold">
                    Tool &amp; Camera Guide
                  </div>
                  <h3 className="text-lg font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE]">
                    {tool.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  aria-label="Close help modal"
                  className="p-2 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                {tool.helpSummary}
              </p>
              <div className="space-y-1.5">
                <div className="font-display font-bold text-[#10251D] dark:text-[#00D69A]">Best Photo Practices</div>
                <ul className="space-y-1">
                  {tool.captureTips.map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-[#F5CA62]/18 border border-[#F5CA62]/45 text-[#7A5600] dark:text-[#F5CA62]">
                <strong>Scientific Guardrail:</strong> {tool.scientificGuardrail}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
