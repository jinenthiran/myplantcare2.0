import React from 'react';
import { X } from 'lucide-react';
import { GreenyCharacter3D } from './GreenyCharacter3D';
import { GreenyAnimationState, GreenyCustomizationSettings } from './GreenyTypes';

interface GreenyFloatingButtonProps {
  animationState: GreenyAnimationState;
  speechAmplitude: number;
  customization: GreenyCustomizationSettings;
  unreadCount: number;
  floatingBubbleText: string | null;
  onDismissBubble: () => void;
  onOpenPanel: () => void;
}

export const GreenyFloatingButton: React.FC<GreenyFloatingButtonProps> = ({
  animationState,
  speechAmplitude,
  customization,
  unreadCount,
  floatingBubbleText,
  onDismissBubble,
  onOpenPanel,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-none">
      {/* Contextual Speech Bubble Toast from GREENY (hidden on <640px mobile so hero CTAs stay unobstructed) */}
      {floatingBubbleText && (
        <div
          role="status"
          aria-live="polite"
          className="hidden sm:flex pointer-events-auto max-w-[310px] p-3.5 rounded-2xl border border-[#00D69A]/50 bg-[#0B1A14] text-[#FAF7EE] shadow-2xl items-start gap-2.5"
        >
          <button
            type="button"
            onClick={onOpenPanel}
            className="text-left text-xs leading-relaxed text-[#FAF7EE] hover:text-[#C7F36B] transition-colors cursor-pointer"
          >
            <span className="block text-[10px] font-mono font-bold text-[#00D69A] mb-0.5">
              GREENY · Botanical Companion
            </span>
            {floatingBubbleText}
          </button>
          <button
            type="button"
            onClick={onDismissBubble}
            aria-label="Dismiss GREENY greeting bubble"
            className="p-0.5 text-[#FAF7EE]/65 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating 3D GREENY Button */}
      <div className="pointer-events-auto relative group">
        {/* Subtle Glowing Botanical Ring */}
        <div
          aria-hidden="true"
          className="absolute -inset-1 rounded-full border border-[#00D69A]/45 bg-[#00D69A]/12 shadow-xl transition-transform group-hover:scale-105"
        />

        <button
          type="button"
          onClick={onOpenPanel}
          aria-label="Open GREENY 3D Botanical Companion Panel"
          className="relative flex items-center gap-2.5 pr-4 pl-1 py-1 rounded-full bg-gradient-to-r from-[#10251D] to-[#174C38] border border-[#00D69A]/55 shadow-2xl hover:border-[#C7F36B] transition-all cursor-pointer"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-[#00D69A]/45 shrink-0 bg-[#10251D]">
            <GreenyCharacter3D
              animationState={animationState}
              speechAmplitude={speechAmplitude}
              customization={customization}
              size="floating"
              interactiveHint={false}
            />
          </div>

          <div className="text-left pr-1">
            <div className="text-xs font-display font-extrabold text-[#FFFFFF] tracking-tight whitespace-nowrap">
              GREENY 3D
            </div>
            <div className="text-[10px] font-medium text-[#C7F36B] whitespace-nowrap">
              Observatory Buddy
            </div>
          </div>

          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} new companion messages`}
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-lg bg-[#C7F36B] text-[#10251D] text-[10px] font-extrabold flex items-center justify-center border border-[#10251D]"
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
