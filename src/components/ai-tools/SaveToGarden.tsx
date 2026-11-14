import React, { useState } from 'react';
import { BookmarkPlus, CalendarPlus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { NormalizedToolAnalysisResult } from '../../data/aiToolsCatalog';

interface SaveToGardenProps {
  result: NormalizedToolAnalysisResult;
  plants: any[];
  selectedPlantId: number | '';
  previewImageUrl?: string;
  authToken?: string | null;
  onSaved: () => void;
}

export const SaveToGarden: React.FC<SaveToGardenProps> = ({
  result,
  plants,
  selectedPlantId,
  previewImageUrl,
  authToken,
  onSaved,
}) => {
  const [targetPlantId, setTargetPlantId] = useState<string>(
    selectedPlantId ? String(selectedPlantId) : 'new'
  );
  const [customPlantName, setCustomPlantName] = useState<string>(
    result.plant_identification.common_name !== 'Unidentified / General Specimen'
      ? result.plant_identification.common_name
      : ''
  );
  const [isSavingGarden, setIsSavingGarden] = useState<boolean>(false);
  const [gardenSaveMsg, setGardenSaveMsg] = useState<string>('');
  const [gardenSaveError, setGardenSaveError] = useState<string>('');

  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [scheduleMsg, setScheduleMsg] = useState<string>('');

  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  };

  const handleSaveToGarden = async () => {
    if (isSavingGarden) return;
    const isNew = targetPlantId === 'new';
    const resolvedName = isNew
      ? customPlantName.trim() || result.plant_identification.common_name
      : plants.find((p) => String(p.id) === targetPlantId)?.name || customPlantName;

    if (isNew && (!resolvedName || resolvedName === 'Unidentified / General Specimen')) {
      setGardenSaveError('Please enter a plant name or link this result to an existing plant in My Garden.');
      return;
    }

    setIsSavingGarden(true);
    setGardenSaveError('');
    setGardenSaveMsg('');

    try {
      const res = await fetch('/api/ai/tools/save-to-garden', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          plantId: !isNew ? Number(targetPlantId) : undefined,
          toolSlug: result.tool,
          toolName: result.toolName,
          plantName: resolvedName,
          scientificName: result.plant_identification.scientific_name,
          headline: result.headline,
          severity: result.severity,
          confidence: result.plant_identification.confidence,
          observations: result.observations,
          possibleCauses: result.possible_causes,
          recommendations: result.recommendations,
          imageUrl: previewImageUrl || undefined,
          reportData: result,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save result to My Garden.');
      }
      setGardenSaveMsg(data.message || 'Saved to My Garden cleanly.');
      onSaved();
    } catch (err: any) {
      setGardenSaveError(err?.message || 'Failed to save result to My Garden.');
    } finally {
      setIsSavingGarden(false);
    }
  };

  const handleAddCareTasks = async () => {
    const suggestions = result.scheduleSuggestions || [];
    if (suggestions.length === 0 || isSavingSchedule) return;
    setIsSavingSchedule(true);
    setScheduleMsg('');
    try {
      const linkedPlant =
        targetPlantId !== 'new'
          ? plants.find((p) => String(p.id) === targetPlantId)
          : undefined;
      const res = await fetch('/api/ai/care-plan', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          plantId: linkedPlant?.id,
          plantName:
            linkedPlant?.name ||
            customPlantName.trim() ||
            result.plant_identification.common_name ||
            'My Garden',
          tasksToCreate: suggestions,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save care tasks.');
      setScheduleMsg(`Added ${data.count} care tasks to Smart Care Calendar.`);
      onSaved();
    } catch (err: any) {
      setScheduleMsg(`Error: ${err?.message || 'Could not save care tasks.'}`);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  return (
    <div
      data-testid="save-to-garden-panel"
      className="rounded-2xl border border-[#00D69A]/35 bg-[#FAF7EE] dark:bg-[#10251D] p-4 space-y-3 text-xs"
    >
      <div className="font-display font-bold text-[#10251D] dark:text-[#C7F36B] flex items-center gap-1.5">
        <BookmarkPlus className="w-4 h-4 text-[#174C38] dark:text-[#00D69A]" />
        Save Result to My Garden & Care History
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="save-target-plant" className="block text-[11px] font-semibold mb-1 text-[#174C38] dark:text-[#B6CDB4]">
            Destination in My Garden
          </label>
          <select
            id="save-target-plant"
            value={targetPlantId}
            onChange={(e) => setTargetPlantId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#B6CDB4]/60 dark:border-white/15 bg-white dark:bg-[#153026] text-[#10251D] dark:text-white"
          >
            <option value="new">+ Add as New Plant in My Garden</option>
            {plants.map((p: any) => (
              <option key={p.id} value={String(p.id)}>
                Update Existing: {p.name} ({p.species})
              </option>
            ))}
          </select>
        </div>

        {targetPlantId === 'new' && (
          <div>
            <label htmlFor="save-new-plant-name" className="block text-[11px] font-semibold mb-1 text-[#174C38] dark:text-[#B6CDB4]">
              Plant Name / Nickname
            </label>
            <input
              id="save-new-plant-name"
              type="text"
              value={customPlantName}
              onChange={(e) => setCustomPlantName(e.target.value)}
              placeholder="e.g. Balcony Hibiscus"
              className="w-full px-3 py-2 rounded-xl border border-[#B6CDB4]/60 dark:border-white/15 bg-white dark:bg-[#153026] text-[#10251D] dark:text-white"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          data-testid="save-result-garden-btn"
          disabled={isSavingGarden}
          onClick={handleSaveToGarden}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-white dark:text-[#10251D] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          {isSavingGarden ? 'Saving...' : 'Save Result to My Garden'}
        </button>

        {Array.isArray(result.scheduleSuggestions) && result.scheduleSuggestions.length > 0 && (
          <button
            type="button"
            disabled={isSavingSchedule}
            onClick={handleAddCareTasks}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#00D69A]/45 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#C7F36B] font-bold hover:border-[#00D69A] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            {isSavingSchedule
              ? 'Scheduling...'
              : `Add ${result.scheduleSuggestions.length} Care Tasks`}
          </button>
        )}
      </div>

      {gardenSaveMsg && (
        <div className="flex items-center gap-1.5 font-semibold text-[#174C38] dark:text-[#00D69A]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{gardenSaveMsg}</span>
        </div>
      )}

      {gardenSaveError && (
        <div className="flex items-center gap-1.5 font-semibold text-[#A33624] dark:text-[#FF806B]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{gardenSaveError}</span>
        </div>
      )}

      {scheduleMsg && (
        <div className="font-semibold text-[#174C38] dark:text-[#C7F36B]">{scheduleMsg}</div>
      )}
    </div>
  );
};
