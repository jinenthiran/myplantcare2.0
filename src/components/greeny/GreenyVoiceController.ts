export interface VoiceOptionInfo {
  voiceURI: string;
  name: string;
  lang: string;
}

export class GreenyVoiceController {
  private amplitudeTimer: number | null = null;
  private isSpeaking = false;
  private lastSpokenText = '';
  private lastSpokenLang: 'en' | 'ta' = 'en';

  public getAvailableVoices(): VoiceOptionInfo[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }
    const rawVoices = window.speechSynthesis.getVoices() || [];
    return rawVoices.map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
    }));
  }

  public selectBestCuteVoice(language: 'en' | 'ta', preferredURI?: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) return null;

    if (preferredURI) {
      const exact = voices.find((v) => v.voiceURI === preferredURI);
      if (exact) return exact;
    }

    if (language === 'ta') {
      const tamilVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('ta')) ||
        voices.find((v) => v.name.toLowerCase().includes('tamil')) ||
        voices.find((v) => v.lang.toLowerCase().includes('in'));
      if (tamilVoice) return tamilVoice;
    }

    // Prefer warm, natural, friendly English voices (Samantha, Aria, Jenny, Google UK/US Female, Victoria, Karen)
    const friendlyKeywords = ['aria', 'jenny', 'samantha', 'zoe', 'victoria', 'google us english', 'natural', 'female'];
    const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    for (const kw of friendlyKeywords) {
      const match = englishVoices.find((v) => v.name.toLowerCase().includes(kw));
      if (match) return match;
    }

    return englishVoices[0] || voices[0] || null;
  }

  public stopSpeaking(onAmplitudeChange: (amp: number) => void, onStateEnd?: () => void): void {
    if (this.amplitudeTimer !== null) {
      window.clearInterval(this.amplitudeTimer);
      this.amplitudeTimer = null;
    }
    this.isSpeaking = false;
    onAmplitudeChange(0);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    onStateEnd?.();
  }

  public speakText(params: {
    text: string;
    language: 'en' | 'ta';
    voiceEnabled: boolean;
    speechRate: number;
    preferredVoiceURI?: string;
    onStartSpeaking: () => void;
    onAmplitudeChange: (amplitude: number) => void;
    onStopSpeaking: () => void;
  }): void {
    const {
      text,
      language,
      voiceEnabled,
      speechRate,
      preferredVoiceURI,
      onStartSpeaking,
      onAmplitudeChange,
      onStopSpeaking,
    } = params;

    this.lastSpokenText = text;
    this.lastSpokenLang = language;

    this.stopSpeaking(onAmplitudeChange);

    if (!voiceEnabled || !text.trim()) {
      onStopSpeaking();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onStopSpeaking();
      return;
    }

    try {
      const cleanText = text.replace(/[*_#`~]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const chosenVoice = this.selectBestCuteVoice(language, preferredVoiceURI);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
      utterance.lang = language === 'ta' ? 'ta-IN' : 'en-US';
      // Warm, youthful, friendly baby-plant pitch & gentle speed
      utterance.pitch = language === 'ta' ? 1.12 : 1.22;
      utterance.rate = Math.max(0.8, Math.min(1.35, speechRate));

      // Pre-compute syllable & pause cadence envelope from text so mouth closes on punctuation pauses
      const words = cleanText.split(/\s+/).filter(Boolean);
      let charIndex = 0;

      const startCadenceEnvelope = () => {
        if (this.amplitudeTimer !== null) {
          window.clearInterval(this.amplitudeTimer);
        }
        let step = 0;
        this.amplitudeTimer = window.setInterval(() => {
          if (!this.isSpeaking) {
            onAmplitudeChange(0);
            return;
          }
          step += 1;
          // Check current character around speech cursor for punctuation pauses
          const currentChar = cleanText[Math.min(cleanText.length - 1, charIndex + Math.floor(step * 0.6))] || 'a';
          if (/[.,!?;:—\-]/.test(currentChar)) {
            onAmplitudeChange(0.04);
          } else if (/\s/.test(currentChar)) {
            onAmplitudeChange(0.14);
          } else {
            // Vowel-driven mouth opening
            const isOpenVowel = /[aeiouAEIOUஆஈஊஏஐஓஔஅஇஉஎஒ]/.test(currentChar);
            const base = isOpenVowel ? 0.72 : 0.42;
            const modulation = Math.abs(Math.sin(step * 0.75)) * 0.25;
            onAmplitudeChange(Math.min(1.0, base + modulation));
          }
        }, 55);
      };

      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (typeof event.charIndex === 'number') {
          charIndex = event.charIndex;
        }
      };

      utterance.onstart = () => {
        this.isSpeaking = true;
        onStartSpeaking();
        startCadenceEnvelope();
      };

      utterance.onend = () => {
        this.stopSpeaking(onAmplitudeChange, onStopSpeaking);
      };

      utterance.onerror = () => {
        this.stopSpeaking(onAmplitudeChange, onStopSpeaking);
      };

      // Fallback start in case browser speechSynthesis doesn't fire onstart immediately
      this.isSpeaking = true;
      onStartSpeaking();
      startCadenceEnvelope();
      window.speechSynthesis.speak(utterance);

      // Safety timeout based on word count so mouth never stays stuck open if browser TTS hangs
      const estimatedDurationMs = Math.max(2200, Math.min(18000, words.length * 420));
      window.setTimeout(() => {
        if (this.isSpeaking && !window.speechSynthesis.speaking) {
          this.stopSpeaking(onAmplitudeChange, onStopSpeaking);
        }
      }, estimatedDurationMs);
    } catch {
      this.stopSpeaking(onAmplitudeChange, onStopSpeaking);
    }
  }

  public replayLastResponse(params: {
    voiceEnabled: boolean;
    speechRate: number;
    preferredVoiceURI?: string;
    onStartSpeaking: () => void;
    onAmplitudeChange: (amplitude: number) => void;
    onStopSpeaking: () => void;
  }): boolean {
    if (!this.lastSpokenText) return false;
    this.speakText({
      ...params,
      text: this.lastSpokenText,
      language: this.lastSpokenLang,
    });
    return true;
  }

  public getLastSpokenText(): string {
    return this.lastSpokenText;
  }
}
