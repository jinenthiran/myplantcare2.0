import React from 'react';
import {
  Volume2,
  VolumeX,
  Globe,
  RotateCcw,
  Sparkles,
  Palette,
  EyeOff,
  Accessibility,
} from 'lucide-react';
import {
  GreenyAccessoryType,
  GreenyCustomizationSettings,
  GreenyEnvironmentType,
  GreenyFlowerStyle,
  GreenyLeafColor,
} from './GreenyTypes';
import { VoiceOptionInfo } from './GreenyVoiceController';

interface GreenySettingsProps {
  customization: GreenyCustomizationSettings;
  onUpdateCustomization: (patch: Partial<GreenyCustomizationSettings>) => void;
  availableVoices: VoiceOptionInfo[];
  onReplayLastVoice: () => void;
  compact?: boolean;
}

const ENVIRONMENTS: Array<{ id: GreenyEnvironmentType; label: string }> = [
  { id: 'floating-botanical', label: 'Floating Botanical (Default)' },
  { id: 'tiny-garden', label: 'Tiny Garden' },
  { id: 'flower-meadow', label: 'Flower Meadow' },
  { id: 'magical-forest', label: 'Magical Forest' },
  { id: 'greenhouse', label: 'Greenhouse' },
  { id: 'sunny-balcony', label: 'Sunny Balcony' },
  { id: 'rainy-garden', label: 'Rainy Garden' },
];

const LEAF_COLORS: Array<{ id: GreenyLeafColor; label: string; swatch: string }> = [
  { id: 'emerald', label: 'Emerald Sprout', swatch: '#00C878' },
  { id: 'mint', label: 'Mint Leaf', swatch: '#6EE7B7' },
  { id: 'pastel', label: 'Pastel Dew', swatch: '#86EFAC' },
  { id: 'lime', label: 'Soft Lime', swatch: '#B7F76B' },
];

const FLOWER_STYLES: Array<{ id: GreenyFlowerStyle; label: string }> = [
  { id: 'daisy', label: 'White Daisy Bloom' },
  { id: 'lotus', label: 'Pink Blossom' },
  { id: 'sunflower', label: 'Golden Sun Flower' },
  { id: 'none', label: 'Sprout Leaves Only' },
];

const ACCESSORIES: Array<{ id: GreenyAccessoryType; label: string }> = [
  { id: 'gold-emblem', label: 'Gold Botanical Emblem' },
  { id: 'dewdrop-halo', label: 'Glowing Dewdrop Halo' },
  { id: 'bow-ribbon', label: 'Pink Garden Ribbon' },
  { id: 'none', label: 'Natural (No Accessory)' },
];

export const GreenySettings: React.FC<GreenySettingsProps> = ({
  customization,
  onUpdateCustomization,
  availableVoices,
  onReplayLastVoice,
  compact = false,
}) => {
  const filteredVoices = availableVoices.filter((v) =>
    customization.language === 'ta'
      ? v.lang.toLowerCase().includes('ta') || v.lang.toLowerCase().includes('in')
      : v.lang.toLowerCase().startsWith('en')
  );

  return (
    <div className="space-y-4">
      {/* 1. Voiceover & Language Controls */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-[#00C878]" />
            GREENY Voiceover & Language
          </h4>
          <button
            type="button"
            onClick={onReplayLastVoice}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#123D2A] text-xs font-semibold text-slate-800 dark:text-[#B7F76B] hover:bg-[#00C878] hover:text-[#071B12] transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Replay Voice
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onUpdateCustomization({ voiceEnabled: !customization.voiceEnabled })}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              customization.voiceEnabled
                ? 'bg-[#00C878] text-[#071B12] border-[#00C878]'
                : 'bg-slate-50 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2]/80 border-slate-200 dark:border-[#123D2A]'
            }`}
          >
            {customization.voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {customization.voiceEnabled ? 'Voice: ON' : 'Voice: Muted'}
          </button>

          <button
            type="button"
            onClick={() => onUpdateCustomization({ language: 'en' })}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              customization.language === 'en'
                ? 'bg-[#00C878] text-[#071B12] border-[#00C878]'
                : 'bg-slate-50 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2]/80 border-slate-200 dark:border-[#123D2A]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            English
          </button>

          <button
            type="button"
            onClick={() => onUpdateCustomization({ language: 'ta' })}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              customization.language === 'ta'
                ? 'bg-[#00C878] text-[#071B12] border-[#00C878]'
                : 'bg-slate-50 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2]/80 border-slate-200 dark:border-[#123D2A]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            தமிழ் (Tamil)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label
              htmlFor="greeny-voice-select"
              className="block text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/65 mb-1"
            >
              Companion Voice Profile
            </label>
            <select
              id="greeny-voice-select"
              value={customization.selectedVoiceURI}
              onChange={(e) => onUpdateCustomization({ selectedVoiceURI: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-xs text-slate-900 dark:text-white"
            >
              <option value="">Auto Sweet Botanical Voice ({customization.language.toUpperCase()})</option>
              {(filteredVoices.length > 0 ? filteredVoices : availableVoices).slice(0, 12).map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="greeny-rate-slider"
              className="block text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/65 mb-1"
            >
              Speaking Speed: <span className="tabular-nums font-bold">{customization.speechRate.toFixed(2)}x</span>
            </label>
            <input
              id="greeny-rate-slider"
              type="range"
              min="0.85"
              max="1.30"
              step="0.05"
              value={customization.speechRate}
              onChange={(e) => onUpdateCustomization({ speechRate: Number(e.target.value) })}
              className="w-full accent-[#00C878] mt-1"
            />
          </div>
        </div>
      </div>

      {/* 2. 3D Character Customisation & 7 Environments */}
      {!compact && (
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[#00C878]" />
              GREENY 3D Customisation & Environments
            </h4>
            <span className="text-[11px] font-mono text-[#00C878]">All 7 Unlocked</span>
          </div>

          {/* Leaf Colour Selector */}
          <div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/65 mb-1.5">
              Baby Plant Leaf & Body Colour
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LEAF_COLORS.map((lc) => (
                <button
                  key={lc.id}
                  type="button"
                  onClick={() => onUpdateCustomization({ leafColor: lc.id })}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    customization.leafColor === lc.id
                      ? 'border-[#00C878] bg-[#00C878]/15 text-slate-900 dark:text-white font-bold'
                      : 'border-slate-200 dark:border-[#123D2A] text-slate-600 dark:text-[#F7F9F2]/75'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                    style={{ backgroundColor: lc.swatch }}
                  />
                  <span>{lc.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3D Environment Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label
                htmlFor="greeny-env-select"
                className="block text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/65 mb-1"
              >
                3D Environment (7 Worlds)
              </label>
              <select
                id="greeny-env-select"
                value={customization.environment}
                onChange={(e) => onUpdateCustomization({ environment: e.target.value as GreenyEnvironmentType })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-xs text-slate-900 dark:text-white"
              >
                {ENVIRONMENTS.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="greeny-flower-select"
                className="block text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/65 mb-1"
              >
                Head Crown Flower
              </label>
              <select
                id="greeny-flower-select"
                value={customization.flowerStyle}
                onChange={(e) => onUpdateCustomization({ flowerStyle: e.target.value as GreenyFlowerStyle })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-xs text-slate-900 dark:text-white"
              >
                {FLOWER_STYLES.map((flw) => (
                  <option key={flw.id} value={flw.id}>
                    {flw.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="greeny-accessory-select"
                className="block text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/65 mb-1"
              >
                Botanical Accessory
              </label>
              <select
                id="greeny-accessory-select"
                value={customization.accessory}
                onChange={(e) => onUpdateCustomization({ accessory: e.target.value as GreenyAccessoryType })}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-xs text-slate-900 dark:text-white"
              >
                {ACCESSORIES.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Performance & Accessibility Toggles */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#123D2A]">
            <button
              type="button"
              onClick={() =>
                onUpdateCustomization({ backgroundEffectsEnabled: !customization.backgroundEffectsEnabled })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                customization.backgroundEffectsEnabled
                  ? 'border-[#00C878]/50 bg-[#00C878]/10 text-emerald-800 dark:text-[#B7F76B]'
                  : 'border-slate-200 dark:border-[#123D2A] text-slate-600 dark:text-[#F7F9F2]/70'
              }`}
            >
              {customization.backgroundEffectsEnabled ? (
                <Sparkles className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              Background Particles: {customization.backgroundEffectsEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => onUpdateCustomization({ reducedMotion: !customization.reducedMotion })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                customization.reducedMotion
                  ? 'border-[#D4B56A] bg-[#D4B56A]/20 text-amber-800 dark:text-[#D4B56A]'
                  : 'border-slate-200 dark:border-[#123D2A] text-slate-600 dark:text-[#F7F9F2]/70'
              }`}
            >
              <Accessibility className="w-3.5 h-3.5" />
              Reduced Motion: {customization.reducedMotion ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
