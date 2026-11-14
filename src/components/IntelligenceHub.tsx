import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Apple,
  ArrowRight,
  Bug,
  Camera,
  Droplets,
  FlaskConical,
  Flower2,
  GitBranch,
  HeartPulse,
  Layers,
  Leaf,
  Package,
  Scan,
  Scissors,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import {
  AI_TOOLS_CATALOG,
  AI_TOOL_ACCENT_STYLES,
  AiToolCategory,
  AiToolSlug,
  getToolBySlug,
  normalizeToolSlug,
} from '../data/aiToolsCatalog';
import { AiToolWorkspace } from './ai-tools/AiToolWorkspace';
import { BotanicalVideoStudio } from './video/BotanicalVideoStudio';

export type CanonicalAiToolId = AiToolSlug;
export type IntelligenceTool = AiToolSlug | string;

export function normalizeToolId(id?: string | null): AiToolSlug | null {
  return normalizeToolSlug(id);
}

const ICON_MAP: Record<string, any> = {
  Scan,
  Leaf,
  ShieldAlert,
  Bug,
  FlaskConical,
  Droplets,
  Layers,
  HeartPulse,
  Sprout,
  Flower2,
  Apple,
  TrendingUp,
  Scissors,
  Package,
  GitBranch,
  ShieldCheck,
  UserCheck,
};

interface IntelligenceHubProps {
  activeToolSlug: AiToolSlug | null;
  onSelectTool: (slug: AiToolSlug | null) => void;
  workspaceData: any;
  onRefreshWorkspace: () => void;
  onLaunchDiagnostic?: (subMode: 'doctor' | 'identify' | 'pest' | 'nutrient' | 'rescue') => void;
  authToken?: string | null;
  prefillContext?: { toolId?: string; plantId?: number | null; prompt?: string } | null;
  onClearPrefill?: () => void;
}

export const IntelligenceHub: React.FC<IntelligenceHubProps> = ({
  activeToolSlug,
  onSelectTool,
  workspaceData,
  onRefreshWorkspace,
  onLaunchDiagnostic,
  authToken,
  prefillContext,
  onClearPrefill,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState<AiToolCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showVideoStudio, setShowVideoStudio] = useState<boolean>(false);

  const activeToolDef = useMemo(
    () => (activeToolSlug ? getToolBySlug(activeToolSlug) : null),
    [activeToolSlug]
  );

  if (showVideoStudio) {
    return (
      <BotanicalVideoStudio
        authToken={authToken}
        onClose={() => setShowVideoStudio(false)}
      />
    );
  }

  // If a specific tool route (/ai-tools/<slug>) is selected, render ONLY its dedicated full-screen workspace (no scroll-to-section!)
  if (activeToolDef) {
    return (
      <AiToolWorkspace
        tool={activeToolDef}
        workspaceData={workspaceData}
        authToken={authToken}
        initialPrefill={prefillContext}
        onClearPrefill={onClearPrefill}
        onRefreshWorkspace={onRefreshWorkspace}
        onBackToToolsGrid={() => onSelectTool(null)}
      />
    );
  }

  // Otherwise render the /ai-tools Hub Grid with 18 distinct colourful interactive cards
  const visibleTools = AI_TOOLS_CATALOG.filter((tool) => {
    const matchesCat = selectedCategory === 'All' || tool.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      tool.name.toLowerCase().includes(q) ||
      tool.tagline.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const categories: AiToolCategory[] = [
    'All',
    'Identification & Safety',
    'Health & Diagnostics',
    'Water, Soil & Roots',
    'Care, Pruning & Growth',
  ];

  return (
    <div data-testid="ai-tools-grid-page" className="space-y-6">
      {/* Observatory Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#174C38]/20 dark:border-[#00D69A]/25 bg-[#10251D] text-[#FAF7EE] p-6 sm:p-8 space-y-6 shadow-md">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#00D69A]/14 blur-3xl"
        />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-[0.18em] text-[#C7F36B] font-semibold">
              AI Botanical Intelligence Centre · {AI_TOOLS_CATALOG.length} Specialized Instruments
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#FAF7EE] tracking-tight">
              AI Plant Intelligence Centre
            </h1>
            <p className="text-xs sm:text-sm text-[#B6CDB4] max-w-2xl leading-relaxed">
              Launch any specialized AI instrument into its own dedicated camera &amp; upload studio, calibrated with saved My Garden context and transparent scientific guardrails.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowVideoStudio(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#BBA8F5]/45 bg-[#BBA8F5]/14 text-xs font-display font-bold text-[#FAF7EE] hover:bg-[#BBA8F5]/24 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            >
              <span>Botanical Cinema (Animate to Video)</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/25 text-[#BBA8F5]">Omni Flash</span>
            </button>

            {onLaunchDiagnostic && (
              <button
                type="button"
                onClick={() => onLaunchDiagnostic('doctor')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00D69A] text-xs font-display font-bold text-[#10251D] hover:brightness-105 transition-all shrink-0 whitespace-nowrap cursor-pointer"
              >
                Multi-Angle Diagnostic Lab <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search + Category Filter Strip */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-display font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#00D69A] text-[#10251D]'
                    : 'bg-white/8 text-[#B6CDB4] hover:bg-white/15 hover:text-white'
                }`}
              >
                {cat === 'All' ? `All ${AI_TOOLS_CATALOG.length} Tools` : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#B6CDB4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AI tools (e.g. root, watering, pest)..."
              aria-label="Search AI plant tools"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-white/15 bg-[#153026] text-[#FAF7EE] placeholder:text-[#B6CDB4]/70"
            />
          </div>
        </div>
      </div>

      {/* Dedicated AI Tool Cards Grid */}
      {visibleTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleTools.map((tool, index) => {
            const Icon = ICON_MAP[tool.iconName] || Scan;
            const accent = AI_TOOL_ACCENT_STYLES[tool.accent];
            return (
              <motion.button
                key={tool.slug}
                type="button"
                data-testid={`ai-tool-card-${tool.slug}`}
                onClick={() => onSelectTool(tool.slug)}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.25,
                  delay: prefersReducedMotion ? 0 : Math.min(index * 0.02, 0.24),
                }}
                whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                className="group relative overflow-hidden text-left rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-lg hover:border-[#00D69A] dark:hover:border-[#00D69A] transition-all cursor-pointer"
              >
                <div
                  aria-hidden="true"
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: accent.hexLight }}
                />
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${accent.lightBg} ${accent.darkBg} ${accent.lightText} ${accent.darkText} ${accent.border}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">
                      <Camera className="w-3.5 h-3.5 text-[#00D69A]" />
                      Cam + AI
                    </span>
                  </div>

                  <div>
                    <div className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${accent.lightText} ${accent.darkText}`}>
                      {tool.category}
                    </div>
                    <h2 className="text-base font-display font-extrabold text-[#10251D] dark:text-[#FAF7EE] mt-0.5 group-hover:text-[#0F6B50] dark:group-hover:text-[#00D69A] transition-colors">
                      {tool.name}
                    </h2>
                    <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mt-1 leading-relaxed">
                      {tool.tagline}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/10 text-xs font-display font-bold text-[#174C38] dark:text-[#00D69A]">
                  <span>Launch Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#174C38]/14 dark:border-[#B6CDB4]/14 bg-white dark:bg-[#153026] p-8 text-center space-y-3">
          <p className="text-sm font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
            No AI tools matched "{searchQuery}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="px-4 py-2 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold cursor-pointer"
          >
            Show All {AI_TOOLS_CATALOG.length} Tools
          </button>
        </div>
      )}
    </div>
  );
};
