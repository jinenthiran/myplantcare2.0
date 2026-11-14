import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Calendar, X, Film } from 'lucide-react';
import { BotanicalImage } from './ui/BotanicalImage';

interface GrowthTimeLapseModalProps {
  plant: {
    name: string;
    species?: string;
    imageUrl?: string;
    imageHistory?: string[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GrowthTimeLapseModal: React.FC<GrowthTimeLapseModalProps> = ({
  plant,
  isOpen,
  onClose,
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(1200);
  const timerRef = useRef<any>(null);

  const rawHistory = (plant?.imageHistory || []).filter((url) => Boolean(url && String(url).trim()));
  const frames = rawHistory.length > 0
    ? rawHistory
    : plant?.imageUrl
    ? [plant.imageUrl]
    : [''];
  const canAnimate = frames.length > 1;

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentFrameIndex(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setCurrentFrameIndex(0);
    setIsPlaying(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, plant?.name, plant?.imageUrl, onClose]);

  useEffect(() => {
    if (isPlaying && canAnimate) {
      timerRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
      }, speedMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, canAnimate, speedMs, frames.length]);

  if (!isOpen || !plant) return null;

  const frameLabel = canAnimate
    ? `Snapshot ${currentFrameIndex + 1} of ${frames.length}`
    : 'Current Specimen Reference';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Growth Progression Time-Lapse"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251D]/80 backdrop-blur-md p-4"
    >
      <div className="bg-[#FAF7EE] dark:bg-[#153026] border border-[#174C38]/20 dark:border-[#00D69A]/35 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-[#10251D] dark:text-[#FAF7EE] shadow-2xl relative space-y-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close time-lapse modal"
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#F1ECE0] dark:bg-[#10251D] hover:border-[#00D69A] border border-transparent text-[#4A665B] dark:text-[#B6CDB4] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00D69A]/16 border border-[#00D69A]/35 flex items-center justify-center text-[#0F6B50] dark:text-[#00D69A]">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold">Growth Progression Time-Lapse</h3>
            <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
              {plant.name} ({plant.species || 'Specimen'})
            </p>
          </div>
        </div>

        <div className="relative h-72 sm:h-80 rounded-2xl bg-[#10251D] border border-[#174C38]/25 dark:border-[#00D69A]/25 overflow-hidden flex items-center justify-center shadow-inner">
          <BotanicalImage
            src={frames[currentFrameIndex % frames.length]}
            alt={`${plant.name} Growth Frame ${currentFrameIndex + 1}`}
            commonName={plant.name}
            scientificName={plant.species}
            containerClassName="absolute inset-0"
            aspectClassName="w-full h-full object-cover transition-all duration-500"
          />

          <div className="absolute top-4 left-4 bg-[#10251D]/85 px-3 py-1 rounded-xl text-xs font-mono text-[#FAF7EE] border border-[#FAF7EE]/15 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#00D69A]" />
            <span>{frameLabel}</span>
          </div>

          <div className="absolute bottom-4 right-4 bg-[#10251D]/85 px-3 py-1 rounded-xl text-xs font-mono text-[#C7F36B] border border-[#00D69A]/35">
            Frame {currentFrameIndex + 1} / {frames.length}
          </div>
        </div>

        {!canAnimate && (
          <div className="p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#B6CDB4]/14 text-xs text-[#4A665B] dark:text-[#B6CDB4]">
            Only 1 specimen snapshot is currently stored for this plant. Add additional gallery photos in Plant Profile or save new diagnostic scans to unlock multi-frame time-lapse playback.
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {frames.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`View snapshot ${idx + 1}`}
                onClick={() => setCurrentFrameIndex(idx)}
                className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                  currentFrameIndex === idx
                    ? 'bg-[#00D69A]'
                    : 'bg-[#E9F0E6] dark:bg-[#10251D] hover:bg-[#B6CDB4]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canAnimate}
                onClick={() => setIsPlaying(!isPlaying)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold text-xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play Time-Lapse'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentFrameIndex(0);
                }}
                aria-label="Reset time-lapse"
                className="p-2.5 rounded-xl bg-[#F1ECE0] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] border border-[#174C38]/15 dark:border-[#B6CDB4]/20 cursor-pointer"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#4A665B] dark:text-[#B6CDB4]">Speed:</span>
              <button
                type="button"
                disabled={!canAnimate}
                onClick={() => setSpeedMs(speedMs === 1200 ? 600 : 1200)}
                className="px-2.5 py-1.5 rounded-lg bg-[#F1ECE0] dark:bg-[#10251D] text-[#10251D] dark:text-[#00D69A] font-mono border border-[#174C38]/16 dark:border-[#00D69A]/30 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {speedMs === 1200 ? '1x' : '2x'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
