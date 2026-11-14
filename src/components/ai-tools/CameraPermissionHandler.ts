export type CameraPermissionStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable';

export interface CameraStreamResult {
  stream: MediaStream | null;
  status: CameraPermissionStatus;
  errorMessage: string;
}

export function isCameraSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')
  );
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore track stop error
      }
    });
  } catch {
    // ignore
  }
}

export async function requestCameraStream(
  facingMode: 'environment' | 'user' = 'environment'
): Promise<CameraStreamResult> {
  if (!isCameraSupported()) {
    return {
      stream: null,
      status: 'unavailable',
      errorMessage:
        'Live camera access is unavailable in this browser or context. You can upload a JPG, PNG, or WEBP photo instead.',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
      audio: false,
    });
    return {
      stream,
      status: 'granted',
      errorMessage: '',
    };
  } catch (err: any) {
    const name = String(err?.name || '');
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return {
        stream: null,
        status: 'denied',
        errorMessage:
          'Camera permission was denied. Please enable camera access in your browser settings or upload an image from your device.',
      };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        stream: null,
        status: 'unavailable',
        errorMessage:
          'No camera device was detected. Please upload a plant photograph from your files instead.',
      };
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        stream: null,
        status: 'unavailable',
        errorMessage:
          'Camera is currently in use by another application or tab. Close the other camera stream or upload a photo.',
      };
    }
    if (name === 'OverconstrainedError' && facingMode === 'environment') {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        return {
          stream: fallbackStream,
          status: 'granted',
          errorMessage: '',
        };
      } catch {
        // fall through
      }
    }
    return {
      stream: null,
      status: 'unavailable',
      errorMessage:
        'Unable to initialize camera stream right now. Please upload a JPG, PNG, or WEBP plant photograph instead.',
    };
  }
}
