import React from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  BookmarkCheck,
  ExternalLink,
  Stethoscope,
  Sprout,
  Droplets,
  ScanLine,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { GreenyChatMessage, NavigationGuideMatch, ResponseSourceCategory } from './GreenyTypes';
import { GreenyNavigationGuideCard } from './GreenyNavigationGuide';

interface GreenyConversationProps {
  messages: GreenyChatMessage[];
  input: string;
  onInputChange: (val: string) => void;
  onSendMessage: (overrideText?: string) => void;
  onStartVoiceInput: () => void;
  isListening: boolean;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onReplayLastVoice: () => void;
  language: 'en' | 'ta';
  onSaveToFirestore?: (msg: GreenyChatMessage) => void;
  onNavigate?: (view: NavigationGuideMatch['targetView'], subTarget?: string) => void;
  threadEndRef: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
}

const SOURCE_BADGE_MAP: Record<
  ResponseSourceCategory,
  { label: string; badgeClass: string }
> = {
  GEMINI_AI: {
    label: 'Gemini AI Response',
    badgeClass: 'text-[#00C878]',
  },
  SAVED_GARDEN_MEMORY: {
    label: 'Saved Garden Information',
    badgeClass: 'text-[#B7F76B]',
  },
  GENERAL_PLANT_CARE: {
    label: 'General Plant Care Advice',
    badgeClass: 'text-[#A7F3D0]',
  },
  WEBSITE_NAVIGATION_GUIDE: {
    label: 'Website Navigation Guide',
    badgeClass: 'text-[#D4B56A]',
  },
  SERVICE_ERROR: {
    label: 'AI Service Temporarily Unavailable (HTTP 503)',
    badgeClass: 'text-amber-400',
  },
};

export const GreenyConversation: React.FC<GreenyConversationProps> = ({
  messages,
  input,
  onInputChange,
  onSendMessage,
  onStartVoiceInput,
  isListening,
  voiceEnabled,
  onToggleVoice,
  onReplayLastVoice,
  language,
  onSaveToFirestore,
  onNavigate,
  threadEndRef,
  compact = false,
}) => {
  const handleQuickAction = (action: 'scan' | 'garden' | 'water' | 'identify' | 'ask') => {
    if (action === 'scan') {
      if (onNavigate) {
        onNavigate('diagnostics', 'doctor');
      } else {
        onSendMessage('How do I scan a plant?');
      }
      return;
    }
    if (action === 'garden') {
      if (onNavigate) {
        onNavigate('sanctuary', 'memory');
      } else {
        onSendMessage('Where are my plants?');
      }
      return;
    }
    if (action === 'water') {
      onSendMessage(
        language === 'ta'
          ? 'என் செடிகளுக்கு எப்போது தண்ணீர் ஊற்ற வேண்டும்?'
          : 'Is our little friend thirsty? Help me check my watering schedule!'
      );
      return;
    }
    if (action === 'identify') {
      if (onNavigate) {
        onNavigate('diagnostics', 'identify');
      } else {
        onSendMessage('How do I identify a plant?');
      }
      return;
    }
    if (action === 'ask') {
      onSendMessage(
        language === 'ta'
          ? 'என் துளசி மற்றும் மான்ஸ்டெரா செடிகளை எப்படி பராமரிப்பது?'
          : 'Share a cheerful plant care tip for my garden today!'
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Quick Action Bar (Part 7: Scan My Plant, Check My Garden, Watering Help, Identify a Plant, Ask GREENY) */}
      <div className="px-3.5 py-2.5 bg-slate-100/80 dark:bg-[#0B2419] border-b border-slate-200 dark:border-[#123D2A] flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleQuickAction('scan')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#00C878] text-[#071B12] text-[11px] font-bold hover:bg-[#B7F76B] transition-colors whitespace-nowrap shrink-0"
        >
          <Stethoscope className="w-3 h-3" />
          Scan My Plant
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('garden')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#123D2A] text-slate-800 dark:text-[#F7F9F2] border border-slate-200 dark:border-[#00C878]/30 text-[11px] font-semibold hover:border-[#00C878] transition-colors whitespace-nowrap shrink-0"
        >
          <Sprout className="w-3 h-3 text-[#00C878]" />
          Check My Garden
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('water')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#123D2A] text-slate-800 dark:text-[#F7F9F2] border border-slate-200 dark:border-[#00C878]/30 text-[11px] font-semibold hover:border-[#00C878] transition-colors whitespace-nowrap shrink-0"
        >
          <Droplets className="w-3 h-3 text-[#00C878]" />
          Watering Help
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('identify')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#123D2A] text-slate-800 dark:text-[#F7F9F2] border border-slate-200 dark:border-[#00C878]/30 text-[11px] font-semibold hover:border-[#00C878] transition-colors whitespace-nowrap shrink-0"
        >
          <ScanLine className="w-3 h-3 text-[#00C878]" />
          Identify a Plant
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('ask')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#123D2A] text-slate-800 dark:text-[#F7F9F2] border border-slate-200 dark:border-[#00C878]/30 text-[11px] font-semibold hover:border-[#00C878] transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3 h-3 text-[#B7F76B]" />
          Ask GREENY
        </button>
      </div>

      {/* Scrollable Conversation Area */}
      <div
        className={`flex-1 overflow-y-auto p-3.5 space-y-3 ${
          compact ? 'max-h-[260px]' : 'max-h-[410px]'
        }`}
      >
        {messages.map((m) => {
          const sourceMeta = SOURCE_BADGE_MAP[m.sourceCategory] || SOURCE_BADGE_MAP.GEMINI_AI;
          return (
            <div key={m.id} className="space-y-2">
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#00C878] text-[#071B12] font-semibold ml-8'
                    : m.sourceCategory === 'SERVICE_ERROR'
                    ? 'bg-amber-950/60 text-amber-100 border border-amber-400/50 mr-3'
                    : 'bg-slate-50 dark:bg-[#123D2A]/80 text-slate-800 dark:text-[#F7F9F2] border border-slate-200 dark:border-[#00C878]/25 mr-3'
                }`}
              >
                {/* Header Metadata with Explicit Response Source Classification */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mb-1.5 opacity-85">
                  <div className="flex items-center gap-1.5 font-mono">
                    {m.sender === 'user' ? (
                      <span className="font-bold">You</span>
                    ) : (
                      <>
                        <span className="font-bold text-[#00C878]">GREENY</span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-semibold ${sourceMeta.badgeClass}`}>{sourceMeta.label}</span>
                        {m.resolvedModel && m.sourceCategory === 'GEMINI_AI' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {m.resolvedModel}
                              {m.usedBackupModel ? ' (Backup Failover)' : ''}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {m.sender === 'greeny' && m.sourceCategory === 'GEMINI_AI' && onSaveToFirestore && (
                      <button
                        type="button"
                        onClick={() => onSaveToFirestore(m)}
                        className="inline-flex items-center gap-1 text-[10px] text-[#00C878] hover:underline"
                      >
                        <BookmarkCheck className="w-3 h-3" />
                        Save
                      </button>
                    )}
                    <span className="font-mono text-[10px]">{m.timestamp}</span>
                  </div>
                </div>

                {/* Primary Message Text */}
                <p className="whitespace-pre-line">{m.text}</p>

                {/* Retry Action when Gemini returns HTTP 503 */}
                {m.isRetryableError && m.failedUserQuery && (
                  <div className="mt-2.5 pt-2 border-t border-amber-400/30 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      AI response unavailable — your conversation is preserved.
                    </span>
                    <button
                      type="button"
                      onClick={() => onSendMessage(m.failedUserQuery)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-400 text-[#071B12] text-[11px] font-bold hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry Question
                    </button>
                  </div>
                )}

                {/* Suggested Care Action */}
                {m.suggestedAction && m.sourceCategory !== 'SERVICE_ERROR' && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-[#00C878]/20 text-[11px] text-emerald-700 dark:text-[#B7F76B]">
                    <strong>Little Buddy Tip:</strong> {m.suggestedAction}
                  </div>
                )}

                {/* Website Navigation Guide Card */}
                {m.navigationGuide && (
                  <GreenyNavigationGuideCard guide={m.navigationGuide} onNavigate={onNavigate} />
                )}

                {/* Google Search Grounding Sources */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-[#00C878]/20 space-y-1">
                    <span className="text-[10px] font-mono text-[#00C878]">Verified Web Sources:</span>
                    <div className="flex flex-wrap gap-2">
                      {m.sources.slice(0, 3).map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-[#B7F76B] underline"
                        >
                          {src.title}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Strictly Separated Saved Garden Information Card (Never disguised as AI response) */}
              {m.savedGardenContext && (
                <div className="mr-3 p-3 rounded-xl border border-[#00C878]/30 bg-emerald-950/30 text-xs text-[#F7F9F2]/90 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B7F76B]">
                    Saved Garden Information · Contextual Memory (Not a New AI Diagnosis)
                  </div>
                  <p className="text-[11px] leading-relaxed">{m.savedGardenContext}</p>
                </div>
              )}

              {/* Strictly Separated General Plant Care Reference Card */}
              {m.generalCareReference && (
                <div className="mr-3 p-3 rounded-xl border border-slate-300 dark:border-[#123D2A] bg-slate-100 dark:bg-[#071B12]/90 text-xs text-slate-700 dark:text-[#F7F9F2]/85 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00C878]">
                    General Plant Care Advice · Verified Reference Knowledge
                  </div>
                  <p className="text-[11px] leading-relaxed">{m.generalCareReference}</p>
                </div>
              )}
            </div>
          );
        })}
        <div ref={threadEndRef} />
      </div>

      {/* Input & Voice Control Bar */}
      <div className="p-3 bg-slate-100 dark:bg-[#0B2419] border-t border-slate-200 dark:border-[#123D2A] flex items-center gap-2">
        <button
          type="button"
          onClick={onStartVoiceInput}
          aria-label={isListening ? 'Stop Microphone' : 'Activate Microphone'}
          title={isListening ? 'Stop Listening' : 'Speak to GREENY'}
          className={`p-2.5 rounded-xl transition-colors shrink-0 ${
            isListening
              ? 'bg-red-500 text-white'
              : 'bg-white dark:bg-[#123D2A] text-slate-800 dark:text-[#B7F76B] border border-slate-200 dark:border-[#00C878]/30 hover:bg-[#00C878] hover:text-[#071B12]'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleVoice}
          aria-label={voiceEnabled ? 'Mute GREENY Voice' : 'Enable GREENY Voice'}
          title={voiceEnabled ? 'Voice Enabled (Click to Mute)' : 'Voice Muted (Click to Enable)'}
          className="p-2.5 rounded-xl bg-white dark:bg-[#123D2A] text-slate-800 dark:text-[#F7F9F2] border border-slate-200 dark:border-[#123D2A] hover:border-[#00C878] transition-colors shrink-0"
        >
          {voiceEnabled ? (
            <Volume2 className="w-4 h-4 text-[#00C878]" />
          ) : (
            <VolumeX className="w-4 h-4 text-amber-400" />
          )}
        </button>

        <button
          type="button"
          onClick={onReplayLastVoice}
          aria-label="Replay GREENY Last Spoken Response"
          title="Replay Last Spoken Response"
          className="p-2.5 rounded-xl bg-white dark:bg-[#123D2A] text-slate-800 dark:text-[#B7F76B] border border-slate-200 dark:border-[#123D2A] hover:border-[#00C878] transition-colors shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
          placeholder={
            language === 'ta'
              ? 'GREENY-யிடம் தாவர கேள்வியை கேளுங்கள்...'
              : 'Ask GREENY about plants, care, or how to use MyPlantCare...'
          }
          aria-label="Ask GREENY a question"
          className="flex-1 bg-white dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#F7F9F2]/40 focus:outline-none focus:border-[#00C878]"
        />

        <button
          type="button"
          onClick={() => onSendMessage()}
          aria-label="Send message to GREENY"
          className="p-2.5 rounded-xl bg-[#00C878] text-[#071B12] font-bold hover:bg-[#B7F76B] transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
