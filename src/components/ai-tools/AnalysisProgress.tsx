import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ScanLine, Sparkles } from 'lucide-react';
import { AnalysisStageText } from './PlantAnalysisEngine';

interface AnalysisProgressProps {
  toolName: string;
  stageText: AnalysisStageText;
  previewImageUrl?: string;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  toolName,
  stageText,
  previewImageUrl,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      data-testid="ai-analysis-progress"
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-[#00D69A]/45 bg-white dark:bg-[#153026] p-6 space-y-5 shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 flex items-center justify-center">
            {!prefersReducedMotion && (
              <motion.span
                aria-hidden="true"
                animate={{ scale: [1, 1.28, 1], opacity: [0.55, 0.15, 0.55] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-[#00D69A]/30"
              />
            )}
            <div className="relative w-10 h-10 rounded-full bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#0F6B50] dark:text-[#00D69A] font-bold">
              Processing · {toolName}
            </div>
            <div className="text-sm font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE]">
              {stageText}
            </div>
          </div>
        </div>

        <ScanLine className="w-5 h-5 text-[#00D69A] shrink-0" />
      </div>

      {/* Laser scanning visual over uploaded/captured preview ONLY while processing */}
      {previewImageUrl ? (
        <div className="relative h-52 rounded-2xl overflow-hidden bg-[#10251D] border border-[#174C38]">
          <img
            src={previewImageUrl}
            alt="Plant currently under AI analysis"
            className="w-full h-full object-contain opacity-85"
          />
          {!prefersReducedMotion && (
            <motion.div
              aria-hidden="true"
              initial={{ top: '4%' }}
              animate={{ top: ['4%', '90%', '4%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00D69A] to-transparent shadow-[0_0_16px_rgba(0,214,154,0.95)]"
            />
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="h-2.5 w-full rounded-full bg-[#FAF7EE] dark:bg-[#10251D] overflow-hidden">
            {!prefersReducedMotion ? (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#00D69A] via-[#C7F36B] to-[#56C7C0]"
              />
            ) : (
              <div className="h-full w-2/3 rounded-full bg-[#00D69A]" />
            )}
          </div>
          <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
            Evaluating your saved My Garden specimens, local microclimate telemetry, and botanical safety guidelines...
          </p>
        </div>
      )}
    </div>
  );
};
