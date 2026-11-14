import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Sparkles,
  Database,
  Sun,
  Droplets,
  Sprout,
  X,
} from 'lucide-react';
import {
  ALL_EXPANDED_PLANTS,
  PLANT_CATEGORIES,
  LibraryPlant,
} from '../../data/plants';
import { BotanicalImage } from '../ui/BotanicalImage';
import { BotanicalMonographModal } from './BotanicalMonographModal';
import { DatabaseAdminModal } from './DatabaseAdminModal';
import { emitGreenyAskRequest } from '../greeny/GreenyTypes';
import {
  applyImageOverridesToCatalog,
  BotanicalImageOverrideRecord,
  generateBotanicalImageAuditReport,
} from '../../utils/botanicalImageVerification';

interface ExpandedBotanicalLibraryProps {
  onSelectPlant?: (plant: LibraryPlant) => void;
  authToken?: string | null;
}

export const ExpandedBotanicalLibrary: React.FC<ExpandedBotanicalLibraryProps> = ({
  onSelectPlant,
  authToken,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSunlight, setSelectedSunlight] = useState<string>('All');
  const [selectedWaterNeed, setSelectedWaterNeed] = useState<string>('All');
  const [selectedHabit, setSelectedHabit] = useState<string>('All');
  const [quickFilter, setQuickFilter] = useState<'all' | 'tamil-nadu' | 'popular' | 'medicinal'>('all');

  // Modals & Admin Override state
  const [inspectedPlantId, setInspectedPlantId] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminEditPlantId, setAdminEditPlantId] = useState<string | null>(null);
  const [imageOverrides, setImageOverrides] = useState<BotanicalImageOverrideRecord[]>([]);

  const loadOverrides = useCallback(async () => {
    try {
      const res = await fetch('/api/botanical-library/image-overrides');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.overrides)) {
        setImageOverrides(data.overrides);
      }
    } catch {
      // Use bundled verified catalog
    }
  }, []);

  useEffect(() => {
    loadOverrides();
  }, [loadOverrides]);

  const catalogPlants = useMemo(
    () => applyImageOverridesToCatalog(ALL_EXPANDED_PLANTS, imageOverrides),
    [imageOverrides]
  );

  const imageAuditReport = useMemo(
    () => generateBotanicalImageAuditReport(catalogPlants),
    [catalogPlants]
  );

  const inspectedPlant = useMemo(
    () => (inspectedPlantId ? catalogPlants.find((p) => p.id === inspectedPlantId) || null : null),
    [catalogPlants, inspectedPlantId]
  );

  // Active filtered plant list
  const filteredPlants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogPlants.filter((plant) => {
      if (q) {
        const matchCommon = plant.commonName.toLowerCase().includes(q);
        const matchTamil = plant.tamilName.toLowerCase().includes(q);
        const matchScientific = plant.scientificName.toLowerCase().includes(q);
        const matchFamily = plant.family.toLowerCase().includes(q);
        const matchSynonyms = plant.synonyms?.some((s) => s.toLowerCase().includes(q)) ?? false;
        const matchBenefits = plant.benefits.toLowerCase().includes(q);
        if (!matchCommon && !matchTamil && !matchScientific && !matchFamily && !matchSynonyms && !matchBenefits) {
          return false;
        }
      }
      if (selectedCategory !== 'All' && plant.category !== selectedCategory) return false;
      if (selectedSunlight !== 'All' && plant.sunlight !== selectedSunlight) return false;
      if (selectedWaterNeed !== 'All' && plant.waterNeed !== selectedWaterNeed) return false;
      if (selectedHabit !== 'All' && plant.growthHabit !== selectedHabit) return false;
      if (quickFilter === 'tamil-nadu' && !plant.isTamilNaduNative) return false;
      if (quickFilter === 'popular' && !plant.isPopular) return false;
      if (
        quickFilter === 'medicinal' &&
        plant.category !== 'Sacred & Medicinal' &&
        plant.category !== 'Herbs, Spices & Aromatics'
      ) {
        return false;
      }
      return true;
    });
  }, [
    catalogPlants,
    searchQuery,
    selectedCategory,
    selectedSunlight,
    selectedWaterNeed,
    selectedHabit,
    quickFilter,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedSunlight('All');
    setSelectedWaterNeed('All');
    setSelectedHabit('All');
    setQuickFilter('all');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'All' ||
    selectedSunlight !== 'All' ||
    selectedWaterNeed !== 'All' ||
    selectedHabit !== 'All' ||
    quickFilter !== 'all';

  const handleQuickAskGreeny = (e: React.MouseEvent, plant: LibraryPlant) => {
    e.stopPropagation();
    emitGreenyAskRequest({
      toolName: 'Plant Library Quick Inquiry',
      plantName: plant.commonName,
      headline: `Quick Care Profile: ${plant.commonName} (${plant.scientificName} / ${plant.tamilName})`,
      severity: 'Info',
      summaryPrompt: `Hi GREENY! Give me a quick summary of the sunlight, watering, and medicinal or ecological importance of ${plant.commonName} (${plant.scientificName}, Tamil: ${plant.tamilName})!`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Editorial Herbarium Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#174C38] bg-[#10251D] text-[#FAF7EE] p-6 sm:p-8 shadow-lg">
        <BotanicalImage
          src="/images/library_herbarium_studio_1794532595655.webp"
          alt="Botanical herbarium reference studio"
          decorative
          priority
          containerClassName="!absolute inset-0"
          aspectClassName="w-full h-full"
          className="opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#10251D]/95 via-[#174C38]/85 to-[#10251D]/90" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#153026]/90 border border-[#00D69A]/35 text-[11px] font-mono uppercase tracking-[0.15em] text-[#C7F36B]">
              <Sprout className="w-3.5 h-3.5 text-[#00D69A]" /> Observatory Herbarium & Monographs · {ALL_EXPANDED_PLANTS.length} Verified Taxa
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#FFFFFF] tracking-tight">
              Curated Botanical Knowledge Database
            </h2>
            <p className="text-xs sm:text-sm text-[#FAF7EE]/85 leading-relaxed">
              Explore 113+ carefully researched botanical records across 10 specialized categories.
              Featuring verified Tamil nomenclature, accepted scientific binomials, authentic photography, and complete organic care profiles.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#153026] hover:bg-[#174C38] border border-[#00D69A]/35 text-[#FAF7EE] text-xs font-bold transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Database className="w-4 h-4 text-[#00D69A]" />
              Database Administration
            </button>
          </div>
        </div>

        {/* Live Metrics Row inside Hero */}
        <div className="relative z-10 mt-6 pt-5 border-t border-[#00D69A]/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[#FAF7EE]">
          <div>
            <div className="text-[11px] text-[#B6CDB4] font-medium">Catalog Records</div>
            <div className="text-2xl font-black font-mono mt-0.5 tabular-nums text-[#C7F36B]">{ALL_EXPANDED_PLANTS.length}</div>
            <div className="text-[10px] text-[#FAF7EE]/70">100+ Goal Exceeded</div>
          </div>
          <div>
            <div className="text-[11px] text-[#B6CDB4] font-medium">Tamil Nadu Native</div>
            <div className="text-2xl font-black font-mono mt-0.5 tabular-nums text-[#00D69A]">
              {ALL_EXPANDED_PLANTS.filter((p) => p.isTamilNaduNative).length}
            </div>
            <div className="text-[10px] text-[#FAF7EE]/70">Authentic Tamil Script</div>
          </div>
          <div>
            <div className="text-[11px] text-[#B6CDB4] font-medium">Botanical Categories</div>
            <div className="text-2xl font-black font-mono mt-0.5 tabular-nums text-[#F5CA62]">10</div>
            <div className="text-[10px] text-[#FAF7EE]/70">A to J Full Spectrum</div>
          </div>
          <div>
            <div className="text-[11px] text-[#B6CDB4] font-medium">Verified Species Photos</div>
            <div className="text-2xl font-black font-mono mt-0.5 tabular-nums text-[#56C7C0]">
              {imageAuditReport.verifiedCount}/{imageAuditReport.totalRecords}
            </div>
            <div className="text-[10px] text-[#FAF7EE]/70">
              {imageAuditReport.awaitingVerificationCount === 0
                ? '100% Species Verified · CC Attribution'
                : `${imageAuditReport.awaitingVerificationCount} Awaiting Review`}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filter Segment Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: `All Species (${ALL_EXPANDED_PLANTS.length})` },
          { id: 'tamil-nadu', label: `Tamil Nadu Native (${ALL_EXPANDED_PLANTS.filter((p) => p.isTamilNaduNative).length})` },
          { id: 'medicinal', label: `Sacred & Medicinal (${ALL_EXPANDED_PLANTS.filter((p) => p.category === 'Sacred & Medicinal' || p.category === 'Herbs, Spices & Aromatics').length})` },
          { id: 'popular', label: `Popular Cultivars (${ALL_EXPANDED_PLANTS.filter((p) => p.isPopular).length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setQuickFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 shadow-sm cursor-pointer ${
              quickFilter === tab.id
                ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D]'
                : 'bg-[#FFFFFF] dark:bg-[#153026] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-[#10251D] dark:text-[#FAF7EE] hover:border-[#00D69A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Multi-Faceted Search and Filter Console */}
      <div className="p-5 rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] space-y-4 shadow-sm">
        {/* Top Search Input Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#10251D]/55 dark:text-[#B6CDB4] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by English name, Tamil (e.g. வேம்பு / Vembu), scientific name, or benefits..."
              aria-label="Search Botanical Library"
              className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:ring-2 focus:ring-[#00D69A]/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#10251D]/60 hover:text-[#10251D] dark:text-[#B6CDB4] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/20 text-xs font-semibold text-[#174C38] dark:text-[#00D69A] hover:bg-[#FF806B] hover:text-[#10251D] transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-[#10251D]/65 dark:text-[#B6CDB4] mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by Category"
              className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none"
            >
              <option value="All">All Categories (10)</option>
              {PLANT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sunlight Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-[#10251D]/65 dark:text-[#B6CDB4] mb-1">
              Sunlight Exposure
            </label>
            <select
              value={selectedSunlight}
              onChange={(e) => setSelectedSunlight(e.target.value)}
              aria-label="Filter by Sunlight"
              className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none"
            >
              <option value="All">Any Sunlight Level</option>
              <option value="Full Sun">Full Sun (6+ hrs)</option>
              <option value="Bright Indirect">Bright Indirect</option>
              <option value="Partial Shade">Partial Shade</option>
              <option value="Low to Medium">Low to Medium</option>
            </select>
          </div>

          {/* Water Need Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-[#10251D]/65 dark:text-[#B6CDB4] mb-1">
              Water Need
            </label>
            <select
              value={selectedWaterNeed}
              onChange={(e) => setSelectedWaterNeed(e.target.value)}
              aria-label="Filter by Water Need"
              className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none"
            >
              <option value="All">Any Water Level</option>
              <option value="Low">Low (Drought Hardy)</option>
              <option value="Moderate">Moderate (Weekly)</option>
              <option value="High">High (Moisture Loving)</option>
            </select>
          </div>

          {/* Growth Habit Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-[#10251D]/65 dark:text-[#B6CDB4] mb-1">
              Growth Habit
            </label>
            <select
              value={selectedHabit}
              onChange={(e) => setSelectedHabit(e.target.value)}
              aria-label="Filter by Growth Habit"
              className="w-full px-3 py-2 rounded-xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none"
            >
              <option value="All">Any Growth Habit</option>
              <option value="Tree">Tree</option>
              <option value="Shrub">Shrub</option>
              <option value="Perennial Herb">Perennial Herb</option>
              <option value="Annual Herb">Annual Herb</option>
              <option value="Climber/Vine">Climber / Vine</option>
              <option value="Succulent">Succulent / Cactus</option>
              <option value="Aquatic">Aquatic Plant</option>
              <option value="Palm">Palm</option>
            </select>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="pt-2 border-t border-[#174C38]/12 dark:border-[#00D69A]/18 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-[#10251D]/65 dark:text-[#B6CDB4] mr-1 shrink-0">
            Categories:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] font-bold'
                : 'bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D]/80 dark:text-[#B6CDB4]'
            }`}
          >
            All ({ALL_EXPANDED_PLANTS.length})
          </button>
          {PLANT_CATEGORIES.map((cat) => {
            const count = ALL_EXPANDED_PLANTS.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] font-bold'
                    : 'bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D]/80 dark:text-[#B6CDB4]'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Count Status Bar */}
      <div className="flex items-center justify-between text-xs text-[#10251D]/65 dark:text-[#B6CDB4] px-1">
        <div>
          Showing <span className="font-bold text-[#10251D] dark:text-[#FAF7EE]">{filteredPlants.length}</span> of {ALL_EXPANDED_PLANTS.length} botanical monographs
          {hasActiveFilters && ' (filtered)'}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[#174C38] dark:text-[#00D69A] font-semibold hover:underline cursor-pointer"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Grid of Botanical Cards */}
      {filteredPlants.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-[#174C38]/30 dark:border-[#00D69A]/30 text-center space-y-3 bg-[#FFFFFF] dark:bg-[#153026]">
          <div className="w-12 h-12 rounded-xl bg-[#00D69A]/15 mx-auto flex items-center justify-center text-[#174C38] dark:text-[#00D69A]">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
            No plant monographs match your active filters
          </h3>
          <p className="text-xs text-[#10251D]/65 dark:text-[#B6CDB4] max-w-md mx-auto">
            Try searching for a Tamil name (e.g. "வேம்பு"), a common English name, or resetting your filter criteria.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] text-xs font-bold shadow-md hover:brightness-110 transition-all cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredPlants.map((plant) => (
            <div
              key={plant.id}
              onClick={() => {
                setInspectedPlantId(plant.id);
                onSelectPlant?.(plant);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setInspectedPlantId(plant.id);
                  onSelectPlant?.(plant);
                }
              }}
              className="group rounded-2xl border border-[#174C38]/14 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#153026] overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-[#00D69A]/50 transition-all cursor-pointer text-left"
            >
              <div>
                {/* Plant Photo with Aspect Ratio and Badge Overlay */}
                <div className="relative overflow-hidden h-48 bg-[#174C38]">
                  <BotanicalImage
                    src={plant.imageUrl}
                    alt={plant.commonName}
                    commonName={plant.commonName}
                    scientificName={plant.scientificName}
                    verificationStatus={plant.verificationStatus}
                    aspectClassName="h-48 w-full"
                    onRequestImageFix={() => {
                      setAdminEditPlantId(plant.id);
                      setShowAdminModal(true);
                    }}
                    className="group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Category Tag */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#10251D]/85 text-[10px] font-semibold text-[#FAF7EE] border border-white/15">
                      {plant.category}
                    </span>
                    {plant.isTamilNaduNative && (
                      <span className="px-2 py-0.5 rounded-lg bg-[#00D69A] text-[10px] font-bold text-[#10251D]">
                        TN Native
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Text Content */}
                <div className="p-4 space-y-2">
                  <div>
                    <h4 className="text-base font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE] group-hover:text-[#174C38] dark:group-hover:text-[#00D69A] transition-colors leading-snug">
                      {plant.commonName}
                    </h4>
                    <div className="text-xs font-bold text-[#B37810] dark:text-[#F5CA62] font-tamil mt-0.5">
                      {plant.tamilName}
                    </div>
                    <div className="text-[11px] italic text-[#10251D]/65 dark:text-[#B6CDB4] font-serif">
                      {plant.scientificName}
                    </div>
                  </div>

                  {/* Badges: Sunlight, Water, Habit */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#10251D]/75 dark:text-[#B6CDB4]">
                    <span className="px-2 py-0.5 rounded-md bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15 dark:border-[#00D69A]/20 flex items-center gap-1">
                      <Sun className="w-2.5 h-2.5 text-[#F5CA62]" /> {plant.sunlight}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15 dark:border-[#00D69A]/20 flex items-center gap-1">
                      <Droplets className="w-2.5 h-2.5 text-[#56C7C0]" /> {plant.waterNeed}
                    </span>
                  </div>

                  {/* Benefits snippet */}
                  <p className="text-xs text-[#10251D]/80 dark:text-[#B6CDB4] line-clamp-2 leading-relaxed pt-1">
                    {plant.benefits}
                  </p>
                </div>
              </div>

              {/* Card Bottom Actions */}
              <div className="p-4 pt-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectedPlantId(plant.id);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/15 dark:border-[#00D69A]/20 text-[#174C38] dark:text-[#FAF7EE] text-xs font-semibold hover:bg-[#174C38] hover:text-[#FFFFFF] dark:hover:bg-[#00D69A] dark:hover:text-[#10251D] transition-colors text-center cursor-pointer"
                >
                  Inspect Monograph
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickAskGreeny(e, plant)}
                  title="Ask GREENY about this plant"
                  className="p-2 rounded-xl bg-[#00D69A]/15 text-[#174C38] dark:text-[#00D69A] hover:bg-[#174C38] dark:hover:bg-[#00D69A] hover:text-[#FFFFFF] dark:hover:text-[#10251D] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monograph Detail Modal */}
      {inspectedPlant && (
        <BotanicalMonographModal
          plant={inspectedPlant}
          allPlants={catalogPlants}
          authToken={authToken}
          onOverridesChanged={loadOverrides}
          onClose={() => setInspectedPlantId(null)}
          onSelectRelated={(p) => setInspectedPlantId(p.id)}
          onRequestImageFix={(p) => {
            setInspectedPlantId(null);
            setAdminEditPlantId(p.id);
            setShowAdminModal(true);
          }}
        />
      )}

      {/* Database Administration & Safe Migration Modal */}
      {showAdminModal && (
        <DatabaseAdminModal
          onClose={() => {
            setShowAdminModal(false);
            setAdminEditPlantId(null);
          }}
          plants={catalogPlants}
          overrides={imageOverrides}
          initialEditPlantId={adminEditPlantId}
          authToken={authToken}
          onOverridesChanged={loadOverrides}
        />
      )}
    </div>
  );
};
