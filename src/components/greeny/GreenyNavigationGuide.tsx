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
    keywords: /\b(watering\s+help|when\s+to\s+water|watering\s+schedule|soil\s+calculator|iot\s+irrigation|weather)\b/i,
    match: {
      targetView: 'intelligence',
      subTarget: 'watering',
      navHighlightId: 'nav-ai-intelligence',
      routeTitle: 'Smart Watering & Soil Intelligence',
      steps: [
        'Click "AI Intelligence" in the top bar.',
        'Select the "Smart Watering" or "Soil & NPK Lab" tool.',
        'Check your live weather evapotranspiration and exact ml watering volume!',
      ],
      dialogueEn:
        "Is our little friend thirsty? Let's open Smart Watering & Soil Intelligence to check the exact water schedule!",
      dialogueTa:
        'நம்ம செடிக்கு எவ்வளவு தண்ணீர் தேவை என்று பார்க்க "AI Intelligence" பகுதிக்குச் செல்வோம்!',
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
  el.classList.add('ring-2', 'ring-[#B7F76B]', 'ring-offset-2');
  window.setTimeout(() => {
    el.classList.remove('ring-2', 'ring-[#B7F76B]', 'ring-offset-2');
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
    <div className="mt-2.5 p-3.5 rounded-xl border border-[#00C878]/40 bg-[#071B12]/90 text-[#F7F9F2] space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#B7F76B]">
          <Compass className="w-3.5 h-3.5 text-[#00C878]" />
          Website Navigation Guide · {guide.routeTitle}
        </span>
      </div>

      <ol className="space-y-1.5 text-xs text-[#F7F9F2]/90">
        {guide.steps.map((step, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00C878] shrink-0 mt-0.5" />
            <span>
              <strong className="text-[#B7F76B]">Step {idx + 1}:</strong> {step}
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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00C878] text-[#071B12] text-xs font-bold hover:bg-[#B7F76B] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Open {guide.routeTitle}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => highlightTargetNavigationElement(guide.navHighlightId)}
            className="px-3 py-1.5 rounded-lg border border-[#00C878]/40 text-[#B7F76B] text-xs font-semibold hover:bg-[#123D2A] transition-colors whitespace-nowrap shrink-0"
          >
            Highlight Menu Item
          </button>
        </div>
      )}
    </div>
  );
};
