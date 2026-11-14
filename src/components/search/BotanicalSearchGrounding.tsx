import React, { useState } from 'react';
import {
  Search,
  Globe,
  ExternalLink,
  Sparkles,
  BookmarkPlus,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { auth, saveBotanicalNoteToFirestore } from '../../lib/firebase';

interface BotanicalSearchGroundingProps {
  initialQuery?: string;
  authToken?: string | null;
  onNoteSaved?: () => void;
  className?: string;
}

const QUICK_SEARCH_PROMPTS = [
  'Best organic treatment for powdery mildew on roses',
  'Optimal light and watering schedule for Monstera deliciosa indoors',
  'Companion planting benefits of Sacred Tulsi in home gardens',
  'How to identify nitrogen deficiency vs overwatering in pothos',
];

export const BotanicalSearchGrounding: React.FC<BotanicalSearchGroundingProps> = ({
  initialQuery = '',
  authToken,
  onNoteSaved,
  className = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    answer: string;
    sources: { uri: string; title: string }[];
    model: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSearch = async (searchQueryToRun?: string) => {
    const q = (searchQueryToRun !== undefined ? searchQueryToRun : query).trim();
    if (!q) return;

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
    setSavedSuccess(false);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const rawErr = String(data?.error || 'Live botanical search is temporarily busy.');
        const cleanMsg = rawErr.trim().startsWith('{')
          ? 'Live Gemini search rate limit reached. Please wait a few seconds and retry.'
          : rawErr;
        if (res.status === 429 || res.status === 503) {
          console.warn('Search grounding notice:', cleanMsg);
        } else {
          console.error('Search grounding error:', cleanMsg);
        }
        setErrorMsg(cleanMsg);
        return;
      }

      setResult(data);
    } catch (err: any) {
      console.warn('Search grounding request interrupted:', err?.message || err);
      setErrorMsg('Unable to reach live search right now. Please retry in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!result || !auth.currentUser) return;
    try {
      await saveBotanicalNoteToFirestore({
        userId: auth.currentUser.uid,
        plantName: 'Botanical Search Research',
        noteText: `Query: ${query}\n\nSummary:\n${result.answer.slice(0, 700)}...`,
        category: 'Search Grounding',
      });
      setSavedSuccess(true);
      if (onNoteSaved) onNoteSaved();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.warn('Failed to save botanical note:', err);
    }
  };

  return (
    <div
      className={`p-6 sm:p-7 rounded-2xl border border-[#B6CDB4]/55 dark:border-[#174C38]/70 bg-white dark:bg-[#153026] shadow-sm space-y-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-[#174C38]/10 dark:bg-[#00D69A]/15 text-[#174C38] dark:text-[#00D69A] border border-[#174C38]/25 dark:border-[#00D69A]/35">
            <Globe className="w-3.5 h-3.5" />
            <span>GOOGLE SEARCH GROUNDING • GEMINI-4-HYDROGEN</span>
          </div>
          <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-white">
            Live Botanical & Horticultural Research
          </h3>
          <p className="text-xs text-[#10251D]/65 dark:text-[#B6CDB4]">
            Query up-to-date botanical research, weather impacts, and disease alerts grounded in real-time Google Search data.
          </p>
        </div>

        {result && auth.currentUser && (
          <button
            type="button"
            onClick={handleSaveToFirestore}
            disabled={savedSuccess}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              savedSuccess
                ? 'bg-[#00D69A] text-[#10251D]'
                : 'bg-[#174C38]/10 dark:bg-[#10251D]/70 hover:bg-[#174C38]/15 dark:hover:bg-[#10251D] text-[#10251D] dark:text-white border border-[#B6CDB4]/40 dark:border-[#174C38]'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved to Firestore Notes</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save to Notes</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Query Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#10251D]/55 dark:text-[#B6CDB4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask any plant care, disease, or agricultural question..."
            className="w-full pl-10 pr-4 py-3 rounded-xl text-xs bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/55 dark:border-[#174C38] text-[#10251D] dark:text-white placeholder:text-[#10251D]/45 dark:placeholder:text-[#B6CDB4]/50 focus:outline-none focus:border-[#00D69A]"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-5 py-3 rounded-xl font-semibold text-xs bg-[#174C38] hover:bg-[#10251D] dark:bg-[#00D69A] dark:hover:bg-[#C7F36B] text-white dark:text-[#10251D] transition-all disabled:opacity-50 whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Grounding...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Search</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Prompts */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-medium text-[#10251D]/65 dark:text-[#B6CDB4]">Suggested:</span>
        {QUICK_SEARCH_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setQuery(prompt);
              handleSearch(prompt);
            }}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D]/80 hover:bg-[#00D69A]/15 text-[#10251D] dark:text-white border border-[#B6CDB4]/45 dark:border-[#174C38] transition-colors text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Error Feedback */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[#FF806B]/12 border border-[#FF806B]/40 text-[#9F2B1A] dark:text-[#FF806B] text-xs flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#FF806B]" />
            <span>{errorMsg}</span>
          </div>
          {query.trim() && (
            <button
              type="button"
              onClick={() => handleSearch()}
              className="px-3 py-1 rounded-lg bg-[#FF806B]/20 hover:bg-[#FF806B]/30 font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Grounded Result Display */}
      {result && (
        <div className="p-5 rounded-xl bg-[#FAF7EE] dark:bg-[#10251D] border border-[#B6CDB4]/45 dark:border-[#174C38]/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#174C38] dark:text-[#00D69A]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grounded with Google Search tool</span>
            </span>
            <span className="opacity-80">Model: {result.model}</span>
          </div>

          <div className="text-xs sm:text-sm text-[#10251D] dark:text-[#FAF7EE] leading-relaxed whitespace-pre-wrap">
            {result.answer}
          </div>

          {result.sources && result.sources.length > 0 && (
            <div className="pt-3 border-t border-[#B6CDB4]/35 dark:border-[#174C38]/70 space-y-2">
              <div className="text-[11px] font-semibold text-[#10251D] dark:text-white flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#174C38] dark:text-[#00D69A]" />
                <span>Grounding Sources ({result.sources.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-white dark:bg-[#153026] border border-[#B6CDB4]/50 dark:border-[#174C38] text-[#174C38] dark:text-[#00D69A] hover:border-[#00D69A] transition-colors"
                  >
                    <span className="max-w-[200px] truncate">{src.title || src.uri}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
