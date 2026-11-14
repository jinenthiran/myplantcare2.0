import React from 'react';
import { Compass, ArrowRight, CheckCircle2 } from 'lucide-react';
import { NavigationGuideMatch } from './GreenyTypes';

const NAVIGATION_GUIDE_DATABASE: Array<{
  keywords: RegExp;
  match: NavigationGuideMatch;
}> = [
  {
    keywords: /\b(how\s+do\s+i\s+scan|scan\s+a\s+plant|scan\s+my\s+plant|plant\s+doctor|diagnos|disease\s+scan|upload\s+a\s+picture|camera\s+scan)\b/i,
    match: {
      targetView: 'diagnostics',
      subTarget: 'doctor',
      navHighlightId: 'nav-plant-doctor',
      routeTitle: 'AI Plant Doctor & Scanner',
      steps: [
        'Click "Plant Doctor" in the top bar or workspace toolbar.',
        'Choose "Live Camera Scanner" or "Upload Photograph" (JPG, PNG, WEBP).',
        'Press "Scan Plant Now" to identify your plant and inspect leaf health!',
      ],
      dialogueEn:
        "Easyyy! Click Plant Doctor and upload or capture a picture of your plant. I'll help you understand it!",
      dialogueTa:
        'மிகவும் எளிது! "Plant Doctor" பகுதியைத் திறந்து உங்கள் செடியின் புகைப்படத்தை பதிவேற்றுங்கள். நான் அதைப் புரிந்துகொள்ள உதவுகிறேன்!',
    },
  },
  {
    keywords: /\b(identify\s+a\s+plant|what\s+plant\s+is\s+this|species\s+id|identification\s+studio)\b/i,
    match: {
      targetView: 'diagnostics',
      subTarget: 'identify',
      navHighlightId: 'nav-identify-studio',
      routeTitle: 'Plant Identification Studio',
      steps: [
        'Open "Identify Studio" in the workspace bar.',
        'Snap or upload a clear photo of the leaves or flowers.',
        'View the species name, scientific taxonomy, and care guide!',
      ],
      dialogueEn:
        "Ooh, let's discover its name! Open Identify Studio and upload a clear leaf photo so we can identify it together!",
      dialogueTa:
        'நம்ம செடியின் பெயரைக் கண்டுபிடிப்போமா! "Identify Studio" திறந்து இலையின் புகைப்படத்தை பதிவேற்றுங்கள்!',
    },
  },
  {
    keywords: /\b(where\s+are\s+my\s+plants|my\s+garden|check\s+my\s+garden|saved\s+plants|my\s+sanctuary)\b/i,
    match: {
      targetView: 'sanctuary',
      subTarget: 'memory',
      navHighlightId: 'nav-my-sanctuary',
      routeTitle: 'My Garden & Plant Sanctuary',
      steps: [
        'Click "My Sanctuary" in the top bar or "My Garden & 2D Map" in the toolbar.',
        'Browse all your saved plants, health scores, and Growth Trends charts.',
        'Click any plant card to log watering or growth updates!',
      ],
      dialogueEn:
        "Let's visit My Garden! All your little green friends are waiting there!",
      dialogueTa:
        'நம்ம தோட்டத்திற்குச் செல்வோம்! உங்கள் பச்சை நண்பர்கள் அனைவரும் அங்கே காத்திருக்கிறார்கள்!',
    },
  },
  {
    keywords: /\b(how\s+do\s+i\s+add\s+a\s+plant|add\s+a\s+plant|add\s+new\s+plant|register\s+a\s+plant)\b/i,
    match: {
      targetView: 'sanctuary',
      subTarget: 'memory',
      navHighlightId: 'nav-my-sanctuary',
      routeTitle: 'Add a Plant in My Garden',
      steps: [
        'Open "My Garden & 2D Map" (My Sanctuary).',
        'Switch to the "Plant Memory & Profiles" tab.',
        'Fill in your new plant’s name, species, and pot size, then tap "Add Plant to Memory"!',
      ],
      dialogueEn:
        "Just open My Garden and tap Add Plant. It's super easy!",
      dialogueTa:
        'My Garden பகுதியைத் திறந்து "Add Plant" பொத்தானை அழுத்துங்கள். அது மிகவும் எளிது!',
    },
  },
  {
    keywords: /\b(3d\s+garden|virtual\s+garden|3d\s+conservatory|arrange\s+plants\s+in\s+3d)\b/i,
    match: {
      targetView: 'virtual-3d',
      navHighlightId: 'nav-3d-garden',
      routeTitle: '3D Virtual Garden Conservatory',
      steps: [
        'Click "3D Garden" in the top navigation bar.',
        'Orbit and zoom around your 3D botanical conservatory.',
        'Use the bottom dock to add 3D specimens and switch pot finishes!',
      ],
      dialogueEn:
        "Yayyy! Let's step inside our 3D Virtual Garden where you can arrange and admire 3D plants!",
      dialogueTa:
        'வாருங்கள்! நம்ம 3D Virtual Garden-க்குள் சென்று செடிகளை முப்பரிமாணத்தில் வடிவமைப்போம்!',
    },
  },
  {
    keywords: /\b(watering\s+help|when\s+to\s+water|watering\s+schedule|soil\s+calculator|iot\s+irrigation|weather|ai\s+tools|plant\s+safety|pruning|repotting|weed)\b/i,
    match: {
      targetView: 'intelligence',
      subTarget: 'watering-doctor',
      navHighlightId: 'intelligence',
      routeTitle: 'AI Plant Intelligence Centre (/ai-tools)',
      steps: [
        'Click "AI Intelligence" in the top bar or mobile drawer to open /ai-tools.',
        'Pick any of the 19 dedicated camera-powered AI tools (e.g., Watering Doctor, Soil Analyser, Pruning Guide).',
        'Capture or upload a plant photo and tap "Analyse Plant" for structured botanical guidance!',
      ],
      dialogueEn:
        "Let's open our 19 Camera-Powered AI Plant Tools! Each tool opens its own dedicated workspace with camera scanning and tailored advice!",
      dialogueTa:
        'நம்ம 19 கேமரா AI தாவர கருவிகளைத் திறப்போம்! ஒவ்வொரு கருவிக்கும் தனிப் பணியிடம் உள்ளது!',
    },
  },
];

export function matchWebsiteNavigationIntent(query: string): NavigationGuideMatch | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  for (const item of NAVIGATION_GUIDE_DATABASE) {
    if (item.keywords.test(trimmed)) {
      return item.match;
    }
  }
  return null;
}

export function highlightTargetNavigationElement(navHighlightId: string): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(`[data-greeny-nav="${navHighlightId}"]`) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  el.classList.add('ring-2', 'ring-[#00D69A]', 'ring-offset-2');
  window.setTimeout(() => {
    el.classList.remove('ring-2', 'ring-[#00D69A]', 'ring-offset-2');
  }, 4000);
}

interface GreenyNavigationGuideCardProps {
  guide: NavigationGuideMatch;
  onNavigate?: (view: NavigationGuideMatch['targetView'], subTarget?: string) => void;
}

export const GreenyNavigationGuideCard: React.FC<GreenyNavigationGuideCardProps> = ({
  guide,
  onNavigate,
}) => {
  return (
    <div className="mt-2.5 p-3.5 rounded-xl border border-[#00D69A]/40 bg-[#10251D] text-[#FAF7EE] space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#C7F36B]">
          <Compass className="w-3.5 h-3.5 text-[#00D69A]" />
          Website Navigation Guide · {guide.routeTitle}
        </span>
      </div>

      <ol className="space-y-1.5 text-xs text-[#FAF7EE]/90">
        {guide.steps.map((step, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00D69A] shrink-0 mt-0.5" />
            <span>
              <strong className="text-[#C7F36B]">Step {idx + 1}:</strong> {step}
            </span>
          </li>
        ))}
      </ol>

      {onNavigate && (
        <div className="pt-1 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              highlightTargetNavigationElement(guide.navHighlightId);
              onNavigate(guide.targetView, guide.subTarget);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00D69A] text-[#10251D] text-xs font-bold hover:bg-[#C7F36B] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Open {guide.routeTitle}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => highlightTargetNavigationElement(guide.navHighlightId)}
            className="px-3 py-1.5 rounded-lg border border-[#00D69A]/40 text-[#B6CDB4] text-xs font-semibold hover:bg-[#174C38] hover:text-[#FAF7EE] transition-colors whitespace-nowrap shrink-0"
          >
            Highlight Menu Item
          </button>
        </div>
      )}
    </div>
  );
};
