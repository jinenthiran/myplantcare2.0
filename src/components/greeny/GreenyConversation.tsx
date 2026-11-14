import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
  Leaf,
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
  isThinking?: boolean;
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
  { label: string; badgeClass: string; chipClass: string }
> = {
  GEMINI_AI: {
    label: 'Gemini AI Response',
    badgeClass: 'text-[#174C38] dark:text-[#00D69A]',
    chipClass: 'bg-[#00D69A]/12 border-[#00D69A]/35',
  },
  SAVED_GARDEN_MEMORY: {
    label: 'Saved Garden Information',
    badgeClass: 'text-[#10251D] dark:text-[#C7F36B]',
    chipClass: 'bg-[#C7F36B]/22 dark:bg-[#174C38]/55 border-[#174C38]/25 dark:border-[#C7F36B]/30',
  },
  GENERAL_PLANT_CARE: {
    label: 'General Plant Care Advice',
    badgeClass: 'text-[#174C38] dark:text-[#56C7C0]',
    chipClass: 'bg-[#56C7C0]/14 border-[#56C7C0]/30',
  },
  WEBSITE_NAVIGATION_GUIDE: {
    label: 'Website Navigation Guide',
    badgeClass: 'text-[#8C5A2B] dark:text-[#F5CA62]',
    chipClass: 'bg-[#F5CA62]/20 border-[#F5CA62]/45',
  },
  SERVICE_ERROR: {
    label: 'AI Service Temporarily Unavailable (HTTP 503)',
    badgeClass: 'text-[#9B3B28] dark:text-[#FF806B]',
    chipClass: 'bg-[#FF806B]/18 border-[#FF806B]/45',
  },
};

export const GreenyConversation: React.FC<GreenyConversationProps> = ({
  messages,
  input,
  onInputChange,
  onSendMessage,
  onStartVoiceInput,
  isListening,
  isThinking = false,
  voiceEnabled,
  onToggleVoice,
  onReplayLastVoice,
  language,
  onSaveToFirestore,
  onNavigate,
  threadEndRef,
  compact = false,
}) => {
  const prefersReducedMotion = useReducedMotion();

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
    <div className="flex flex-col flex-1 min-h-0 bg-[#FAF7EE] dark:bg-[#10251D]">
      {/* Quick Action Bar */}
      <div className="px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#153026] border-b border-[#174C38]/12 dark:border-[#00D69A]/18 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleQuickAction('scan')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] text-[11px] font-bold hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
        >
          <Stethoscope className="w-3 h-3" />
          Scan My Plant
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('garden')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-[11px] font-semibold hover:border-[#00D69A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sprout className="w-3 h-3 text-[#174C38] dark:text-[#00D69A]" />
          Check My Garden
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('water')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-[11px] font-semibold hover:border-[#00D69A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Droplets className="w-3 h-3 text-[#56C7C0]" />
          Watering Help
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('identify')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-[11px] font-semibold hover:border-[#00D69A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ScanLine className="w-3 h-3 text-[#174C38] dark:text-[#00D69A]" />
          Identify a Plant
        </button>
        <button
          type="button"
          onClick={() => handleQuickAction('ask')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] border border-[#174C38]/15 dark:border-[#00D69A]/25 text-[11px] font-semibold hover:border-[#00D69A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-[#F5CA62]" />
          Ask GREENY
        </button>
      </div>

      {/* Scrollable Conversation Area */}
      <div
        className={`flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 ${
          compact ? 'max-h-[265px]' : 'max-h-[430px]'
        }`}
      >
        {messages.map((m) => {
          const sourceMeta = SOURCE_BADGE_MAP[m.sourceCategory] || SOURCE_BADGE_MAP.GEMINI_AI;
          const isUser = m.sender === 'user';
          const isError = m.sourceCategory === 'SERVICE_ERROR';

          return (
            <motion.div
              key={m.id}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
              className="space-y-2"
            >
              <div
                className={`p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed transition-colors ${
                  isUser
                    ? 'bg-gradient-to-br from-[#174C38] to-[#10251D] dark:from-[#00D69A] dark:to-[#C7F36B] text-[#FFFFFF] dark:text-[#10251D] font-semibold ml-8 sm:ml-14 rounded-br-md shadow-sm'
                    : isError
                    ? 'bg-[#FF806B]/18 text-[#7A2F1E] dark:text-[#FAF7EE] border border-[#FF806B]/50 mr-2 sm:mr-6 rounded-bl-md'
                    : 'bg-[#FFFFFF] dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] border border-[#174C38]/14 dark:border-[#00D69A]/20 mr-2 sm:mr-6 rounded-bl-md shadow-xs'
                }`}
              >
                {/* Header Metadata with Explicit Response Source Classification */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mb-2">
                  <div className="flex flex-wrap items-center gap-1.5 font-mono">
                    {isUser ? (
                      <span className="font-bold opacity-95">You</span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 font-bold text-[#10251D] dark:text-[#00D69A]">
                          <Leaf className="w-3 h-3 text-[#174C38] dark:text-[#00D69A]" />
                          GREENY
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${sourceMeta.chipClass} ${sourceMeta.badgeClass}`}>
                          {sourceMeta.label}
                        </span>
                        {m.resolvedModel && m.sourceCategory === 'GEMINI_AI' && (
                          <span className="text-[10px] text-[#10251D]/60 dark:text-[#B6CDB4]">
                            · {m.resolvedModel}
                            {m.usedBackupModel ? ' (Backup)' : ''}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {m.sender === 'greeny' && m.sourceCategory === 'GEMINI_AI' && onSaveToFirestore && (
                      <button
                        type="button"
                        onClick={() => onSaveToFirestore(m)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#174C38] dark:text-[#00D69A] hover:underline cursor-pointer"
                      >
                        <BookmarkCheck className="w-3 h-3" />
                        Save
                      </button>
                    )}
                    <span className={`font-mono text-[10px] ${isUser ? 'opacity-80' : 'text-[#10251D]/60 dark:text-[#B6CDB4]'}`}>
                      {m.timestamp}
                    </span>
                  </div>
                </div>

                {/* Primary Message Text */}
                <p className="whitespace-pre-line">{m.text}</p>

                {/* Retry Action when Gemini returns HTTP 503 */}
                {m.isRetryableError && m.failedUserQuery && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#FF806B]/35 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#7A2F1E] dark:text-[#F5CA62]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#FF806B] dark:text-[#F5CA62] shrink-0" />
                      AI response unavailable — your conversation is preserved.
                    </span>
                    <button
                      type="button"
                      onClick={() => onSendMessage(m.failedUserQuery)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#F5CA62] text-[#10251D] text-[11px] font-bold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry Question
                    </button>
                  </div>
                )}

                {/* Suggested Care Action */}
                {m.suggestedAction && m.sourceCategory !== 'SERVICE_ERROR' && (
                  <div className="mt-2.5 pt-2 border-t border-[#174C38]/12 dark:border-[#00D69A]/18 text-[11px] text-[#174C38] dark:text-[#C7F36B]">
                    <strong>Observatory Tip:</strong> {m.suggestedAction}
                  </div>
                )}

                {/* Website Navigation Guide Card */}
                {m.navigationGuide && (
                  <GreenyNavigationGuideCard guide={m.navigationGuide} onNavigate={onNavigate} />
                )}

                {/* Google Search Grounding Sources */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#174C38]/12 dark:border-[#00D69A]/18 space-y-1">
                    <span className="text-[10px] font-mono text-[#174C38] dark:text-[#00D69A] uppercase tracking-wider">
                      Verified Web Sources
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {m.sources.slice(0, 3).map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF7EE] dark:bg-[#10251D] text-[11px] text-[#10251D] dark:text-[#00D69A] hover:underline"
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
                <div className="mr-2 sm:mr-6 p-3 rounded-xl border border-[#00D69A]/30 bg-[#FFFFFF] dark:bg-[#10251D] text-xs text-[#10251D] dark:text-[#FAF7EE] space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#174C38] dark:text-[#C7F36B]">
                    Saved Garden Information · Contextual Memory (Not a New AI Diagnosis)
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#10251D]/75 dark:text-[#B6CDB4]">{m.savedGardenContext}</p>
                </div>
              )}

              {/* Strictly Separated General Plant Care Reference Card */}
              {m.generalCareReference && (
                <div className="mr-2 sm:mr-6 p-3 rounded-xl border border-[#174C38]/15 dark:border-[#00D69A]/20 bg-[#FFFFFF] dark:bg-[#10251D] text-xs text-[#10251D] dark:text-[#FAF7EE] space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#174C38] dark:text-[#56C7C0]">
                    General Plant Care Advice · Verified Reference Knowledge
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#10251D]/75 dark:text-[#B6CDB4]">{m.generalCareReference}</p>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Animated Thinking State Indicator */}
        {isThinking && (
          <div
            role="status"
            aria-live="polite"
            className="mr-6 p-3.5 rounded-2xl rounded-bl-md bg-[#FFFFFF] dark:bg-[#153026] border border-[#00D69A]/35 flex items-center gap-2.5 text-xs text-[#10251D] dark:text-[#C7F36B] w-fit shadow-xs"
          >
            <Leaf className="w-3.5 h-3.5 text-[#174C38] dark:text-[#00D69A]" />
            <span className="font-mono text-[11px]">GREENY is synthesizing botanical context...</span>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Input & Voice Control Bar */}
      <div className="p-3 bg-[#FFFFFF] dark:bg-[#153026] border-t border-[#174C38]/12 dark:border-[#00D69A]/18 flex items-center gap-2">
        <button
          type="button"
          onClick={onStartVoiceInput}
          aria-label={isListening ? 'Stop Microphone' : 'Activate Microphone'}
          title={isListening ? 'Stop Listening' : 'Speak to GREENY'}
          className={`p-2.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
            isListening
              ? 'bg-[#FF806B] text-[#10251D]'
              : 'bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#00D69A] border border-[#174C38]/15 dark:border-[#00D69A]/25 hover:bg-[#174C38] hover:text-[#FFFFFF] dark:hover:bg-[#00D69A] dark:hover:text-[#10251D]'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleVoice}
          aria-label={voiceEnabled ? 'Mute GREENY Voice' : 'Enable GREENY Voice'}
          title={voiceEnabled ? 'Voice Enabled (Click to Mute)' : 'Voice Muted (Click to Enable)'}
          className="p-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] border border-[#174C38]/15 dark:border-[#00D69A]/25 hover:border-[#00D69A] transition-colors shrink-0 cursor-pointer"
        >
          {voiceEnabled ? (
            <Volume2 className="w-4 h-4 text-[#174C38] dark:text-[#00D69A]" />
          ) : (
            <VolumeX className="w-4 h-4 text-[#FF806B]" />
          )}
        </button>

        <button
          type="button"
          onClick={onReplayLastVoice}
          aria-label="Replay GREENY Last Spoken Response"
          title="Replay Last Spoken Response"
          className="p-2.5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#00D69A] border border-[#174C38]/15 dark:border-[#00D69A]/25 hover:border-[#00D69A] transition-colors shrink-0 cursor-pointer"
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
              : 'Ask GREENY about plants, care, or navigation...'
          }
          aria-label="Ask GREENY a question"
          className="flex-1 bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/18 dark:border-[#00D69A]/25 rounded-xl px-3.5 py-2 text-xs text-[#10251D] dark:text-[#FAF7EE] placeholder-[#10251D]/55 dark:placeholder-[#B6CDB4]/60 focus:outline-none focus:ring-2 focus:ring-[#00D69A]/50"
        />

        <button
          type="button"
          onClick={() => onSendMessage()}
          aria-label="Send message to GREENY"
          className="p-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FFFFFF] dark:text-[#10251D] font-bold hover:brightness-110 transition-all shrink-0 cursor-pointer shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
