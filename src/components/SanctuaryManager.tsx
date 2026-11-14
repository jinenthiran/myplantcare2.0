import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  Leaf,
  Award,
  Shield,
  Edit3,
  AlertCircle,
  Search,
  Database,
  ExternalLink,
  Map,
  Cpu,
  Bell,
  Sliders,
  TrendingUp,
  CloudSun,
  Droplets,
  Wind,
  X,
  Sparkles,
  Stethoscope,
  ArrowRight,
  Camera,
  Clock,
  FlaskConical,
  Share2,
  QrCode,
  Film,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { calculateEcoImpactScore, buildPlantImageHistory } from '../utils/botanicalAnalytics';
import { auth, saveBotanicalNoteToFirestore, deleteBotanicalNoteFromFirestore } from '../lib/firebase';
import { emitGreenyAppEvent } from './greeny/GreenyTypes';
import { AnimatedMetricValue, BotanicalSkeleton } from './ui/LivingEarthMotion';
import { BotanicalImage } from './ui/BotanicalImage';
import { GardenPushNotificationCenter } from './sanctuary/GardenPushNotificationCenter';
import { WeatherWateringAdvisor } from './WeatherWateringAdvisor';
import { WeatherMapWidget } from './WeatherMapWidget';
import { PredictiveGrowthCard } from './PredictiveGrowthCard';
import { SocialShareModal } from './SocialShareModal';
import { QrTagScannerModal } from './QrTagScannerModal';
import { ActivityHeatmap } from './ActivityHeatmap';
import { GrowthProjectionChart } from './GrowthProjectionChart';
import { ClimateTrackerCard, ClimateLogEntry } from './ClimateTrackerCard';
import { EcosystemSynergyTool } from './EcosystemSynergyTool';
import { GrowthTimeLapseModal } from './GrowthTimeLapseModal';
import { GreenyVoiceQuickNote } from './GreenyVoiceQuickNote';
import { GardenFloorPlan } from './GardenFloorPlan';

export type SanctuaryTab = 'dashboard' | 'my-plants' | 'garden-map' | 'calendar' | 'iot' | 'eco' | 'admin';

interface SanctuaryManagerProps {
  activeTab: SanctuaryTab;
  onTabChange: (tab: SanctuaryTab) => void;
  workspaceData: any;
  firestoreNotes?: any[];
  firestoreLayouts?: any[];
  onRefresh: () => void;
  onNavigateToSection: (section: string) => void;
  authToken?: string | null;
}

const GARDEN_CATEGORIES = [
  'All Gardens',
  'Indoor Garden',
  'Balcony Garden',
  'Terrace Garden',
  'Kitchen Garden',
  'Backyard Garden',
  'Office Garden',
] as const;

function safeParseArray(raw: string | null | undefined): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const SanctuaryManager: React.FC<SanctuaryManagerProps> = ({
  activeTab,
  onTabChange,
  workspaceData,
  firestoreNotes = [],
  firestoreLayouts = [],
  onRefresh,
  onNavigateToSection,
  authToken,
}) => {
  const plants = workspaceData?.plants || [];
  const tasks = workspaceData?.tasks || [];
  const diagnoses = workspaceData?.diagnoses || [];
  const growthRecordsData = workspaceData?.growthRecords || workspaceData?.growth || [];
  const eco = workspaceData?.eco || {
    waterSavedLiters: 0,
    compostKg: 0,
    plantsMaintained: plants.length,
    wasteRecycledKg: 0,
    sustainableActions: 0,
    ecoScore: 0,
  };

  // Growth Trends Filter & Quick Record Form State
  const [selectedGrowthPlant, setSelectedGrowthPlant] = useState<string>('All');
  const [newGrowthPlant, setNewGrowthPlant] = useState<string>(plants[0]?.name || '');
  const [newGrowthHeight, setNewGrowthHeight] = useState<string>('72');
  const [newGrowthLeaves, setNewGrowthLeaves] = useState<string>('15');
  const [newGrowthDate, setNewGrowthDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isSavingGrowth, setIsSavingGrowth] = useState<boolean>(false);

  // Garden Category Filter, Search, Sort & Layout Switcher
  const [selectedGardenCategory, setSelectedGardenCategory] = useState<string>('All Gardens');
  const [plantSearchQuery, setPlantSearchQuery] = useState<string>('');
  const [plantSortBy, setPlantSortBy] = useState<'recent' | 'health-desc' | 'health-asc' | 'name'>('recent');
  const [gardenLayoutMode, setGardenLayoutMode] = useState<'grid' | 'showcase'>('grid');

  // Add Plant Form State
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSpecies, setNewPlantSpecies] = useState('');
  const [newPlantLocation, setNewPlantLocation] = useState('Indoor Garden · East Window');
  const [newPlantPot, setNewPlantPot] = useState('25cm Ceramic Planter');
  const [newPlantSoil, setNewPlantSoil] = useState('Well-draining Organic Mix');
  const [newPlantSun, setNewPlantSun] = useState('Bright Indirect');
  const [newPlantNotes, setNewPlantNotes] = useState('');
  const [newPlantImageUrl, setNewPlantImageUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [isAddingPlant, setIsAddingPlant] = useState(false);

  // Quick Note Inline Edit + Delete Confirmation + Profile Modal State
  const [editingPlantId, setEditingPlantId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [plantPendingDelete, setPlantPendingDelete] = useState<any | null>(null);
  const [deletingPlantId, setDeletingPlantId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  const [selectedProfilePlant, setSelectedProfilePlant] = useState<any | null>(null);
  const [profileModalTab, setProfileModalTab] = useState<'overview' | 'edit' | 'timeline'>('overview');
  const [profileForm, setProfileForm] = useState<any>({});
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileFeedback, setProfileFeedback] = useState<string>('');
  const [isLoggingCareAction, setIsLoggingCareAction] = useState<boolean>(false);

  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  // Sync selectedProfilePlant if workspace refreshed
  useEffect(() => {
    if (!selectedProfilePlant) return;
    const latest = plants.find((p: any) => p.id === selectedProfilePlant.id);
    if (latest) {
      setSelectedProfilePlant(latest);
    } else {
      setSelectedProfilePlant(null);
    }
  }, [plants, selectedProfilePlant?.id]);

  useEffect(() => {
    if (!plantPendingDelete && !selectedProfilePlant) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (plantPendingDelete && deletingPlantId === null) {
        setPlantPendingDelete(null);
      } else if (selectedProfilePlant) {
        setSelectedProfilePlant(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plantPendingDelete, deletingPlantId, selectedProfilePlant]);

  // Live Local Weather Widget
  const [dashboardWeather, setDashboardWeather] = useState<any | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(true);
  const [weatherError, setWeatherError] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setWeatherLoading(true);
    fetch('/api/weather?lat=12.9716&lon=77.5946&city=Bengaluru')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Weather unavailable'))))
      .then((data) => {
        if (active) {
          setDashboardWeather(data);
          setWeatherError(false);
        }
      })
      .catch(() => {
        if (active) setWeatherError(true);
      })
      .finally(() => {
        if (active) setWeatherLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Interactive 2D Garden Map & Growth Slider State (synced with real My Garden plants)
  const [mapMarkers, setMapMarkers] = useState<
    { id: string; label: string; zone: string; xPercent: number; yPercent: number; status: string }[]
  >([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>('');
  const [comparisonSliderPercent, setComparisonSliderPercent] = useState<number>(55);

  useEffect(() => {
    setMapMarkers((prev) => {
      const prevById = new globalThis.Map(prev.map((m) => [m.id, m]));
      return plants.map((p: any, idx: number) => {
        const markerId = `plant-${p.id}`;
        const existing = prevById.get(markerId);
        const health = Number(p.healthScore ?? 90);
        return {
          id: markerId,
          label: `${p.name} (${p.species || 'Specimen'})`,
          zone: p.location || 'Sanctuary Bed',
          xPercent: existing ? existing.xPercent : 20 + ((idx * 23) % 62),
          yPercent: existing ? existing.yPercent : 26 + ((idx * 19) % 52),
          status: `${health}% ${health >= 85 ? 'Healthy' : 'Attention'}`,
        };
      });
    });
  }, [plants]);

  // Add Calendar Task & Notification State
  const [taskPlantName, setTaskPlantName] = useState(plants[0]?.name || '');
  const [taskType, setTaskType] = useState('Watering');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [taskFreq, setTaskFreq] = useState('Weekly');
  const [taskError, setTaskError] = useState('');
  const [notifStatus, setNotifStatus] = useState<string>('Browser Care Reminders Ready');

  // IoT State
  const [iotHardwareConnected, setIotHardwareConnected] = useState<boolean>(false);
  const [iotThresholdMoisture, setIotThresholdMoisture] = useState<number>(35);
  const [iotSimMoisture, setIotSimMoisture] = useState<number>(48);
  const [iotSimTemp] = useState<number>(26.5);
  const [iotSimHumidity] = useState<number>(62);
  const [iotSimTankLevel] = useState<number>(78);
  const [iotPumpActive, setIotPumpActive] = useState<boolean>(false);

  // Admin AI Status State
  const [aiServerStatus, setAiServerStatus] = useState<{ configured: boolean; models: string[]; message: string } | null>(null);
  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((d) => setAiServerStatus(d))
      .catch(() => {});
  }, []);

  // Eco Form State
  const [waterSaved, setWaterSaved] = useState<number>(eco.waterSavedLiters || 0);
  const [compostKg, setCompostKg] = useState<number>(eco.compostKg || 0);
  const [wasteKg, setWasteKg] = useState<number>(eco.wasteRecycledKg || 0);
  const [actionsCount, setActionsCount] = useState<number>(eco.sustainableActions || 0);

  // Google Search Grounding & Firestore Note State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [searchGroundedResult, setSearchGroundedResult] = useState<{
    answer: string;
    sources: { uri: string; title: string }[];
  } | null>(null);
  const [fsNotePlant, setFsNotePlant] = useState(plants[0]?.name || '');
  const [fsNoteText, setFsNoteText] = useState('');
  const [fsStatusMsg, setFsStatusMsg] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [isTimeLapseOpen, setIsTimeLapseOpen] = useState<boolean>(false);
  const [timeLapsePlant, setTimeLapsePlant] = useState<any>(null);

  const handleScannedPlant = (plantData: { name: string; species: string; location: string; sunlight: string }) => {
    setNewPlantName(plantData.name);
    setNewPlantSpecies(plantData.species);
    setNewPlantLocation(plantData.location);
    setNewPlantSun(plantData.sunlight);
    onTabChange('my-plants');
    emitGreenyAppEvent({ type: 'USER_ADDED_PLANT', plantName: plantData.name });
  };

  const [climateLogs, setClimateLogs] = useState<ClimateLogEntry[]>([
    { id: 'c-1', areaName: 'Living Room Conservatory', humidity: 68, lightLux: 1400, temperature: 26.5, timestamp: '2026-11-12 10:00' },
    { id: 'c-2', areaName: 'Balcony Herb Garden', humidity: 55, lightLux: 12500, temperature: 31.0, timestamp: '2026-11-12 14:30' },
  ]);

  const handleAddClimateLog = (entry: ClimateLogEntry) => {
    setClimateLogs((prev) => [entry, ...prev]);
  };

  const handleDeleteClimateLog = (id: string) => {
    setClimateLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const ecoResult = calculateEcoImpactScore({
    waterSavedLiters: waterSaved,
    compostKg,
    plantsMaintained: plants.length,
    wasteRecycledKg: wasteKg,
    sustainableActions: actionsCount,
  });

  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  };

  const compressPlantPhoto = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read photo file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file.'));
        img.onload = () => {
          const maxDim = 960;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas unavailable'));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  };

  const openPlantProfile = (plant: any, initialTab: 'overview' | 'edit' | 'timeline' = 'overview') => {
    setSelectedProfilePlant(plant);
    setProfileModalTab(initialTab);
    setProfileFeedback('');
    setProfileForm({
      name: plant.name || '',
      species: plant.species || '',
      scientificName: plant.scientificName || '',
      location: plant.location || '',
      potSize: plant.potSize || '',
      soilType: plant.soilType || '',
      sunlight: plant.sunlight || '',
      heightCm: plant.heightCm ?? 30,
      notes: plant.notes || '',
      imageUrl: plant.imageUrl || '',
    });
  };

  const handleRunSearchGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearchingWeb(true);
    try {
      const res = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (res.ok) {
        setSearchGroundedResult({
          answer: data.answer,
          sources: Array.isArray(data.sources) ? data.sources : [],
        });
      }
    } catch (err) {
      console.error('Search grounding failed:', err);
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleSaveFirestoreNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fsNoteText.trim()) return;
    if (!auth.currentUser) {
      setFsStatusMsg('Please sign in with Google in the top bar to persist notes to Firebase Firestore.');
      return;
    }
    try {
      await saveBotanicalNoteToFirestore({
        userId: auth.currentUser.uid,
        plantName: fsNotePlant,
        noteText: fsNoteText.trim(),
        category: 'Care Log',
      });
      setFsNoteText('');
      setFsStatusMsg('Synced note to Firebase Firestore!');
      setTimeout(() => setFsStatusMsg(null), 3500);
    } catch {
      setFsStatusMsg('Failed to save note to Firestore.');
    }
  };

  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlantName.trim() || !newPlantSpecies.trim()) {
      setFormError('Please enter both a plant nickname and botanical species.');
      return;
    }
    if (isAddingPlant) return;
    setIsAddingPlant(true);
    setFormError('');
    try {
      const addedName = newPlantName.trim();
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: addedName,
          species: newPlantSpecies.trim(),
          scientificName: newPlantSpecies.trim(),
          location: newPlantLocation,
          potSize: newPlantPot,
          soilType: newPlantSoil,
          sunlight: newPlantSun,
          notes: newPlantNotes,
          imageUrl: newPlantImageUrl || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to register plant.');
      }
      emitGreenyAppEvent({ type: 'USER_ADDED_PLANT', plantName: addedName });
      setNewPlantName('');
      setNewPlantSpecies('');
      setNewPlantNotes('');
      setNewPlantImageUrl('');
      onRefresh();
    } catch (err: any) {
      setFormError(err?.message || 'Could not save plant.');
    } finally {
      setIsAddingPlant(false);
    }
  };

  const handleSavePlantEdit = async (id: number) => {
    await fetch(`/api/plants/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ notes: editNotes }),
    });
    setEditingPlantId(null);
    onRefresh();
  };

  const handleSaveFullProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfilePlant || isSavingProfile) return;
    setIsSavingProfile(true);
    setProfileFeedback('');
    try {
      const res = await fetch(`/api/plants/${selectedProfilePlant.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          name: profileForm.name,
          species: profileForm.species,
          scientificName: profileForm.scientificName,
          location: profileForm.location,
          potSize: profileForm.potSize,
          soilType: profileForm.soilType,
          sunlight: profileForm.sunlight,
          heightCm: Number(profileForm.heightCm) || 30,
          notes: profileForm.notes,
          imageUrl: profileForm.imageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setSelectedProfilePlant(data.plant);
      setProfileFeedback('Plant profile & photo updated cleanly.');
      setProfileModalTab('overview');
      onRefresh();
    } catch (err: any) {
      setProfileFeedback(`Error: ${err?.message || 'Could not update plant profile'}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleQuickCareLog = async (plantId: number, kind: 'water' | 'fertilize') => {
    if (isLoggingCareAction) return;
    setIsLoggingCareAction(true);
    setProfileFeedback('');
    try {
      const body =
        kind === 'water'
          ? { logWatering: { amountMl: 350, notes: 'Logged from My Garden plant profile' } }
          : { logFertilizing: { fertilizerType: 'Organic Compost / Kelp Tonic', notes: 'Logged from My Garden plant profile' } };

      const res = await fetch(`/api/plants/${plantId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not record care log');
      if (selectedProfilePlant?.id === plantId) {
        setSelectedProfilePlant(data.plant);
      }
      if (kind === 'water') emitGreenyAppEvent({ type: 'USER_COMPLETED_WATERING' });
      setProfileFeedback(kind === 'water' ? 'Watering logged & next schedule refreshed.' : 'Fertilizing feed logged.');
      onRefresh();
    } catch (err: any) {
      setProfileFeedback(`Error: ${err?.message || 'Failed to log care activity'}`);
    } finally {
      setIsLoggingCareAction(false);
    }
  };

  const handleConfirmDeletePlant = async () => {
    if (!plantPendingDelete || deletingPlantId !== null) return;
    const targetId = plantPendingDelete.id;
    setDeletingPlantId(targetId);
    setDeleteError('');
    try {
      const res = await fetch(`/api/plants/${targetId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete plant permanently.');
      }
      if (selectedProfilePlant?.id === targetId) {
        setSelectedProfilePlant(null);
      }
      setPlantPendingDelete(null);
      onRefresh();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to permanently remove plant. Please try again.');
    } finally {
      setDeletingPlantId(null);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setTaskError('Please provide a clear task description.');
      return;
    }
    setTaskError('');
    await fetch('/api/tasks', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        plantName: taskPlantName,
        taskType,
        title: taskTitle.trim(),
        dueDate: taskDueDate,
        frequency: taskFreq,
      }),
    });
    setTaskTitle('');
    onRefresh();
  };

  const handleToggleTask = async (id: number, currentCompleted: boolean) => {
    await fetch(`/api/tasks/${id}/toggle`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ completed: !currentCompleted }),
    });
    if (!currentCompleted) {
      emitGreenyAppEvent({ type: 'USER_COMPLETED_WATERING' });
    }
    onRefresh();
  };

  const handleUpdateEco = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/eco', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        waterSavedLiters: waterSaved,
        compostKg,
        plantsMaintained: plants.length,
        wasteRecycledKg: wasteKg,
        sustainableActions: actionsCount,
      }),
    });
    onRefresh();
  };

  const handleQuickAddGrowthRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrowthPlant.trim() || !newGrowthHeight || !newGrowthLeaves) return;
    setIsSavingGrowth(true);
    try {
      await fetch('/api/growth-records', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          plantName: newGrowthPlant.trim(),
          heightCm: Number(newGrowthHeight),
          leafCount: Number(newGrowthLeaves),
          recordedDate: newGrowthDate || new Date().toISOString().slice(0, 10),
          observation: 'Logged via User Dashboard Growth Trends tracker.',
          healthScore: 95,
        }),
      });
      onRefresh();
    } finally {
      setIsSavingGrowth(false);
    }
  };

  const filteredGrowthChartData = growthRecordsData
    .filter((rec: any) => selectedGrowthPlant === 'All' || rec.plantName === selectedGrowthPlant)
    .map((rec: any) => ({
      ...rec,
      heightCm: Number(rec.heightCm),
      leafCount: Number(rec.leafCount),
      recordedDate: rec.recordedDate,
    }));

  const uniqueGrowthPlants = Array.from(
    new Set(growthRecordsData.map((r: any) => r.plantName).filter(Boolean))
  ) as string[];

  const healthyCount = plants.filter((p: any) => Number(p.healthScore) >= 85).length;
  const attentionCount = plants.length - healthyCount;
  const pendingTasksCount = tasks.filter((t: any) => !t.completed).length;

  const filteredPlants = plants
    .filter((p: any) => {
      const catMatch =
        selectedGardenCategory === 'All Gardens' ||
        String(p.location || '')
          .toLowerCase()
          .includes(selectedGardenCategory.replace(' Garden', '').toLowerCase());
      const q = plantSearchQuery.trim().toLowerCase();
      const queryMatch =
        !q ||
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.species || '').toLowerCase().includes(q) ||
        String(p.location || '').toLowerCase().includes(q);
      return catMatch && queryMatch;
    })
    .slice()
    .sort((a: any, b: any) => {
      if (plantSortBy === 'health-desc') return Number(b.healthScore ?? 0) - Number(a.healthScore ?? 0);
      if (plantSortBy === 'health-asc') return Number(a.healthScore ?? 0) - Number(b.healthScore ?? 0);
      if (plantSortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      return Number(b.id ?? 0) - Number(a.id ?? 0);
    });

  const handleEnableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('Browser notifications unavailable here; in-app alerts active.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifStatus('Browser Care Notifications Enabled!');
      } else {
        setNotifStatus('In-App Care Reminders Active.');
      }
    } catch {
      setNotifStatus('In-App Care Reminders Active.');
    }
  };

  const currentDisplayName = auth.currentUser?.displayName || 'Botanical Grower';
  const attentionPlants = plants.filter((p: any) => Number(p.healthScore ?? 100) < 85);
  const spotlightPlantForTip = attentionPlants[0] || plants[0] || null;

  // Build strict linked scans for any plant without cross-plant duplicates
  const getLinkedDiagnosesForPlant = (plant: any) =>
    diagnoses.filter((d: any) => {
      if (d.plantId !== null && d.plantId !== undefined) {
        return Number(d.plantId) === Number(plant.id);
      }
      return String(d.plantName || '').toLowerCase().includes(String(plant.name || '').toLowerCase());
    });

  return (
    <div className="space-y-6">
      {/* Sanctuary Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/16 bg-white dark:bg-[#153026] shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            ['dashboard', 'Observatory Dashboard'],
            ['my-plants', `My Garden (${plants.length})`],
            ['garden-map', '2D Floor Plan'],
            ['calendar', `Care Calendar (${pendingTasksCount})`],
            ['iot', 'IoT Irrigation'],
            ['eco', 'Eco Intelligence'],
            ['admin', 'Admin Console'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-display font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === id
                  ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-bold shadow-xs'
                  : 'text-[#4A665B] dark:text-[#B6CDB4] hover:bg-[#F1ECE0] dark:hover:bg-[#193A2E] hover:text-[#10251D] dark:hover:text-[#FAF7EE]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsQrScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#174C38] hover:bg-[#10251D] dark:bg-[#00D69A] dark:hover:bg-[#C7F36B] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" /> Scan QR Tag
          </button>
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] hover:border-[#00D69A] text-[#10251D] dark:text-[#FAF7EE] text-xs font-semibold transition-colors border border-[#174C38]/18 dark:border-[#B6CDB4]/20 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#00D69A]" /> Share Progress
          </button>
        </div>
      </div>

      {deleteError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-[#FF806B]/45 bg-[#FF806B]/12 text-xs text-[#C9432C] dark:text-[#FF806B] flex items-center justify-between"
        >
          <span>{deleteError}</span>
          <button type="button" onClick={() => setDeleteError('')} className="underline font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 1. USER DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-[#174C38]/20 dark:border-[#00D69A]/30 bg-[#10251D] text-[#FAF7EE] shadow-xl">
            <BotanicalImage
              src="/images/garden_conservatory_backdrop_1794532597538.webp"
              alt="Sunlit conservatory greenhouse sanctuary"
              decorative
              priority
              containerClassName="!absolute inset-0"
              aspectClassName="w-full h-full"
              className="opacity-28"
            />
            <div className="relative z-10 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-gradient-to-r from-[#10251D]/95 via-[#174C38]/88 to-[#10251D]/92">
              <div className="lg:col-span-7 space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#C7F36B]">
                  MYPLANTCARE · BOTANICAL INTELLIGENCE CENTRE
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-[#FAF7EE]">
                  Welcome back, {currentDisplayName}
                </h2>
                <p className="text-xs sm:text-sm text-[#B6CDB4] max-w-xl leading-relaxed">
                  Monitoring <span className="font-bold text-[#00D69A]">{plants.length}</span> registered plant specimens,{' '}
                  <span className="font-bold text-[#C7F36B]">{pendingTasksCount}</span> pending care reminders, and{' '}
                  <span className="font-bold text-[#56C7C0]">{diagnoses.length}</span> saved AI scans.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateToSection('doctor')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00D69A] hover:bg-[#C7F36B] text-[#10251D] text-xs font-display font-bold transition-colors cursor-pointer"
                  >
                    <Stethoscope className="w-3.5 h-3.5" /> Scan a Plant
                  </button>
                  <button
                    type="button"
                    onClick={() => onTabChange('my-plants')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/25 text-[#FAF7EE] text-xs font-semibold hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Plant
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToSection('greeny')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/25 text-[#C7F36B] text-xs font-semibold hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Ask GREENY 3D
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-2xl border border-[#00D69A]/25 bg-[#10251D]/82 backdrop-blur-md p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#C7F36B] flex items-center gap-1.5">
                    <CloudSun className="w-3.5 h-3.5 text-[#00D69A]" />
                    {dashboardWeather?.isFallback ? 'Seasonal Baseline' : 'Live Garden Microclimate'}
                  </span>
                  <span className="text-[11px] font-mono text-[#B6CDB4] truncate">
                    {dashboardWeather?.city || 'Local Station'}
                  </span>
                </div>

                {weatherLoading ? (
                  <BotanicalSkeleton className="h-20 w-full bg-white/10" />
                ) : weatherError || dashboardWeather?.current?.temperatureC === undefined ? (
                  <div className="text-xs text-[#B6CDB4] py-2">
                    Weather telemetry temporarily unavailable. Use the Meteorological Advisor below to retry.
                  </div>
                ) : (
                  (() => {
                    const current = dashboardWeather.current;
                    return (
                      <>
                        <div className="flex items-baseline justify-between gap-4">
                          <div className="text-3xl font-display font-extrabold font-mono text-[#FAF7EE] tabular-nums">
                            {Math.round(Number(current.temperatureC))}°C
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[#FAF7EE]/85 font-mono">
                            <span className="flex items-center gap-1">
                              <Droplets className="w-3.5 h-3.5 text-[#56C7C0]" />
                              {current.humidityPercent}% RH
                            </span>
                            <span className="flex items-center gap-1">
                              <Wind className="w-3.5 h-3.5 text-[#B6CDB4]" />
                              {current.windSpeedKmh} km/h
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-[#B6CDB4] leading-relaxed">
                          {dashboardWeather.advisories?.[0] ||
                            'Check top 4cm soil moisture before watering.'}
                        </p>
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          </div>

          {/* KPI Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] shadow-sm">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#4A665B] dark:text-[#B6CDB4]">
                Total Plants
              </div>
              <div className="text-3xl font-display font-extrabold font-mono text-[#10251D] dark:text-[#FAF7EE] mt-1 tabular-nums">
                <AnimatedMetricValue value={plants.length} />
              </div>
              <div className="text-xs text-[#0F6B50] dark:text-[#00D69A] mt-1">PostgreSQL + Firestore</div>
            </div>
            <div className="p-5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] shadow-sm">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#4A665B] dark:text-[#B6CDB4]">
                Thriving Specimens
              </div>
              <div className="text-3xl font-display font-extrabold font-mono text-[#0F6B50] dark:text-[#00D69A] mt-1 tabular-nums">
                <AnimatedMetricValue value={healthyCount} />
              </div>
              <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mt-1">Health ≥ 85%</div>
            </div>
            <div className="p-5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] shadow-sm">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#4A665B] dark:text-[#B6CDB4]">
                Needing Attention
              </div>
              <div className="text-3xl font-display font-extrabold font-mono text-[#C9432C] dark:text-[#FF806B] mt-1 tabular-nums">
                <AnimatedMetricValue value={attentionCount} />
              </div>
              <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mt-1">Follow-up triage</div>
            </div>
            <div className="p-5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] shadow-sm">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#4A665B] dark:text-[#B6CDB4]">
                Eco-Impact Index
              </div>
              <div className="text-3xl font-display font-extrabold font-mono text-[#174C38] dark:text-[#C7F36B] mt-1 tabular-nums">
                <AnimatedMetricValue value={ecoResult.ecoScore} suffix="/100" />
              </div>
              <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mt-1">{ecoResult.tier}</div>
            </div>
          </div>

          {/* Smart Care Alert Sentinel */}
          <GardenPushNotificationCenter
            plants={plants}
            soilRecords={workspaceData?.soilRecords || []}
            currentSimMoisture={iotSimMoisture}
            onQuickCareLog={handleQuickCareLog}
          />

          {/* Real-time Weather & Watering Schedule Advisor */}
          <WeatherWateringAdvisor />

          {/* Interactive Hardiness Zone & Weather Map + Predictive Growth */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <WeatherMapWidget
                temperature={dashboardWeather?.current?.temperatureC}
                humidity={dashboardWeather?.current?.humidityPercent}
                locationName={dashboardWeather?.city}
              />
            </div>
            <div className="lg:col-span-7">
              <PredictiveGrowthCard plants={plants} />
            </div>
          </div>

          {/* D3 Activity Heatmap & Recharts Growth Projection Chart */}
          <ActivityHeatmap tasks={tasks} notes={firestoreNotes} />
          <GrowthProjectionChart plants={plants} growthRecords={growthRecordsData} climateLogs={climateLogs} />

          {/* Microclimate Tracker & Ecosystem Synergy */}
          <ClimateTrackerCard onLogAdded={handleAddClimateLog} logs={climateLogs} onDeleteLog={handleDeleteClimateLog} />
          <EcosystemSynergyTool plants={plants} />

          {/* GREENY Voice-to-Text Quick Note */}
          <GreenyVoiceQuickNote onNoteAdded={onRefresh} authToken={authToken} />

          {/* My Plants Spotlight Strip */}
          <div className="p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono text-[#0F6B50] dark:text-[#00D69A] uppercase tracking-[0.18em] font-semibold">
                  Living Plant Collection
                </div>
                <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
                  My Garden Summary
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onTabChange('my-plants')}
                className="text-xs font-display font-bold text-[#174C38] dark:text-[#00D69A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Open Full Garden <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {plants.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-[#174C38]/22 dark:border-[#B6CDB4]/22 text-center space-y-2.5">
                <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                  Your digital garden has 0 specimens. Add a plant or save one from the AI Plant Doctor.
                </p>
                <button
                  type="button"
                  onClick={() => onTabChange('my-plants')}
                  className="px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold cursor-pointer"
                >
                  + Register Plant
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {plants.slice(0, 4).map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openPlantProfile(p, 'overview')}
                    className="text-left group rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-[#FAF7EE] dark:bg-[#10251D] overflow-hidden hover:border-[#00D69A] transition-all cursor-pointer"
                  >
                    <BotanicalImage
                      src={p.imageUrl}
                      alt={p.name}
                      commonName={p.name}
                      scientificName={p.species}
                      aspectClassName="h-32"
                      className="group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-display font-bold truncate text-[#10251D] dark:text-[#FAF7EE]">
                          {p.name}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#0F6B50] dark:text-[#00D69A] tabular-nums shrink-0">
                          {p.healthScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#E9F0E6] dark:bg-[#193A2E] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#00D69A]"
                          style={{ width: `${Math.min(100, Math.max(0, Number(p.healthScore ?? 85)))}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] truncate">
                        Next water: {p.nextWatering || 'Check topsoil'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Growth Trends Recharts */}
          <div className="p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-[#0F6B50] dark:text-[#00D69A] flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" /> Longitudinal Biometric Telemetry
                </div>
                <h3 className="text-lg font-display font-bold mt-0.5 text-[#10251D] dark:text-[#FAF7EE]">Growth Trends</h3>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="growth-plant-filter" className="text-xs font-semibold text-[#4A665B] dark:text-[#B6CDB4]">
                  Specimen:
                </label>
                <select
                  id="growth-plant-filter"
                  value={selectedGrowthPlant}
                  onChange={(e) => setSelectedGrowthPlant(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] font-semibold"
                >
                  <option value="All">All Specimens ({growthRecordsData.length})</option>
                  {uniqueGrowthPlants.map((pName) => (
                    <option key={pName} value={pName}>
                      {pName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full h-72 pt-2">
              {filteredGrowthChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-[#174C38]/25 dark:border-[#B6CDB4]/25 text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                  No growth records logged yet. Add a measurement below to plot the trajectory.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredGrowthChartData} margin={{ top: 10, right: 24, left: 4, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#B6CDB4" opacity={0.3} />
                    <XAxis dataKey="recordedDate" stroke="#4A665B" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis stroke="#4A665B" tick={{ fontSize: 11 }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#10251D',
                        borderColor: '#00D69A',
                        borderRadius: '12px',
                        color: '#FAF7EE',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="heightCm"
                      name="Plant Height (cm)"
                      stroke="#00D69A"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#00D69A', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="leafCount"
                      name="Leaf Count"
                      stroke="#F5CA62"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#F5CA62', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <form
              onSubmit={handleQuickAddGrowthRecord}
              className="pt-3 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/12 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-[#4A665B] dark:text-[#B6CDB4] mb-1">
                  Plant Name
                </label>
                <input
                  type="text"
                  value={newGrowthPlant}
                  onChange={(e) => setNewGrowthPlant(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#4A665B] dark:text-[#B6CDB4] mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newGrowthHeight}
                  onChange={(e) => setNewGrowthHeight(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#4A665B] dark:text-[#B6CDB4] mb-1">
                  Leaf Count
                </label>
                <input
                  type="number"
                  value={newGrowthLeaves}
                  onChange={(e) => setNewGrowthLeaves(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#4A665B] dark:text-[#B6CDB4] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newGrowthDate}
                  onChange={(e) => setNewGrowthDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingGrowth}
                className="px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold text-xs whitespace-nowrap cursor-pointer"
              >
                {isSavingGrowth ? 'Saving...' : '+ Log Growth Record'}
              </button>
            </form>
          </div>

          {/* Care Queue + Recent Diagnoses */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                  Upcoming Care Queue ({pendingTasksCount} Pending)
                </h3>
                <button
                  type="button"
                  onClick={() => onTabChange('calendar')}
                  className="text-xs font-semibold text-[#0F6B50] dark:text-[#00D69A] hover:underline cursor-pointer"
                >
                  Open Calendar →
                </button>
              </div>
              <div className="space-y-2.5">
                {tasks.length === 0 ? (
                  <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">No watering or care tasks scheduled yet.</p>
                ) : (
                  tasks.slice(0, 5).map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t.id, t.completed)}
                        className="flex items-start gap-2.5 text-left cursor-pointer"
                      >
                        {t.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#00D69A] shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#FF806B] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className={`text-xs font-semibold text-[#10251D] dark:text-[#FAF7EE] ${t.completed ? 'line-through opacity-60' : ''}`}>
                            {t.title}
                          </div>
                          <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4]">
                            {t.plantName} · {t.taskType} · Due {t.dueDate}
                          </div>
                        </div>
                      </button>
                      <span className="text-[11px] font-mono text-[#0F6B50] dark:text-[#00D69A] shrink-0">
                        {t.frequency}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                  Recent Scans & Garden Memory
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateToSection('doctor')}
                  className="text-xs font-semibold text-[#0F6B50] dark:text-[#00D69A] hover:underline cursor-pointer"
                >
                  New Scan →
                </button>
              </div>
              <div className="p-4 rounded-xl bg-[#00D69A]/10 border border-[#00D69A]/25 text-xs space-y-1 text-[#10251D] dark:text-[#FAF7EE]">
                <div className="font-display font-bold text-[#174C38] dark:text-[#00D69A]">Garden Memory Insight</div>
                <p>
                  {spotlightPlantForTip
                    ? `${spotlightPlantForTip.name} (${spotlightPlantForTip.species}) registers ${spotlightPlantForTip.healthScore}% health. ${spotlightPlantForTip.notes || 'Check topsoil before next watering.'}`
                    : 'Register plants in My Garden or run a scan to build tailored memory reminders.'}
                </p>
              </div>
              <div className="space-y-2.5">
                {diagnoses.slice(0, 3).map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">{d.plantName}</span>
                      <span className="font-mono text-[#0F6B50] dark:text-[#00D69A] tabular-nums">{d.healthScore}/100</span>
                    </div>
                    <div className="text-[#C9432C] dark:text-[#FF806B] font-medium">{d.possibleCondition}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Google Search Grounding & Firestore Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-4">
              <div>
                <div className="text-xs font-mono text-[#0F6B50] dark:text-[#00D69A] uppercase tracking-wider font-semibold">
                  Live Web Grounding · Gemini Search
                </div>
                <h3 className="text-base font-display font-bold mt-0.5 text-[#10251D] dark:text-[#FAF7EE]">
                  Google Search Grounded Botanical Research
                </h3>
              </div>
              <form onSubmit={handleRunSearchGrounding} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Organic treatment for Monstera thrips"
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                />
                <button
                  type="submit"
                  disabled={isSearchingWeb}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold text-xs shrink-0 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  {isSearchingWeb ? 'Searching...' : 'Search Web'}
                </button>
              </form>
              {searchGroundedResult && (
                <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 text-xs space-y-2 text-[#10251D] dark:text-[#FAF7EE]">
                  <p className="leading-relaxed whitespace-pre-line">{searchGroundedResult.answer}</p>
                  {searchGroundedResult.sources.length > 0 && (
                    <div className="pt-2 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/12 flex flex-wrap gap-2">
                      {searchGroundedResult.sources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#0F6B50] dark:text-[#00D69A] underline"
                        >
                          {s.title} <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-[#9A6F00] dark:text-[#F5CA62] flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                    <Database className="w-3.5 h-3.5" /> Firebase Firestore Cloud Sync
                  </div>
                  <h3 className="text-base font-display font-bold mt-0.5 text-[#10251D] dark:text-[#FAF7EE]">
                    Synced Botanical Field Notes
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#0F6B50] dark:text-[#00D69A] tabular-nums">
                  {firestoreNotes.length} Notes · {firestoreLayouts.length} 3D
                </span>
              </div>

              <form onSubmit={handleSaveFirestoreNote} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={fsNotePlant}
                    onChange={(e) => setFsNotePlant(e.target.value)}
                    placeholder="Plant Name"
                    className="px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                  />
                  <input
                    type="text"
                    value={fsNoteText}
                    onChange={(e) => setFsNoteText(e.target.value)}
                    placeholder="Log a cloud-synced field note..."
                    className="sm:col-span-2 px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold cursor-pointer"
                  >
                    + Save Field Note
                  </button>
                  {fsStatusMsg && <span className="text-xs font-mono text-[#0F6B50] dark:text-[#00D69A]">{fsStatusMsg}</span>}
                </div>
              </form>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {firestoreNotes.map((n: any) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#10251D] dark:text-[#FAF7EE]">{n.plantName}</span>
                      <p className="text-[#4A665B] dark:text-[#B6CDB4] mt-0.5">{n.noteText}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteBotanicalNoteFromFirestore(n.id)}
                      aria-label={`Delete Firestore note for ${n.plantName}`}
                      className="text-[#C9432C] dark:text-[#FF806B] hover:opacity-80 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MY PLANTS (PERMANENT DELETE, FULL PROFILE EDIT, PHOTO UPLOAD, WATER/FERTILIZER LOGS) */}
      {activeTab === 'my-plants' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-[#174C38]/25 dark:border-[#00D69A]/25 bg-[#10251D] text-[#FAF7EE] p-6 shadow-md">
            <BotanicalImage
              src="/images/plant_areca_pothos_collection_1794532597731.webp"
              alt="Indoor botanical leaf collection"
              decorative
              priority
              containerClassName="!absolute inset-0"
              aspectClassName="w-full h-full"
              className="opacity-25"
            />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#10251D]/95 via-[#10251D]/85 to-[#174C38]/70 p-2 rounded-2xl">
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.14em] text-[#C7F36B]">My Digital Garden</div>
                <h2 className="text-2xl font-display font-extrabold text-[#FAF7EE] mt-0.5">
                  Registered Specimens & Care Memory ({plants.length})
                </h2>
                <p className="text-xs text-[#B6CDB4] mt-1">
                  Tap any plant card to edit metadata, upload custom photos, log watering/fertilizing, or inspect its timeline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('plant-nickname-input');
                  input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  input?.focus();
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00D69A] text-[#10251D] text-xs font-display font-bold cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" /> Register New Plant
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Add Plant Form */}
            <form
              onSubmit={handleAddPlant}
              className="lg:col-span-4 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-3.5 h-fit shadow-sm"
            >
              <h3 className="text-lg font-display font-bold flex items-center gap-2 text-[#10251D] dark:text-[#FAF7EE]">
                <Leaf className="w-4 h-4 text-[#00D69A]" /> Register Plant to Memory
              </h3>

              <div>
                <label htmlFor="plant-nickname-input" className="block text-xs font-medium mb-1">
                  Plant Nickname *
                </label>
                <input
                  id="plant-nickname-input"
                  type="text"
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  placeholder="e.g., Balcony Jade Bonsai"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                />
              </div>

              <div>
                <label htmlFor="plant-species-input" className="block text-xs font-medium mb-1">
                  Botanical Species *
                </label>
                <input
                  id="plant-species-input"
                  type="text"
                  value={newPlantSpecies}
                  onChange={(e) => setNewPlantSpecies(e.target.value)}
                  placeholder="e.g., Crassula ovata"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={newPlantLocation}
                    onChange={(e) => setNewPlantLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Pot Size</label>
                  <input
                    type="text"
                    value={newPlantPot}
                    onChange={(e) => setNewPlantPot(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium mb-1">Soil Mix</label>
                  <input
                    type="text"
                    value={newPlantSoil}
                    onChange={(e) => setNewPlantSoil(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Sunlight</label>
                  <input
                    type="text"
                    value={newPlantSun}
                    onChange={(e) => setNewPlantSun(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                  />
                </div>
              </div>

              <div>
                <input
                  ref={addPhotoInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const dataUrl = await compressPlantPhoto(f).catch(() => '');
                    if (dataUrl) setNewPlantImageUrl(dataUrl);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => addPhotoInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[#00D69A]" />
                  {newPlantImageUrl ? 'Photo Attached (Change)' : 'Attach Plant Photo (Optional)'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Care Notes</label>
                <textarea
                  rows={2}
                  value={newPlantNotes}
                  onChange={(e) => setNewPlantNotes(e.target.value)}
                  placeholder="Soil blend, pruning history, or placement notes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                />
              </div>

              {formError && (
                <p className="text-xs text-[#C9432C] dark:text-[#FF806B] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isAddingPlant}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold text-xs disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {isAddingPlant ? 'Saving...' : 'Save Specimen to Plant Memory'}
              </button>
            </form>

            {/* Right: Search, Sort, Layout Switcher & Plant Cards */}
            <div className="lg:col-span-8 space-y-4">
              <div className="p-4 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-[#4A665B] dark:text-[#B6CDB4] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={plantSearchQuery}
                      onChange={(e) => setPlantSearchQuery(e.target.value)}
                      placeholder="Search by nickname, species, or zone..."
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#174C38]/16 dark:border-[#B6CDB4]/18 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Sort plants"
                      value={plantSortBy}
                      onChange={(e) => setPlantSortBy(e.target.value as any)}
                      className="px-3 py-2 text-xs rounded-xl border border-[#174C38]/16 dark:border-[#B6CDB4]/18 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] font-medium"
                    >
                      <option value="recent">Sort: Latest Added</option>
                      <option value="health-desc">Sort: Highest Health</option>
                      <option value="health-asc">Sort: Needs Attention First</option>
                      <option value="name">Sort: Name (A–Z)</option>
                    </select>
                    <div className="inline-flex rounded-xl p-1 bg-[#F1ECE0] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 text-xs">
                      <button
                        type="button"
                        onClick={() => setGardenLayoutMode('grid')}
                        className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                          gardenLayoutMode === 'grid'
                            ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-bold'
                            : 'text-[#4A665B] dark:text-[#B6CDB4]'
                        }`}
                      >
                        Grid
                      </button>
                      <button
                        type="button"
                        onClick={() => setGardenLayoutMode('showcase')}
                        className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                          gardenLayoutMode === 'showcase'
                            ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-bold'
                            : 'text-[#4A665B] dark:text-[#B6CDB4]'
                        }`}
                      >
                        Editorial
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/12">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#4A665B] dark:text-[#B6CDB4] mr-1">
                    Zone:
                  </span>
                  {GARDEN_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedGardenCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        selectedGardenCategory === cat
                          ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D]'
                          : 'bg-[#FAF7EE] dark:bg-[#10251D] text-[#4A665B] dark:text-[#B6CDB4] hover:border-[#00D69A]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {plants.length === 0 ? (
                <div
                  data-testid="empty-garden-state"
                  className="p-10 rounded-3xl border border-dashed border-[#174C38]/22 dark:border-[#B6CDB4]/22 bg-white dark:bg-[#153026] text-center space-y-3"
                >
                  <Leaf className="w-10 h-10 mx-auto text-[#00D69A]" />
                  <h3 className="text-base font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                    No Plants Registered in My Garden
                  </h3>
                  <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] max-w-md mx-auto">
                    Your garden has 0 specimens. Register a new plant using the form on the left, or scan a plant in AI Plant Doctor and click Save to My Garden.
                  </p>
                </div>
              ) : filteredPlants.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-[#174C38]/22 dark:border-[#B6CDB4]/22 bg-white dark:bg-[#153026] text-center space-y-2.5 text-xs">
                  <p className="text-[#4A665B] dark:text-[#B6CDB4]">
                    No plants matched your active filter or search query.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGardenCategory('All Gardens');
                      setPlantSearchQuery('');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold cursor-pointer"
                  >
                    Reset Filters ({plants.length})
                  </button>
                </div>
              ) : (
                <div
                  className={
                    gardenLayoutMode === 'showcase'
                      ? 'space-y-4'
                      : 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  }
                >
                  {filteredPlants.map((plant: any) => {
                    const score = Math.min(100, Math.max(0, Number(plant.healthScore ?? 85)));
                    return (
                      <motion.div
                        key={plant.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        data-testid={`plant-card-${plant.id}`}
                        className={`rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] overflow-hidden flex ${
                          gardenLayoutMode === 'showcase' ? 'flex-col sm:flex-row' : 'flex-col'
                        } justify-between shadow-sm hover:border-[#00D69A]/60 transition-colors`}
                      >
                        <div className={gardenLayoutMode === 'showcase' ? 'flex-1 flex flex-col sm:flex-row' : ''}>
                          <div
                            onClick={() => openPlantProfile(plant, 'overview')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openPlantProfile(plant, 'overview');
                              }
                            }}
                            className={`relative cursor-pointer group ${
                              gardenLayoutMode === 'showcase' ? 'sm:w-56 shrink-0' : ''
                            }`}
                          >
                            <BotanicalImage
                              src={plant.imageUrl}
                              alt={plant.name}
                              commonName={plant.name}
                              scientificName={plant.species}
                              aspectClassName={gardenLayoutMode === 'showcase' ? 'h-48 sm:h-full' : 'h-44'}
                              className="group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#10251D]/90 via-[#10251D]/45 to-transparent p-3.5 flex items-end justify-between">
                              <div>
                                <h4 className="text-base font-display font-bold text-[#FAF7EE]">{plant.name}</h4>
                                <p className="text-xs text-[#C7F36B]">{plant.species}</p>
                              </div>
                              <span className="font-mono text-sm font-bold text-[#00D69A] tabular-nums">
                                {score}%
                              </span>
                            </div>
                          </div>

                          <div className="p-4 space-y-2.5 text-xs flex-1">
                            <div className="w-full h-1.5 rounded-full bg-[#E9F0E6] dark:bg-[#10251D] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  score >= 85 ? 'bg-[#00D69A]' : score >= 70 ? 'bg-[#F5CA62]' : 'bg-[#FF806B]'
                                }`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <div className="text-[#4A665B] dark:text-[#B6CDB4]">
                              {plant.location} · {plant.potSize} · {plant.sunlight}
                            </div>
                            <div className="font-mono text-[11px] text-[#0F6B50] dark:text-[#00D69A]">
                              Watered: {plant.lastWatered} · Next: {plant.nextWatering} · {plant.heightCm}cm
                            </div>

                            {editingPlantId === plant.id ? (
                              <div className="space-y-2 pt-1">
                                <textarea
                                  rows={2}
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#00D69A] bg-[#FAF7EE] dark:bg-[#10251D]"
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSavePlantEdit(plant.id)}
                                    className="px-3 py-1 rounded-lg bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-semibold"
                                  >
                                    Save Note
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPlantId(null)}
                                    className="px-3 py-1 rounded-lg bg-[#F1ECE0] dark:bg-[#10251D]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="leading-relaxed line-clamp-2 text-[#18342A] dark:text-[#EBF2EA]">
                                {plant.notes || 'No custom observations logged yet.'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div
                          className={`px-4 py-3 border-[#174C38]/12 dark:border-[#B6CDB4]/12 flex flex-wrap items-center justify-between gap-2 text-xs ${
                            gardenLayoutMode === 'showcase'
                              ? 'sm:border-l sm:flex-col sm:items-end sm:justify-center sm:w-44 shrink-0 border-t sm:border-t-0'
                              : 'border-t'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openPlantProfile(plant, 'overview')}
                              className="font-display font-bold text-[#174C38] dark:text-[#00D69A] hover:underline cursor-pointer"
                            >
                              Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickCareLog(plant.id, 'water')}
                              className="px-2 py-1 rounded-lg bg-[#00D69A]/14 text-[#0F6B50] dark:text-[#00D69A] font-semibold text-[11px] cursor-pointer"
                            >
                              + Water
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTimeLapsePlant({
                                  ...plant,
                                  imageHistory: buildPlantImageHistory(plant, diagnoses),
                                });
                                setIsTimeLapseOpen(true);
                              }}
                              className="flex items-center gap-1 text-[#174C38] dark:text-[#C7F36B] hover:underline font-semibold cursor-pointer"
                            >
                              <Film className="w-3.5 h-3.5" /> Time-Lapse
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openPlantProfile(plant, 'edit')}
                              className="flex items-center gap-1 text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#00D69A] cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setPlantPendingDelete(plant)}
                              aria-label={`Remove ${plant.name}`}
                              data-testid={`delete-plant-btn-${plant.id}`}
                              className="flex items-center gap-1 text-[#C9432C] dark:text-[#FF806B] hover:underline font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {plantPendingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => deletingPlantId === null && setPlantPendingDelete(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Confirm plant deletion"
              className="max-w-md w-full rounded-2xl border border-[#FF806B]/45 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#FF806B]/15 text-[#C9432C] dark:text-[#FF806B] shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-display font-extrabold">Permanently Remove Plant?</h3>
                  <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                    Are you sure you want to permanently remove <strong>{plantPendingDelete.name}</strong> ({plantPendingDelete.species}) from My Garden? Its care tasks and growth logs will be deleted; past AI scan logs remain safely preserved in history.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={deletingPlantId !== null}
                  onClick={() => setPlantPendingDelete(null)}
                  className="px-4 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingPlantId !== null}
                  data-testid="confirm-delete-plant-btn"
                  onClick={handleConfirmDeletePlant}
                  className="px-4 py-2 rounded-xl bg-[#C9432C] dark:bg-[#FF806B] text-white dark:text-[#10251D] text-xs font-display font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {deletingPlantId === plantPendingDelete.id ? 'Removing...' : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE PLANT PROFILE, EDIT & CHRONOLOGICAL TIMELINE MODAL */}
      <AnimatePresence>
        {selectedProfilePlant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProfilePlant(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`${selectedProfilePlant.name} Plant Profile`}
              className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-[#174C38]/25 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] shadow-2xl"
            >
              <div className="relative h-52 bg-[#10251D]">
                <BotanicalImage
                  src={selectedProfilePlant.imageUrl}
                  alt={selectedProfilePlant.name}
                  commonName={selectedProfilePlant.name}
                  scientificName={selectedProfilePlant.species}
                  aspectClassName="h-52"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <button
                  type="button"
                  onClick={() => setSelectedProfilePlant(null)}
                  aria-label="Close plant profile modal"
                  className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#C7F36B]">
                      {selectedProfilePlant.location}
                    </div>
                    <h3 className="text-xl font-display font-extrabold text-white">{selectedProfilePlant.name}</h3>
                    <p className="text-xs italic text-white/80">{selectedProfilePlant.species}</p>
                  </div>
                  <span className="font-mono text-lg font-extrabold text-[#00D69A] tabular-nums">
                    {selectedProfilePlant.healthScore}%
                  </span>
                </div>
              </div>

              {/* Modal Sub-Tabs */}
              <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/12 pb-3">
                <div className="flex gap-1.5">
                  {([
                    ['overview', 'Overview & Care'],
                    ['edit', 'Edit Profile & Photo'],
                    ['timeline', 'Logs & Plant Timeline'],
                  ] as const).map(([tId, tLabel]) => (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => {
                        if (tId === 'edit') {
                          openPlantProfile(selectedProfilePlant, 'edit');
                        } else {
                          setProfileModalTab(tId);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-colors cursor-pointer ${
                        profileModalTab === tId
                          ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D]'
                          : 'bg-white dark:bg-[#10251D] text-[#4A665B] dark:text-[#B6CDB4]'
                      }`}
                    >
                      {tLabel}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={isLoggingCareAction}
                    onClick={() => handleQuickCareLog(selectedProfilePlant.id, 'water')}
                    className="px-3 py-1.5 rounded-xl bg-[#00D69A]/15 text-[#0F6B50] dark:text-[#00D69A] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Droplets className="w-3.5 h-3.5" /> Log Watering
                  </button>
                  <button
                    type="button"
                    disabled={isLoggingCareAction}
                    onClick={() => handleQuickCareLog(selectedProfilePlant.id, 'fertilize')}
                    className="px-3 py-1.5 rounded-xl bg-[#F5CA62]/20 text-[#9A6F00] dark:text-[#F5CA62] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FlaskConical className="w-3.5 h-3.5" /> Log Fertilizing
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5 text-xs">
                {profileFeedback && (
                  <div className="p-3 rounded-xl bg-[#00D69A]/15 border border-[#00D69A]/35 font-semibold text-[#0F6B50] dark:text-[#00D69A]">
                    {profileFeedback}
                  </div>
                )}

                {profileModalTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-white dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                        <div className="text-[10px] text-[#4A665B] dark:text-[#B6CDB4]">Pot & Soil</div>
                        <div className="font-bold mt-0.5">{selectedProfilePlant.potSize || 'Standard'}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                        <div className="text-[10px] text-[#4A665B] dark:text-[#B6CDB4]">Sunlight</div>
                        <div className="font-bold mt-0.5">{selectedProfilePlant.sunlight || 'Indirect'}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                        <div className="text-[10px] text-[#4A665B] dark:text-[#B6CDB4]">Last Watered</div>
                        <div className="font-mono font-bold mt-0.5">{selectedProfilePlant.lastWatered || '--'}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                        <div className="text-[10px] text-[#4A665B] dark:text-[#B6CDB4]">Next Watering</div>
                        <div className="font-mono font-bold text-[#0F6B50] dark:text-[#00D69A] mt-0.5">
                          {selectedProfilePlant.nextWatering || '--'}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 space-y-1">
                      <div className="font-display font-bold text-[#174C38] dark:text-[#C7F36B]">Care Memory & Soil Notes</div>
                      <p className="leading-relaxed">
                        Soil: {selectedProfilePlant.soilType} · Height: {selectedProfilePlant.heightCm} cm ·{' '}
                        {selectedProfilePlant.notes || 'No custom observations recorded.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="font-display font-bold">Linked Plant Doctor Scans ({getLinkedDiagnosesForPlant(selectedProfilePlant).length})</div>
                      {getLinkedDiagnosesForPlant(selectedProfilePlant).length === 0 ? (
                        <p className="text-[#4A665B] dark:text-[#B6CDB4]">No diagnostic scans linked to this plant yet.</p>
                      ) : (
                        getLinkedDiagnosesForPlant(selectedProfilePlant)
                          .slice(0, 4)
                          .map((d: any) => (
                            <div
                              key={d.id}
                              className="p-3 rounded-xl bg-white dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{d.possibleCondition}</span>
                                <span className="font-mono text-[#0F6B50] dark:text-[#00D69A] tabular-nums">
                                  {d.scannedDate} · {d.healthScore}/100
                                </span>
                              </div>
                              <p className="text-[#4A665B] dark:text-[#B6CDB4]">{d.recommendations}</p>
                            </div>
                          ))
                      )}
                    </div>
                  </>
                )}

                {profileModalTab === 'edit' && (
                  <form onSubmit={handleSaveFullProfile} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium mb-1">Plant Nickname</label>
                        <input
                          type="text"
                          value={profileForm.name || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#10251D]"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Common / Scientific Species</label>
                        <input
                          type="text"
                          value={profileForm.species || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, species: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#10251D]"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Sanctuary Location</label>
                        <input
                          type="text"
                          value={profileForm.location || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#10251D]"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Pot Size</label>
                        <input
                          type="text"
                          value={profileForm.potSize || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, potSize: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#10251D]"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Soil Mix</label>
                        <input
                          type="text"
                          value={profileForm.soilType || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, soilType: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#10251D]"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Sunlight & Height (cm)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={profileForm.sunlight || ''}
                            onChange={(e) => setProfileForm({ ...profileForm, sunlight: e.target.value })}
                            className="flex-1 px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#10251D]"
                          />
                          <input
                            type="number"
                            value={profileForm.heightCm ?? 30}
                            onChange={(e) => setProfileForm({ ...profileForm, heightCm: Number(e.target.value) })}
                            className="w-20 px-2.5 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#10251D] font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <input
                        ref={editPhotoInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const dataUrl = await compressPlantPhoto(f).catch(() => '');
                          if (dataUrl) setProfileForm((prev: any) => ({ ...prev, imageUrl: dataUrl }));
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editPhotoInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#10251D] border border-[#174C38]/20 dark:border-[#B6CDB4]/20 font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#00D69A]" /> Upload / Replace Plant Photo
                      </button>
                    </div>

                    <div>
                      <label className="block font-medium mb-1">Care & Observation Notes</label>
                      <textarea
                        rows={3}
                        value={profileForm.notes || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-white dark:bg-[#10251D]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold cursor-pointer"
                    >
                      {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                    </button>
                  </form>
                )}

                {profileModalTab === 'timeline' && (() => {
                  const waterLogs = safeParseArray(selectedProfilePlant.waterLogJson);
                  const fertLogs = safeParseArray(selectedProfilePlant.fertilizerLogJson);
                  const linkedScans = getLinkedDiagnosesForPlant(selectedProfilePlant);
                  const linkedGrowth = growthRecordsData.filter(
                    (g: any) =>
                      Number(g.plantId) === Number(selectedProfilePlant.id) ||
                      String(g.plantName || '').toLowerCase() === String(selectedProfilePlant.name || '').toLowerCase()
                  );
                  const linkedTasks = tasks.filter(
                    (t: any) =>
                      Number(t.plantId) === Number(selectedProfilePlant.id) ||
                      String(t.plantName || '').toLowerCase() === String(selectedProfilePlant.name || '').toLowerCase()
                  );

                  const events: { date: string; kind: string; title: string; detail: string }[] = [
                    ...waterLogs.map((w: any) => ({
                      date: w.date || selectedProfilePlant.lastWatered || '',
                      kind: 'Watering',
                      title: `Watered (${w.amountMl || 350} ml)`,
                      detail: w.note || 'Routine hydration',
                    })),
                    ...fertLogs.map((f: any) => ({
                      date: f.date || selectedProfilePlant.lastFertilized || '',
                      kind: 'Fertilizing',
                      title: `Fed (${f.product || 'Organic Feed'})`,
                      detail: f.note || 'Organic nutrition applied',
                    })),
                    ...linkedScans.map((d: any) => ({
                      date: d.scannedDate || '',
                      kind: 'AI Scan',
                      title: `${d.possibleCondition} (Health ${d.healthScore}/100)`,
                      detail: d.recommendations || '',
                    })),
                    ...linkedGrowth.map((g: any) => ({
                      date: g.recordedDate || '',
                      kind: 'Growth',
                      title: `Measured ${g.heightCm} cm · ${g.leafCount} leaves`,
                      detail: g.observation || '',
                    })),
                    ...linkedTasks.map((t: any) => ({
                      date: t.dueDate || '',
                      kind: t.completed ? 'Task Done' : 'Task Due',
                      title: t.title,
                      detail: `${t.taskType} (${t.frequency})`,
                    })),
                  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-white dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                          <div className="font-bold text-[#0F6B50] dark:text-[#00D69A]">
                            Watering History ({waterLogs.length})
                          </div>
                          <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] mt-1">
                            Last: {selectedProfilePlant.lastWatered}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                          <div className="font-bold text-[#9A6F00] dark:text-[#F5CA62]">
                            Fertilizing History ({fertLogs.length})
                          </div>
                          <div className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] mt-1">
                            Last: {selectedProfilePlant.lastFertilized || 'Not logged yet'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="font-display font-bold flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#00D69A]" /> Chronological Plant Timeline ({events.length})
                        </div>
                        {events.length === 0 ? (
                          <p className="text-[#4A665B] dark:text-[#B6CDB4]">
                            Log watering, fertilizing, growth measurements, or AI scans to build this plant's timeline.
                          </p>
                        ) : (
                          events.map((ev, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-xl bg-white dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 flex items-start justify-between gap-3"
                            >
                              <div>
                                <div className="font-bold">
                                  <span className="text-[10px] font-mono uppercase text-[#0F6B50] dark:text-[#00D69A] mr-1.5">
                                    [{ev.kind}]
                                  </span>
                                  {ev.title}
                                </div>
                                {ev.detail && <p className="text-[#4A665B] dark:text-[#B6CDB4] mt-0.5">{ev.detail}</p>}
                              </div>
                              <span className="font-mono text-[11px] text-[#4A665B] dark:text-[#B6CDB4] shrink-0">
                                {ev.date}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between pt-2 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/12">
                  <button
                    type="button"
                    onClick={() => setPlantPendingDelete(selectedProfilePlant)}
                    className="px-3.5 py-2 rounded-xl text-[#C9432C] dark:text-[#FF806B] hover:bg-[#FF806B]/10 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Plant
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProfilePlant(null);
                        onNavigateToSection('doctor');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold cursor-pointer"
                    >
                      Scan This Plant
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProfilePlant(null)}
                      className="px-4 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2B. 2D GARDEN FLOOR PLAN & LIGHT MAPPER */}
      {activeTab === 'garden-map' && (
        <GardenFloorPlan plants={plants} onRefresh={onRefresh} />
      )}

      {/* 3. SMART PLANT CARE CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddTask}
            className="lg:col-span-4 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-4 h-fit"
          >
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-[#10251D] dark:text-[#FAF7EE]">
              <Calendar className="w-4 h-4 text-[#00D69A]" /> Schedule Care Task
            </h3>
            <div>
              <label className="block text-xs font-medium mb-1">Target Plant</label>
              <input
                type="text"
                value={taskPlantName}
                onChange={(e) => setTaskPlantName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block font-medium mb-1">Activity Type</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                >
                  <option value="Watering">Watering</option>
                  <option value="Fertilizing">Fertilizing</option>
                  <option value="Pruning">Pruning</option>
                  <option value="Repotting">Repotting</option>
                  <option value="Pest Inspection">Pest Inspection</option>
                  <option value="Disease Follow-up">Disease Follow-up</option>
                  <option value="Growth Photo">Growth Photo</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Task Instructions *</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g., Apply 2ml/L liquid seaweed drench"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Recurrence</label>
              <input
                type="text"
                value={taskFreq}
                onChange={(e) => setTaskFreq(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE]"
              />
            </div>
            {taskError && <p className="text-xs text-[#C9432C] dark:text-[#FF806B]">{taskError}</p>}
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold text-xs cursor-pointer"
            >
              Add to Smart Care Calendar
            </button>

            <div className="pt-2 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/12 space-y-2">
              <button
                type="button"
                onClick={handleEnableBrowserNotifications}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#F1ECE0] dark:bg-[#10251D] text-xs font-semibold cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-[#00D69A]" /> Enable Browser Care Reminders
              </button>
              <p className="text-[11px] text-center font-mono text-[#0F6B50] dark:text-[#00D69A]">{notifStatus}</p>
            </div>
          </form>

          <div className="lg:col-span-8 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-4">
            <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
              Active Botanical Care Schedule ({tasks.length})
            </h3>
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">No tasks scheduled yet.</p>
              ) : (
                tasks.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12 flex items-center justify-between gap-4"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTask(t.id, t.completed)}
                      className="flex items-start gap-3 text-left cursor-pointer"
                    >
                      {t.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-[#00D69A] shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#FF806B] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className={`text-sm font-bold text-[#10251D] dark:text-[#FAF7EE] ${t.completed ? 'line-through opacity-55' : ''}`}>
                          {t.title}
                        </div>
                        <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mt-0.5">
                          {t.plantName} · {t.taskType} · Due: {t.dueDate}
                        </div>
                      </div>
                    </button>
                    <span className="text-xs font-mono text-[#0F6B50] dark:text-[#00D69A] shrink-0">{t.frequency}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3B. IOT & SMART IRRIGATION */}
      {activeTab === 'iot' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[#F5CA62]/45 bg-[#F5CA62]/10 text-xs flex flex-wrap items-center justify-between gap-3 text-[#10251D] dark:text-[#FAF7EE]">
            <div>
              <span className="font-bold uppercase tracking-wider">
                {iotHardwareConnected ? 'ESP32 HTTP Bridge Mode' : 'Demo Hardware Simulation Preview'}:
              </span>{' '}
              {iotHardwareConnected
                ? 'Listening for incoming ESP32 sensor telemetry on /api/soil.'
                : 'No physical ESP32 sensor paired. Interactive values below simulate irrigation thresholds.'}
            </div>
            <button
              type="button"
              onClick={() => setIotHardwareConnected((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-mono text-xs font-bold shrink-0 cursor-pointer"
            >
              {iotHardwareConnected ? 'Switch to Simulation' : 'Simulate ESP32 Pairing'}
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026]">
              <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">Soil Moisture (Preview)</div>
              <div className="text-3xl font-extrabold font-mono text-[#0F6B50] dark:text-[#00D69A] mt-1 tabular-nums">
                {iotSimMoisture}%
              </div>
            </div>
            <div className="p-5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026]">
              <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">Canopy Temp</div>
              <div className="text-3xl font-extrabold font-mono mt-1 tabular-nums text-[#10251D] dark:text-[#FAF7EE]">{iotSimTemp}°C</div>
            </div>
            <div className="p-5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026]">
              <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">Humidity</div>
              <div className="text-3xl font-extrabold font-mono mt-1 tabular-nums text-[#10251D] dark:text-[#FAF7EE]">{iotSimHumidity}%</div>
            </div>
            <div className="p-5 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026]">
              <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">Cistern Tank</div>
              <div className="text-3xl font-extrabold font-mono text-[#0F6B50] dark:text-[#00D69A] mt-1 tabular-nums">
                {iotSimTankLevel}%
              </div>
            </div>
          </div>

          <GardenPushNotificationCenter
            plants={plants}
            soilRecords={workspaceData?.soilRecords || []}
            currentSimMoisture={iotSimMoisture}
            onQuickCareLog={handleQuickCareLog}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-4 text-xs">
              <h3 className="text-base font-display font-bold flex items-center gap-2 text-[#10251D] dark:text-[#FAF7EE]">
                <Cpu className="w-4 h-4 text-[#00D69A]" /> Drip Threshold Controller
              </h3>
              <div>
                <label className="block font-medium mb-1">Trigger Threshold: {iotThresholdMoisture}%</label>
                <input
                  type="range"
                  min="15"
                  max="65"
                  value={iotThresholdMoisture}
                  onChange={(e) => setIotThresholdMoisture(Number(e.target.value))}
                  className="w-full accent-[#00D69A]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Simulated Soil Moisture: {iotSimMoisture}%</label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={iotSimMoisture}
                  onChange={(e) => setIotSimMoisture(Number(e.target.value))}
                  className="w-full accent-[#00D69A]"
                />
              </div>
              <button
                type="button"
                onClick={() => setIotPumpActive((p) => !p)}
                className={`px-4 py-2 rounded-xl font-display font-bold cursor-pointer ${
                  iotPumpActive ? 'bg-[#C9432C] text-white' : 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D]'
                }`}
              >
                {iotPumpActive ? 'Stop Drip Pulse' : 'Trigger Manual Drip Pulse'}
              </button>
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-3">
              <h3 className="text-base font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">ESP32 Webhook Specification</h3>
              <pre className="p-3.5 rounded-xl bg-[#10251D] border border-[#174C38] text-[11px] font-mono text-[#00D69A] overflow-x-auto">
{`POST /api/soil
{
  "plantName": "Emerald Fenestra",
  "soilType": "ESP32 Live Probe",
  "ph": 6.4,
  "moisture": ${iotSimMoisture},
  "temperature": ${iotSimTemp}
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 4. ENVIRONMENTAL INTELLIGENCE */}
      {activeTab === 'eco' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleUpdateEco}
            className="lg:col-span-5 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-4 text-xs"
          >
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-[#10251D] dark:text-[#FAF7EE]">
              <Award className="w-5 h-5 text-[#00D69A]" /> Log Sustainable Activity
            </h3>
            <div>
              <label className="block font-medium mb-1">Water Saved: {waterSaved} L</label>
              <input
                type="range"
                min="0"
                max="300"
                value={waterSaved}
                onChange={(e) => setWaterSaved(Number(e.target.value))}
                className="w-full accent-[#00D69A]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Home Compost: {compostKg} kg</label>
              <input
                type="range"
                min="0"
                max="80"
                value={compostKg}
                onChange={(e) => setCompostKg(Number(e.target.value))}
                className="w-full accent-[#00D69A]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Waste Recycled: {wasteKg} kg</label>
              <input
                type="range"
                min="0"
                max="60"
                value={wasteKg}
                onChange={(e) => setWasteKg(Number(e.target.value))}
                className="w-full accent-[#00D69A]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Organic Actions: {actionsCount}</label>
              <input
                type="range"
                min="0"
                max="30"
                value={actionsCount}
                onChange={(e) => setActionsCount(Number(e.target.value))}
                className="w-full accent-[#00D69A]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-display font-bold cursor-pointer"
            >
              Sync Eco-Impact Telemetry
            </button>
          </form>

          <div className="lg:col-span-7 p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-5">
            <div className="flex items-center justify-between border-b border-[#174C38]/12 dark:border-[#B6CDB4]/12 pb-4">
              <div>
                <div className="text-xs font-mono text-[#0F6B50] dark:text-[#00D69A] uppercase tracking-wider font-semibold">
                  Eco-Impact Index
                </div>
                <h4 className="text-xl font-display font-bold mt-0.5 text-[#10251D] dark:text-[#FAF7EE]">{ecoResult.tier}</h4>
                <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                  Estimated Annual Offset: ~{ecoResult.co2OffsetEstimateKg} kg CO₂e
                </p>
              </div>
              <div className="text-4xl font-extrabold font-mono text-[#0F6B50] dark:text-[#00D69A] tabular-nums">
                {ecoResult.ecoScore}/100
              </div>
            </div>
            <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4]">{ecoResult.formulaExplanation}</p>
          </div>
        </div>
      )}

      {/* 5. ADMIN CONSOLE */}
      {activeTab === 'admin' && (
        <div className="p-6 rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/12 pb-4">
            <div>
              <div className="text-xs font-mono text-[#9A6F00] dark:text-[#F5CA62] flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <Shield className="w-4 h-4" /> Platform Governance Console
              </div>
              <h3 className="text-xl font-display font-bold mt-1 text-[#10251D] dark:text-[#FAF7EE]">
                MYPLANTCARE Platform Telemetry & Status
              </h3>
            </div>
            {aiServerStatus && (
              <div className="px-3.5 py-2 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/16 dark:border-[#B6CDB4]/16 text-xs font-mono">
                AI Orchestrator: <span className="text-[#0F6B50] dark:text-[#00D69A] font-bold">ACTIVE (19 TOOLS)</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
              <div className="text-[#4A665B] dark:text-[#B6CDB4]">Accounts</div>
              <div className="text-2xl font-bold font-mono mt-1 tabular-nums text-[#10251D] dark:text-[#FAF7EE]">
                {(workspaceData?.allUsers || []).length || 1}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
              <div className="text-[#4A665B] dark:text-[#B6CDB4]">Saved Scans</div>
              <div className="text-2xl font-bold font-mono text-[#0F6B50] dark:text-[#00D69A] mt-1 tabular-nums">
                {diagnoses.length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
              <div className="text-[#4A665B] dark:text-[#B6CDB4]">AI Tool Runs</div>
              <div className="text-2xl font-bold font-mono mt-1 tabular-nums text-[#10251D] dark:text-[#FAF7EE]">
                {(workspaceData?.toolRuns || []).length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/12">
              <div className="text-[#4A665B] dark:text-[#B6CDB4]">Registered Plants</div>
              <div className="text-2xl font-bold font-mono text-[#0F6B50] dark:text-[#00D69A] mt-1 tabular-nums">
                {plants.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social Share Modal */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        payload={{
          title: 'Sanctuary Growth & Eco Achievement',
          summaryText: `Managing ${plants.length} plant specimens with pristine organic care and zero pest stress.`,
          category: 'achievement',
          metrics: [
            { label: 'Registered Plants', value: plants.length },
            { label: 'Eco Impact Score', value: `${ecoResult.ecoScore}/100` },
            { label: 'Water Saved', value: `${waterSaved} Liters` },
            { label: 'Compost Generated', value: `${compostKg} kg` },
          ],
        }}
      />

      {/* QR Code Nursery Tag Scanner Modal */}
      <QrTagScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onPlantScanned={handleScannedPlant}
      />

      {/* Growth Progression Time-Lapse Modal */}
      <GrowthTimeLapseModal
        isOpen={isTimeLapseOpen}
        onClose={() => setIsTimeLapseOpen(false)}
        plant={timeLapsePlant}
      />
    </div>
  );
};
