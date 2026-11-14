import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Eye,
  HelpCircle,
  Layers,
  RotateCcw,
  Scissors,
  ShieldAlert,
  Sparkles,
  Sprout,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { NormalizedToolAnalysisResult } from '../../data/aiToolsCatalog';
import { SaveToGarden } from './SaveToGarden';

interface PlantAnalysisResultProps {
  result: NormalizedToolAnalysisResult;
  plants: any[];
  selectedPlantId: number | '';
  previewImageUrl?: string;
  authToken?: string | null;
  onSavedToGarden: () => void;
  onScanAgain: () => void;
  onAskGreeny: (result: NormalizedToolAnalysisResult) => void;
  onFollowUpPrompt?: (prompt: string) => void;
}

const SEVERITY_BADGE_MAP: Record<NormalizedToolAnalysisResult['severity'], string> = {
  Critical: 'bg-[#FF806B]/20 text-[#A63522] dark:bg-[#FF806B]/18 dark:text-[#FF806B] border-[#FF806B]/55',
  High: 'bg-[#FF806B]/14 text-[#A63522] dark:bg-[#FF806B]/15 dark:text-[#FF806B] border-[#FF806B]/45',
  Moderate: 'bg-[#F5CA62]/28 text-[#7A5600] dark:bg-[#F5CA62]/18 dark:text-[#F5CA62] border-[#F5CA62]/50',
  Low: 'bg-[#00D69A]/16 text-[#0F6B50] dark:bg-[#00D69A]/16 dark:text-[#00D69A] border-[#00D69A]/40',
  Informational: 'bg-[#BBA8F5]/25 text-[#4F3B8F] dark:bg-[#BBA8F5]/18 dark:text-[#BBA8F5] border-[#BBA8F5]/50',
};

export const PlantAnalysisResult: React.FC<PlantAnalysisResultProps> = ({
  result,
  plants,
  selectedPlantId,
  previewImageUrl,
  authToken,
  onSavedToGarden,
  onScanAgain,
  onAskGreeny,
  onFollowUpPrompt,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      data-testid="ai-tool-result-card"
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] p-6 space-y-6 shadow-md"
    >
      {/* Top Result Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/12">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="font-bold uppercase tracking-wider text-[#0F6B50] dark:text-[#00D69A]">
              {result.toolName}
            </span>
            {result.resolvedModel && (
              <span className="text-[#4A665B] dark:text-[#B6CDB4]">
                · {result.resolvedModel.toUpperCase()}
                {result.usedBackupModel ? ' (BACKUP)' : ''}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE]">
            {result.headline}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1 rounded-xl border text-xs font-mono font-bold ${SEVERITY_BADGE_MAP[result.severity]}`}
          >
            Severity: {result.severity}
          </span>
        </div>
      </div>

      {/* Plant Identification Summary Strip */}
      <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#4A665B] dark:text-[#B6CDB4]">
            Plant Identification
          </div>
          <div className="text-base font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE]">
            {result.plant_identification.common_name}
            {result.plant_identification.scientific_name && (
              <span className="ml-2 text-sm font-medium italic text-[#4A665B] dark:text-[#B6CDB4]">
                ({result.plant_identification.scientific_name})
              </span>
            )}
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4]">Confidence</div>
          <div className="text-lg font-extrabold text-[#0F6B50] dark:text-[#00D69A] tabular-nums">
            {result.plant_identification.confidence > 0
              ? `${result.plant_identification.confidence}%`
              : 'Context-Based'}
          </div>
          {result.plant_identification.is_uncertain && (
            <div className="text-[11px] font-bold text-[#9A6F00] dark:text-[#F5CA62]">
              Uncertain ID — see alternatives
            </div>
          )}
        </div>
      </div>

      {/* Direct Observations vs Possible Causes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-[#00D69A]/10 border border-[#00D69A]/25 space-y-2">
          <div className="font-display font-bold text-[#10251D] dark:text-[#00D69A] flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-[#00D69A]" />
            Direct Visual &amp; Context Observations
          </div>
          {result.observations.length > 0 ? (
            <ul className="space-y-1.5 text-[#10251D] dark:text-[#FAF7EE]">
              {result.observations.map((obs, i) => (
                <li key={i} className="leading-relaxed">• {obs}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[#4A665B] dark:text-[#B6CDB4]">No visual anomalies recorded.</p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-[#F5CA62]/15 border border-[#F5CA62]/35 space-y-2">
          <div className="font-display font-bold text-[#7A5600] dark:text-[#F5CA62] flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            Possible Underlying Causes
          </div>
          {result.possible_causes.length > 0 ? (
            <ul className="space-y-1.5 text-[#10251D] dark:text-[#FAF7EE]">
              {result.possible_causes.map((cause, i) => (
                <li key={i} className="leading-relaxed">• {cause}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[#4A665B] dark:text-[#B6CDB4]">No stress factors indicated.</p>
          )}
        </div>
      </div>

      {/* Tool-Specific Structured Sections */}
      {Array.isArray(result.alternatives) && result.alternatives.length > 0 && (
        <div className="p-4 rounded-xl bg-[#BBA8F5]/14 border border-[#BBA8F5]/35 space-y-2 text-xs">
          <div className="font-display font-bold text-[#4F3B8F] dark:text-[#BBA8F5]">
            Alternative / Lookalike Species Candidates
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {result.alternatives.map((alt, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/90 dark:bg-[#10251D]/80 border border-[#BBA8F5]/25">
                <div className="font-bold text-[#10251D] dark:text-[#FAF7EE]">
                  {alt.common_name}{' '}
                  {alt.scientific_name && <span className="italic font-normal">({alt.scientific_name})</span>}
                </div>
                <p className="text-[#4A665B] dark:text-[#B6CDB4] mt-0.5">{alt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.growing_requirements &&
        Object.values(result.growing_requirements).some(Boolean) && (
          <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 space-y-2 text-xs">
            <div className="font-display font-bold text-[#10251D] dark:text-[#00D69A] flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-[#F5CA62]" />
              Basic Growing Requirements
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {result.growing_requirements.light && (
                <div><strong>Light:</strong> {result.growing_requirements.light}</div>
              )}
              {result.growing_requirements.watering && (
                <div><strong>Watering:</strong> {result.growing_requirements.watering}</div>
              )}
              {result.growing_requirements.soil && (
                <div><strong>Soil:</strong> {result.growing_requirements.soil}</div>
              )}
              {result.growing_requirements.humidity && (
                <div><strong>Humidity:</strong> {result.growing_requirements.humidity}</div>
              )}
              {result.growing_requirements.temperature && (
                <div><strong>Temperature:</strong> {result.growing_requirements.temperature}</div>
              )}
            </div>
          </div>
        )}

      {result.watering_diagnosis &&
        Object.values(result.watering_diagnosis).some(Boolean) && (
          <div className="p-4 rounded-xl bg-[#56C7C0]/14 border border-[#56C7C0]/35 space-y-2 text-xs">
            <div className="font-display font-bold text-[#126B66] dark:text-[#56C7C0] flex items-center gap-1.5">
              <Droplets className="w-4 h-4" />
              Watering &amp; Hydration Calibration
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.watering_diagnosis.moisture_assessment && (
                <div><strong>Assessment:</strong> {result.watering_diagnosis.moisture_assessment}</div>
              )}
              {result.watering_diagnosis.suggested_interval_days ? (
                <div className="font-mono">
                  <strong>Interval:</strong> Every {result.watering_diagnosis.suggested_interval_days} days
                </div>
              ) : null}
              {result.watering_diagnosis.suggested_volume_ml && (
                <div className="font-mono">
                  <strong>Volume:</strong> {result.watering_diagnosis.suggested_volume_ml}
                </div>
              )}
            </div>
            {result.watering_diagnosis.next_check_rule && (
              <p className="text-[#4A665B] dark:text-[#B6CDB4]">
                <strong>Check Before Watering:</strong> {result.watering_diagnosis.next_check_rule}
              </p>
            )}
          </div>
        )}

      {result.soil_recommendations &&
        (result.soil_recommendations.drainage_status ||
          result.soil_recommendations.ideal_mix_ratio ||
          (result.soil_recommendations.amendments?.length ?? 0) > 0) && (
          <div className="p-4 rounded-xl bg-[#F5CA62]/14 border border-[#F5CA62]/35 space-y-2 text-xs">
            <div className="font-display font-bold text-[#7A5600] dark:text-[#F5CA62] flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Soil Structure &amp; Substrate Blend
            </div>
            {result.soil_recommendations.drainage_status && (
              <p><strong>Observed Drainage:</strong> {result.soil_recommendations.drainage_status}</p>
            )}
            {result.soil_recommendations.ideal_mix_ratio && (
              <p><strong>Recommended Mix Ratio:</strong> {result.soil_recommendations.ideal_mix_ratio}</p>
            )}
            {Array.isArray(result.soil_recommendations.amendments) &&
              result.soil_recommendations.amendments.length > 0 && (
                <ul className="space-y-1">
                  {result.soil_recommendations.amendments.map((am, i) => (
                    <li key={i}>• {am}</li>
                  ))}
                </ul>
              )}
          </div>
        )}

      {result.recovery_timeline &&
        Object.values(result.recovery_timeline).some(Boolean) && (
          <div className="p-4 rounded-xl bg-[#FF806B]/14 border border-[#FF806B]/35 space-y-2 text-xs">
            <div className="font-display font-bold text-[#A63522] dark:text-[#FF806B]">
              Emergency Stabilization Timeline
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {result.recovery_timeline.first_24h && (
                <div className="p-3 rounded-xl bg-white/90 dark:bg-[#10251D]/80">
                  <div className="font-mono font-bold text-[#A63522] dark:text-[#FF806B]">First 24 Hours</div>
                  <p className="mt-1">{result.recovery_timeline.first_24h}</p>
                </div>
              )}
              {result.recovery_timeline.hours_72 && (
                <div className="p-3 rounded-xl bg-white/90 dark:bg-[#10251D]/80">
                  <div className="font-mono font-bold text-[#7A5600] dark:text-[#F5CA62]">At 72 Hours</div>
                  <p className="mt-1">{result.recovery_timeline.hours_72}</p>
                </div>
              )}
              {result.recovery_timeline.days_14 && (
                <div className="p-3 rounded-xl bg-white/90 dark:bg-[#10251D]/80">
                  <div className="font-mono font-bold text-[#0F6B50] dark:text-[#00D69A]">14-Day Check</div>
                  <p className="mt-1">{result.recovery_timeline.days_14}</p>
                </div>
              )}
            </div>
          </div>
        )}

      {Array.isArray(result.pruning_zones) && result.pruning_zones.length > 0 && (
        <div className="p-4 rounded-xl bg-[#C7F36B]/20 border border-[#7AA61F]/35 space-y-2.5 text-xs">
          <div className="font-display font-bold text-[#3D5E0A] dark:text-[#C7F36B] flex items-center gap-1.5">
            <Scissors className="w-4 h-4" />
            Safe Pruning Zones (Why Before You Cut)
          </div>
          <div className="space-y-2">
            {result.pruning_zones.map((pz, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/90 dark:bg-[#10251D]/80 border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                <div className="font-bold">{pz.target}</div>
                <p className="mt-1"><strong>Why:</strong> {pz.why_before_cut}</p>
                <p className="mt-0.5 text-[#0F6B50] dark:text-[#00D69A]"><strong>Where &amp; How:</strong> {pz.how_to_cut}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.toxicity_and_precautions &&
        Object.values(result.toxicity_and_precautions).some(Boolean) && (
          <div className="p-4 rounded-xl bg-[#BBA8F5]/16 border border-[#BBA8F5]/40 space-y-2 text-xs">
            <div className="font-display font-bold text-[#4F3B8F] dark:text-[#BBA8F5] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Pet &amp; Human Toxicity Assessment
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {result.toxicity_and_precautions.pet_safety && (
                <div><strong>Cats &amp; Dogs:</strong> {result.toxicity_and_precautions.pet_safety}</div>
              )}
              {result.toxicity_and_precautions.human_safety && (
                <div><strong>Children &amp; Skin:</strong> {result.toxicity_and_precautions.human_safety}</div>
              )}
              {result.toxicity_and_precautions.toxic_compounds && (
                <div><strong>Key Compounds:</strong> {result.toxicity_and_precautions.toxic_compounds}</div>
              )}
            </div>
            {result.toxicity_and_precautions.emergency_guidance && (
              <p className="p-2.5 rounded-xl bg-[#FF806B]/18 font-semibold text-[#A63522] dark:text-[#FF806B]">
                {result.toxicity_and_precautions.emergency_guidance}
              </p>
            )}
          </div>
        )}

      {result.propagation_plan &&
        (result.propagation_plan.best_method ||
          result.propagation_plan.node_guidance ||
          (result.propagation_plan.rooting_steps?.length ?? 0) > 0) && (
          <div className="p-4 rounded-xl bg-[#00D69A]/10 border border-[#00D69A]/30 space-y-2 text-xs">
            <div className="font-display font-bold text-[#0F6B50] dark:text-[#00D69A] flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-[#00D69A]" />
              Propagation &amp; Node Rooting Guide
            </div>
            {result.propagation_plan.best_method && (
              <p><strong>Best Method:</strong> {result.propagation_plan.best_method}</p>
            )}
            {result.propagation_plan.node_guidance && (
              <p><strong>Node Placement:</strong> {result.propagation_plan.node_guidance}</p>
            )}
            {Array.isArray(result.propagation_plan.rooting_steps) &&
              result.propagation_plan.rooting_steps.length > 0 && (
                <ol className="space-y-1 list-decimal list-inside">
                  {result.propagation_plan.rooting_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              )}
          </div>
        )}

      {result.growth_comparison &&
        (result.growth_comparison.measured_summary ||
          result.growth_comparison.visual_estimate ||
          (result.growth_comparison.bottlenecks?.length ?? 0) > 0) && (
          <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#00D69A]/30 space-y-2 text-xs">
            <div className="font-display font-bold text-[#0F6B50] dark:text-[#00D69A] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Growth Comparison (Measured vs. Visual Estimate)
            </div>
            {result.growth_comparison.measured_summary && (
              <p><strong>Measured Data:</strong> {result.growth_comparison.measured_summary}</p>
            )}
            {result.growth_comparison.visual_estimate && (
              <p><strong>Visual Estimate:</strong> {result.growth_comparison.visual_estimate}</p>
            )}
            {Array.isArray(result.growth_comparison.bottlenecks) &&
              result.growth_comparison.bottlenecks.length > 0 && (
                <ul className="space-y-1">
                  {result.growth_comparison.bottlenecks.map((b, i) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>
              )}
          </div>
        )}

      {Array.isArray(result.garden_action_plan) && result.garden_action_plan.length > 0 && (
        <div className="p-4 rounded-xl bg-[#BBA8F5]/14 border border-[#BBA8F5]/35 space-y-2.5 text-xs">
          <div className="font-display font-bold text-[#4F3B8F] dark:text-[#BBA8F5]">
            Prioritized Garden Coaching Plan
          </div>
          <div className="space-y-2">
            {result.garden_action_plan.map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/90 dark:bg-[#10251D]/80 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold">{item.target}</div>
                  <p className="text-[#4A665B] dark:text-[#B6CDB4] mt-0.5">{item.action}</p>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#4F3B8F] dark:text-[#BBA8F5] shrink-0">
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Recommendations & Follow-Up */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 space-y-2">
          <div className="font-display font-bold text-[#0F6B50] dark:text-[#00D69A] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Actionable Recommendations
          </div>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="leading-relaxed">• {rec}</li>
            ))}
          </ul>
        </div>

        <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 space-y-2">
          <div className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
            Follow-Up Checklist
          </div>
          <ul className="space-y-1.5">
            {result.follow_up.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {onFollowUpPrompt ? (
                  <button
                    type="button"
                    onClick={() => onFollowUpPrompt(item)}
                    className="text-left hover:text-[#0F6B50] dark:hover:text-[#00D69A] underline-offset-2 hover:underline cursor-pointer"
                  >
                    • {item}
                  </button>
                ) : (
                  <span>• {item}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Scientific Guardrails & Limitations */}
      {result.limitations.length > 0 && (
        <div
          data-testid="ai-tool-limitations"
          className="p-4 rounded-xl bg-[#FF806B]/10 border border-[#FF806B]/35 space-y-1.5 text-xs"
        >
          <div className="font-display font-bold text-[#A63522] dark:text-[#FF806B] flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Scientific Accuracy &amp; Limitations
          </div>
          <ul className="space-y-1 text-[#10251D] dark:text-[#FAF7EE]">
            {result.limitations.map((lim, i) => (
              <li key={i}>• {lim}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save to My Garden + Care Calendar */}
      <SaveToGarden
        result={result}
        plants={plants}
        selectedPlantId={selectedPlantId}
        previewImageUrl={previewImageUrl}
        authToken={authToken}
        onSaved={onSavedToGarden}
      />

      {/* Footer Actions: Ask GREENY + Scan Again */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/12">
        <button
          type="button"
          data-testid="ask-greeny-from-tool-btn"
          onClick={() => onAskGreeny(result)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#BBA8F5]/25 border border-[#BBA8F5]/55 text-xs font-display font-bold text-[#4F3B8F] dark:text-[#FAF7EE] hover:bg-[#BBA8F5] hover:text-[#10251D] transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Ask GREENY About This Result
        </button>

        <button
          type="button"
          data-testid="scan-again-tool-btn"
          onClick={onScanAgain}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-xs font-display font-bold text-[#10251D] dark:text-[#FAF7EE] hover:border-[#00D69A] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Scan Again / New Analysis
        </button>
      </div>
    </motion.div>
  );
};
