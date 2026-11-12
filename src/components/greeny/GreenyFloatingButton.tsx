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
      {/* Contextual Speech Bubble Toast from GREENY */}
      {floatingBubbleText && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto max-w-[270px] sm:max-w-[310px] p-3 rounded-2xl border border-[#00C878]/50 bg-[#071B12]/95 text-[#F7F9F2] shadow-2xl flex items-start gap-2.5"
        >
          <button
            type="button"
            onClick={onOpenPanel}
            className="text-left text-xs leading-relaxed text-[#F7F9F2] hover:text-[#B7F76B] transition-colors"
          >
            <span className="block text-[10px] font-mono font-bold text-[#00C878] mb-0.5">
              GREENY · Your Little Garden Buddy
            </span>
            {floatingBubbleText}
          </button>
          <button
            type="button"
            onClick={onDismissBubble}
            aria-label="Dismiss GREENY greeting bubble"
            className="p-0.5 text-[#F7F9F2]/60 hover:text-white shrink-0"
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
          className="absolute -inset-1 rounded-full border-2 border-[#00C878]/60 bg-[#00C878]/10 shadow-xl transition-transform group-hover:scale-105"
        />

        <div
          onClick={onOpenPanel}
          role="button"
          tabIndex={0}
          aria-label="Open GREENY 3D Botanical Companion Panel"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenPanel();
            }
          }}
          className="relative flex items-center gap-2.5 pr-3.5 pl-1 py-1 rounded-full bg-[#071B12] border border-[#00C878]/60 shadow-2xl hover:border-[#B7F76B] transition-all cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full overflow-hidden border border-[#123D2A] shrink-0">
            <GreenyCharacter3D
              animationState={animationState}
              speechAmplitude={speechAmplitude}
              customization={customization}
              size="floating"
              interactiveHint={false}
            />
          </div>

          <div className="text-left pr-1">
            <div className="text-xs font-extrabold text-white tracking-tight whitespace-nowrap">
              GREENY 3D
            </div>
            <div className="text-[10px] font-medium text-[#B7F76B] whitespace-nowrap">
              Little Garden Buddy
            </div>
          </div>

          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} new companion messages`}
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#B7F76B] text-[#071B12] text-[10px] font-extrabold flex items-center justify-center border border-[#071B12]"
            >
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
