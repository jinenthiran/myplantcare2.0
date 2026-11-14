import React, { useEffect, useRef, useState } from 'react';
import { Camera, SwitchCamera, X } from 'lucide-react';

interface CameraPreviewProps {
  stream: MediaStream;
  facingMode: 'environment' | 'user';
  onToggleFacingMode: () => void;
  onCaptureFrame: (videoEl: HTMLVideoElement) => void;
  onClose: () => void;
  slotLabel?: string;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  stream,
  facingMode,
  onToggleFacingMode,
  onCaptureFrame,
  onClose,
  slotLabel,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [tapPoint, setTapPoint] = useState<{ x: number; y: number } | null>(null);
  const [videoReady, setVideoReady] = useState<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    const onLoaded = () => setVideoReady(true);
    video.addEventListener('loadedmetadata', onLoaded);
    video.play().catch(() => {});

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      if (video.srcObject) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  const handleTapFocus = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
    setTapPoint({ x, y });
    window.setTimeout(() => setTapPoint(null), 900);
  };

  return (
    <div
      data-testid="live-camera-preview"
      className="rounded-2xl border border-[#00D69A]/50 bg-[#10251D] overflow-hidden shadow-xl"
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#153026] border-b border-white/10 text-xs text-white">
        <div className="flex items-center gap-2 font-mono font-semibold text-[#00D69A]">
          <span className="w-2 h-2 rounded-full bg-[#00D69A] animate-pulse" />
          <span>LIVE CAMERA · {facingMode === 'environment' ? 'REAR' : 'FRONT'}</span>
          {slotLabel && <span className="text-[#B6CDB4]">({slotLabel})</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFacingMode}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[#C7F36B] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            Switch Camera
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close live camera"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-[#FF806B]/25 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        onClick={handleTapFocus}
        className="relative aspect-[4/3] w-full bg-black overflow-hidden cursor-crosshair select-none"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />

        {/* Optical framing corner guides */}
        <div className="pointer-events-none absolute inset-6 border border-dashed border-[#00D69A]/45 rounded-2xl" />

        {tapPoint && (
          <div
            style={{ left: `${tapPoint.x}%`, top: `${tapPoint.y}%` }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-[#F5CA62] shadow-md"
          />
        )}

        {!videoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#10251D]/85 text-xs font-mono text-[#C7F36B]">
            Initializing camera viewfinder...
          </div>
        )}
      </div>

      <div className="p-3.5 bg-[#153026] flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] text-[#B6CDB4]">
          Hold steady in bright natural light. Tap viewfinder to mark focus zone.
        </span>
        <button
          type="button"
          data-testid="camera-capture-btn"
          disabled={!videoReady}
          onClick={() => {
            if (videoRef.current) onCaptureFrame(videoRef.current);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D69A] text-[#10251D] font-bold text-xs shadow-md hover:bg-[#C7F36B] disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          Capture Photo
        </button>
      </div>
    </div>
  );
};
