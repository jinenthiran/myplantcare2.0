import React, { useState } from 'react';
import { Droplets, Sun, Plus, ShieldCheck, MapPin, Trash2 } from 'lucide-react';
import { ObservatoryCard } from './ui/ObservatoryPrimitives';

export interface ClimateLogEntry {
  id: string;
  areaName: string;
  humidity: number;
  lightLux: number;
  temperature: number;
  timestamp: string;
}

interface ClimateTrackerCardProps {
  onLogAdded: (entry: ClimateLogEntry) => void;
  logs: ClimateLogEntry[];
  onDeleteLog: (id: string) => void;
}

export const ClimateTrackerCard: React.FC<ClimateTrackerCardProps> = ({
  onLogAdded,
  logs = [],
  onDeleteLog,
}) => {
  const [areaName, setAreaName] = useState('Living Room Conservatory');
  const [humidity, setHumidity] = useState<number>(65);
  const [lightLux, setLightLux] = useState<number>(1200);
  const [temperature, setTemperature] = useState<number>(26.5);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim()) return;

    const newEntry: ClimateLogEntry = {
      id: `climate-${Date.now()}`,
      areaName: areaName.trim(),
      humidity: Number(humidity),
      lightLux: Number(lightLux),
      temperature: Number(temperature),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    onLogAdded(newEntry);
    setSuccessMsg(`Logged climate stats for "${newEntry.areaName}"`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <ObservatoryCard padding="lg" className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A]">
            <Sun className="w-4 h-4" />
            <span>Microclimate Telemetry</span>
          </p>
          <h3 className="text-lg sm:text-xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
            Indoor Humidity & Light Intensity Logs
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleAddLog}
          className="lg:col-span-5 rounded-2xl p-5 bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 space-y-4"
        >
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#174C38] dark:text-[#C7F36B]">
            Log New Zone Reading
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#4A665B] dark:text-[#B6CDB4]">Zone / Area Name</label>
            <input
              type="text"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder="e.g., East Balcony, Kitchen Windowsill..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/18 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#4A665B] dark:text-[#B6CDB4]">Humidity (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                value={humidity}
                onChange={(e) => setHumidity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/18 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A] font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#4A665B] dark:text-[#B6CDB4]">Light (Lux)</label>
              <input
                type="number"
                min="100"
                max="50000"
                step="100"
                value={lightLux}
                onChange={(e) => setLightLux(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/18 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A] font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#4A665B] dark:text-[#B6CDB4]">Temperature (°C)</label>
            <input
              type="number"
              min="5"
              max="50"
              step="0.5"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/18 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A] font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-[#174C38] hover:bg-[#10251D] dark:bg-[#00D69A] dark:hover:bg-[#C7F36B] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log Microclimate Reading
          </button>

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-[#00D69A]/14 border border-[#00D69A]/35 text-xs text-[#0F6B50] dark:text-[#00D69A] text-center font-medium">
              {successMsg}
            </div>
          )}
        </form>

        <div className="lg:col-span-7 rounded-2xl p-5 bg-[#F1ECE0]/70 dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-semibold uppercase tracking-wider text-[#174C38] dark:text-[#C7F36B]">
              Logged Zone Telemetry ({logs.length})
            </span>
            <span className="font-mono text-[#4A665B] dark:text-[#B6CDB4]">Synced to Growth Overlay</span>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-[#4A665B] dark:text-[#B6CDB4] text-xs">
              No indoor climate logs recorded yet. Record humidity and light intensity to personalize recommendations.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white dark:bg-[#153026] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 rounded-xl p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00D69A]" />
                      {log.areaName}
                    </div>
                    <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] font-mono">
                      {log.timestamp} · {log.temperature}°C
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <div className="text-[#136E68] dark:text-[#56C7C0] font-bold flex items-center gap-1 justify-end">
                        <Droplets className="w-3 h-3" /> {log.humidity}% RH
                      </div>
                      <div className="text-[#8F6500] dark:text-[#F5CA62] font-bold flex items-center gap-1 justify-end">
                        <Sun className="w-3 h-3" /> {log.lightLux} Lux
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteLog(log.id)}
                      className="p-1.5 rounded-lg bg-[#FF806B]/12 hover:bg-[#FF806B]/25 text-[#C9432C] dark:text-[#FF806B] transition-colors cursor-pointer"
                      aria-label={`Delete ${log.areaName} log`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] flex items-center gap-1.5 pt-2 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/12">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00D69A] shrink-0" />
            <span>Readings feed into the Environment Optimizer and Recharts growth correlation chart.</span>
          </div>
        </div>
      </div>
    </ObservatoryCard>
  );
};
