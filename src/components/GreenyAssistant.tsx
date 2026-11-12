import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Cpu,
  Search,
  Sparkles,
  Heart,
  Smile,
  HelpCircle,
  Moon,
  PartyPopper,
  Volume2,
} from 'lucide-react';
import { auth, saveBotanicalNoteToFirestore, syncUserPreferencesToFirestore } from '../lib/firebase';
import {
  DEFAULT_GREENY_CUSTOMIZATION,
  GREENY_DIALOGUE_LIBRARY,
  GreenyAnimationState,
  GreenyAppEventPayload,
  GreenyChatMessage,
  GreenyCustomizationSettings,
  NavigationGuideMatch,
  pickContextualDialogue,
  subscribeGreenyAppEvents,
} from './greeny/GreenyTypes';
import { GreenyCharacter3D } from './greeny/GreenyCharacter3D';
import { GreenyVoiceController, VoiceOptionInfo } from './greeny/GreenyVoiceController';
import { GreenySettings } from './greeny/GreenySettings';
import { GreenyConversation } from './greeny/GreenyConversation';
import { GreenyFloatingButton } from './greeny/GreenyFloatingButton';
import { GreenyAssistantPanel } from './greeny/GreenyAssistantPanel';
import {
  highlightTargetNavigationElement,
  matchWebsiteNavigationIntent,
} from './greeny/GreenyNavigationGuide';

export type GreenyEmotionState = GreenyAnimationState;

export type GeminiChatModel =
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon'
  | 'gemini-4-carbon';

export type BotanicalRolePersona =
  | 'GREENY Companion'
  | 'Pathology & Root Scientist'
  | 'Climate & Irrigation Agronomist'
  | 'Quick Triage Botanist';

interface GreenyAssistantProps {
  mode: 'page' | 'floating';
  plants: any[];
  authToken?: string | null;
  onNavigate?: (view: NavigationGuideMatch['targetView'], subTarget?: string) => void;
}

const CUSTOMIZATION_STORAGE_KEY = 'myplantcare_greeny_custom_v2';
const SESSION_GREETED_KEY = 'myplantcare_greeny_session_greeted_v2';
const DAILY_GREETING_DATE_KEY = 'myplantcare_greeny_daily_date_v2';

function loadSavedCustomization(): GreenyCustomizationSettings {
  try {
    const raw = localStorage.getItem(CUSTOMIZATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_GREENY_CUSTOMIZATION, ...parsed };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_GREENY_CUSTOMIZATION;
}

function float32ToPcm16Base64(float32Array: Float32Array): string {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export const GreenyAssistant: React.FC<GreenyAssistantProps> = ({
  mode,
  plants,
  authToken,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(mode === 'page');
  const [customization, setCustomization] = useState<GreenyCustomizationSettings>(loadSavedCustomization);
  const [animationState, setAnimationState] = useState<GreenyAnimationState>('IDLE');
  const [speechAmplitude, setSpeechAmplitude] = useState<number>(0);
  const [availableVoices, setAvailableVoices] = useState<VoiceOptionInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<GeminiChatModel>('gemini-3.8-flash');
  const [rolePersona, setRolePersona] = useState<BotanicalRolePersona>('GREENY Companion');
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [floatingBubbleText, setFloatingBubbleText] = useState<string | null>(null);
  const [savedNoteBadge, setSavedNoteBadge] = useState<string | null>(null);

  // Gemini Live API (`gemini-3.8-live`) real-time voice state
  const [liveConnected, setLiveConnected] = useState<boolean>(false);
  const [liveVoiceName, setLiveVoiceName] = useState<'Zephyr' | 'Kore' | 'Puck'>('Zephyr');
  const [liveStatusText, setLiveStatusText] = useState<string>('Standby · Sweet Baby Plant Voice Active');
  const [liveTranscriptPreview, setLiveTranscriptPreview] = useState<string>('');

  const voiceControllerRef = useRef<GreenyVoiceController>(new GreenyVoiceController());
  const inactivityTimerRef = useRef<number | null>(null);
  const stateRevertTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // Live API WebSocket & Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const customRef = useRef<GreenyCustomizationSettings>(customization);
  customRef.current = customization;

  const [messages, setMessages] = useState<GreenyChatMessage[]>(() => {
    const lang = loadSavedCustomization().language;
    return [
      {
        id: 'welcome-greeny-2',
        sender: 'greeny',
        text: GREENY_DIALOGUE_LIBRARY[lang].firstGreeting,
        sourceCategory: 'GEMINI_AI',
        animationState: 'GREETING',
        suggestedAction:
          plants.length > 0
            ? `Tap "Scan My Plant" or check on your ${plants[0]?.name} (${plants[0]?.species}) in My Garden!`
            : 'Tap my head for a head pat, click my leaves to see them wiggle, or ask me any plant question!',
        resolvedModel: 'GREENY 3D Companion 2.0',
        timestamp: 'Just now',
      },
    ];
  });

  // Load browser speech synthesis voices
  useEffect(() => {
    const updateVoices = () => {
      const list = voiceControllerRef.current.getAvailableVoices();
      setAvailableVoices(list);
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Persist customisation settings
  const handleUpdateCustomization = useCallback((patch: Partial<GreenyCustomizationSettings>) => {
    setCustomization((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      if (auth.currentUser) {
        syncUserPreferencesToFirestore({
          userId: auth.currentUser.uid,
          displayName: auth.currentUser.displayName || 'Botanical Explorer',
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          preferredLanguage: next.language,
          preferredModel: 'gemini-3.8-flash',
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  const triggerTemporaryState = useCallback((nextState: GreenyAnimationState, durationMs = 3600) => {
    if (stateRevertTimerRef.current !== null) {
      window.clearTimeout(stateRevertTimerRef.current);
    }
    setAnimationState(nextState);
    stateRevertTimerRef.current = window.setTimeout(() => {
      setAnimationState((curr) => (curr === nextState ? 'IDLE' : curr));
    }, durationMs);
  }, []);

  const speakWithGreeny = useCallback(
    (text: string, postState: GreenyAnimationState = 'IDLE') => {
      const currentCustom = customRef.current;
      voiceControllerRef.current.speakText({
        text,
        language: currentCustom.language,
        voiceEnabled: currentCustom.voiceEnabled,
        speechRate: currentCustom.speechRate,
        preferredVoiceURI: currentCustom.selectedVoiceURI,
        onStartSpeaking: () => {
          setAnimationState('SPEAKING');
        },
        onAmplitudeChange: (amp) => {
          setSpeechAmplitude(amp);
        },
        onStopSpeaking: () => {
          setSpeechAmplitude(0);
          setAnimationState(postState);
        },
      });
    },
    []
  );

  // Reset inactivity sleep timer on user interaction
  const resetInactivitySleepTimer = useCallback(() => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      setAnimationState((curr) => (curr === 'IDLE' ? 'SLEEPING' : curr));
    }, 60000);
  }, []);

  useEffect(() => {
    resetInactivitySleepTimer();
    const handleActivity = () => resetInactivitySleepTimer();
    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivitySleepTimer]);

  // First-visit arrival greeting (once per session) + Daily gardening greeting (once per day)
  useEffect(() => {
    try {
      const alreadyGreetedSession = sessionStorage.getItem(SESSION_GREETED_KEY);
      const todayIso = new Date().toISOString().slice(0, 10);
      const lastDailyDate = localStorage.getItem(DAILY_GREETING_DATE_KEY);

      if (!alreadyGreetedSession) {
        sessionStorage.setItem(SESSION_GREETED_KEY, 'true');
        localStorage.setItem(DAILY_GREETING_DATE_KEY, todayIso);
        const greetingLine = GREENY_DIALOGUE_LIBRARY[customization.language].firstGreeting;
        setFloatingBubbleText(greetingLine);
        triggerTemporaryState('GREETING', 4800);
        window.setTimeout(() => {
          setFloatingBubbleText((curr) => (curr === greetingLine ? null : curr));
        }, 9000);
      } else if (lastDailyDate !== todayIso) {
        localStorage.setItem(DAILY_GREETING_DATE_KEY, todayIso);
        const dailyLine = pickContextualDialogue(customization.language, 'dailyGreetings');
        setFloatingBubbleText(dailyLine);
        triggerTemporaryState('HAPPY', 3600);
      }
    } catch {
      // ignore storage errors
    }
  }, [customization.language, triggerTemporaryState]);

  // Subscribe to Real Application Events (Part 4: Emotional Intelligence)
  useEffect(() => {
    const unsubscribe = subscribeGreenyAppEvents((event: GreenyAppEventPayload) => {
      resetInactivitySleepTimer();
      const lang = customRef.current.language;
      const reactionText =
        GREENY_DIALOGUE_LIBRARY[lang].events[event.type] ||
        GREENY_DIALOGUE_LIBRARY.en.events[event.type];

      let targetAnim: GreenyAnimationState = 'HAPPY';
      if (event.type === 'USER_SCANNED_DISEASED_PLANT' || event.type === 'USER_RECEIVED_ERROR') {
        targetAnim = 'SAD';
      } else if (event.type === 'USER_FORGOT_REMINDER') {
        targetAnim = 'SURPRISED';
      } else if (event.type === 'USER_ASKED_QUESTION') {
        targetAnim = 'THINKING';
      } else if (event.type === 'USER_OPENED_MY_GARDEN') {
        targetAnim = 'GREETING';
      } else if (event.type === 'USER_MILESTONE_CELEBRATION') {
        targetAnim = 'CELEBRATION';
      }

      const fullLine = event.plantName ? `${reactionText} (${event.plantName})` : reactionText;
      setFloatingBubbleText(fullLine);
      triggerTemporaryState(targetAnim, 4500);

      // Append contextual reaction message if it is a significant garden/scan milestone
      if (
        event.type === 'USER_ADDED_PLANT' ||
        event.type === 'USER_SCANNED_HEALTHY_PLANT' ||
        event.type === 'USER_SCANNED_DISEASED_PLANT' ||
        event.type === 'USER_COMPLETED_WATERING' ||
        event.type === 'USER_MILESTONE_CELEBRATION'
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: `evt-${Date.now()}`,
            sender: 'greeny',
            text: fullLine,
            sourceCategory: 'SAVED_GARDEN_MEMORY',
            animationState: targetAnim,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        if (!isOpen && mode === 'floating') {
          setUnreadCount((c) => c + 1);
        }
        speakWithGreeny(reactionText, targetAnim);
      }
    });
    return unsubscribe;
  }, [isOpen, mode, resetInactivitySleepTimer, speakWithGreeny, triggerTemporaryState]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  // Interactive 3D Character Touch Handlers (Part 11: Head Pat, Leaf Touch, Happy Tap, Wake Up)
  const handleHeadPat = useCallback(() => {
    resetInactivitySleepTimer();
    const line = pickContextualDialogue(customRef.current.language, 'headPat');
    setFloatingBubbleText(line);
    triggerTemporaryState('HAPPY', 3200);
    speakWithGreeny(line, 'HAPPY');
  }, [resetInactivitySleepTimer, speakWithGreeny, triggerTemporaryState]);

  const handleLeafTouch = useCallback(() => {
    resetInactivitySleepTimer();
    const line = pickContextualDialogue(customRef.current.language, 'leafTouch');
    setFloatingBubbleText(line);
    triggerTemporaryState('SURPRISED', 2600);
    speakWithGreeny(line, 'HAPPY');
  }, [resetInactivitySleepTimer, speakWithGreeny, triggerTemporaryState]);

  const handleHappyTap = useCallback(() => {
    resetInactivitySleepTimer();
    const line = pickContextualDialogue(customRef.current.language, 'happyTap');
    setFloatingBubbleText(line);
    triggerTemporaryState('CELEBRATION', 4000);
    speakWithGreeny(line, 'CELEBRATION');
  }, [resetInactivitySleepTimer, speakWithGreeny, triggerTemporaryState]);

  const handleWakeUp = useCallback(() => {
    resetInactivitySleepTimer();
    const line = pickContextualDialogue(customRef.current.language, 'wakeUp');
    setFloatingBubbleText(line);
    triggerTemporaryState('GREETING', 3600);
    speakWithGreeny(line, 'IDLE');
  }, [resetInactivitySleepTimer, speakWithGreeny, triggerTemporaryState]);

  const handleReplayLastVoice = useCallback(() => {
    const lastMsg = [...messages].reverse().find((m) => m.sender === 'greeny');
    const textToReplay = voiceControllerRef.current.getLastSpokenText() || lastMsg?.text || '';
    if (!textToReplay) return;
    speakWithGreeny(textToReplay, 'IDLE');
  }, [messages, speakWithGreeny]);

  // Gemini Live API (`gemini-3.8-live`) Real-Time Audio Playback
  const stopAllLiveAudioPlayback = () => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore
      }
    });
    activeSourcesRef.current = [];
    setSpeechAmplitude(0);
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
  };

  const play24kHzPcmChunk = (base64Pcm: string) => {
    if (!customRef.current.voiceEnabled) return;
    let outCtx = outputAudioCtxRef.current;
    if (!outCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      outCtx = new AudioCtx({ sampleRate: 24000 });
      outputAudioCtxRef.current = outCtx;
      nextStartTimeRef.current = outCtx.currentTime;
    }
    if (outCtx.state === 'suspended') {
      outCtx.resume();
    }

    const binaryStr = window.atob(base64Pcm);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    let rmsSum = 0;
    for (let i = 0; i < int16.length; i++) {
      const sample = int16[i] / 32768.0;
      float32[i] = sample;
      rmsSum += sample * sample;
    }
    const rms = Math.sqrt(rmsSum / Math.max(1, int16.length));
    const liveAmp = Math.min(1.0, rms * 4.2);
    setSpeechAmplitude(liveAmp);

    const audioBuffer = outCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const startAt = Math.max(outCtx.currentTime, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + audioBuffer.duration;
    activeSourcesRef.current.push(source);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0) {
        setSpeechAmplitude(0);
        setAnimationState('LISTENING');
      }
    };
  };

  const stopGeminiLiveSession = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    stopAllLiveAudioPlayback();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setLiveConnected(false);
    setAnimationState('IDLE');
    setLiveStatusText('Live Session Ended · Sweet Baby Plant Voice Ready');
  };

  const startGeminiLiveSession = async () => {
    if (liveConnected) {
      stopGeminiLiveSession();
      return;
    }

    try {
      setLiveStatusText('Connecting to gemini-3.8-live...');
      setAnimationState('THINKING');

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const plantContextParam = encodeURIComponent(
        plants.map((p) => `${p.name} (${p.species}, Health ${p.healthScore}%)`).join('; ')
      );
      const wsUrl = `${proto}//${window.location.host}/api/ai/live-ws?lang=${customization.language}&voice=${liveVoiceName}&plantContext=${plantContextParam}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'live_open') {
            setLiveConnected(true);
            setAnimationState('LISTENING');
            setLiveStatusText(`Live Voice Connected (${liveVoiceName}) — Speak to GREENY!`);

            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaStreamRef.current = stream;
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
              const inCtx = new AudioCtx({ sampleRate: 16000 });
              inputAudioCtxRef.current = inCtx;

              const source = inCtx.createMediaStreamSource(stream);
              const processor = inCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = processor;

              processor.onaudioprocess = (e) => {
                if (ws.readyState === WebSocket.OPEN) {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const b64 = float32ToPcm16Base64(inputData);
                  ws.send(JSON.stringify({ realtimeInput: { data: b64, mimeType: 'audio/pcm;rate=16000' } }));
                }
              };

              source.connect(processor);
              processor.connect(inCtx.destination);
            } catch {
              setLiveStatusText('Live Session Connected (Mic unavailable — type below to hear Live Audio!)');
            }
          } else if (msg.type === 'audio_chunk' && msg.data) {
            setAnimationState('SPEAKING');
            play24kHzPcmChunk(msg.data);
          } else if (msg.type === 'interrupted') {
            stopAllLiveAudioPlayback();
            setAnimationState('LISTENING');
          } else if (msg.type === 'transcript' && msg.text) {
            setLiveTranscriptPreview(msg.text);
            setMessages((prev) => [
              ...prev,
              {
                id: `live-${Date.now()}`,
                sender: 'greeny',
                text: msg.text,
                sourceCategory: 'GEMINI_AI',
                animationState: 'HAPPY',
                resolvedModel: 'gemini-3.8-live',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          } else if (msg.type === 'turn_complete') {
            if (activeSourcesRef.current.length === 0) {
              setSpeechAmplitude(0);
              setAnimationState('LISTENING');
            }
          } else if (msg.type === 'error') {
            setLiveStatusText(`Live API Note: ${msg.message}`);
            setAnimationState('SAD');
          }
        } catch {
          // ignore malformed ws packets
        }
      };

      ws.onerror = () => {
        setLiveStatusText('Live API WebSocket encountered a connection issue.');
      };

      ws.onclose = () => {
        setLiveConnected(false);
        setSpeechAmplitude(0);
      };
    } catch {
      setLiveStatusText('Could not start Live API session.');
    }
  };

  // Browser Speech Recognition (Part 3.C: Listening Animation)
  const startVoiceInput = () => {
    resetInactivitySleepTimer();
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setMessages((prev) => [
        ...prev,
        {
          id: `mic-note-${Date.now()}`,
          sender: 'greeny',
          text: 'Oopsie! Browser microphone speech recognition is not supported in this frame. You can type your question below or use the Live Voice button!',
          sourceCategory: 'WEBSITE_NAVIGATION_GUIDE',
          animationState: 'SURPRISED',
          timestamp: 'Just now',
        },
      ]);
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setAnimationState('IDLE');
      return;
    }

    const rec = new SpeechRec();
    rec.lang = customization.language === 'ta' ? 'ta-IN' : 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      setAnimationState('LISTENING');
    };

    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setInput(transcript);
        handleSendMessage(transcript);
      }
    };

    rec.onerror = () => {
      setIsListening(false);
      setAnimationState('IDLE');
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  useEffect(() => {
    return () => {
      stopGeminiLiveSession();
      voiceControllerRef.current.stopSpeaking(setSpeechAmplitude);
    };
  }, []);

  const handleSaveReplyToFirestore = async (msg: GreenyChatMessage) => {
    if (!auth.currentUser) {
      setSavedNoteBadge('Sign in with Google in the top bar to save notes to Firestore.');
      setTimeout(() => setSavedNoteBadge(null), 4000);
      return;
    }
    try {
      await saveBotanicalNoteToFirestore({
        userId: auth.currentUser.uid,
        plantName: plants[0]?.name || 'Sanctuary Specimen',
        noteText: msg.text.slice(0, 950),
        category: msg.sources && msg.sources.length > 0 ? 'Search Grounding' : 'Observation',
      });
      setSavedNoteBadge('Saved to Firebase Firestore (botanicalNotes)');
      setTimeout(() => setSavedNoteBadge(null), 3500);
    } catch {
      setSavedNoteBadge('Could not save note to Firestore.');
      setTimeout(() => setSavedNoteBadge(null), 3500);
    }
  };

  // Send Message with Strict Source Separation (Part 8 & Part 9)
  const handleSendMessage = async (overrideText?: string) => {
    const query = (overrideText ?? input).trim();
    if (!query) return;

    resetInactivitySleepTimer();

    const userMsg: GreenyChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      sourceCategory: 'GEMINI_AI',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentHistory = messages
      .filter((m) => m.sourceCategory === 'GEMINI_AI')
      .slice(-8)
      .map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAnimationState('THINKING');

    // Source 4: Predefined Website Navigation Guide (Immediate & Accurate Route Assistance)
    const navMatch = matchWebsiteNavigationIntent(query);
    if (navMatch) {
      const navReply =
        customization.language === 'ta' ? navMatch.dialogueTa : navMatch.dialogueEn;
      highlightTargetNavigationElement(navMatch.navHighlightId);
      const guideMsg: GreenyChatMessage = {
        id: `nav-${Date.now()}`,
        sender: 'greeny',
        text: navReply,
        sourceCategory: 'WEBSITE_NAVIGATION_GUIDE',
        animationState: 'HAPPY',
        navigationGuide: navMatch,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, guideMsg]);
      speakWithGreeny(navReply, 'HAPPY');
      return;
    }

    // Forward text into active Gemini Live API session if connected
    if (liveConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text: query }));
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/ai/greeny-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: query,
          history: currentHistory,
          language: customization.language,
          model: selectedModel,
          rolePersona,
          useSearchGrounding,
          plantContext: plants
            .map((p) => `${p.name} (${p.species}, Health ${p.healthScore}%, Soil: ${p.soilType || 'Organic Mix'})`)
            .join('; '),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errObj: any = new Error(
          data.error ||
            'Oopsie! GREENY is temporarily unable to connect to the Gemini AI service right now. Please try again!'
        );
        errObj.savedGardenContext = data.savedGardenContext;
        errObj.generalCareReference = data.generalCareReference;
        throw errObj;
      }

      const mappedState: GreenyAnimationState =
        data.emotionState === 'WARNING' || data.emotionState === 'SAD'
          ? 'SAD'
          : data.emotionState === 'SURPRISED'
          ? 'SURPRISED'
          : 'HAPPY';

      const replyText =
        data.reply ||
        pickContextualDialogue(customization.language, 'plantCare');

      const aiMsg: GreenyChatMessage = {
        id: `g-${Date.now()}`,
        sender: 'greeny',
        text: replyText,
        sourceCategory: 'GEMINI_AI',
        animationState: mappedState,
        suggestedAction: data.suggestedAction,
        resolvedModel: data.resolvedModel || selectedModel,
        usedBackupModel: Boolean(data.usedBackupModel),
        savedGardenContext: data.savedGardenContext,
        sources: Array.isArray(data.sources) ? data.sources : [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (!liveConnected) {
        speakWithGreeny(replyText, mappedState);
      }
    } catch (err: any) {
      // HTTP 503 / Service Unavailable: Never pretend the AI answered or mix raw JSON with saved plant advice!
      setAnimationState('SAD');
      const friendlyErrorText =
        customization.language === 'ta'
          ? 'அடடா! தற்போது AI சேவையைத் தொடர்புகொள்ள முடியவில்லை. உங்கள் உரையாடல் பாதுகாப்பாக உள்ளது — மீண்டும் முயற்சிக்கவும்!'
          : "Oopsie! I couldn't reach the Gemini AI service right now because of temporary high demand. Your question is safe — click Retry Question below!";

      const savedGardenSummary =
        err?.savedGardenContext ||
        (plants.length > 0
          ? `Your saved My Garden currently tracks ${plants.length} plants: ${plants
              .slice(0, 3)
              .map((p) => `${p.name} (${p.species}, Last Health Record: ${p.healthScore}%)`)
              .join(', ')}.`
          : undefined);

      const generalCareTip =
        err?.generalCareReference ||
        'General Reference Tip: Check the top 3–5 cm of soil with your finger before watering, provide bright indirect sunlight for tropical foliage, and ensure pots have unobstructed drainage holes.';

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'greeny',
          text: friendlyErrorText,
          sourceCategory: 'SERVICE_ERROR',
          animationState: 'SAD',
          isRetryableError: true,
          failedUserQuery: query,
          savedGardenContext: savedGardenSummary,
          generalCareReference: generalCareTip,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      if (!liveConnected) {
        speakWithGreeny(
          GREENY_DIALOGUE_LIBRARY[customization.language].events.USER_RECEIVED_ERROR,
          'SAD'
        );
      }
    }
  };

  // Mode 1: Floating 3D Companion Button & Expandable Assistant Panel
  if (mode === 'floating') {
    if (!isOpen) {
      return (
        <GreenyFloatingButton
          animationState={animationState}
          speechAmplitude={speechAmplitude}
          customization={customization}
          unreadCount={unreadCount}
          floatingBubbleText={floatingBubbleText}
          onDismissBubble={() => setFloatingBubbleText(null)}
          onOpenPanel={() => {
            setIsOpen(true);
            setUnreadCount(0);
            setFloatingBubbleText(null);
          }}
        />
      );
    }

    return (
      <GreenyAssistantPanel
        animationState={animationState}
        speechAmplitude={speechAmplitude}
        customization={customization}
        onUpdateCustomization={handleUpdateCustomization}
        availableVoices={availableVoices}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSendMessage={handleSendMessage}
        onStartVoiceInput={startVoiceInput}
        isListening={isListening}
        onReplayLastVoice={handleReplayLastVoice}
        onHeadPat={handleHeadPat}
        onLeafTouch={handleLeafTouch}
        onHappyTap={handleHappyTap}
        onWakeUp={handleWakeUp}
        onSaveToFirestore={handleSaveReplyToFirestore}
        onNavigate={onNavigate}
        onOpenFullStudio={
          onNavigate
            ? () => {
                setIsOpen(false);
                onNavigate('greeny');
              }
            : undefined
        }
        onMinimise={() => setIsOpen(false)}
        onClose={() => {
          const byeLine = pickContextualDialogue(customization.language, 'goodbye');
          setFloatingBubbleText(byeLine);
          setIsOpen(false);
        }}
        threadEndRef={threadEndRef}
      />
    );
  }

  // Mode 2: Full-Page 3D Companion Studio View
  const ALL_STATES: GreenyAnimationState[] = [
    'IDLE',
    'GREETING',
    'LISTENING',
    'THINKING',
    'SPEAKING',
    'HAPPY',
    'SAD',
    'SURPRISED',
    'SLEEPING',
    'CELEBRATION',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: 3D GREENY Character Viewport, Animation State Machine Dock & Customisation */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00C878]" />
                GREENY 3D — Your Little Garden Buddy
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/75">
                Interactive 3D Baby Plant · State: <span className="font-mono font-bold text-[#00C878]">{animationState}</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleHeadPat}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00C878]/15 border border-[#00C878]/40 text-xs font-bold text-emerald-900 dark:text-[#B7F76B] hover:bg-[#00C878] hover:text-[#071B12] transition-colors whitespace-nowrap shrink-0"
              >
                <Heart className="w-3.5 h-3.5" />
                Head Pat
              </button>
              <button
                type="button"
                onClick={handleLeafTouch}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00C878]/15 border border-[#00C878]/40 text-xs font-bold text-emerald-900 dark:text-[#B7F76B] hover:bg-[#00C878] hover:text-[#071B12] transition-colors whitespace-nowrap shrink-0"
              >
                <Smile className="w-3.5 h-3.5" />
                Wiggle Leaves
              </button>
              <button
                type="button"
                onClick={handleHappyTap}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00C878]/15 border border-[#00C878]/40 text-xs font-bold text-emerald-900 dark:text-[#B7F76B] hover:bg-[#00C878] hover:text-[#071B12] transition-colors whitespace-nowrap shrink-0"
              >
                <PartyPopper className="w-3.5 h-3.5" />
                Celebrate
              </button>
            </div>
          </div>

          {/* 3D WebGL Character Stage */}
          <GreenyCharacter3D
            animationState={animationState}
            speechAmplitude={speechAmplitude}
            customization={customization}
            size="studio"
            onHeadPat={handleHeadPat}
            onLeafTouch={handleLeafTouch}
            onHappyTap={handleHappyTap}
            onWakeUp={handleWakeUp}
          />

          {/* 10-State Animation Machine Selector Dock */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/65 mb-1.5">
              <span>10-State 3D Animation Machine (Click to Preview Any State)</span>
              {animationState === 'SLEEPING' && (
                <button
                  type="button"
                  onClick={handleWakeUp}
                  className="text-[#00C878] font-bold underline"
                >
                  Wake Up GREENY
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {ALL_STATES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    resetInactivitySleepTimer();
                    setAnimationState(st);
                    if (st === 'SPEAKING') {
                      speakWithGreeny(
                        pickContextualDialogue(customization.language, 'happy'),
                        'IDLE'
                      );
                    }
                  }}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    animationState === st
                      ? 'bg-[#00C878] text-[#071B12] font-bold'
                      : 'bg-slate-100 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2]/80 hover:border-[#00C878] border border-slate-200 dark:border-[#123D2A]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-Time Gemini Live API (`gemini-3.8-live`) Control Card */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#00C878]" />
              Real-Time Voice Stream (`gemini-3.8-live`)
            </h3>
            <span className="text-[11px] font-mono text-[#00C878]">Audio Lip-Sync Ready</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={liveVoiceName}
              onChange={(e) => setLiveVoiceName(e.target.value as any)}
              aria-label="Select Gemini Live Prebuilt Voice"
              className="bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
            >
              <option value="Zephyr">Voice: Zephyr</option>
              <option value="Kore">Voice: Kore</option>
              <option value="Puck">Voice: Puck</option>
            </select>

            <button
              type="button"
              onClick={startGeminiLiveSession}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                liveConnected
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-[#00C878] text-[#071B12] hover:bg-[#B7F76B]'
              }`}
            >
              <Radio className="w-4 h-4" />
              {liveConnected ? 'Disconnect Live Stream' : 'Start Live API Voice'}
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500 dark:text-[#B7F76B]/90">
            {liveStatusText}
          </div>
          {liveTranscriptPreview && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#071B12] border border-slate-200 dark:border-[#123D2A] text-xs text-slate-700 dark:text-[#F7F9F2]">
              {liveTranscriptPreview}
            </div>
          )}
        </div>

        {/* Voice, Language, 7 Environments & Accessories Settings */}
        <GreenySettings
          customization={customization}
          onUpdateCustomization={handleUpdateCustomization}
          availableVoices={availableVoices}
          onReplayLastVoice={handleReplayLastVoice}
        />
      </div>

      {/* Right Column: Multi-Source Conversation Studio & Website Navigation Guide */}
      <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#123D2A] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Chat with GREENY 3D · Separated AI, Garden Memory & Navigation Guide
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                Every response is clearly labeled by source: Gemini AI · Saved Garden Information · General Plant Care · Website Navigation
              </p>
            </div>
            {savedNoteBadge && (
              <span className="text-xs font-mono text-[#00C878]">{savedNoteBadge}</span>
            )}
          </div>

          {/* Model Tier Selector, Specialist Role & Live Search Grounding */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div>
              <label
                htmlFor="studio-model-select"
                className="block text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/60 mb-1"
              >
                Gemini Model (Auto Backup Failover)
              </label>
              <div className="relative flex items-center">
                <Cpu className="w-3.5 h-3.5 text-[#00C878] absolute left-2.5 pointer-events-none" />
                <select
                  id="studio-model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as GeminiChatModel)}
                  className="w-full pl-8 pr-2 py-2 rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-xs font-mono text-slate-900 dark:text-white"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Primary Free)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Backup Fast)</option>
                  <option value="gemini-4-argon">gemini-4-argon (Interactive)</option>
                  <option value="gemini-4-carbon">gemini-4-carbon (Deep Reasoning)</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="studio-persona-select"
                className="block text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/60 mb-1"
              >
                Companion Personality Mode
              </label>
              <select
                id="studio-persona-select"
                value={rolePersona}
                onChange={(e) => setRolePersona(e.target.value as BotanicalRolePersona)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-xs text-slate-900 dark:text-white"
              >
                <option value="GREENY Companion">GREENY Cute Garden Buddy</option>
                <option value="Pathology & Root Scientist">Dr. Chloris (Root & Pathology)</option>
                <option value="Climate & Irrigation Agronomist">Climate & Irrigation Buddy</option>
                <option value="Quick Triage Botanist">Rapid Triage Buddy</option>
              </select>
            </div>

            <div>
              <span className="block text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/60 mb-1">
                Live Web Grounding
              </span>
              <button
                type="button"
                onClick={() => setUseSearchGrounding((s) => !s)}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  useSearchGrounding
                    ? 'bg-[#00C878] text-[#071B12] border-[#00C878]'
                    : 'bg-slate-50 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2] border-slate-200 dark:border-[#123D2A]'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Google Search: {useSearchGrounding ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Interactive Website Guide Prompt Starters */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-mono text-slate-500 dark:text-[#F7F9F2]/60 flex items-center gap-1 mr-1">
              <HelpCircle className="w-3.5 h-3.5 text-[#00C878]" />
              Ask GREENY:
            </span>
            {[
              'How do I scan a plant?',
              'Where are my plants?',
              'How do I add a plant?',
              'My Ficus has yellow lower leaves — what should I check?',
              'வணக்கம் GREENY! என் துளசி செடியை எப்படி பராமரிப்பது?',
            ].map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(promptText)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#123D2A] text-[11px] text-slate-700 dark:text-[#F7F9F2] border border-slate-200 dark:border-[#00C878]/25 hover:border-[#00C878] transition-colors"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>

        {/* Main Conversation Component */}
        <GreenyConversation
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSendMessage={handleSendMessage}
          onStartVoiceInput={startVoiceInput}
          isListening={isListening}
          voiceEnabled={customization.voiceEnabled}
          onToggleVoice={() => handleUpdateCustomization({ voiceEnabled: !customization.voiceEnabled })}
          onReplayLastVoice={handleReplayLastVoice}
          language={customization.language}
          onSaveToFirestore={handleSaveReplyToFirestore}
          onNavigate={onNavigate}
          threadEndRef={threadEndRef}
          compact={false}
        />
      </div>
    </div>
  );
};
