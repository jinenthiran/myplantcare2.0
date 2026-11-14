import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Camera, AlertTriangle, SwitchCamera } from 'lucide-react';
import {
  CameraPermissionStatus,
  requestCameraStream,
  stopMediaStream,
} from './CameraPermissionHandler';
import { compressAndEvaluateImageElement, ProcessedImagePayload } from './ImageQualityChecker';
import { CameraPreview } from './CameraPreview';
import { ImageCapture } from './ImageCapture';
import { ImageUploader } from './ImageUploader';

export interface PlantCameraProps {
  toolSlug?: string;
  activeSlotLabel?: string;
  onImageConfirmed: (
    payload: ProcessedImagePayload,
    source: 'camera' | 'upload',
    labelNote?: string
  ) => void;
}

export const PlantCamera: React.FC<PlantCameraProps> = ({
  toolSlug,
  activeSlotLabel = 'Plant Photo',
  onImageConfirmed,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>('idle');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedPreview, setCapturedPreview] = useState<ProcessedImagePayload | null>(null);

  const closeStream = useCallback(() => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  // Synchronously clean up any active MediaStream tracks when switching tools or unmounting
  useEffect(() => {
    closeStream();
    setCapturedPreview(null);
    setCameraError('');
    setPermissionStatus('idle');
    return () => {
      if (streamRef.current) {
        stopMediaStream(streamRef.current);
        streamRef.current = null;
      }
    };
  }, [toolSlug, closeStream]);

  const openCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    closeStream();
    setCapturedPreview(null);
    setCameraError('');
    setPermissionStatus('requesting');

    const res = await requestCameraStream(targetFacing);
    setPermissionStatus(res.status);
    if (res.stream) {
      streamRef.current = res.stream;
      setStream(res.stream);
      setFacingMode(targetFacing);
    } else {
      setCameraError(res.errorMessage);
    }
  };

  const handleToggleFacing = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (streamRef.current) {
      await openCamera(nextFacing);
    }
  };

  const handleCaptureFrame = (videoEl: HTMLVideoElement) => {
    try {
      const w = videoEl.videoWidth || 640;
      const h = videoEl.videoHeight || 480;
      const payload = compressAndEvaluateImageElement(videoEl, w, h);
      setCapturedPreview(payload);
      closeStream();
      setPermissionStatus('idle');
    } catch (err: any) {
      setCameraError(err?.message || 'Failed to capture frame from camera.');
    }
  };

  return (
    <div
      data-testid="plant-camera-component"
      data-tool-slug={toolSlug || 'shared'}
      className="space-y-3"
    >
      {/* Primary Action Controls: Open Camera + Lens Toggle + Upload Image */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="open-camera-btn"
          disabled={permissionStatus === 'requesting'}
          onClick={() => openCamera(facingMode)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] text-xs font-bold shadow-sm hover:bg-[#10251D] dark:hover:bg-[#C7F36B] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          {permissionStatus === 'requesting'
            ? 'Opening Camera...'
            : stream
            ? 'Restart Camera'
            : 'Open Camera'}
        </button>

        <button
          type="button"
          data-testid="toggle-camera-lens-btn"
          onClick={handleToggleFacing}
          aria-label={`Switch preferred camera lens (currently ${facingMode === 'environment' ? 'Rear' : 'Front'})`}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#B6CDB4]/55 dark:border-white/12 bg-[#FAF7EE] dark:bg-[#10251D] text-xs font-semibold text-[#10251D] dark:text-[#B6CDB4] hover:border-[#00D69A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <SwitchCamera className="w-3.5 h-3.5 text-[#174C38] dark:text-[#00D69A]" />
          {facingMode === 'environment' ? 'Rear Lens' : 'Front Lens'}
        </button>

        <ImageUploader
          compact
          buttonLabel="Upload Image"
          onImageProcessed={(payload, fileName) => {
            closeStream();
            setCapturedPreview(null);
            setCameraError('');
            onImageConfirmed(payload, 'upload', fileName);
          }}
        />
      </div>

      {/* Live Video Preview (when stream active) */}
      {stream && !capturedPreview && (
        <CameraPreview
          stream={stream}
          facingMode={facingMode}
          slotLabel={activeSlotLabel}
          onToggleFacingMode={handleToggleFacing}
          onCaptureFrame={handleCaptureFrame}
          onClose={() => {
            closeStream();
            setPermissionStatus('idle');
          }}
        />
      )}

      {/* Captured Photo Confirm / Retake Step */}
      {capturedPreview && (
        <ImageCapture
          captured={capturedPreview}
          onRetake={() => {
            setCapturedPreview(null);
            openCamera(facingMode);
          }}
          onConfirm={() => {
            onImageConfirmed(capturedPreview, 'camera', `Camera Capture (${activeSlotLabel})`);
            setCapturedPreview(null);
          }}
        />
      )}

      {/* Permission Denied / Unavailable Fallback with Upload Option */}
      {cameraError && (
        <div
          role="alert"
          data-testid="camera-permission-alert"
          className="p-3.5 rounded-2xl border border-[#FF806B]/45 bg-[#FF806B]/10 space-y-2.5 text-xs"
        >
          <div className="font-bold text-[#A33624] dark:text-[#FF806B] flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {permissionStatus === 'denied' ? 'Camera Access Blocked' : 'Camera Unavailable'}
            </span>
          </div>
          <p className="text-[#10251D] dark:text-white leading-relaxed">{cameraError}</p>
          <ImageUploader
            testId="camera-fallback-upload-input"
            buttonLabel="Choose Plant Photo from Device"
            onImageProcessed={(payload, fileName) => {
              setCameraError('');
              onImageConfirmed(payload, 'upload', fileName);
            }}
          />
        </div>
      )}
    </div>
  );
};
