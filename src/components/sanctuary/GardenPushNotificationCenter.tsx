import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  BellRing,
  Droplets,
  Sprout,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Gauge,
} from 'lucide-react';
import { ObservatoryCard } from '../ui/ObservatoryPrimitives';

export interface SpeciesCareTelemetry {
  speciesKey: string;
  displayName: string;
  minMoisturePercent: number;
  optimalMoisturePercent: number;
  wateringCadenceDays: number;
  fertilizingCadenceDays: number;
  recommendedFertilizer: string;
  sensorAdvice: string;
}

export const SPECIES_CARE_CATALOG: Record<string, SpeciesCareTelemetry> = {
  monstera: {
    speciesKey: 'monstera',
    displayName: 'Monstera deliciosa (Swiss Cheese)',
    minMoisturePercent: 35,
    optimalMoisturePercent: 55,
    wateringCadenceDays: 7,
    fertilizingCadenceDays: 28,
    recommendedFertilizer: 'Balanced organic kelp/fish hydrolysate',
    sensorAdvice: 'Allow top 50% of soil column to dry. Root rot occurs if kept >75% constantly.',
  },
  tulsi: {
    speciesKey: 'tulsi',
    displayName: 'Ocimum tenuiflorum (Sacred Tulsi)',
    minMoisturePercent: 45,
    optimalMoisturePercent: 65,
    wateringCadenceDays: 3,
    fertilizingCadenceDays: 14,
    recommendedFertilizer: 'Vermicompost leachate or diluted seaweed tonic',
    sensorAdvice: 'Fibrous shallow roots dry rapidly in tropical warmth. Moisture <40% causes wilting.',
  },
  ficus: {
    speciesKey: 'ficus',
    displayName: 'Ficus elastica / lyrata (Fig Tree)',
    minMoisturePercent: 30,
    optimalMoisturePercent: 50,
    wateringCadenceDays: 8,
    fertilizingCadenceDays: 30,
    recommendedFertilizer: 'High-nitrogen organic emulsion during active leaf flush',
    sensorAdvice: 'Sensitive to edema and wet feet. Wait until moisture drops to 30% before deep soak.',
  },
  palm: {
    speciesKey: 'palm',
    displayName: 'Dypsis lutescens (Areca Palm)',
    minMoisturePercent: 40,
    optimalMoisturePercent: 60,
    wateringCadenceDays: 5,
    fertilizingCadenceDays: 25,
    recommendedFertilizer: 'Slow-release palm nutrition with micronutrient magnesium/iron',
    sensorAdvice: 'Fronds yellow if root ball desiccates. Maintain moisture between 40-60%.',
  },
  snake: {
    speciesKey: 'snake',
    displayName: 'Sansevieria trifasciata (Snake Plant)',
    minMoisturePercent: 18,
    optimalMoisturePercent: 35,
    wateringCadenceDays: 18,
    fertilizingCadenceDays: 60,
    recommendedFertilizer: 'Dilute cactus/succulent mineral blend',
    sensorAdvice: 'Extremely drought-resilient xerophyte. Only water when moisture drops below 18%.',
  },
  pothos: {
    speciesKey: 'pothos',
    displayName: 'Epipremnum aureum (Golden Pothos)',
    minMoisturePercent: 32,
    optimalMoisturePercent: 55,
    wateringCadenceDays: 6,
    fertilizingCadenceDays: 21,
    recommendedFertilizer: 'General organic compost tea',
    sensorAdvice: 'Tolerant of slight drought; water when moisture reaches ~32%.',
  },
  succulent: {
    speciesKey: 'succulent',
    displayName: 'Crassula ovata / Echeveria (Succulent)',
    minMoisturePercent: 15,
    optimalMoisturePercent: 30,
    wateringCadenceDays: 14,
    fertilizingCadenceDays: 45,
    recommendedFertilizer: 'Low-nitrogen organic foliar spray',
    sensorAdvice: 'Fleshy water-storing leaves. Excess moisture triggers fungal stem rot.',
  },
  default: {
    speciesKey: 'default',
    displayName: 'Standard Tropical Specimen',
    minMoisturePercent: 35,
    optimalMoisturePercent: 55,
    wateringCadenceDays: 7,
    fertilizingCadenceDays: 28,
    recommendedFertilizer: 'Balanced organic potting tonic',
    sensorAdvice: 'Check top 4cm before irrigating. Maintain consistent moderate hydration.',
  },
};

export function resolveSpeciesProfile(speciesStr?: string, nameStr?: string): SpeciesCareTelemetry {
  const combined = `${speciesStr || ''} ${nameStr || ''}`.toLowerCase();
  if (combined.includes('monstera') || combined.includes('fenestra') || combined.includes('delicious')) {
    return SPECIES_CARE_CATALOG.monstera;
  }
  if (combined.includes('tulsi') || combined.includes('basil') || combined.includes('ocimum') || combined.includes('vrinda')) {
    return SPECIES_CARE_CATALOG.tulsi;
  }
  if (combined.includes('ficus') || combined.includes('lyrata') || combined.includes('rubber') || combined.includes('fig')) {
    return SPECIES_CARE_CATALOG.ficus;
  }
  if (combined.includes('palm') || combined.includes('areca') || combined.includes('cane')) {
    return SPECIES_CARE_CATALOG.palm;
  }
  if (combined.includes('snake') || combined.includes('sansevieria') || combined.includes('purifier')) {
    return SPECIES_CARE_CATALOG.snake;
  }
  if (combined.includes('pothos') || combined.includes('epipremnum') || combined.includes('ivy')) {
    return SPECIES_CARE_CATALOG.pothos;
  }
  if (combined.includes('succulent') || combined.includes('jade') || combined.includes('echeveria') || combined.includes('aloe')) {
    return SPECIES_CARE_CATALOG.succulent;
  }
  return SPECIES_CARE_CATALOG.default;
}

export interface GardenCareAlert {
  id: string;
  plantId: number;
  plantName: string;
  speciesName: string;
  kind: 'watering' | 'fertilizing';
  urgency: 'critical' | 'warning' | 'advisory';
  title: string;
  summary: string;
  soilMoistureCurrent: number;
  soilMoistureMinThreshold: number;
  daysSinceLastCare: number;
  targetCadenceDays: number;
  actionRecommendation: string;
  timestamp: string;
}

interface GardenPushNotificationCenterProps {
  plants: any[];
  soilRecords?: any[];
  currentSimMoisture?: number;
  onQuickCareLog: (plantId: number, kind: 'water' | 'fertilize') => Promise<void>;
  className?: string;
}

export const GardenPushNotificationCenter: React.FC<GardenPushNotificationCenterProps> = ({
  plants,
  soilRecords = [],
  currentSimMoisture = 48,
  onQuickCareLog,
  className = '',
}) => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [lastScannedTime, setLastScannedTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        new Notification('MYPLANTCARE Notifications Enabled', {
          body: 'Watering and fertilizing alerts are now monitoring your garden.',
          icon: '/favicon.ico',
        });
      }
    } catch (err) {
      console.warn('Notification permission request failed:', err);
    }
  };

  const activeAlerts = useMemo(() => {
    const alerts: GardenCareAlert[] = [];
    const nowMs = Date.now();

    plants.forEach((plant) => {
      const profile = resolveSpeciesProfile(plant.species, plant.name);

      let daysSinceWatering = 5;
      if (plant.lastWatered) {
        const lastWaterMs = new Date(plant.lastWatered).getTime();
        if (!isNaN(lastWaterMs)) {
          daysSinceWatering = Math.max(0, Math.floor((nowMs - lastWaterMs) / 86400000));
        }
      }

      let daysSinceFertilizing = 22;
      if (plant.fertilizerLogJson) {
        try {
          const logs = JSON.parse(plant.fertilizerLogJson);
          if (Array.isArray(logs) && logs.length > 0) {
            const latest = logs[logs.length - 1];
            const fertMs = new Date(latest.date || latest.timestamp).getTime();
            if (!isNaN(fertMs)) {
              daysSinceFertilizing = Math.max(0, Math.floor((nowMs - fertMs) / 86400000));
            }
          }
        } catch {
          // ignore
        }
      }

      const matchedRecord = soilRecords.find(
        (r) => String(r.plantName || '').toLowerCase() === String(plant.name || '').toLowerCase()
      );
      const plantMoisture = matchedRecord?.moisture != null ? Number(matchedRecord.moisture) : currentSimMoisture;

      if (plantMoisture <= profile.minMoisturePercent) {
        const isSeverelyDry = plantMoisture <= profile.minMoisturePercent - 8;
        alerts.push({
          id: `water-sensor-${plant.id}`,
          plantId: plant.id,
          plantName: plant.name,
          speciesName: profile.displayName,
          kind: 'watering',
          urgency: isSeverelyDry ? 'critical' : 'warning',
          title: `${isSeverelyDry ? 'Critical Desiccation' : 'Low Moisture Alert'}: ${plant.name}`,
          summary: `Soil moisture dropped to ${plantMoisture}% (threshold: ${profile.minMoisturePercent}%). Last watered ${daysSinceWatering}d ago.`,
          soilMoistureCurrent: plantMoisture,
          soilMoistureMinThreshold: profile.minMoisturePercent,
          daysSinceLastCare: daysSinceWatering,
          targetCadenceDays: profile.wateringCadenceDays,
          actionRecommendation: profile.sensorAdvice,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else if (daysSinceWatering >= profile.wateringCadenceDays + 2) {
        alerts.push({
          id: `water-cadence-${plant.id}`,
          plantId: plant.id,
          plantName: plant.name,
          speciesName: profile.displayName,
          kind: 'watering',
          urgency: 'advisory',
          title: `Scheduled Hydration: ${plant.name}`,
          summary: `Care interval reached (${daysSinceWatering}d since last watering; expected every ${profile.wateringCadenceDays}d).`,
          soilMoistureCurrent: plantMoisture,
          soilMoistureMinThreshold: profile.minMoisturePercent,
          daysSinceLastCare: daysSinceWatering,
          targetCadenceDays: profile.wateringCadenceDays,
          actionRecommendation: `Verify topsoil before watering. ${profile.sensorAdvice}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      if (daysSinceFertilizing >= profile.fertilizingCadenceDays) {
        alerts.push({
          id: `fert-cadence-${plant.id}`,
          plantId: plant.id,
          plantName: plant.name,
          speciesName: profile.displayName,
          kind: 'fertilizing',
          urgency: 'advisory',
          title: `Nutrient Replenishment: ${plant.name}`,
          summary: `${daysSinceFertilizing}d since last fertilizing (cadence: every ${profile.fertilizingCadenceDays}d).`,
          soilMoistureCurrent: plantMoisture,
          soilMoistureMinThreshold: profile.minMoisturePercent,
          daysSinceLastCare: daysSinceFertilizing,
          targetCadenceDays: profile.fertilizingCadenceDays,
          actionRecommendation: `Apply ${profile.recommendedFertilizer}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    });

    return alerts.filter((alert) => !dismissedAlertIds.has(alert.id));
  }, [plants, soilRecords, currentSimMoisture, dismissedAlertIds]);

  const handleExecuteCare = async (alert: GardenCareAlert) => {
    setActionInProgress(alert.id);
    try {
      await onQuickCareLog(alert.plantId, alert.kind === 'watering' ? 'water' : 'fertilize');
      setDismissedAlertIds((prev) => new Set(prev).add(alert.id));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDismiss = (id: string) => {
    setDismissedAlertIds((prev) => new Set(prev).add(id));
  };

  const handleRefreshSensors = () => {
    setDismissedAlertIds(new Set());
    setLastScannedTime(new Date().toLocaleTimeString());
  };

  return (
    <ObservatoryCard padding="md" className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-[#00D69A]/14 flex items-center justify-center text-[#0F6B50] dark:text-[#00D69A]">
              {activeAlerts.some((a) => a.urgency === 'critical') ? (
                <BellRing className="w-5 h-5 text-[#FF806B]" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-mono text-[10px] font-bold flex items-center justify-center shadow-sm">
                {activeAlerts.length}
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                Smart Care Alert Sentinel
              </h3>
              <span className="font-mono text-[11px] text-[#0F6B50] dark:text-[#00D69A] font-semibold">
                · SPECIES & SENSOR TELEMETRY
              </span>
            </div>
            <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
              Cross-references moisture ({currentSimMoisture}%) with species care intervals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {notificationPermission !== 'granted' ? (
            <button
              type="button"
              onClick={requestBrowserPermission}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Browser Push</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#0F6B50] dark:text-[#00D69A] px-2.5 py-1 rounded-lg bg-[#00D69A]/12">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Push Active</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleRefreshSensors}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#4A665B] dark:text-[#B6CDB4] hover:bg-[#F1ECE0] dark:hover:bg-[#193A2E] transition-colors cursor-pointer"
          >
            Rescan ({lastScannedTime})
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            aria-label="Toggle alerts section"
            className="p-1.5 rounded-xl text-[#4A665B] dark:text-[#B6CDB4] hover:bg-[#F1ECE0] dark:hover:bg-[#193A2E] transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-1">
          {activeAlerts.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#00D69A] mx-auto" />
              <div className="text-xs font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                All Garden Specimens Hydrated & Nourished
              </div>
              <p className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] max-w-md mx-auto">
                No active care alerts detected at {currentSimMoisture}% soil moisture.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activeAlerts.map((alert) => {
                const isWater = alert.kind === 'watering';
                const isCritical = alert.urgency === 'critical';
                const isWarning = alert.urgency === 'warning';

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                      isCritical
                        ? 'border-[#FF806B]/45 bg-[#FF806B]/10'
                        : isWarning
                        ? 'border-[#F5CA62]/45 bg-[#F5CA62]/10'
                        : 'border-[#00D69A]/30 bg-[#FAF7EE] dark:bg-[#10251D]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isWater ? (
                            <Droplets
                              className={`w-4 h-4 ${
                                isCritical ? 'text-[#FF806B]' : isWarning ? 'text-[#F5CA62]' : 'text-[#00D69A]'
                              }`}
                            />
                          ) : (
                            <Sprout className="w-4 h-4 text-[#00D69A]" />
                          )}
                          <span className="font-display font-bold text-xs text-[#10251D] dark:text-[#FAF7EE]">
                            {alert.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDismiss(alert.id)}
                          className="text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#FF806B] p-0.5 cursor-pointer"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-[#18342A] dark:text-[#EBF2EA] leading-relaxed">
                        {alert.summary}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-[#00D69A]" />
                          {alert.soilMoistureCurrent}% (Min {alert.soilMoistureMinThreshold}%)
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#F5CA62]" />
                          {alert.targetCadenceDays}d cycle
                        </span>
                      </div>

                      <div className="text-[11px] italic text-[#4A665B] dark:text-[#B6CDB4]">
                        {alert.actionRecommendation}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/12">
                      <span className="text-[10px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">
                        {alert.timestamp}
                      </span>

                      <button
                        type="button"
                        disabled={actionInProgress === alert.id}
                        onClick={() => handleExecuteCare(alert)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isCritical
                            ? 'bg-[#FF806B] text-[#10251D]'
                            : 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D]'
                        }`}
                      >
                        {isWater ? (
                          <>
                            <Droplets className="w-3.5 h-3.5" />
                            <span>Log Watering</span>
                          </>
                        ) : (
                          <>
                            <Sprout className="w-3.5 h-3.5" />
                            <span>Log Fertilizing</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </ObservatoryCard>
  );
};
