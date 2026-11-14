import React from 'react';
import { Trash2, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';
import { AiToolSlug } from '../../data/aiToolsCatalog';
import { PlantCamera } from './PlantCamera';
import { ToolImageSlot } from './PlantAnalysisEngine';

interface MultiImageSelectorProps {
  toolSlug: AiToolSlug;
  slots: ToolImageSlot[];
  activeSlotIndex: number;
  onSelectSlot: (idx: number) => void;
  onUpdateSlot: (idx: number, patch: Partial<ToolImageSlot>) => void;
  onClearSlot: (idx: number) => void;
}

export const MultiImageSelector: React.FC<MultiImageSelectorProps> = ({
  toolSlug,
  slots,
  activeSlotIndex,
  onSelectSlot,
  onUpdateSlot,
  onClearSlot,
}) => {
  const activeSlot = slots[activeSlotIndex] || slots[0];
  const filledCount = slots.filter((s) => Boolean(s.dataUrl)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-display font-bold text-[#10251D] dark:text-[#C7F36B]">
          Camera & Photo Slots ({filledCount}/{slots.length} Attached)
        </span>
        <span className="text-[11px] font-mono text-[#174C38] dark:text-[#B6CDB4]">
          Active: {activeSlot?.label}
        </span>
      </div>

      {/* Multi-angle / Before-After Slot Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {slots.map((slot, idx) => {
          const isSelected = idx === activeSlotIndex;
          const hasImage = Boolean(slot.dataUrl);
          return (
            <div
              key={slot.id}
              onClick={() => onSelectSlot(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSlot(idx);
                }
              }}
              className={`rounded-2xl border p-2.5 cursor-pointer transition-all space-y-2 ${
                isSelected
                  ? 'border-[#00D69A] bg-[#00D69A]/12 dark:bg-[#00D69A]/14 shadow-sm ring-1 ring-[#00D69A]/35'
                  : 'border-[#B6CDB4]/45 dark:border-white/12 bg-[#FAF7EE] dark:bg-[#10251D]/85 hover:border-[#00D69A]/60'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-[#10251D] dark:text-white truncate">
                  {idx + 1}. {slot.label}
                </span>
                {hasImage && (
                  <button
                    type="button"
                    aria-label={`Remove ${slot.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearSlot(idx);
                    }}
                    className="p-1 rounded-lg text-[#FF806B] hover:bg-[#FF806B]/18 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {hasImage ? (
                <div className="relative h-24 rounded-xl overflow-hidden bg-[#10251D]">
                  <img
                    src={slot.dataUrl}
                    alt={slot.label}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#10251D]/85 text-[10px] font-mono text-[#00D69A] border border-[#00D69A]/30">
                    <CheckCircle2 className="w-3 h-3" />
                    {slot.source === 'camera' ? 'Cam' : 'File'}
                  </span>
                </div>
              ) : (
                <div className="h-24 rounded-xl border border-dashed border-[#B6CDB4]/65 dark:border-white/15 flex items-center justify-center text-[11px] text-[#174C38]/80 dark:text-[#B6CDB4] text-center px-2">
                  Tap to capture or upload
                </div>
              )}

              {/* Date-stamped photo support for AI Growth Monitor */}
              {toolSlug === 'plant-growth' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 pt-0.5"
                >
                  <Calendar className="w-3 h-3 text-[#00D69A] shrink-0" />
                  <input
                    type="date"
                    aria-label={`${slot.label} date`}
                    value={slot.capturedDate || ''}
                    onChange={(e) => onUpdateSlot(idx, { capturedDate: e.target.value })}
                    className="w-full px-2 py-1 text-[11px] font-mono rounded-lg border border-[#B6CDB4]/55 dark:border-white/15 bg-white dark:bg-[#10251D] text-[#10251D] dark:text-white"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unified Camera + Uploader targeting the active slot */}
      <PlantCamera
        toolSlug={toolSlug}
        activeSlotLabel={activeSlot?.label || 'Plant View'}
        onImageConfirmed={(payload, source, labelNote) => {
          onUpdateSlot(activeSlotIndex, {
            dataUrl: payload.dataUrl,
            mimeType: payload.mimeType,
            source,
            metaText: `${labelNote || source} · ${payload.width}×${payload.height} · ${payload.sizeKb} KB`,
            qualityWarnings: payload.warnings,
            qualityScore: payload.qualityScore,
          });
          // Automatically advance to next empty slot if available
          const nextEmpty = slots.findIndex((s, i) => i > activeSlotIndex && !s.dataUrl);
          if (nextEmpty !== -1) {
            onSelectSlot(nextEmpty);
          }
        }}
      />

      {/* Active Slot Quality Warning if dark/blurry */}
      {activeSlot?.dataUrl && activeSlot.qualityWarnings && activeSlot.qualityWarnings.length > 0 && (
        <div className="p-3 rounded-xl bg-[#F5CA62]/20 dark:bg-[#F5CA62]/12 border border-[#F5CA62]/50 text-xs text-[#705308] dark:text-[#F5CA62] space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Clarity Notice on {activeSlot.label} (Score {activeSlot.qualityScore}%)</span>
          </div>
          {activeSlot.qualityWarnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}
    </div>
  );
};
