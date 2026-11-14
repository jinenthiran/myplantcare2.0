import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, Upload, CheckCircle2, X } from 'lucide-react';

interface QrTagScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlantScanned: (plantData: { name: string; species: string; location: string; sunlight: string }) => void;
}

export const QrTagScannerModal: React.FC<QrTagScannerModalProps> = ({
  isOpen,
  onClose,
  onPlantScanned,
}) => {
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      setScanning(false);
      setScanSuccess(null);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSimulateScan = (presetName: string, presetSpecies: string, presetSun: string) => {
    setScanning(true);
    const t1 = window.setTimeout(() => {
      setScanning(false);
      setScanSuccess(presetName);
      const t2 = window.setTimeout(() => {
        onPlantScanned({
          name: presetName,
          species: presetSpecies,
          location: 'Nursery Acquisition Tag',
          sunlight: presetSun,
        });
        setScanSuccess(null);
        onClose();
      }, 900);
      timersRef.current.push(t2);
    }, 900);
    timersRef.current.push(t1);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleSimulateScan('Scanned Nursery Ficus Benjamina', 'Ficus benjamina', 'Bright Indirect');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nursery Tag QR Scanner"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251D]/80 backdrop-blur-sm p-4"
    >
      <div className="bg-[#FAF7EE] dark:bg-[#153026] border border-[#174C38]/20 dark:border-[#00D69A]/35 rounded-3xl p-6 sm:p-8 max-w-md w-full text-[#10251D] dark:text-[#FAF7EE] shadow-2xl relative space-y-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close QR scanner"
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#F1ECE0] dark:bg-[#10251D] text-[#4A665B] dark:text-[#B6CDB4] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00D69A]/16 border border-[#00D69A]/35 flex items-center justify-center text-[#0F6B50] dark:text-[#00D69A]">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold">Nursery Tag QR Scanner</h3>
            <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
              Import plant species metadata from nursery tags
            </p>
          </div>
        </div>

        {scanSuccess ? (
          <div className="py-8 text-center space-y-3 bg-[#FFFFFF] dark:bg-[#10251D] border border-[#00D69A]/35 rounded-2xl p-6">
            <CheckCircle2 className="w-10 h-10 text-[#00D69A] mx-auto" />
            <div className="text-base font-display font-bold">Tag Decoded</div>
            <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
              Prefilling "{scanSuccess}" in your garden registration form...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative h-52 rounded-2xl bg-[#FFFFFF] dark:bg-[#10251D] border-2 border-dashed border-[#174C38]/25 dark:border-[#00D69A]/35 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              {scanning ? (
                <div className="space-y-3 z-10">
                  <div className="w-9 h-9 border-2 border-[#00D69A] border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="text-xs font-mono text-[#0F6B50] dark:text-[#00D69A]">
                    Decoding Nursery Botanical Tag...
                  </div>
                </div>
              ) : (
                <div className="space-y-3 z-10">
                  <Camera className="w-9 h-9 text-[#00D69A] mx-auto" />
                  <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                    Upload a nursery QR tag photo to decode species data
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload QR Tag Photo
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#4A665B] dark:text-[#B6CDB4]">
                Test Sample Nursery Tags:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() =>
                    handleSimulateScan('Monstera Deliciosa (Tag #882)', 'Monstera deliciosa', 'Bright Indirect')
                  }
                  className="p-2.5 rounded-xl bg-white dark:bg-[#10251D] hover:border-[#00D69A] border border-[#174C38]/14 dark:border-[#B6CDB4]/18 text-xs text-left transition-colors cursor-pointer"
                >
                  <div className="font-display font-bold">Monstera Deliciosa</div>
                  <div className="text-[10px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">Tag ID: #882-M</div>
                </button>
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() =>
                    handleSimulateScan('Sacred Tulsi Ocimum (Tag #104)', 'Ocimum tenuiflorum', 'Full Sun')
                  }
                  className="p-2.5 rounded-xl bg-white dark:bg-[#10251D] hover:border-[#00D69A] border border-[#174C38]/14 dark:border-[#B6CDB4]/18 text-xs text-left transition-colors cursor-pointer"
                >
                  <div className="font-display font-bold">Sacred Tulsi</div>
                  <div className="text-[10px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">Tag ID: #104-T</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
