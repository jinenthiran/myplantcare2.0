import React, { useState } from 'react';
import { Sparkles, Shield, Leaf, Bug, Sprout } from 'lucide-react';
import { ObservatoryCard } from './ui/ObservatoryPrimitives';

interface EcosystemSynergyToolProps {
  plants?: any[];
}

export const EcosystemSynergyTool: React.FC<EcosystemSynergyToolProps> = ({ plants = [] }) => {
  const [selectedSpecimen, setSelectedSpecimen] = useState<string>(
    plants[0]?.name || 'Monstera & Tropical Cluster'
  );

  const companionDatabase: Record<
    string,
    { partner: string; benefit: string; pestDeterrent: string; soilImpact: string; matchScore: number }[]
  > = {
    Monstera: [
      {
        partner: 'Areca Palm',
        benefit: 'Shared high-humidity canopy microclimate & dappled filtered shade.',
        pestDeterrent: 'Reduces spider mite pressure via ambient transpiration',
        soilImpact: 'Balanced organic moisture retention',
        matchScore: 96,
      },
      {
        partner: 'Snake Plant (Sansevieria)',
        benefit: 'Complementary shallow-vs-deep root zones and nighttime oxygen release.',
        pestDeterrent: 'Natural antifungal root perimeter',
        soilImpact: 'Aerated topsoil matrix',
        matchScore: 91,
      },
    ],
    Tulsi: [
      {
        partner: 'Curry Leaf (Kadi Patta)',
        benefit: 'Repels leaf miners and sap-sucking aphids through aromatic leaf terpenes.',
        pestDeterrent: 'Aphids, Whiteflies & Thrips',
        soilImpact: 'Enriches rhizosphere microbial diversity',
        matchScore: 98,
      },
      {
        partner: 'Marigold (Chendu Malli)',
        benefit: 'Releases alpha-terthienyl root exudates that suppress root-knot nematodes.',
        pestDeterrent: 'Root Nematodes & Soil Beetles',
        soilImpact: 'Pest-suppressive organic mulch',
        matchScore: 95,
      },
    ],
    Tomato: [
      {
        partner: 'Basil (Tiruvatchi)',
        benefit: 'Masks volatile plant scents from moth pests and boosts vigor.',
        pestDeterrent: 'Tomato Hornworms & Fruit Flies',
        soilImpact: 'Micronutrient mutualism',
        matchScore: 99,
      },
      {
        partner: 'Marigold',
        benefit: 'Classic companion border repelling soil-borne tomato nematodes.',
        pestDeterrent: 'Nematodes & Whiteflies',
        soilImpact: 'Suppresses fungal soil pathogens',
        matchScore: 97,
      },
    ],
  };

  const defaultCompanions = [
    {
      partner: 'Neem Specimen',
      benefit: 'Natural broad-spectrum botanical barrier in nearby containers.',
      pestDeterrent: 'Mealybugs, Aphids & Scales',
      soilImpact: 'Organic nitrogen and neem cake enrichment',
      matchScore: 95,
    },
    {
      partner: 'Marigold Companion',
      benefit: 'Attracts beneficial pollinators while deterring harmful root nematodes.',
      pestDeterrent: 'Soil Nematodes & Beetles',
      soilImpact: 'Root health protection',
      matchScore: 92,
    },
    {
      partner: 'Aloe Vera',
      benefit: 'Improves microclimate oxygenation and acts as a soothing companion.',
      pestDeterrent: 'Reduces localized fungal spore spread',
      soilImpact: 'Moisture-balanced substrate',
      matchScore: 88,
    },
  ];

  const currentMatchKey = Object.keys(companionDatabase).find((k) =>
    selectedSpecimen.toLowerCase().includes(k.toLowerCase())
  );
  const activeCompanions = currentMatchKey ? companionDatabase[currentMatchKey] : defaultCompanions;

  return (
    <ObservatoryCard padding="lg" className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A]">
            <Shield className="w-4 h-4" />
            <span>Companion Planting & Biotic Synergy</span>
          </p>
          <h3 className="text-lg sm:text-xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
            Ecosystem Synergy Analyzer
          </h3>
        </div>

        {plants.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="synergy-plant-select" className="text-xs text-[#4A665B] dark:text-[#B6CDB4] font-medium">
              Analyze Plant:
            </label>
            <select
              id="synergy-plant-select"
              value={selectedSpecimen}
              onChange={(e) => setSelectedSpecimen(e.target.value)}
              className="bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/18 dark:border-[#B6CDB4]/20 text-[#10251D] dark:text-[#FAF7EE] text-xs rounded-xl px-3 py-1.5 font-semibold focus:outline-none focus:border-[#00D69A]"
            >
              {plants.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.species || 'Specimen'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeCompanions.map((comp, idx) => (
          <div
            key={idx}
            className="rounded-2xl p-5 bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#B6CDB4]/14 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-display font-bold text-[#10251D] dark:text-[#FAF7EE] flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-[#00D69A]" />
                {comp.partner}
              </span>
              <span className="font-mono text-xs font-bold text-[#0F6B50] dark:text-[#00D69A] tabular-nums">
                {comp.matchScore}% Match
              </span>
            </div>

            <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">{comp.benefit}</p>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/12 text-xs">
              <div className="rounded-xl p-2.5 bg-white dark:bg-[#153026] border border-[#174C38]/10 dark:border-[#B6CDB4]/12">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#C9432C] dark:text-[#FF806B] flex items-center gap-1">
                  <Bug className="w-3 h-3" /> Pest Deterrent
                </div>
                <div className="font-semibold text-[#10251D] dark:text-[#FAF7EE] text-[11px] mt-1">
                  {comp.pestDeterrent}
                </div>
              </div>
              <div className="rounded-xl p-2.5 bg-white dark:bg-[#153026] border border-[#174C38]/10 dark:border-[#B6CDB4]/12">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#0F6B50] dark:text-[#00D69A] flex items-center gap-1">
                  <Leaf className="w-3 h-3" /> Soil Impact
                </div>
                <div className="font-semibold text-[#10251D] dark:text-[#FAF7EE] text-[11px] mt-1">
                  {comp.soilImpact}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[#4A665B] dark:text-[#B6CDB4] pt-2 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/12">
        <Sparkles className="w-3.5 h-3.5 text-[#00D69A] shrink-0" />
        <span>
          Spacing companion specimens within 60 cm amplifies allelopathic pest deterrence and shared soil vigor.
        </span>
      </div>
    </ObservatoryCard>
  );
};
