import React, { useRef, useState } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { ProcessedImagePayload, processUploadedImageFile } from './ImageQualityChecker';

interface ImageUploaderProps {
  onImageProcessed: (payload: ProcessedImagePayload, fileName: string) => void;
  buttonLabel?: string;
  compact?: boolean;
  testId?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageProcessed,
  buttonLabel = 'Upload Image',
  compact = false,
  testId = 'tool-image-upload-input',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setIsProcessing(true);
    setUploadError('');
    try {
      const processed = await processUploadedImageFile(file);
      onImageProcessed(processed, file.name);
    } catch (err: any) {
      setUploadError(err?.message || 'Unable to process this image file.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        data-testid={testId}
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          handleFile(f);
          e.target.value = '';
        }}
        className="hidden"
      />

      {compact ? (
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#B6CDB4]/60 dark:border-white/15 bg-white dark:bg-[#153026] text-xs font-bold text-[#10251D] dark:text-[#00D69A] hover:border-[#00D69A] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          {isProcessing ? 'Processing...' : buttonLabel}
        </button>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${
            isDragging
              ? 'border-[#00D69A] bg-[#00D69A]/12'
              : 'border-[#B6CDB4]/60 dark:border-white/15 bg-[#FAF7EE] dark:bg-[#10251D]/70'
          }`}
        >
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#153026] border border-[#B6CDB4]/55 dark:border-white/15 text-xs font-bold text-[#10251D] dark:text-[#00D69A] hover:border-[#00D69A] transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            {isProcessing ? 'Optimizing Image...' : buttonLabel}
          </button>
          <p className="text-[11px] text-[#174C38]/80 dark:text-[#B6CDB4] mt-1.5">
            Drag & drop or choose JPG, PNG, or WEBP (auto-compressed preserving leaf detail)
          </p>
        </div>
      )}

      {uploadError && (
        <div
          role="alert"
          className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FF806B]/15 border border-[#FF806B]/50 text-xs text-[#A33624] dark:text-[#FF806B]"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
};
