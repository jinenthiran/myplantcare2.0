import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Droplets,
  Sun,
  Thermometer,
  Wind,
  ShieldAlert,
  Sprout,
  Heart,
  Share2,
  ExternalLink,
  BookOpen,
  Info,
  CheckCircle2,
  Layers,
  Bug,
  AlertTriangle,
  Maximize2,
  Wrench,
} from 'lucide-react';
import { LibraryPlant } from '../../data/plants/types';
import { BotanicalImage } from '../ui/BotanicalImage';
import { emitGreenyAskRequest } from '../greeny/GreenyTypes';
import { AdminImageCorrection } from './AdminImageCorrection';

interface BotanicalMonographModalProps {
  plant: LibraryPlant | null;
  onClose: () => void;
  onSelectRelated?: (plant: LibraryPlant) => void;
  onRequestImageFix?: (plant: LibraryPlant) => void;
  onOverridesChanged?: () => void;
  authToken?: string | null;
  allPlants: LibraryPlant[];
}

export const BotanicalMonographModal: React.FC<BotanicalMonographModalProps> = ({
  plant,
  onClose,
  onSelectRelated,
  onRequestImageFix,
  onOverridesChanged,
  authToken,
  allPlants,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'soil' | 'care' | 'pathology' | 'ethnobotany'>('profile');
  const [copiedLink, setCopiedLink] = useState(false);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [showInlineCorrection, setShowInlineCorrection] = useState(false);

  useEffect(() => {
    if (!plant) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plant, onClose]);

  if (!plant) return null;

  const verificationStatus = plant.verificationStatus || 'verified';

  const handleAskGreeny = () => {
    emitGreenyAskRequest({
      toolName: 'Botanical Monograph',
      plantName: plant.commonName,
      headline: `Botanical Inquiry: ${plant.commonName} (${plant.scientificName} / ${plant.tamilName})`,
      severity: 'Info',
      summaryPrompt: `Hi GREENY! Please tell me about the botanical characteristics, traditional uses, and specific care blueprint for ${plant.commonName} (${plant.scientificName}, Tamil: ${plant.tamilName}) from the herbarium library.`,
    });
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${plant.commonName} (${plant.tamilName} / ${plant.scientificName}) — MyPlantCare Botanical Library`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Find related plants from same category or family
  const relatedPlants = allPlants
    .filter((p) => p.id !== plant.id && (p.category === plant.category || p.family === plant.family))
    .slice(0, 4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="monograph-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#10251D]/75 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-[#FFFFFF] dark:bg-[#153026] border border-[#174C38]/20 dark:border-[#00D69A]/30 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#174C38]/12 dark:border-[#00D69A]/20 bg-[#FAF7EE] dark:bg-[#10251D]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#174C38] dark:bg-[#00D69A]" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#174C38] dark:text-[#00D69A] font-semibold">
              Botanical Monograph · Taxon ID: {plant.id}
            </span>
            {plant.isTamilNaduNative && (
              <span className="px-2 py-0.5 rounded-lg bg-[#00D69A]/15 text-[10px] font-bold text-[#174C38] dark:text-[#C7F36B] border border-[#00D69A]/30">
                Tamil Nadu Native
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              title="Share Monograph"
              className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#153026] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-[#10251D] dark:text-[#FAF7EE] hover:bg-[#174C38] hover:text-[#FFFFFF] transition-colors cursor-pointer"
            >
              {copiedLink ? <CheckCircle2 className="w-4 h-4 text-[#00D69A]" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Monograph"
              className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#153026] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-[#10251D] dark:text-[#FAF7EE] hover:bg-[#FF806B] hover:text-[#10251D] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Hero Section: Photo + Core Identification */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 space-y-2">
              <div className="relative rounded-2xl overflow-hidden border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#10251D] shadow-md group">
                <BotanicalImage
                  src={plant.imageUrl}
                  alt={plant.commonName}
                  commonName={plant.commonName}
                  scientificName={plant.scientificName}
                  verificationStatus={verificationStatus}
                  fitMode={fitMode}
                  onRequestImageFix={onRequestImageFix ? () => onRequestImageFix(plant) : undefined}
                  aspectClassName="h-64 sm:h-72 w-full"
                  className={fitMode === 'cover' ? 'group-hover:scale-105 transition-transform duration-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => setFitMode((m) => (m === 'cover' ? 'contain' : 'cover'))}
                  title="Toggle full uncropped botanical specimen view"
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#10251D]/85 border border-white/15 text-[10px] font-mono text-[#FAF7EE] hover:border-[#00D69A] cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3 text-[#00D69A]" />
                  {fitMode === 'cover' ? 'Uncrop View' : 'Fill Frame'}
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#10251D]/90 via-[#10251D]/45 to-transparent p-3 text-[#FAF7EE] text-[11px] pointer-events-none">
                  <div className="font-semibold truncate">{plant.commonName}</div>
                  <div className="text-[10px] text-[#B6CDB4] italic truncate">{plant.scientificName}</div>
                </div>
              </div>

              {/* Verified Image Attribution Metadata */}
              <div className="p-3 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 text-[11px] text-[#10251D]/70 dark:text-[#B6CDB4] space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-[#174C38] dark:text-[#00D69A]" />
                    {verificationStatus === 'verified' ? 'Verified Botanical Photography' : 'Image Awaiting Botanical Review'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInlineCorrection((v) => !v)}
                      data-testid="toggle-inline-image-correction-btn"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#174C38] dark:text-[#00D69A] hover:underline cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" /> {showInlineCorrection ? 'Close Curator Form' : 'Flag / Correct Image'}
                    </button>
                  </div>
                </div>
                <div>Photographer / Credit: <span className="font-medium text-[#10251D] dark:text-[#FAF7EE]">{plant.attribution.photographer}</span></div>
                <div>Source: <span className="font-mono text-[10px]">{plant.attribution.source}</span> · License: <span className="font-semibold text-[#174C38] dark:text-[#00D69A]">{plant.attribution.license}</span></div>
                {plant.attribution.sourceUrl && /^https?:\/\//i.test(plant.attribution.sourceUrl) && (
                  <a
                    href={plant.attribution.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-[#174C38] dark:text-[#00D69A] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Inspect Canonical Species Source
                  </a>
                )}
              </div>
            </div>

            {/* Core Identification & Meta Badges */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <div className="text-xs font-semibold text-[#174C38] dark:text-[#00D69A]">
                  {plant.family} Family · {plant.category}
                </div>
                <h1 id="monograph-title" className="text-2xl sm:text-3xl font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
                  {plant.commonName}
                </h1>
                <div className="text-lg font-bold text-[#B37810] dark:text-[#F5CA62] mt-1 font-tamil">
                  {plant.tamilName}
                </div>
                <div className="text-sm italic text-[#10251D]/65 dark:text-[#B6CDB4] font-serif mt-0.5">
                  {plant.scientificName}
                  {plant.synonyms && plant.synonyms.length > 0 && (
                    <span className="text-xs not-italic text-[#10251D]/55 dark:text-[#B6CDB4]/75 ml-2">
                      (syn. {plant.synonyms.join(', ')})
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Spec Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4] flex items-center gap-1">
                    <Sun className="w-3 h-3 text-[#F5CA62]" /> Sunlight
                  </div>
                  <div className="font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5 truncate">{plant.sunlight}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4] flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-[#56C7C0]" /> Water Need
                  </div>
                  <div className="font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">{plant.waterNeed}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4] flex items-center gap-1">
                    <Sprout className="w-3 h-3 text-[#00D69A]" /> Habit
                  </div>
                  <div className="font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5 truncate">{plant.growthHabit}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20">
                  <div className="text-[10px] text-[#10251D]/65 dark:text-[#B6CDB4] flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-[#FF806B]" /> Difficulty
                  </div>
                  <div className="font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">{plant.difficulty}</div>
                </div>
              </div>

              {/* Primary Benefits / Ethnobotany Summary Box */}
              <div className="p-3.5 rounded-xl bg-[#00D69A]/12 border border-[#00D69A]/30 text-xs text-[#10251D] dark:text-[#FAF7EE] leading-relaxed">
                <strong className="text-[#174C38] dark:text-[#00D69A]">Ethnobotanical & Practical Value:</strong> {plant.benefits}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAskGreeny}
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] text-xs font-extrabold hover:brightness-110 shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Ask GREENY About This Plant
                </button>
              </div>
            </div>
          </div>

          {showInlineCorrection && (
            <AdminImageCorrection
              plant={plant}
              authToken={authToken}
              onCorrectionSaved={onOverridesChanged}
              onClose={() => setShowInlineCorrection(false)}
            />
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-[#174C38]/12 dark:border-[#00D69A]/20 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'profile', label: 'Botanical Profile', icon: BookOpen },
              { id: 'soil', label: 'Rhizosphere & Climate', icon: Droplets },
              { id: 'care', label: 'Care & Nutrition', icon: Sprout },
              { id: 'pathology', label: 'Pathology & Safety', icon: Bug },
              { id: 'ethnobotany', label: 'Siddha & Cultural Lore', icon: Heart },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] font-bold shadow-sm'
                      : 'text-[#10251D]/70 dark:text-[#B6CDB4] hover:bg-[#FAF7EE] dark:hover:bg-[#10251D]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Botanical Profile */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-1.5">
                <div className="font-bold text-[#174C38] dark:text-[#00D69A]">Origin & Geographic Distribution</div>
                <div className="text-[#10251D] dark:text-[#FAF7EE]">{plant.origin}</div>
                <div className="text-[11px] text-[#10251D]/65 dark:text-[#B6CDB4] pt-1">
                  Climate Zone: <span className="font-semibold">{plant.climate}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-1.5">
                <div className="font-bold text-[#174C38] dark:text-[#00D69A]">Growth Habit & Mature Scale</div>
                <div className="text-[#10251D] dark:text-[#FAF7EE]">
                  Type: <span className="font-semibold">{plant.growthHabit}</span> · Mature Height: <span className="font-semibold">{plant.matureHeight}</span>
                </div>
                <div className="text-[11px] text-[#10251D]/65 dark:text-[#B6CDB4] pt-1">
                  Space Suitability: <span className="font-semibold">{plant.spaceSuitability}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-1.5 sm:col-span-2">
                <div className="font-bold text-[#174C38] dark:text-[#00D69A]">Flowering, Foliage & Phenology</div>
                <div className="text-[#10251D] dark:text-[#FAF7EE] leading-relaxed">{plant.season}</div>
              </div>
            </div>
          )}

          {/* Tab 2: Rhizosphere & Climate */}
          {activeTab === 'soil' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-2">
                <div className="font-bold text-[#174C38] dark:text-[#00D69A] flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Ideal Substrate Mix & Soil Chemistry
                </div>
                <div className="text-[#10251D] dark:text-[#FAF7EE] leading-relaxed">{plant.soilMix}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-1">
                  <div className="text-[#10251D]/65 dark:text-[#B6CDB4] font-semibold flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-[#F5CA62]" /> Light Exposure
                  </div>
                  <div className="font-bold text-[#10251D] dark:text-[#FAF7EE]">{plant.sunlight}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-1">
                  <div className="text-[#10251D]/65 dark:text-[#B6CDB4] font-semibold flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-[#FF806B]" /> Temperature Band
                  </div>
                  <div className="font-bold text-[#10251D] dark:text-[#FAF7EE]">{plant.temperatureRange}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-1">
                  <div className="text-[#10251D]/65 dark:text-[#B6CDB4] font-semibold flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-[#56C7C0]" /> Target Humidity
                  </div>
                  <div className="font-bold text-[#10251D] dark:text-[#FAF7EE]">{plant.humidity}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Care & Nutrition */}
          {activeTab === 'care' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-2">
                <div className="font-bold text-[#174C38] dark:text-[#00D69A]">Botanical Care Instructions</div>
                <div className="text-[#10251D] dark:text-[#FAF7EE] leading-relaxed">{plant.careInstructions}</div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-2">
                <div className="font-bold text-[#174C38] dark:text-[#00D69A]">Organic Fertilizer & Nutrient Blueprint</div>
                <div className="text-[#10251D] dark:text-[#FAF7EE] leading-relaxed">{plant.fertilizer}</div>
              </div>

              <div className="p-4 rounded-xl bg-[#00D69A]/12 border border-[#00D69A]/30 space-y-2">
                <div className="font-bold text-[#174C38] dark:text-[#00D69A]">Propagation Methods</div>
                <div className="flex flex-wrap gap-2">
                  {plant.propagation.map((prop, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-[#FFFFFF] dark:bg-[#10251D] border border-[#00D69A]/30 font-medium text-[#10251D] dark:text-[#FAF7EE]"
                    >
                      {prop}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Pathology & Safety */}
          {activeTab === 'pathology' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-2">
                  <div className="font-bold text-[#FF806B] flex items-center gap-1.5">
                    <Bug className="w-4 h-4" /> Common Pests & Vectors
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-[#10251D] dark:text-[#FAF7EE]">
                    {plant.commonPests.map((pest, i) => (
                      <li key={i}>{pest}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-2">
                  <div className="font-bold text-[#B37810] dark:text-[#F5CA62] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Common Plant Diseases
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-[#10251D] dark:text-[#FAF7EE]">
                    {plant.commonDiseases.map((dis, i) => (
                      <li key={i}>{dis}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FF806B]/15 border border-[#FF806B]/45 space-y-1.5">
                <div className="font-bold text-[#9B3B28] dark:text-[#FF806B] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Toxicity & Safety Information
                </div>
                <div className="text-[#7A2F1E] dark:text-[#FAF7EE] leading-relaxed">{plant.toxicity}</div>
              </div>
            </div>
          )}

          {/* Tab 5: Ethnobotany & Lore */}
          {activeTab === 'ethnobotany' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#00D69A]/20 space-y-2">
                <div className="font-bold text-[#174C38] dark:text-[#00D69A]">Ethnomedicinal, Traditional & Modern Uses</div>
                <div className="text-[#10251D] dark:text-[#FAF7EE] leading-relaxed">{plant.benefits}</div>
              </div>

              <div className="p-4 rounded-xl bg-[#00D69A]/12 border border-[#00D69A]/30 space-y-1.5">
                <div className="font-bold text-[#174C38] dark:text-[#00D69A]">Tamil Botanical Heritage Connection</div>
                <div className="text-[#10251D] dark:text-[#FAF7EE] leading-relaxed">
                  Known in Tamil as <strong className="font-tamil text-[#B37810] dark:text-[#F5CA62]">{plant.tamilName}</strong>.
                  Documented in Siddha herbal pharmacopeias and classical Sangam floral classifications.
                </div>
              </div>
            </div>
          )}

          {/* Related Plants Carousel */}
          {relatedPlants.length > 0 && (
            <div className="pt-4 border-t border-[#174C38]/12 dark:border-[#00D69A]/20 space-y-3">
              <div className="text-xs font-bold text-[#10251D] dark:text-[#FAF7EE]">
                Related Botanical Taxa ({plant.category})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedPlants.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectRelated?.(rel)}
                    className="p-2.5 rounded-xl border border-[#174C38]/15 dark:border-[#00D69A]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-left hover:border-[#00D69A] transition-all group cursor-pointer"
                  >
                    <div className="h-20 rounded-lg overflow-hidden mb-2 bg-[#174C38]">
                      <BotanicalImage
                        src={rel.imageUrl}
                        alt={rel.commonName}
                        commonName={rel.commonName}
                        scientificName={rel.scientificName}
                        verificationStatus={rel.verificationStatus}
                        aspectClassName="h-full w-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="text-xs font-bold text-[#10251D] dark:text-[#FAF7EE] truncate">
                      {rel.commonName}
                    </div>
                    <div className="text-[10px] text-[#B37810] dark:text-[#F5CA62] font-tamil truncate">
                      {rel.tamilName}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
