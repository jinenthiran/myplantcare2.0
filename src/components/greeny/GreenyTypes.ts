export type GreenyAnimationState =
  | 'IDLE'
  | 'GREETING'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'HAPPY'
  | 'SAD'
  | 'SURPRISED'
  | 'SLEEPING'
  | 'CELEBRATION';

export type GreenyEnvironmentType =
  | 'floating-botanical'
  | 'tiny-garden'
  | 'flower-meadow'
  | 'magical-forest'
  | 'greenhouse'
  | 'sunny-balcony'
  | 'rainy-garden';

export type GreenyLeafColor = 'mint' | 'pastel' | 'emerald' | 'lime';

export type GreenyFlowerStyle = 'daisy' | 'lotus' | 'sunflower' | 'none';

export type GreenyAccessoryType = 'gold-emblem' | 'dewdrop-halo' | 'bow-ribbon' | 'none';

export interface GreenyCustomizationSettings {
  leafColor: GreenyLeafColor;
  flowerStyle: GreenyFlowerStyle;
  accessory: GreenyAccessoryType;
  environment: GreenyEnvironmentType;
  backgroundEffectsEnabled: boolean;
  reducedMotion: boolean;
  voiceEnabled: boolean;
  language: 'en' | 'ta';
  speechRate: number;
  selectedVoiceURI: string;
}

export type ResponseSourceCategory =
  | 'GEMINI_AI'
  | 'SAVED_GARDEN_MEMORY'
  | 'GENERAL_PLANT_CARE'
  | 'WEBSITE_NAVIGATION_GUIDE'
  | 'SERVICE_ERROR';

export interface NavigationGuideMatch {
  targetView: 'home' | 'diagnostics' | 'virtual-3d' | 'intelligence' | 'greeny' | 'sanctuary' | 'ecosystem';
  subTarget?: string;
  navHighlightId: string;
  routeTitle: string;
  steps: string[];
  dialogueEn: string;
  dialogueTa: string;
}

export interface GreenyChatMessage {
  id: string;
  sender: 'greeny' | 'user';
  text: string;
  sourceCategory: ResponseSourceCategory;
  animationState?: GreenyAnimationState;
  suggestedAction?: string;
  resolvedModel?: string;
  usedBackupModel?: boolean;
  savedGardenContext?: string;
  generalCareReference?: string;
  navigationGuide?: NavigationGuideMatch;
  isRetryableError?: boolean;
  failedUserQuery?: string;
  sources?: Array<{ uri: string; title: string }>;
  timestamp: string;
}

export type GreenyAppEventType =
  | 'USER_ADDED_PLANT'
  | 'USER_SCANNED_HEALTHY_PLANT'
  | 'USER_SCANNED_DISEASED_PLANT'
  | 'USER_COMPLETED_WATERING'
  | 'USER_FORGOT_REMINDER'
  | 'USER_OPENED_MY_GARDEN'
  | 'USER_ASKED_QUESTION'
  | 'USER_RECEIVED_ERROR'
  | 'USER_MILESTONE_CELEBRATION';

export interface GreenyAppEventPayload {
  type: GreenyAppEventType;
  plantName?: string;
  detail?: string;
}

type GreenyEventListener = (event: GreenyAppEventPayload) => void;
const listeners = new Set<GreenyEventListener>();

export function emitGreenyAppEvent(event: GreenyAppEventPayload): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeGreenyAppEvents(listener: GreenyEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface GreenyAskRequestPayload {
  toolName: string;
  plantName?: string;
  headline: string;
  severity: string;
  summaryPrompt: string;
}

type GreenyAskListener = (req: GreenyAskRequestPayload) => void;
const askListeners = new Set<GreenyAskListener>();

export function emitGreenyAskRequest(req: GreenyAskRequestPayload): void {
  askListeners.forEach((listener) => {
    try {
      listener(req);
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeGreenyAskRequests(listener: GreenyAskListener): () => void {
  askListeners.add(listener);
  return () => {
    askListeners.delete(listener);
  };
}

export const GREENY_DIALOGUE_LIBRARY = {
  en: {
    firstGreeting: "Yayyy! You're here! Welcome to MyPlantCare! I'm GREENY, your little gardening buddy!",
    dailyGreetings: [
      "Heyyy! I'm GREENY! Let's grow something beautiful!",
      "Good day, plant friend! My little leaves are soaked in sunshine and ready to help!",
      "Hello there! Let's check on our leafy family together!",
    ],
    happy: [
      "Yippee! That makes my little leaves dance!",
      "Yayyy! My crown flower is blooming so wide right now!",
      "Hehehe! Nothing makes a baby plant happier than healthy green leaves!",
    ],
    thinking: [
      "Hmmm... let me think with my tiny plant brain!",
      "Ooh! That's a good question! Let me think!",
      "Wiggling my little roots... searching for the best botanical answer!",
    ],
    success: [
      "Yayyy! We did it!",
      "Hooray! Another green victory for our garden!",
    ],
    plantCare: [
      "Remember, every little plant needs a little love!",
      "Gentle sunlight, breathable soil, and patient watering make happy roots!",
    ],
    watering: [
      "Is our little friend thirsty? Let's check the soil!",
      "Splish splash! Your plant has received its water!",
    ],
    goodbye: [
      "Bye-bye! Keep growing and keep smiling!",
      "See you soon! I'll keep wiggling my leaves here until you come back!",
    ],
    headPat: [
      "Hehehe! Head pats feel like warm morning sunshine! Thank you!",
      "Aww, that tickles my little sprout head! Yayyy!",
    ],
    leafTouch: [
      "Wiggle wiggle! You touched my fresh green leaves!",
      "Ooh! My little leaves love a gentle breeze and a friendly tap!",
    ],
    happyTap: [
      "Wheee! Jumping for joy! You're the best gardening buddy ever!",
      "Boing boing! Look how high a tiny baby plant can bounce!",
    ],
    wakeUp: [
      "*Yaaawn*... Stretchhh! Good morning! Did I doze off in the soil?",
      "Ooh! I'm awake, I'm awake! My leaves are stretched and ready to help!",
    ],
    events: {
      USER_ADDED_PLANT: "Yay! We have a new green friend! What shall we name it?",
      USER_SCANNED_HEALTHY_PLANT: "Wowww! Your plant looks happy! You're doing a wonderful job!",
      USER_SCANNED_DISEASED_PLANT:
        "Oh no! Let's take a closer look at our little friend. I'll help you understand what might be wrong.",
      USER_COMPLETED_WATERING: "Splish splash! Your plant has received its water!",
      USER_FORGOT_REMINDER: "Oops! We have a little gardening task waiting for us!",
      USER_OPENED_MY_GARDEN: "Welcome back! Let's see how our little green friends are doing!",
      USER_ASKED_QUESTION: "Ooh! That's a good question! Let me think!",
      USER_RECEIVED_ERROR: "Oopsie! Something went wrong. Let's try again!",
      USER_MILESTONE_CELEBRATION: "Yayyy! Look at all these confetti leaves! Your garden is thriving!",
    },
  },
  ta: {
    firstGreeting: "வணக்கம்! நான் GREENY! நம்ம தோட்டத்தை அழகாக வளர்ப்போமா? (Yayyy! Welcome to MyPlantCare!)",
    dailyGreetings: [
      "வணக்கம்! நான் GREENY! நம்ம தோட்டத்தை அழகாக வளர்ப்போமா?",
      "இனிய நாள்! நம்ம சின்ன செடிகளை இன்று அன்போடு கவனிப்போமா?",
    ],
    happy: [
      "அருமை! நம்ம செடி ரொம்ப அழகா வளருது!",
      "ஆஹா! என் சின்ன இலைகள் மகிழ்ச்சியில் ஆடுகின்றன!",
    ],
    thinking: [
      "ஒரு நிமிஷம்... நான் யோசிச்சிட்டு சொல்றேன்!",
      "அருமையான கேள்வி! என் சின்ன தாவர மூளையால் யோசிக்கிறேன்!",
    ],
    success: [
      "சூப்பர்! நாம சாதிச்சுட்டோம்!",
      "மிகவும் அருமை! நம்ம தோட்டம் செழிப்பாக வளர்கிறது!",
    ],
    plantCare: [
      "ஒவ்வொரு சின்ன செடிக்கும் கொஞ்சம் அன்பும் கவனிப்பும் தேவை!",
      "நல்ல வெளிச்சமும் சரியான ஈரப்பதமும் செடிகளுக்கு மிகவும் பிடிக்கும்!",
    ],
    watering: [
      "நம்ம சின்ன நண்பனுக்கு தாகமா இருக்கா? மண்ணை தொட்டுப் பார்ப்போம்!",
      "ஜல் ஜல்! உங்க செடிக்குத் தேவையான தண்ணீர் கிடைத்துவிட்டது!",
    ],
    goodbye: [
      "போயிட்டு வாங்க! செடிகளை அன்போடு பார்த்துக்கோங்க!",
      "மீண்டும் சந்திப்போம்! எப்போதும் புன்னகையோடு இருங்கள்!",
    ],
    headPat: [
      "ஹிஹி! என் தலையை வருடுவது காலை வெயில் போல இதமாக இருக்கிறது!",
    ],
    leafTouch: [
      "கிச்சு கிச்சு! என் பச்சை இலைகள் அழகாக ஆடுகின்றன!",
    ],
    happyTap: [
      "யப்பீ! உற்சாகத்தில் நான் துள்ளிக்குதிக்கிறேன்!",
    ],
    wakeUp: [
      "ஆஹா... கொட்டாவி! நான் கொஞ்சம் தூங்கிட்டேனா? இப்போ தயாராகிவிட்டேன்!",
    ],
    events: {
      USER_ADDED_PLANT: "ஆஹா! நமக்கு ஒரு புதிய பச்சை நண்பன் கிடைத்துவிட்டான்!",
      USER_SCANNED_HEALTHY_PLANT: "வாவ்! உங்க செடி ரொம்ப ஆரோக்கியமாகவும் மகிழ்ச்சியாகவும் இருக்கு!",
      USER_SCANNED_DISEASED_PLANT:
        "அச்சச்சோ! நம்ம சின்ன செடிக்கு என்ன ஆச்சுன்னு கவனமாகப் பார்ப்போம். நான் உங்களுக்கு உதவுகிறேன்.",
      USER_COMPLETED_WATERING: "ஜல் ஜல்! உங்க செடிக்குத் தேவையான தண்ணீர் கிடைத்துவிட்டது!",
      USER_FORGOT_REMINDER: "அடடா! நம்ம தோட்டத்தில் ஒரு சிறிய பராமரிப்பு வேலை காத்திருக்கிறது!",
      USER_OPENED_MY_GARDEN: "நல்வரவு! நம்ம பச்சை நண்பர்கள் எப்படி இருக்கிறார்கள் என்று பார்ப்போம்!",
      USER_ASKED_QUESTION: "ஒரு நிமிஷம்... நான் யோசிச்சிட்டு சொல்றேன்!",
      USER_RECEIVED_ERROR: "அடடா! சிறிய தடங்கல் ஏற்பட்டுவிட்டது. மீண்டும் முயற்சி செய்வோம்!",
      USER_MILESTONE_CELEBRATION: "அருமை! நம்ம செடி ரொம்ப அழகா வளருது! கொண்டாடுவோம்!",
    },
  },
};

export function pickContextualDialogue(
  language: 'en' | 'ta',
  category: keyof typeof GREENY_DIALOGUE_LIBRARY['en'],
  lastText?: string
): string {
  const pool = GREENY_DIALOGUE_LIBRARY[language][category];
  if (typeof pool === 'string') return pool;
  if (Array.isArray(pool)) {
    const filtered = pool.length > 1 && lastText ? pool.filter((item) => item !== lastText) : pool;
    return filtered[Math.floor(Math.random() * filtered.length)] || pool[0];
  }
  return GREENY_DIALOGUE_LIBRARY[language].dailyGreetings[0];
}

export const DEFAULT_GREENY_CUSTOMIZATION: GreenyCustomizationSettings = {
  leafColor: 'emerald',
  flowerStyle: 'daisy',
  accessory: 'gold-emblem',
  environment: 'floating-botanical',
  backgroundEffectsEnabled: true,
  reducedMotion: false,
  voiceEnabled: true,
  language: 'en',
  speechRate: 1.02,
  selectedVoiceURI: '',
};
