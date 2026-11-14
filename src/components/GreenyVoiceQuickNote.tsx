import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Send, Volume2 } from 'lucide-react';
import { auth, saveBotanicalNoteToFirestore } from '../lib/firebase';
import { emitGreenyAppEvent } from './greeny/GreenyTypes';
import { ObservatoryCard } from './ui/ObservatoryPrimitives';

interface GreenyVoiceQuickNoteProps {
  onNoteAdded: () => void;
  authToken?: string | null;
}

export const GreenyVoiceQuickNote: React.FC<GreenyVoiceQuickNoteProps> = ({ onNoteAdded }) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          }
        }
        if (final) {
          setTranscript((prev) => (prev ? `${prev} ${final}` : final));
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      return () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      };
    }
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      setStatusMsg(
        'Browser speech recognition is unavailable here—you can type or edit your quick note directly below.'
      );
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setStatusMsg('Listening for your botanical care observation...');
      } catch (err) {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      }
    }
  };

  const handleSaveVoiceNote = async () => {
    if (!transcript.trim()) return;

    try {
      if (auth.currentUser) {
        await saveBotanicalNoteToFirestore({
          userId: auth.currentUser.uid,
          plantName: 'Greeny Voice Observation',
          noteText: transcript.trim(),
          category: 'Observation',
        });
        setStatusMsg('Voice observation synced to GREENY memory.');
      } else {
        setStatusMsg('Note captured locally. Sign in with Google to sync to Firebase Firestore.');
      }
      emitGreenyAppEvent({ type: 'USER_COMPLETED_WATERING', plantName: 'Garden' });
      setTranscript('');
      onNoteAdded();
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err) {
      console.error('Failed to save voice note:', err);
      setStatusMsg('Failed to save voice note to Firestore.');
    }
  };

  return (
    <ObservatoryCard padding="lg" className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A]">
            <Volume2 className="w-4 h-4" />
            <span>Voice-to-Text Quick Note</span>
          </p>
          <h3 className="text-lg sm:text-xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE] mt-0.5">
            Speak to GREENY: Field Observations
          </h3>
        </div>

        <button
          type="button"
          onClick={handleToggleListening}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-xs transition-all cursor-pointer ${
            isListening
              ? 'bg-[#FF806B] text-[#10251D] shadow-md'
              : 'bg-[#174C38] hover:bg-[#10251D] dark:bg-[#00D69A] dark:hover:bg-[#C7F36B] text-[#FAF7EE] dark:text-[#10251D]'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{isListening ? 'Stop Listening' : 'Speak to GREENY'}</span>
        </button>
      </div>

      <div className="space-y-3">
        <textarea
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Tap 'Speak to GREENY' or type an observation (e.g., 'Pruned yellowing lower leaves on Monstera and checked topsoil')..."
          className="w-full px-4 py-3 text-xs rounded-xl border border-[#174C38]/18 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] focus:outline-none focus:border-[#00D69A] leading-relaxed"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#4A665B] dark:text-[#B6CDB4] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00D69A] shrink-0" />
            <span>Transcribes speech directly into your synced botanical log.</span>
          </div>

          <button
            type="button"
            disabled={!transcript.trim()}
            onClick={handleSaveVoiceNote}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#174C38] hover:bg-[#10251D] dark:bg-[#00D69A] dark:hover:bg-[#C7F36B] disabled:opacity-45 text-[#FAF7EE] dark:text-[#10251D] font-display font-bold text-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Save Observation
          </button>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-[#00D69A]/14 border border-[#00D69A]/35 text-xs text-[#0F6B50] dark:text-[#00D69A] text-center font-medium">
            {statusMsg}
          </div>
        )}
      </div>
    </ObservatoryCard>
  );
};
