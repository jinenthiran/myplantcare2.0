import React, { useState } from 'react';
import { Minimize2, X, Sliders, Maximize2 } from 'lucide-react';
import {
  GreenyAnimationState,
  GreenyChatMessage,
  GreenyCustomizationSettings,
  NavigationGuideMatch,
} from './GreenyTypes';
import { GreenyCharacter3D } from './GreenyCharacter3D';
import { GreenyConversation } from './GreenyConversation';
import { GreenySettings } from './GreenySettings';
import { VoiceOptionInfo } from './GreenyVoiceController';

interface GreenyAssistantPanelProps {
  animationState: GreenyAnimationState;
  speechAmplitude: number;
  customization: GreenyCustomizationSettings;
  onUpdateCustomization: (patch: Partial<GreenyCustomizationSettings>) => void;
  availableVoices: VoiceOptionInfo[];
  messages: GreenyChatMessage[];
  input: string;
  onInputChange: (val: string) => void;
  onSendMessage: (overrideText?: string) => void;
  onStartVoiceInput: () => void;
  isListening: boolean;
  onReplayLastVoice: () => void;
  onHeadPat: () => void;
  onLeafTouch: () => void;
  onHappyTap: () => void;
  onWakeUp: () => void;
  onSaveToFirestore?: (msg: GreenyChatMessage) => void;
  onNavigate?: (view: NavigationGuideMatch['targetView'], subTarget?: string) => void;
  onOpenFullStudio?: () => void;
  onMinimise: () => void;
  onClose: () => void;
  threadEndRef: React.RefObject<HTMLDivElement | null>;
}

export const GreenyAssistantPanel: React.FC<GreenyAssistantPanelProps> = ({
  animationState,
  speechAmplitude,
  customization,
  onUpdateCustomization,
  availableVoices,
  messages,
  input,
  onInputChange,
  onSendMessage,
  onStartVoiceInput,
  isListening,
  onReplayLastVoice,
  onHeadPat,
  onLeafTouch,
  onHappyTap,
  onWakeUp,
  onSaveToFirestore,
  onNavigate,
  onOpenFullStudio,
  onMinimise,
  onClose,
  threadEndRef,
}) => {
  const [showCustomiseDrawer, setShowCustomiseDrawer] = useState(false);

  return (
    <div
      role="dialog"
      aria-label="GREENY 3D Botanical Companion Panel"
      className="fixed bottom-4 right-4 z-50 w-[370px] sm:w-[435px] max-h-[85vh] flex flex-col rounded-2xl border border-[#123D2A] bg-white dark:bg-[#071B12] text-slate-900 dark:text-[#F7F9F2] shadow-2xl overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#123D2A] text-white border-b border-[#00C878]/25">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold tracking-tight text-white">GREENY 3D</h3>
            <span className="text-[11px] font-mono text-[#B7F76B]">· Online ({animationState})</span>
          </div>
          <p className="text-[11px] text-[#A7F3D0]">Your Little Garden Buddy</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowCustomiseDrawer((s) => !s)}
            title="Voice & 3D Character Customisation"
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
              showCustomiseDrawer
                ? 'bg-[#00C878] text-[#071B12]'
                : 'bg-[#071B12]/70 text-[#B7F76B] border border-[#00C878]/30 hover:bg-[#071B12]'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>{showCustomiseDrawer ? 'Chat' : 'Customise'}</span>
          </button>

          {onOpenFullStudio && (
            <button
              type="button"
              onClick={onOpenFullStudio}
              aria-label="Expand to Full 3D Companion Studio"
              title="Open Full 3D Studio"
              className="p-1.5 text-[#F7F9F2]/80 hover:text-[#B7F76B] rounded-lg"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onMinimise}
            aria-label="Minimise GREENY Companion Panel"
            title="Minimise"
            className="p-1.5 text-[#F7F9F2]/80 hover:text-white rounded-lg"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close GREENY Companion Panel"
            title="Close"
            className="p-1.5 text-[#F7F9F2]/80 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive 3D Baby Plant Character Viewport */}
      <div className="px-3 pt-2.5 pb-1 bg-[#071B12]">
        <GreenyCharacter3D
          animationState={animationState}
          speechAmplitude={speechAmplitude}
          customization={customization}
          size="panel"
          onHeadPat={onHeadPat}
          onLeafTouch={onLeafTouch}
          onHappyTap={onHappyTap}
          onWakeUp={onWakeUp}
          interactiveHint={false}
        />
        <div className="flex items-center justify-between px-1 py-1 text-[10px] font-mono text-[#B7F76B]/85">
          <span>Tap Head to Pat · Tap Leaves to Wiggle</span>
          <button
            type="button"
            onClick={() =>
              onUpdateCustomization({
                language: customization.language === 'en' ? 'ta' : 'en',
              })
            }
            className="text-[#00C878] hover:underline font-bold"
          >
            Lang: {customization.language === 'en' ? 'English (Switch to தமிழ்)' : 'தமிழ் (Switch to EN)'}
          </button>
        </div>
      </div>

      {/* Either Settings/Customisation Drawer OR Live Conversation Area */}
      {showCustomiseDrawer ? (
        <div className="p-3.5 overflow-y-auto max-h-[380px]">
          <GreenySettings
            customization={customization}
            onUpdateCustomization={onUpdateCustomization}
            availableVoices={availableVoices}
            onReplayLastVoice={onReplayLastVoice}
          />
        </div>
      ) : (
        <GreenyConversation
          messages={messages}
          input={input}
          onInputChange={onInputChange}
          onSendMessage={onSendMessage}
          onStartVoiceInput={onStartVoiceInput}
          isListening={isListening}
          voiceEnabled={customization.voiceEnabled}
          onToggleVoice={() => onUpdateCustomization({ voiceEnabled: !customization.voiceEnabled })}
          onReplayLastVoice={onReplayLastVoice}
          language={customization.language}
          onSaveToFirestore={onSaveToFirestore}
          onNavigate={onNavigate}
          threadEndRef={threadEndRef}
          compact={true}
        />
      )}
    </div>
  );
};
