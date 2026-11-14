import React from 'react';
import { Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { ProcessedImagePayload } from './ImageQualityChecker';

interface ImageCaptureProps {
  captured: ProcessedImagePayload;
  onRetake: () => void;
  onConfirm: () => void;
}

export const ImageCapture: React.FC<ImageCaptureProps> = ({
  captured,
  onRetake,
  onConfirm,
}) => {
  return (
    <div
      data-testid="captured-image-confirm"
      className="rounded-2xl border border-[#00D69A]/45 bg-white dark:bg-[#153026] overflow-hidden shadow-md space-y-3 p-4"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-display font-bold text-[#10251D] dark:text-[#C7F36B]">
          Captured Frame Preview
        </span>
        <span className="font-mono text-[#174C38] dark:text-[#B6CDB4]">
          {captured.width}×{captured.height} · {captured.sizeKb} KB · Clarity {captured.qualityScore}%
        </span>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-[#10251D] max-h-72 flex items-center justify-center">
        <img
          src={captured.dataUrl}
          alt="Captured plant preview"
          className="max-h-72 w-auto object-contain"
        />
      </div>

      {captured.warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-[#F5CA62]/20 dark:bg-[#F5CA62]/12 border border-[#F5CA62]/50 text-xs space-y-1 text-[#705308] dark:text-[#F5CA62]">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Photo Clarity Tip
          </div>
          {captured.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#B6CDB4]/60 dark:border-white/15 bg-[#FAF7EE] dark:bg-[#10251D] text-xs font-bold text-[#10251D] dark:text-white hover:border-[#FF806B] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retake Photo
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
          Use This Photo
        </button>
      </div>
    </div>
  );
};
