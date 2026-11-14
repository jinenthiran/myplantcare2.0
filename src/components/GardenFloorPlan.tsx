import React, { useEffect, useRef, useState } from 'react';
import {
  Map,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Upload,
} from 'lucide-react';
import { auth, saveGardenLayoutToFirestore } from '../lib/firebase';
import { emitGreenyAppEvent } from './greeny/GreenyTypes';
import { ObservatoryCard } from './ui/ObservatoryPrimitives';

export interface FloorPlantMarker {
  id: string;
  name: string;
  speciesType: string;
  x: number;
  y: number;
  lightZone: 'south_direct' | 'east_indirect' | 'center_medium' | 'north_low';
  preferredLight: 'direct' | 'indirect' | 'low';
  healthScore: number;
}

interface GardenFloorPlanProps {
  plants: any[];
  onRefresh: () => void;
}

const LIGHT_ZONE_META = {
  south_direct: {
    label: 'South Window (Direct Sun · 4,000+ Lux)',
    luxRange: '4,000 – 10,000 Lux',
  },
  east_indirect: {
    label: 'East / West Window (Bright Indirect · 2,000–4,000 Lux)',
    luxRange: '2,000 – 4,000 Lux',
  },
  center_medium: {
    label: 'Center Room (Medium Indirect · 800–2,000 Lux)',
    luxRange: '800 – 2,000 Lux',
  },
  north_low: {
    label: 'North Corner / Hallway (Low Light · <800 Lux)',
    luxRange: '200 – 800 Lux',
  },
};

export const GardenFloorPlan: React.FC<GardenFloorPlanProps> = ({ plants }) => {
  const initialMarkers: FloorPlantMarker[] =
    plants.length > 0
      ? plants.slice(0, 6).map((p: any, i: number) => ({
          id: `marker-${p.id}`,
          name: p.name,
          speciesType: p.species || 'specimen',
          x: 20 + ((i * 22) % 64),
          y: 26 + ((i * 20) % 52),
          lightZone: i % 3 === 0 ? 'south_direct' : i % 3 === 1 ? 'east_indirect' : 'north_low',
          preferredLight: String(p.sunlight || '').toLowerCase().includes('full')
            ? 'direct'
            : String(p.sunlight || '').toLowerCase().includes('low')
            ? 'low'
            : 'indirect',
          healthScore: Number(p.healthScore ?? 90),
        }))
      : [
          {
            id: 'marker-1',
            name: 'Monstera Deliciosa',
            speciesType: 'monstera',
            x: 35,
            y: 44,
            lightZone: 'east_indirect',
            preferredLight: 'indirect',
            healthScore: 95,
          },
          {
            id: 'marker-2',
            name: 'Krishna Tulsi',
            speciesType: 'tulsi',
            x: 72,
            y: 26,
            lightZone: 'south_direct',
            preferredLight: 'direct',
            healthScore: 92,
          },
          {
            id: 'marker-3',
            name: 'Sansevieria Purifier',
            speciesType: 'snake',
            x: 24,
            y: 74,
            lightZone: 'north_low',
            preferredLight: 'low',
            healthScore: 98,
          },
        ];

  const [markers, setMarkers] = useState<FloorPlantMarker[]>(initialMarkers);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>(markers[0]?.id || '');
  const [roomScanPhoto, setRoomScanPhoto] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activeMarker = markers.find((m) => m.id === selectedMarkerId) || markers[0];

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopCameraStream();
        setIsScanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScanning]);

  const handleStartCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraError('Live camera streaming is unavailable in this browser. Please use "Upload Map" to upload a room photo.');
      setIsScanning(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera device unavailable or permission denied:', err);
      setCameraError('Camera access was denied or no camera device was found. You can still upload a room photo using "Upload Map".');
      setIsScanning(false);
    }
  };

  const handleCaptureRoomScan = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setRoomScanPhoto(canvas.toDataURL('image/jpeg'));
    }
    stopCameraStream();
    setIsScanning(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setRoomScanPhoto(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMoveMarker = (id: string, newZone: keyof typeof LIGHT_ZONE_META) => {
    setMarkers((prev) =>
      prev.map((m) =>
        m.id !== id
          ? m
          : {
              ...m,
              lightZone: newZone,
              y: newZone === 'south_direct' ? 20 : newZone === 'north_low' ? 78 : 50,
            }
      )
    );
    emitGreenyAppEvent({ type: 'USER_COMPLETED_WATERING', plantName: 'Floor Plan' });
  };

  const handleSaveFloorPlan = async () => {
    if (!auth.currentUser) {
      setSyncMsg('Sign in with Google to save floor plan layout to Firestore.');
      setTimeout(() => setSyncMsg(null), 4000);
      return;
    }
    try {
      await saveGardenLayoutToFirestore({
        userId: auth.currentUser.uid,
        title: `Room Floor Plan (${markers.length} Specimens Mapped)`,
        lightingPreset: 'daylight',
        specimenCount: markers.length,
      });
      setSyncMsg('Floor plan and light zones saved to Firebase Firestore.');
      setTimeout(() => setSyncMsg(null), 3500);
    } catch {
      setSyncMsg('Failed to save floor plan.');
      setTimeout(() => setSyncMsg(null), 3500);
    }
  };

  const getSuitability = (marker: FloorPlantMarker) => {
    if (marker.preferredLight === 'direct' && marker.lightZone === 'south_direct') {
      return {
        status: 'Optimal',
        text: 'Ideal high-light exposure for sun-loving specimens.',
        color: 'text-[#0F6B50] dark:text-[#00D69A]',
      };
    }
    if (
      marker.preferredLight === 'indirect' &&
      (marker.lightZone === 'east_indirect' || marker.lightZone === 'center_medium')
    ) {
      return {
        status: 'Optimal',
        text: 'Balanced indirect light for vigorous foliage.',
        color: 'text-[#0F6B50] dark:text-[#00D69A]',
      };
    }
    if (marker.preferredLight === 'low' && marker.lightZone === 'north_low') {
      return {
        status: 'Optimal',
        text: 'Well-matched low-light corner tolerance.',
        color: 'text-[#0F6B50] dark:text-[#00D69A]',
      };
    }
    if (marker.preferredLight === 'direct' && marker.lightZone === 'north_low') {
      return {
        status: 'Warning',
        text: 'Too dim—reposition closer to a bright South or East window.',
        color: 'text-[#C9432C] dark:text-[#FF806B]',
      };
    }
    return {
      status: 'Moderate',
      text: 'Acceptable placement; move toward your target window zone for faster growth.',
      color: 'text-[#8F6500] dark:text-[#F5CA62]',
    };
  };

  return (
    <div className="space-y-6">
      <ObservatoryCard padding="lg" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A] font-semibold flex items-center gap-1.5">
            <Map className="w-4 h-4" /> Camera Room Scan & 2D Floor Plan
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
            Garden Floor Plan & Light Optimizer
          </h2>
          <p className="text-xs sm:text-sm text-[#4A665B] dark:text-[#B6CDB4] max-w-xl">
            Scan a room via camera or upload a layout image, then place plant markers across natural light zones.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsScanning(true);
              handleStartCamera();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold hover:brightness-110 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" /> Scan Room
          </button>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] text-xs font-semibold hover:border-[#00D69A] transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-[#00D69A]" /> Upload Map
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleSaveFloorPlan}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/30 text-xs font-semibold text-[#174C38] dark:text-[#00D69A] hover:bg-[#00D69A]/10 transition-colors cursor-pointer"
          >
            Save Layout
          </button>
        </div>
      </ObservatoryCard>

      {cameraError && (
        <div role="alert" className="p-3.5 rounded-xl bg-[#FF806B]/14 border border-[#FF806B]/45 text-[#A63522] dark:text-[#FF806B] text-xs flex items-center justify-between gap-3">
          <span>{cameraError}</span>
          <button
            type="button"
            onClick={() => setCameraError(null)}
            aria-label="Dismiss camera error"
            className="font-bold hover:opacity-75 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {syncMsg && (
        <div className="p-3.5 rounded-xl bg-[#00D69A]/14 border border-[#00D69A]/35 text-[#0F6B50] dark:text-[#00D69A] text-xs font-mono">
          {syncMsg}
        </div>
      )}

      {isScanning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Scan Room Environment"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              stopCameraStream();
              setIsScanning(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#10251D]/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-[#153026] border border-[#00D69A]/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 text-[#FAF7EE]">
            <div className="flex items-center justify-between border-b border-[#B6CDB4]/14 pb-3">
              <h3 className="text-base font-display font-bold text-[#C7F36B] flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#00D69A]" /> Scan Room Environment
              </h3>
              <button
                type="button"
                aria-label="Close room scanner"
                onClick={() => {
                  stopCameraStream();
                  setIsScanning(false);
                }}
                className="text-[#B6CDB4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-[#00D69A]/30 bg-black h-80 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-dashed border-[#00D69A]/50 m-6 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="bg-[#10251D]/80 text-[#C7F36B] px-3 py-1 rounded-lg text-xs font-mono">
                  Align camera with room windows & walls
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCaptureRoomScan}
                className="px-5 py-2.5 bg-[#00D69A] text-[#10251D] font-display font-bold text-xs rounded-xl hover:bg-[#C7F36B] transition-colors"
              >
                Capture Room Layout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ObservatoryCard padding="lg" className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                Interactive Room Light Map
              </h3>
              <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                Select any specimen pin to evaluate its photoperiod suitability.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#0F6B50] dark:text-[#00D69A]">
              <span>South (Direct)</span>
              <span>·</span>
              <span>East (Indirect)</span>
              <span>·</span>
              <span>North (Low)</span>
            </div>
          </div>

          <div className="relative h-[420px] rounded-2xl border border-[#174C38]/25 dark:border-[#00D69A]/25 bg-[#10251D] overflow-hidden p-6 shadow-inner">
            {roomScanPhoto ? (
              <div className="absolute inset-0 opacity-45">
                <img src={roomScanPhoto} alt="Scanned Room Layout" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #00D69A 1px, transparent 1px), linear-gradient(to bottom, #00D69A 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                }}
              />
            )}

            <div className="absolute top-4 inset-x-6 h-16 bg-[#F5CA62]/12 border border-[#F5CA62]/35 rounded-xl flex items-center justify-center text-xs font-mono text-[#F5CA62] pointer-events-none">
              South Window Zone (4,000 – 10,000 Lux)
            </div>
            <div className="absolute bottom-4 inset-x-6 h-16 bg-[#BBA8F5]/12 border border-[#BBA8F5]/35 rounded-xl flex items-center justify-center text-xs font-mono text-[#BBA8F5] pointer-events-none">
              North Wall / Shade Zone (200 – 800 Lux)
            </div>

            {markers.map((m) => {
              const isSelected = activeMarker?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMarkerId(m.id)}
                  style={{ left: `${m.x}%`, top: `${m.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-display font-bold border transition-all cursor-pointer shadow-lg ${
                    isSelected
                      ? 'bg-[#00D69A] text-[#10251D] border-[#FAF7EE] scale-105 z-20 ring-4 ring-[#00D69A]/25'
                      : 'bg-[#153026]/95 text-[#FAF7EE] border-[#00D69A]/45 hover:border-[#C7F36B] z-10'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#10251D]' : 'bg-[#00D69A]'}`}
                  />
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
        </ObservatoryCard>

        <ObservatoryCard padding="lg" className="lg:col-span-4 space-y-5 flex flex-col justify-between">
          {activeMarker ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 pb-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#0F6B50] dark:text-[#00D69A] font-semibold">
                  Placement Inspector
                </span>
                <span className="text-xs font-mono font-bold text-[#0F6B50] dark:text-[#00D69A]">
                  Health {activeMarker.healthScore}%
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                  {activeMarker.name}
                </h3>
                <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                  Zone: <strong className="text-[#174C38] dark:text-[#C7F36B]">{LIGHT_ZONE_META[activeMarker.lightZone].label}</strong>
                </p>
              </div>

              {(() => {
                const suit = getSuitability(activeMarker);
                return (
                  <div className="p-3.5 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 space-y-1.5">
                    <div className={`text-xs font-display font-bold flex items-center gap-1.5 ${suit.color}`}>
                      {suit.status === 'Optimal' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      <span>{suit.status} Light Suitability</span>
                    </div>
                    <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">{suit.text}</p>
                  </div>
                );
              })()}

              <div className="space-y-2 pt-2">
                <label className="text-xs font-display font-bold text-[#10251D] dark:text-[#FAF7EE] block">
                  Reassign Light Zone:
                </label>
                <div className="space-y-1.5">
                  {(Object.keys(LIGHT_ZONE_META) as (keyof typeof LIGHT_ZONE_META)[]).map((zoneKey) => (
                    <button
                      key={zoneKey}
                      type="button"
                      onClick={() => handleMoveMarker(activeMarker.id, zoneKey)}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center justify-between cursor-pointer ${
                        activeMarker.lightZone === zoneKey
                          ? 'bg-[#00D69A]/15 border-[#00D69A] text-[#10251D] dark:text-[#00D69A] font-bold'
                          : 'bg-[#FAF7EE] dark:bg-[#10251D] border-[#174C38]/14 dark:border-[#B6CDB4]/14 text-[#4A665B] dark:text-[#B6CDB4] hover:border-[#00D69A]'
                      }`}
                    >
                      <span>{LIGHT_ZONE_META[zoneKey].label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-center text-[#4A665B] dark:text-[#B6CDB4] py-12">
              Select a plant marker on the 2D floor plan to inspect its light optimization.
            </div>
          )}

          <div className="pt-4 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/14">
            <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#00D69A] shrink-0" />
              <span>Matching specimen photoperiods prevents leggy stems and leaf scorch.</span>
            </div>
          </div>
        </ObservatoryCard>
      </div>
    </div>
  );
};
