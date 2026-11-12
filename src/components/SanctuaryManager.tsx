import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
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
import { calculateEcoImpactScore } from '../utils/botanicalAnalytics';
import { auth, saveBotanicalNoteToFirestore, deleteBotanicalNoteFromFirestore } from '../lib/firebase';
import { emitGreenyAppEvent } from './greeny/GreenyTypes';

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
    waterSavedLiters: 164,
    compostKg: 31.5,
    plantsMaintained: plants.length || 4,
    wasteRecycledKg: 21,
    sustainableActions: 17,
    ecoScore: 86,
  };

  // Growth Trends Filter & Quick Record Form State
  const [selectedGrowthPlant, setSelectedGrowthPlant] = useState<string>('All');
  const [newGrowthPlant, setNewGrowthPlant] = useState<string>(plants[0]?.name || 'Emerald Fenestra');
  const [newGrowthHeight, setNewGrowthHeight] = useState<string>('72');
  const [newGrowthLeaves, setNewGrowthLeaves] = useState<string>('15');
  const [newGrowthDate, setNewGrowthDate] = useState<string>('2026-12-12');
  const [isSavingGrowth, setIsSavingGrowth] = useState<boolean>(false);

  // Multiple Garden Category Filter
  const [selectedGardenCategory, setSelectedGardenCategory] = useState<string>('All Gardens');

  // Add Plant Form State
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSpecies, setNewPlantSpecies] = useState('');
  const [newPlantLocation, setNewPlantLocation] = useState('Indoor Garden · East Window');
  const [newPlantPot, setNewPlantPot] = useState('25cm Ceramic Planter');
  const [newPlantSun, setNewPlantSun] = useState('Bright Indirect');
  const [newPlantNotes, setNewPlantNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [editingPlantId, setEditingPlantId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');

  // Interactive 2D Garden Map & Growth Slider State
  const [mapMarkers, setMapMarkers] = useState<
    { id: string; label: string; zone: string; xPercent: number; yPercent: number; status: string }[]
  >([
    { id: 'm1', label: 'Emerald Fenestra (Monstera)', zone: 'East Window Bed A1', xPercent: 24, yPercent: 32, status: '94% Healthy' },
    { id: 'm2', label: 'Sacred Vrinda (Krishna Tulsi)', zone: 'South Balcony Rail B2', xPercent: 68, yPercent: 26, status: '96% Healthy' },
    { id: 'm3', label: 'Sculpted Ficus Canopy', zone: 'Corner Planter C1', xPercent: 38, yPercent: 68, status: '84% Attention' },
    { id: 'm4', label: 'Golden Plume Areca', zone: 'Diffused Atrium D3', xPercent: 76, yPercent: 66, status: '91% Healthy' },
  ]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>('m1');
  const [comparisonSliderPercent, setComparisonSliderPercent] = useState<number>(55);

  // Add Calendar Task & Notification State
  const [taskPlantName, setTaskPlantName] = useState(plants[0]?.name || 'Emerald Fenestra');
  const [taskType, setTaskType] = useState('Watering');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('2026-11-15');
  const [taskFreq, setTaskFreq] = useState('Weekly');
  const [taskError, setTaskError] = useState('');
  const [notifStatus, setNotifStatus] = useState<string>('Browser Care Reminders Ready');

  // Stage 8: IoT & Smart Irrigation Architecture State (Demo Preview vs Connected ESP32)
  const [iotHardwareConnected, setIotHardwareConnected] = useState<boolean>(false);
  const [iotThresholdMoisture, setIotThresholdMoisture] = useState<number>(35);
  const [iotSimMoisture, setIotSimMoisture] = useState<number>(48);
  const [iotSimTemp, setIotSimTemp] = useState<number>(26.5);
  const [iotSimHumidity, setIotSimHumidity] = useState<number>(62);
  const [iotSimTankLevel, setIotSimTankLevel] = useState<number>(78);
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
  const [waterSaved, setWaterSaved] = useState<number>(eco.waterSavedLiters || 164);
  const [compostKg, setCompostKg] = useState<number>(eco.compostKg || 31.5);
  const [wasteKg, setWasteKg] = useState<number>(eco.wasteRecycledKg || 21);
  const [actionsCount, setActionsCount] = useState<number>(eco.sustainableActions || 17);

  // Google Search Grounding & Firestore Note State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [searchGroundedResult, setSearchGroundedResult] = useState<{
    answer: string;
    sources: { uri: string; title: string }[];
  } | null>(null);
  const [fsNotePlant, setFsNotePlant] = useState(plants[0]?.name || 'Emerald Fenestra');
  const [fsNoteText, setFsNoteText] = useState('');
  const [fsStatusMsg, setFsStatusMsg] = useState<string | null>(null);

  const ecoResult = calculateEcoImpactScore({
    waterSavedLiters: waterSaved,
    compostKg,
    plantsMaintained: plants.length || 4,
    wasteRecycledKg: wasteKg,
    sustainableActions: actionsCount,
  });

  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
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
    setFormError('');
    const addedName = newPlantName.trim();
    await fetch('/api/plants', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        name: addedName,
        species: newPlantSpecies.trim(),
        scientificName: newPlantSpecies.trim(),
        location: newPlantLocation,
        potSize: newPlantPot,
        sunlight: newPlantSun,
        notes: newPlantNotes,
      }),
    });
    emitGreenyAppEvent({ type: 'USER_ADDED_PLANT', plantName: addedName });
    setNewPlantName('');
    setNewPlantSpecies('');
    setNewPlantNotes('');
    onRefresh();
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

  const handleDeletePlant = async (id: number) => {
    await fetch(`/api/plants/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    onRefresh();
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
        plantsMaintained: plants.length || 4,
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

  const healthyCount = plants.filter((p: any) => p.healthScore >= 85).length;
  const attentionCount = plants.length - healthyCount;
  const pendingTasksCount = tasks.filter((t: any) => !t.completed).length;

  const filteredPlants = plants.filter((p: any) => {
    if (selectedGardenCategory === 'All Gardens') return true;
    const keyword = selectedGardenCategory.replace(' Garden', '').toLowerCase();
    return String(p.location || '').toLowerCase().includes(keyword);
  });

  const handleEnableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('Browser notifications not supported in this frame; in-app alerts active.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifStatus('Browser Care Notifications Enabled!');
      } else {
        setNotifStatus('In-App Care Reminders Active (Browser permission declined).');
      }
    } catch {
      setNotifStatus('In-App Care Reminders Active.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sanctuary Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            ['dashboard', 'User Dashboard'],
            ['my-plants', `My Gardens & Plants (${plants.length})`],
            ['garden-map', '2D Garden Map & Growth Slider'],
            ['calendar', `Smart Care Calendar (${pendingTasksCount})`],
            ['iot', 'IoT & Smart Irrigation'],
            ['eco', 'Environmental Intelligence'],
            ['admin', 'Admin Console'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === id
                  ? 'bg-[#00C878] text-[#071B12]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. USER DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Total Registered Plants</div>
              <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {plants.length}
              </div>
              <div className="text-xs text-[#00C878] mt-1">Cloud SQL PostgreSQL + Firestore</div>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Thriving Specimens</div>
              <div className="text-3xl font-extrabold font-mono text-[#00C878] mt-1 tabular-nums">
                {healthyCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60 mt-1">Health Score ≥ 85%</div>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Requiring Attention</div>
              <div className="text-3xl font-extrabold font-mono text-amber-500 mt-1 tabular-nums">
                {attentionCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60 mt-1">Active follow-up schedule</div>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Eco-Impact Index</div>
              <div className="text-3xl font-extrabold font-mono text-[#B7F76B] mt-1 tabular-nums">
                {ecoResult.ecoScore}/100
              </div>
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60 mt-1">{ecoResult.tier}</div>
            </div>
          </div>

          {/* GROWTH TRENDS (RECHARTS VISUALIZATION FROM growth_records TABLE) */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-[#00C878] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> LONGITUDINAL BIOMETRIC TELEMETRY · GROWTH_RECORDS TABLE
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Growth Trends
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Interactive Recharts dual-metric trajectory tracking plant height (cm) and leaf count over time from Cloud SQL <code className="font-mono text-[#00C878]">growth_records</code>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="growth-plant-filter" className="text-xs font-semibold text-slate-600 dark:text-[#F7F9F2]/75">
                  Specimen:
                </label>
                <select
                  id="growth-plant-filter"
                  value={selectedGrowthPlant}
                  onChange={(e) => setSelectedGrowthPlant(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-slate-900 dark:text-white font-semibold"
                >
                  <option value="All">All Recorded Specimens ({growthRecordsData.length})</option>
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
                <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-[#123D2A] text-xs text-slate-500 dark:text-[#F7F9F2]/60">
                  No growth records found for this filter. Log a new measurement below to plot the trajectory.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={filteredGrowthChartData}
                    margin={{ top: 10, right: 24, left: 4, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#123D2A" opacity={0.45} />
                    <XAxis
                      dataKey="recordedDate"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#071B12',
                        borderColor: '#123D2A',
                        borderRadius: '12px',
                        color: '#F7F9F2',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="heightCm"
                      name="Plant Height (cm)"
                      stroke="#00C878"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#00C878', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="leafCount"
                      name="Leaf Count"
                      stroke="#B7F76B"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#B7F76B', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick Log to growth_records Table */}
            <form
              onSubmit={handleQuickAddGrowthRecord}
              className="pt-3 border-t border-slate-200 dark:border-[#123D2A] grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-[#F7F9F2]/65 mb-1">
                  Plant Name
                </label>
                <input
                  type="text"
                  value={newGrowthPlant}
                  onChange={(e) => setNewGrowthPlant(e.target.value)}
                  placeholder="Emerald Fenestra"
                  aria-label="Growth Record Plant Name"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-[#F7F9F2]/65 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newGrowthHeight}
                  onChange={(e) => setNewGrowthHeight(e.target.value)}
                  aria-label="Growth Record Height cm"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-[#F7F9F2]/65 mb-1">
                  Leaf Count
                </label>
                <input
                  type="number"
                  value={newGrowthLeaves}
                  onChange={(e) => setNewGrowthLeaves(e.target.value)}
                  aria-label="Growth Record Leaf Count"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-[#F7F9F2]/65 mb-1">
                  Recorded Date
                </label>
                <input
                  type="date"
                  value={newGrowthDate}
                  onChange={(e) => setNewGrowthDate(e.target.value)}
                  aria-label="Growth Record Date"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingGrowth}
                className="px-4 py-2 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors whitespace-nowrap"
              >
                {isSavingGrowth ? 'Saving...' : '+ Log Growth Record'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Today's Tasks */}
            <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Today’s Botanical Care Queue ({pendingTasksCount} Pending)
                </h3>
                <button
                  type="button"
                  onClick={() => onTabChange('calendar')}
                  className="text-xs font-semibold text-[#00C878] hover:underline"
                >
                  Open Calendar →
                </button>
              </div>

              <div className="space-y-2.5">
                {tasks.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTask(t.id, t.completed)}
                      className="flex items-start gap-2.5 text-left"
                    >
                      {t.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#00C878] shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            t.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/65">
                          {t.plantName} · {t.taskType} · Due {t.dueDate}
                        </div>
                      </div>
                    </button>
                    <span className="text-[11px] font-mono text-[#00C878] shrink-0">{t.frequency}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Diagnoses & GREENY Context Insights */}
            <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent AI Diagnoses & GREENY Memory Insights
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateToSection('doctor')}
                  className="text-xs font-semibold text-[#00C878] hover:underline"
                >
                  New Scan →
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#00C878]/10 border border-[#00C878]/30 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-[#B7F76B]">
                  GREENY Proactive Care Memory Reminder
                </div>
                <p className="text-slate-700 dark:text-[#F7F9F2]/85">
                  "Your Sculpted Ficus Canopy showed mild lower-leaf yellowing on its last inspection. Check top 5cm dryness today before giving its 450ml Epsom salt micro-dose."
                </p>
              </div>

              <div className="space-y-2.5">
                {diagnoses.slice(0, 3).map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{d.plantName}</span>
                      <span className="font-mono text-[#00C878]">Health {d.healthScore}/100</span>
                    </div>
                    <div className="text-amber-600 dark:text-[#D4B56A] font-medium">{d.possibleCondition}</div>
                    <p className="text-slate-500 dark:text-[#F7F9F2]/70">{d.recommendations}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Google Search Grounding (gemini-3.8-flash) + Firebase Firestore Cloud Persistence Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Google Search Grounding Engine */}
            <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
              <div>
                <div className="text-xs font-mono text-[#00C878]">LIVE WEB GROUNDING · GEMINI-3.8-FLASH</div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Google Search Grounded Botanical Research
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Query up-to-date horticultural research, regional pest advisories, and seasonal care with live Google Search citations.
                </p>
              </div>

              <form onSubmit={handleRunSearchGrounding} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Organic treatment for Monstera thrips & humidity targets"
                  aria-label="Google Search Grounding Botanical Query"
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
                <button
                  type="submit"
                  disabled={isSearchingWeb}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors whitespace-nowrap shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  {isSearchingWeb ? 'Searching...' : 'Search Web'}
                </button>
              </form>

              {searchGroundedResult && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs space-y-2.5">
                  <p className="text-slate-800 dark:text-[#F7F9F2] leading-relaxed whitespace-pre-line">
                    {searchGroundedResult.answer}
                  </p>
                  {searchGroundedResult.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-[#123D2A] space-y-1">
                      <span className="font-mono text-[11px] text-[#00C878]">Verified Google Search Sources:</span>
                      <div className="flex flex-wrap gap-2">
                        {searchGroundedResult.sources.map((s, idx) => (
                          <a
                            key={idx}
                            href={s.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 dark:text-[#B7F76B] underline"
                          >
                            {s.title} <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Firebase Firestore Real-Time Cloud Synced Notes & 3D Layouts */}
            <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-[#D4B56A] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> FIREBASE FIRESTORE REAL-TIME CLOUD SYNC
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    Synced Botanical Field Notes & 3D Layouts
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#00C878]">
                  {firestoreNotes.length} Notes · {firestoreLayouts.length} 3D Snapshots
                </span>
              </div>

              <form onSubmit={handleSaveFirestoreNote} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={fsNotePlant}
                    onChange={(e) => setFsNotePlant(e.target.value)}
                    placeholder="Plant Name"
                    aria-label="Firestore Note Plant Name"
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                  />
                  <input
                    type="text"
                    value={fsNoteText}
                    onChange={(e) => setFsNoteText(e.target.value)}
                    placeholder="Log a cloud-synced field note to Firestore..."
                    aria-label="Firestore Field Note Content"
                    className="sm:col-span-2 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#123D2A] text-[#B7F76B] border border-[#00C878]/30 hover:bg-[#00C878] hover:text-[#071B12] text-xs font-semibold transition-colors"
                  >
                    + Save Field Note to Firestore
                  </button>
                  {fsStatusMsg && <span className="text-xs font-mono text-[#00C878]">{fsStatusMsg}</span>}
                </div>
              </form>

              <div className="space-y-2 max-h-44 overflow-y-auto">
                {firestoreNotes.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">
                    Sign in with Google and save a field note or chat insight to sync across devices via Firestore.
                  </p>
                ) : (
                  firestoreNotes.map((n: any) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{n.plantName}</span>
                        <span className="ml-2 font-mono text-[10px] text-[#00C878]">{n.category}</span>
                        <p className="text-slate-600 dark:text-[#F7F9F2]/80 mt-0.5">{n.noteText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteBotanicalNoteFromFirestore(n.id)}
                        aria-label="Delete Firestore Note"
                        className="text-red-500 hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MY PLANTS (PLANT MEMORY SYSTEM) */}
      {activeTab === 'my-plants' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddPlant}
            className="lg:col-span-4 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4 h-fit"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Leaf className="w-4 h-4 text-[#00C878]" /> Register Plant to Memory
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
              Every registered specimen is remembered by GREENY for personalized watering, soil, and disease tracking.
            </p>

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
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>

            <div>
              <label htmlFor="plant-species-input" className="block text-xs font-medium mb-1">
                Common or Scientific Species *
              </label>
              <input
                id="plant-species-input"
                type="text"
                value={newPlantSpecies}
                onChange={(e) => setNewPlantSpecies(e.target.value)}
                placeholder="e.g., Crassula ovata"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium mb-1">Sanctuary Location</label>
                <input
                  type="text"
                  value={newPlantLocation}
                  onChange={(e) => setNewPlantLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Pot Size</label>
                <input
                  type="text"
                  value={newPlantPot}
                  onChange={(e) => setNewPlantPot(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Care & Observation Notes</label>
              <textarea
                rows={2}
                value={newPlantNotes}
                onChange={(e) => setNewPlantNotes(e.target.value)}
                placeholder="Initial leaf count, soil mix, or recent repotting notes..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>

            {formError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {formError}
              </p>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors"
            >
              <Plus className="w-4 h-4" /> Save Specimen to Plant Memory
            </button>
          </form>

          <div className="lg:col-span-8 space-y-4">
            {/* Multiple Garden Selector Bar */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-[#B7F76B]">
                Filter by Sanctuary Zone:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {GARDEN_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedGardenCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      selectedGardenCategory === cat
                        ? 'bg-[#00C878] text-[#071B12]'
                        : 'bg-slate-100 dark:bg-[#071B12] text-slate-600 dark:text-[#F7F9F2]/75'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(filteredPlants.length > 0 ? filteredPlants : plants).map((plant: any) => (
                <div
                  key={plant.id}
                  className="rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 bg-[#071B12]">
                    <img
                      src={plant.imageUrl || '/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg'}
                      alt={plant.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3.5 flex items-end justify-between">
                      <div>
                        <h4 className="text-base font-bold text-white">{plant.name}</h4>
                        <p className="text-xs text-[#B7F76B]">{plant.species}</p>
                      </div>
                      <span className="font-mono text-sm font-bold text-white tabular-nums">
                        Health {plant.healthScore}%
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2 text-xs">
                    <div className="text-slate-500 dark:text-[#F7F9F2]/70">
                      {plant.location} · {plant.potSize} · {plant.sunlight}
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 dark:text-[#B7F76B]">
                      Last Watered: {plant.lastWatered} · Next: {plant.nextWatering} · Height: {plant.heightCm}cm
                    </div>

                    {editingPlantId === plant.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#00C878] bg-slate-50 dark:bg-[#071B12]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSavePlantEdit(plant.id)}
                            className="px-3 py-1 rounded-lg bg-[#00C878] text-[#071B12] font-semibold"
                          >
                            Save Note
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlantId(null)}
                            className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-[#123D2A]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 dark:text-[#F7F9F2]/85 leading-relaxed">
                        {plant.notes || 'No custom observations logged yet.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-100 dark:border-[#123D2A] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlantId(plant.id);
                      setEditNotes(plant.notes || '');
                    }}
                    className="flex items-center gap-1 text-slate-600 dark:text-[#F7F9F2]/75 hover:text-[#00C878]"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Memory Note
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePlant(plant.id)}
                    aria-label={`Delete ${plant.name}`}
                    className="flex items-center gap-1 text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2B. INTERACTIVE 2D GARDEN MAP & BEFORE/AFTER GROWTH JOURNAL SLIDER */}
      {activeTab === 'garden-map' && (() => {
        const activeMarker = mapMarkers.find((m) => m.id === selectedMarkerId) || mapMarkers[0];
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Interactive 2D Spatial Map */}
            <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-mono text-[#00C878] flex items-center gap-1.5">
                    <Map className="w-3.5 h-3.5" /> INTERACTIVE 2D SANCTUARY FLOORPLAN
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    2D Pot & Raised Bed Spatial Map
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Click any marker to inspect or nudge coordinates
                </span>
              </div>

              <div className="relative h-72 rounded-2xl border border-[#123D2A] bg-[#071B12] overflow-hidden p-4">
                {/* Architectural Grid Lines */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #00C878 1px, transparent 1px), linear-gradient(to bottom, #00C878 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />
                <div className="absolute top-3 left-3 text-[11px] font-mono text-[#B7F76B]/80">
                  NORTH WINDOW LIGHT VECTOR ↓
                </div>

                {mapMarkers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMarkerId(m.id)}
                    style={{ left: `${m.xPercent}%`, top: `${m.yPercent}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedMarkerId === m.id
                        ? 'bg-[#00C878] text-[#071B12] border-white scale-105 shadow-lg'
                        : 'bg-[#0B2419]/90 text-[#F7F9F2] border-[#00C878]/50 hover:border-[#B7F76B]'
                    }`}
                  >
                    ● {m.label.split(' (')[0]}
                  </button>
                ))}
              </div>

              {activeMarker && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{activeMarker.label}</div>
                    <div className="text-slate-500 dark:text-[#F7F9F2]/70">
                      Zone: {activeMarker.zone} · Status: <span className="text-[#00C878] font-mono">{activeMarker.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMapMarkers((prev) =>
                          prev.map((item) =>
                            item.id === activeMarker.id
                              ? { ...item, xPercent: Math.max(15, (item.xPercent + 8) % 85) }
                              : item
                          )
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#123D2A] text-[#B7F76B] font-semibold"
                    >
                      Reposition X
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMapMarkers((prev) =>
                          prev.map((item) =>
                            item.id === activeMarker.id
                              ? { ...item, yPercent: Math.max(20, (item.yPercent + 10) % 80) }
                              : item
                          )
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#123D2A] text-[#B7F76B] font-semibold"
                    >
                      Reposition Y
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Before-and-After Growth Journal Comparison Slider */}
            <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
              <div>
                <div className="text-xs font-mono text-[#D4B56A] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> VISUAL GROWTH JOURNAL COMPARISON
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Before & After Canopy Progress Slider
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Drag the comparison slider to inspect Day 1 baseline vs. Day 90 organic vermicompost canopy expansion.
                </p>
              </div>

              <div className="relative h-56 rounded-2xl overflow-hidden border border-slate-200 dark:border-[#123D2A] bg-[#071B12]">
                <img
                  src="/src/assets/images/plant_monstera_deliciosa_1794482112942.jpg"
                  alt="Day 90 Thriving Canopy"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-[#B7F76B]"
                  style={{ width: `${comparisonSliderPercent}%` }}
                >
                  <img
                    src="/src/assets/images/plant_fiddle_leaf_fig_1794482114191.jpg"
                    alt="Day 1 Juvenile Baseline"
                    className="w-full h-full object-cover filter sepia-[0.25] brightness-90"
                  />
                </div>
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/75 text-[10px] font-mono text-amber-300">
                  DAY 01 BASELINE (42cm · 7 Leaves)
                </div>
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/75 text-[10px] font-mono text-[#B7F76B]">
                  DAY 90 CURRENT (68cm · 13 Leaves)
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Comparison Split Position: <span className="font-mono text-[#00C878]">{comparisonSliderPercent}%</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={comparisonSliderPercent}
                  onChange={(e) => setComparisonSliderPercent(Number(e.target.value))}
                  aria-label="Before and After Growth Comparison Slider"
                  className="w-full accent-[#00C878]"
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. SMART PLANT CARE CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddTask}
            className="lg:col-span-4 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4 h-fit"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00C878]" /> Schedule Care Task
            </h3>
            <div>
              <label className="block text-xs font-medium mb-1">Target Plant</label>
              <input
                type="text"
                value={taskPlantName}
                onChange={(e) => setTaskPlantName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium mb-1">Activity Type</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                >
                  <option value="Watering">Watering</option>
                  <option value="Fertilizing">Fertilizing</option>
                  <option value="Pruning">Pruning</option>
                  <option value="Repotting">Repotting</option>
                  <option value="Pest Inspection">Pest Inspection</option>
                  <option value="Disease Follow-up">Disease Follow-up</option>
                  <option value="Growth Photo">Growth Photography</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="calendar-task-title" className="block text-xs font-medium mb-1">
                Task Instructions *
              </label>
              <input
                id="calendar-task-title"
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g., Apply 2ml/L liquid seaweed drench"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Recurrence Cadence</label>
              <input
                type="text"
                value={taskFreq}
                onChange={(e) => setTaskFreq(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12]"
              />
            </div>
            {taskError && <p className="text-xs text-red-500">{taskError}</p>}
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors"
            >
              Add to Smart Care Calendar
            </button>

            <div className="pt-2 border-t border-slate-200 dark:border-[#123D2A] space-y-2">
              <button
                type="button"
                onClick={handleEnableBrowserNotifications}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-[#123D2A] text-slate-800 dark:text-[#B7F76B] text-xs font-semibold"
              >
                <Bell className="w-3.5 h-3.5" /> Enable Browser Care Reminders
              </button>
              <p className="text-[11px] text-center font-mono text-[#00C878]">{notifStatus}</p>
            </div>
          </form>

          <div className="lg:col-span-8 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Active Botanical Care Schedule
            </h3>
            <div className="space-y-3">
              {tasks.map((t: any) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] flex items-center justify-between gap-4"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(t.id, t.completed)}
                    className="flex items-start gap-3 text-left"
                  >
                    {t.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00C878] shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div
                        className={`text-sm font-bold ${
                          t.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {t.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/70 mt-0.5">
                        Specimen: {t.plantName} · Category: {t.taskType} · Due: {t.dueDate}
                      </div>
                    </div>
                  </button>
                  <span className="text-xs font-mono text-[#00C878] shrink-0">{t.frequency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3B. STAGE 8 — IOT & SMART IRRIGATION ARCHITECTURE */}
      {activeTab === 'iot' && (
        <div className="space-y-6">
          {/* Mandatory Hardware Transparency Banner */}
          <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-bold uppercase tracking-wider">
                {iotHardwareConnected ? 'ESP32 MQTT / HTTP Bridge Mode' : 'Demo Hardware Simulation Preview Mode'}:
              </span>{' '}
              {iotHardwareConnected
                ? 'Listening for incoming ESP32 sensor frames on /api/soil. Showing latest calibrated values.'
                : 'No physical ESP32 soil probe is currently paired. Values below are interactive simulation previews for testing irrigation thresholds and are never presented as live physical sensor measurements.'}
            </div>
            <button
              type="button"
              onClick={() => setIotHardwareConnected((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-[#123D2A] text-[#B7F76B] font-mono text-xs font-semibold shrink-0"
            >
              {iotHardwareConnected ? 'Switch to Demo Preview' : 'Simulate ESP32 Endpoint Pairing'}
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Capacitive Soil Moisture (Preview)</div>
              <div className="text-3xl font-extrabold font-mono text-[#00C878] mt-1 tabular-nums">{iotSimMoisture}%</div>
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60 mt-1">
                Trigger Threshold: &lt;{iotThresholdMoisture}%
              </div>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">DHT22 Canopy Temp (Preview)</div>
              <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {iotSimTemp}°C
              </div>
              <div className="text-xs text-[#00C878] mt-1">Optimal VPD Thermal Range</div>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Relative Humidity (Preview)</div>
              <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {iotSimHumidity}%
              </div>
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60 mt-1">Tropical Target: 55–75%</div>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Reservoir Tank Level (Preview)</div>
              <div className="text-3xl font-extrabold font-mono text-[#B7F76B] mt-1 tabular-nums">
                {iotSimTankLevel}%
              </div>
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60 mt-1">Rainwater Harvest Cistern</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#00C878]" /> Automated Drip Irrigation & Threshold Controller
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium mb-1">
                    Auto-Irrigation Moisture Trigger Threshold: <span className="font-mono font-bold text-[#00C878]">{iotThresholdMoisture}%</span>
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="65"
                    value={iotThresholdMoisture}
                    onChange={(e) => setIotThresholdMoisture(Number(e.target.value))}
                    className="w-full accent-[#00C878]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    Test Simulated Soil Moisture Input: <span className="font-mono font-bold text-[#B7F76B]">{iotSimMoisture}%</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={iotSimMoisture}
                    onChange={(e) => setIotSimMoisture(Number(e.target.value))}
                    className="w-full accent-[#00C878]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] flex items-center justify-between gap-4">
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Solenoid Valve & Micro-Drip Relay Status
                  </div>
                  <div className="text-slate-500 dark:text-[#F7F9F2]/70">
                    {iotPumpActive || iotSimMoisture < iotThresholdMoisture
                      ? 'ACTIVE — Dispensing 350ml pulse to Root Zone A1'
                      : 'STANDBY — Root zone moisture exceeds threshold'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIotPumpActive((p) => !p)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    iotPumpActive
                      ? 'bg-amber-500 text-[#071B12]'
                      : 'bg-[#00C878] text-[#071B12]'
                  }`}
                >
                  {iotPumpActive ? 'Stop Manual Pulse' : 'Trigger Manual Drip Pulse'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ESP32 Hardware Webhook Integration Specification
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80">
                Connect a physical ESP32 microcontroller with a capacitive soil sensor and DHT22 probe by posting JSON telemetry directly to the Cloud SQL endpoint:
              </p>
              <pre className="p-3.5 rounded-xl bg-[#071B12] border border-[#123D2A] text-[11px] font-mono text-[#B7F76B] overflow-x-auto">
{`POST /api/soil
Content-Type: application/json

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
            className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-[#00C878]" /> Log Sustainable Gardening Activity
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Rainwater / Greywater Saved (Liters): <span className="font-mono font-bold">{waterSaved} L</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={waterSaved}
                  onChange={(e) => setWaterSaved(Number(e.target.value))}
                  className="w-full accent-[#00C878]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Home Compost Produced (kg): <span className="font-mono font-bold">{compostKg} kg</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={compostKg}
                  onChange={(e) => setCompostKg(Number(e.target.value))}
                  className="w-full accent-[#00C878]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Organic Kitchen Waste Recycled (kg): <span className="font-mono font-bold">{wasteKg} kg</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={wasteKg}
                  onChange={(e) => setWasteKg(Number(e.target.value))}
                  className="w-full accent-[#00C878]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Chemical-Free IPM & Mulching Actions: <span className="font-mono font-bold">{actionsCount}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={actionsCount}
                  onChange={(e) => setActionsCount(Number(e.target.value))}
                  className="w-full accent-[#00C878]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-xs hover:bg-[#B7F76B] transition-colors"
            >
              Sync Eco-Impact Telemetry to Database
            </button>
          </form>

          <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#123D2A] pb-4">
              <div>
                <div className="text-xs font-mono text-[#00C878]">TRANSPARENT ECO-IMPACT INDEX</div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{ecoResult.tier}</h4>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Estimated Annual Biomass & Soil Carbon Offset: ~{ecoResult.co2OffsetEstimateKg} kg CO₂e
                </p>
              </div>
              <div className="text-4xl font-extrabold font-mono text-[#00C878] tabular-nums">
                {ecoResult.ecoScore}/100
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-mono font-bold text-base text-[#00C878]">{ecoResult.breakdown.waterPoints}/25</div>
                <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/65">Water Saved</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-mono font-bold text-base text-[#00C878]">{ecoResult.breakdown.compostPoints}/25</div>
                <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/65">Composting</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-mono font-bold text-base text-[#00C878]">{ecoResult.breakdown.plantPoints}/20</div>
                <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/65">Active Plants</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-mono font-bold text-base text-[#00C878]">{ecoResult.breakdown.recyclePoints}/15</div>
                <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/65">Waste Recycled</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
                <div className="font-mono font-bold text-base text-[#00C878]">{ecoResult.breakdown.actionPoints}/15</div>
                <div className="text-[11px] text-slate-500 dark:text-[#F7F9F2]/65">Organic Actions</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs text-slate-600 dark:text-[#F7F9F2]/80">
              <strong>Explainable Formula:</strong> {ecoResult.formulaExplanation}
            </div>
          </div>
        </div>
      )}

      {/* 5. ADMIN DASHBOARD (ROLE-BASED ACCESS CONTROL) */}
      {activeTab === 'admin' && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-[#123D2A] pb-4">
            <div>
              <div className="text-xs font-mono text-[#D4B56A] flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> ROLE-BASED ACCESS CONTROL: ADMINISTRATOR VERIFIED
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                MYPLANTCARE Platform Administration & Governance Console
              </h3>
            </div>
            {aiServerStatus && (
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs font-mono">
                AI Engine Status:{' '}
                <span className={aiServerStatus.configured ? 'text-[#00C878] font-bold' : 'text-amber-400 font-bold'}>
                  {aiServerStatus.configured ? 'ACTIVE (SERVER KEY CONFIGURED)' : 'PENDING SECRETS SETUP'}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">Registered Accounts</div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {(workspaceData?.allUsers || []).length || 1}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">AI Diagnostic Records</div>
              <div className="text-2xl font-bold font-mono text-[#00C878] mt-1 tabular-nums">
                {diagnoses.length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">Community Posts Moderated</div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {(workspaceData?.posts || []).length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A]">
              <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60">Botanical Encyclopedia Taxa</div>
              <div className="text-2xl font-bold font-mono text-[#B7F76B] mt-1 tabular-nums">
                8 Verified Species
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#123D2A] text-slate-500 dark:text-[#F7F9F2]/60">
                  <th className="py-2.5 px-3">User UID</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Display Name</th>
                  <th className="py-2.5 px-3">RBAC Role</th>
                </tr>
              </thead>
              <tbody>
                {(workspaceData?.allUsers || []).map((u: any) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-[#123D2A]/50">
                    <td className="py-2.5 px-3 font-mono">{u.uid}</td>
                    <td className="py-2.5 px-3">{u.email}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{u.displayName}</td>
                    <td className="py-2.5 px-3 font-mono text-[#00C878] uppercase">{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
