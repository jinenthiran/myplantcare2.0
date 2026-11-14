/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Sparkles,
  Stethoscope,
  Box,
  Cpu,
  Compass,
  ArrowRight,
  Trophy,
  ScanLine,
  Bug,
  Search,
  Sprout,
  ShieldCheck,
} from 'lucide-react';
import { BotanicalAchievementsModal } from './components/BotanicalAchievementsModal';
import {
  auth,
  googleSignIn,
  logout,
  syncUserPreferencesToFirestore,
  subscribeToBotanicalNotes,
  subscribeToGardenLayouts,
} from './lib/firebase';
import {
  WorkspaceBotanicalHub,
  WorkspacePrefillPayload,
} from './components/WorkspaceBotanicalHub';
import { VirtualGarden3D } from './components/VirtualGarden3D';
import { GreenyAssistant } from './components/GreenyAssistant';
import { DiagnosticLaboratory, DiagnosticSubMode } from './components/DiagnosticLaboratory';
import { IntelligenceHub } from './components/IntelligenceHub';
import {
  AiToolSlug,
  buildAiToolsPath,
  normalizeToolSlug,
  parseAiToolsRoute,
} from './data/aiToolsCatalog';
import { SanctuaryManager, SanctuaryTab } from './components/SanctuaryManager';
import { EcosystemHub } from './components/EcosystemHub';
import {
  DesktopNavigation,
  MobileHeader,
  SwipeGestureHandler,
  NavigationOverlay,
  MobileSidebar,
} from './components/navigation/ResponsiveNavigation';
import { emitGreenyAppEvent } from './components/greeny/GreenyTypes';
import {
  PageTransition,
  BotanicalReveal,
  AnimatedMetricValue,
  FloatingBotanicalParticles,
} from './components/ui/LivingEarthMotion';
import {
  InteractiveSpecimenStage,
  MagneticButton,
  ObservatoryCard,
  ObservatorySectionHeader,
} from './components/ui/ObservatoryPrimitives';
import { BotanicalImage } from './components/ui/BotanicalImage';
import { BOTANICAL_IMAGES } from './utils/botanicalImageResolver';

export type MainView =
  | 'home'
  | 'diagnostics'
  | 'virtual-3d'
  | 'intelligence'
  | 'greeny'
  | 'sanctuary'
  | 'ecosystem'
  | 'workspace';

export default function App() {
  const [activeView, setActiveView] = useState<MainView>(() => {
    if (typeof window !== 'undefined') {
      const route = parseAiToolsRoute(window.location.pathname);
      if (route.isAiToolsRoute) return 'intelligence';
    }
    try {
      const saved = sessionStorage.getItem('myplantcare_active_view') as MainView | null;
      if (
        saved &&
        ['home', 'diagnostics', 'virtual-3d', 'intelligence', 'greeny', 'sanctuary', 'ecosystem', 'workspace'].includes(saved)
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'home';
  });
  const [workspacePrefill, setWorkspacePrefill] = useState<WorkspacePrefillPayload | null>(null);
  const [diagSubMode, setDiagSubMode] = useState<DiagnosticSubMode>(() => {
    try {
      const saved = sessionStorage.getItem('myplantcare_diag_submode') as DiagnosticSubMode | null;
      if (saved && ['doctor', 'identify', 'pest', 'nutrient', 'rescue'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'doctor';
  });
  const [activeToolSlug, setActiveToolSlug] = useState<AiToolSlug | null>(() => {
    if (typeof window !== 'undefined') {
      return parseAiToolsRoute(window.location.pathname).activeToolSlug;
    }
    return null;
  });
  const [aiToolPrefill, setAiToolPrefill] = useState<{
    toolId?: string;
    plantId?: number | null;
    prompt?: string;
  } | null>(null);
  const [sanctuaryTab, setSanctuaryTab] = useState<SanctuaryTab>('dashboard');
  const [showAchievementsModal, setShowAchievementsModal] = useState<boolean>(false);
  const [ecosystemSec, setEcosystemSec] = useState<'library' | 'academy' | 'community' | 'marketplace' | 'legal'>(
    'library'
  );
  const [heroStageMode, setHeroStageMode] = useState<'optical' | '3d'>('optical');
  const [showSproutLoader, setShowSproutLoader] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const navigateToView = useCallback(
    (view: MainView) => {
      setActiveView(view);
      if (typeof window !== 'undefined') {
        if (view === 'intelligence') {
          const targetPath = buildAiToolsPath(activeToolSlug);
          if (window.location.pathname !== targetPath) {
            window.history.pushState({ view, slug: activeToolSlug }, '', targetPath);
          }
        } else if (window.location.pathname.startsWith('/ai-tools')) {
          window.history.pushState({ view }, '', '/');
        }
      }
    },
    [activeToolSlug]
  );

  const navigateToTool = useCallback((slug: AiToolSlug | null) => {
    setActiveToolSlug(slug);
    setActiveView('intelligence');
    if (typeof window !== 'undefined') {
      const targetPath = buildAiToolsPath(slug);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view: 'intelligence', slug }, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const route = parseAiToolsRoute(window.location.pathname);
      if (route.isAiToolsRoute) {
        setActiveView('intelligence');
        setActiveToolSlug(route.activeToolSlug);
      } else {
        setActiveToolSlug(null);
        setActiveView((curr) => (curr === 'intelligence' ? 'home' : curr));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  useEffect(() => {
    try {
      sessionStorage.setItem('myplantcare_active_view', activeView);
      sessionStorage.setItem('myplantcare_diag_submode', diagSubMode);
    } catch {
      // ignore
    }
    if (activeView === 'sanctuary') {
      emitGreenyAppEvent({ type: 'USER_OPENED_MY_GARDEN' });
    }
  }, [activeView, diagSubMode]);

  const handleGreenyNavigate = useCallback(
    (targetView: string, subTarget?: string) => {
      if (targetView === 'intelligence') {
        navigateToTool(normalizeToolSlug(subTarget));
        return;
      }
      if (['home', 'diagnostics', 'virtual-3d', 'greeny', 'sanctuary', 'ecosystem', 'workspace'].includes(targetView)) {
        navigateToView(targetView as MainView);
      }
      if (targetView === 'diagnostics' && subTarget) {
        if (['doctor', 'identify', 'pest', 'nutrient', 'rescue'].includes(subTarget)) {
          setDiagSubMode(subTarget as DiagnosticSubMode);
        }
      } else if (targetView === 'sanctuary' && subTarget) {
        if (['dashboard', 'my-plants', 'garden-map', 'calendar', 'iot', 'eco', 'admin'].includes(subTarget)) {
          setSanctuaryTab(subTarget as SanctuaryTab);
        }
      } else if (targetView === 'ecosystem' && subTarget) {
        if (['library', 'academy', 'community', 'marketplace', 'legal'].includes(subTarget)) {
          setEcosystemSec(subTarget as 'library' | 'academy' | 'community' | 'marketplace' | 'legal');
        }
      }
    },
    [navigateToTool, navigateToView]
  );

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedTheme = localStorage.getItem('myplantcare_theme');
        if (storedTheme === 'light') return false;
        if (storedTheme === 'dark') return true;
      } catch {
        // ignore
      }
    }
    return true;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [firestoreNotes, setFirestoreNotes] = useState<any[]>([]);
  const [firestoreLayouts, setFirestoreLayouts] = useState<any[]>([]);
  const [workspaceData, setWorkspaceData] = useState<any>({
    plants: [],
    diagnoses: [],
    tasks: [],
    soils: [],
    growth: [],
    designs: [],
    posts: [],
    eco: null,
    orders: [],
    allUsers: [],
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('obs-theme-transition');
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const timer = setTimeout(() => root.classList.remove('obs-theme-transition'), 340);
    try {
      localStorage.setItem('myplantcare_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
    return () => clearTimeout(timer);
  }, [darkMode]);

  const loadWorkspace = useCallback(async (token?: string | null) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/workspace', { headers });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceData(data);
      }
    } catch (err) {
      console.error('Failed to load workspace:', err);
    }
  }, []);

  useEffect(() => {
    let unsubNotes: (() => void) | null = null;
    let unsubLayouts: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (unsubNotes) {
        unsubNotes();
        unsubNotes = null;
      }
      if (unsubLayouts) {
        unsubLayouts();
        unsubLayouts = null;
      }

      setCurrentUser(user);
      if (user) {
        const token = await user.getIdToken();
        setAuthToken(token);
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: user.email,
            displayName: user.displayName,
          }),
        });
        loadWorkspace(token);

        try {
          await syncUserPreferencesToFirestore({
            userId: user.uid,
            displayName: user.displayName || 'Botanical Explorer',
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
            preferredLanguage: 'en',
            preferredModel: 'gemini-4-hydrogen',
          });
          unsubNotes = subscribeToBotanicalNotes(user.uid, setFirestoreNotes);
          unsubLayouts = subscribeToGardenLayouts(user.uid, setFirestoreLayouts);
        } catch (fsErr) {
          console.error('Firestore initial sync note:', fsErr);
        }
      } else {
        setAuthToken(null);
        setFirestoreNotes([]);
        setFirestoreLayouts([]);
        loadWorkspace(null);
      }
    });
    return () => {
      unsub();
      if (unsubNotes) unsubNotes();
      if (unsubLayouts) unsubLayouts();
    };
  }, [loadWorkspace]);

  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
    } catch (err) {
      console.error('Google sign-in popup closed or blocked:', err);
    }
  };

  const handleSignOut = async () => {
    await logout();
  };

  const plantsList = workspaceData?.plants || [];
  const diagnosesList = workspaceData?.diagnoses || [];
  const tasksList = workspaceData?.tasks || [];

  const meanHealth =
    plantsList.length > 0
      ? (
          plantsList.reduce((sum: number, p: any) => sum + Number(p.healthScore ?? 0), 0) /
          plantsList.length
        ).toFixed(1)
      : null;

  const diagnosesCount = diagnosesList.length;
  const waterSavedLiters = Number(workspaceData?.eco?.waterSavedLiters ?? 0);
  const compostKg = Number(workspaceData?.eco?.compostKg ?? 0);

  const realWateringCount = plantsList.reduce(
    (acc: number, p: any) => acc + (Number(p.wateringCount) || (p.lastWatered ? 1 : 0)),
    0
  );
  const realCompletedTasksCount = tasksList.filter((t: any) => t.completed).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] obs-atmosphere">
      {/* Desktop Navigation */}
      <DesktopNavigation
        activeView={activeView}
        setActiveView={navigateToView}
        onOpenAiToolsGrid={() => navigateToTool(null)}
        diagSubMode={diagSubMode}
        setDiagSubMode={setDiagSubMode}
        sanctuaryTab={sanctuaryTab}
        setSanctuaryTab={setSanctuaryTab}
        ecosystemSec={ecosystemSec}
        setEcosystemSec={setEcosystemSec}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentUser={currentUser}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />

      {/* Mobile Header + Left-Edge Swipeable Drawer */}
      <MobileHeader
        setActiveView={navigateToView}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />
      <SwipeGestureHandler
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />
      <NavigationOverlay
        mobileSidebarOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <MobileSidebar
        activeView={activeView}
        setActiveView={navigateToView}
        onOpenAiToolsGrid={() => navigateToTool(null)}
        diagSubMode={diagSubMode}
        setDiagSubMode={setDiagSubMode}
        sanctuaryTab={sanctuaryTab}
        setSanctuaryTab={setSanctuaryTab}
        ecosystemSec={ecosystemSec}
        setEcosystemSec={setEcosystemSec}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentUser={currentUser}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-9">
        <PageTransition
          viewKey={activeView === 'intelligence' ? `intel-${activeToolSlug || 'grid'}` : activeView}
        >
          {activeView === 'home' && (
            <div className="space-y-16 sm:space-y-20">
              {/* HERO SECTION — AI BOTANICAL OBSERVATORY */}
              <section className="relative overflow-hidden rounded-3xl border border-[#174C38]/14 dark:border-[#00D69A]/22 bg-white/85 dark:bg-[#153026]/82 backdrop-blur-xl p-6 sm:p-10 lg:p-12 shadow-[0_24px_70px_-28px_rgba(16,37,29,0.28)]">
                {/* Ambient Layered Botanical Glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-28 -right-24 w-[420px] h-[420px] rounded-full bg-[#00D69A]/14 dark:bg-[#00D69A]/18 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-[#C7F36B]/22 dark:bg-[#56C7C0]/12 blur-3xl"
                />
                <FloatingBotanicalParticles />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                  {/* Left Editorial Column */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-[0.2em] text-[#0F6B50] dark:text-[#00D69A] font-semibold">
                      <span>MYPLANTCARE</span>
                      <span aria-hidden="true" className="text-[#B6CDB4]">·</span>
                      <span>AI BOTANICAL OBSERVATORY</span>
                    </div>

                    <h1 className="font-display text-[clamp(2.25rem,4.4vw,3.9rem)] font-extrabold tracking-tight text-[#10251D] dark:text-[#FAF7EE] leading-[1.04]">
                      Your Plants. Your Garden. Powered by AI.
                    </h1>

                    <p className="text-base sm:text-lg text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed max-w-xl">
                      An intelligent botanical sanctuary combining Gemini vision pathology, 19 camera-driven specialist tools, interactive 3D and AR garden planning, and GREENY—your bilingual 3D voice companion.
                    </p>

                    <div className="flex flex-wrap items-center gap-3.5 pt-1">
                      <MagneticButton
                        type="button"
                        variant="primary"
                        onClick={() => {
                          setDiagSubMode('doctor');
                          navigateToView('diagnostics');
                        }}
                        className="px-6 py-3.5 text-sm"
                      >
                        <Stethoscope className="w-4 h-4" />
                        EXPLORE AI PLANT DOCTOR
                      </MagneticButton>

                      <MagneticButton
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setSanctuaryTab('my-plants');
                          navigateToView('sanctuary');
                        }}
                        className="px-6 py-3.5 text-sm"
                      >
                        EXPLORE MY GARDEN
                        <ArrowRight className="w-4 h-4" />
                      </MagneticButton>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => navigateToView('greeny')}
                        className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#174C38] dark:text-[#C7F36B] hover:text-[#00D69A] transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-[#00D69A]" />
                        Speak with GREENY 3D (EN + தமிழ்)
                      </button>
                      <span aria-hidden="true" className="text-[#B6CDB4]">·</span>
                      <button
                        type="button"
                        onClick={() => setShowAchievementsModal(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#174C38] dark:text-[#F5CA62] hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <Trophy className="w-3.5 h-3.5 text-[#F5CA62]" />
                        Botanical Badges & XP
                      </button>
                      <span aria-hidden="true" className="text-[#B6CDB4]">·</span>
                      <button
                        type="button"
                        data-testid="hero-open-workspace-btn"
                        onClick={() => navigateToView('workspace')}
                        className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#174C38] dark:text-[#00D69A] hover:underline cursor-pointer"
                      >
                        Google Docs & Chat Studio →
                      </button>
                    </div>

                    <div className="pt-3 border-t border-[#174C38]/10 dark:border-[#B6CDB4]/14 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#4A665B] dark:text-[#B6CDB4]">
                      <span>Multi-Angle Vision Scanner</span>
                      <span aria-hidden="true">·</span>
                      <span>19 Specialist AI Tools</span>
                      <span aria-hidden="true">·</span>
                      <span>WebXR AR & 3D Conservatory</span>
                    </div>
                  </div>

                  {/* Right Interactive Botanical Stage (Mouse-Reactive Optical Scanner / 3D Conservatory Switch) */}
                  <div className="lg:col-span-6 space-y-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="inline-flex rounded-xl p-1 bg-[#F1ECE0] dark:bg-[#10251D] border border-[#174C38]/14 dark:border-[#B6CDB4]/16 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setHeroStageMode('optical')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            heroStageMode === 'optical'
                              ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-bold'
                              : 'text-[#4A665B] dark:text-[#B6CDB4]'
                          }`}
                        >
                          Optical Specimen
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeroStageMode('3d')}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            heroStageMode === '3d'
                              ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] font-bold'
                              : 'text-[#4A665B] dark:text-[#B6CDB4]'
                          }`}
                        >
                          3D Conservatory
                        </button>
                      </div>
                    </div>

                    {heroStageMode === 'optical' ? (
                      <InteractiveSpecimenStage
                        onLaunchScanner={() => {
                          setDiagSubMode('doctor');
                          navigateToView('diagnostics');
                        }}
                        onOpenGarden={() => {
                          setSanctuaryTab('my-plants');
                          navigateToView('sanctuary');
                        }}
                      />
                    ) : (
                      <div className="rounded-3xl border border-[#174C38]/18 dark:border-[#00D69A]/35 bg-[#10251D] overflow-hidden shadow-2xl">
                        <VirtualGarden3D mode="hero" />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* REAL-TIME GARDEN METRICS STRIP (Strictly Actual User Data) */}
              <section aria-label="Live Sanctuary Telemetry" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <BotanicalReveal delay={0.02}>
                  <ObservatoryCard interactive padding="md">
                    <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#4A665B] dark:text-[#B6CDB4]">
                      Registered Garden Plants
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#10251D] dark:text-[#FAF7EE] mt-2 tabular-nums">
                      <AnimatedMetricValue value={plantsList.length} suffix=" Specimens" />
                    </p>
                    <p className="text-xs text-[#0F6B50] dark:text-[#00D69A] mt-1.5 font-medium">
                      {meanHealth !== null ? `${meanHealth}% Mean Specimen Health` : 'Add your first plant in My Garden'}
                    </p>
                  </ObservatoryCard>
                </BotanicalReveal>

                <BotanicalReveal delay={0.06}>
                  <ObservatoryCard interactive padding="md">
                    <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#4A665B] dark:text-[#B6CDB4]">
                      Saved AI Pathology Scans
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#174C38] dark:text-[#F5CA62] mt-2 tabular-nums">
                      <AnimatedMetricValue value={diagnosesCount} suffix=" Reports" />
                    </p>
                    <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mt-1.5">
                      {diagnosesCount > 0 ? 'Stored in Vision History' : 'Run a camera scan to record history'}
                    </p>
                  </ObservatoryCard>
                </BotanicalReveal>

                <BotanicalReveal delay={0.1}>
                  <ObservatoryCard interactive padding="md">
                    <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#4A665B] dark:text-[#B6CDB4]">
                      Conservation Logged
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#10251D] dark:text-[#56C7C0] mt-2 tabular-nums">
                      <AnimatedMetricValue value={waterSavedLiters} suffix=" L Saved" />
                    </p>
                    <p className="text-xs text-[#FF806B] mt-1.5 font-medium tabular-nums">
                      {compostKg} kg Home Compost Logged
                    </p>
                  </ObservatoryCard>
                </BotanicalReveal>

                <BotanicalReveal delay={0.14}>
                  <ObservatoryCard interactive padding="md">
                    <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#4A665B] dark:text-[#B6CDB4]">
                      GREENY 3D Companion
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#174C38] dark:text-[#BBA8F5] mt-2">
                      EN + தமிழ்
                    </p>
                    <p className="text-xs text-[#4A665B] dark:text-[#B6CDB4] mt-1.5">
                      Voice + Expressive 3D States
                    </p>
                  </ObservatoryCard>
                </BotanicalReveal>
              </section>

              {/* VARIED ASYMMETRIC FEATURE SHOWCASE (6 Core Pillars, Zero Repetitive Grid Slop) */}
              <section className="space-y-8">
                <ObservatorySectionHeader
                  eyebrow="Observatory Capabilities"
                  title="Six Pillars of Living Plant Intelligence"
                  subtitle="Every diagnostic workflow, spatial view, and companion experience is crafted as a dedicated, interactive workspace."
                  action={
                    <button
                      type="button"
                      onClick={() => navigateToTool(null)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold hover:brightness-110 transition-all cursor-pointer"
                    >
                      Open All 19 AI Tools <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  }
                />

                {/* Row 1: Asymmetric 7/5 Editorial Feature Split (AI Plant Doctor + Plant Identifier) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Pillar 1: AI Plant Doctor */}
                  <BotanicalReveal delay={0.04} className="lg:col-span-7">
                    <ObservatoryCard
                      interactive
                      padding="none"
                      className="h-full overflow-hidden flex flex-col md:flex-row"
                    >
                      <div className="md:w-[46%] relative min-h-[240px] bg-[#10251D] overflow-hidden">
                        <BotanicalImage
                          src={BOTANICAL_IMAGES.diagnosticLab}
                          alt="AI Plant Doctor diagnostic laboratory"
                          commonName="AI Plant Doctor"
                          aspectClassName="h-full min-h-[240px]"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#10251D]/85 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-[#C7F36B]">
                          <span>MULTI-ANGLE SCANNER</span>
                          <ScanLine className="w-4 h-4 text-[#00D69A]" />
                        </div>
                      </div>
                      <div className="md:w-[54%] p-6 sm:p-7 flex flex-col justify-between space-y-5">
                        <div className="space-y-3">
                          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#0F6B50] dark:text-[#00D69A] font-semibold">
                            01 · Clinical Pathology
                          </span>
                          <h3 className="text-xl sm:text-2xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                            AI Plant Doctor
                          </h3>
                          <p className="text-sm text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                            Capture full canopy, leaf undersides, stems, and soil in a single guided session. Get clarity checks, prioritized organic IPM remedies, and instant garden logging.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDiagSubMode('doctor');
                            navigateToView('diagnostics');
                          }}
                          className="w-fit inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold hover:brightness-110 transition-all cursor-pointer"
                        >
                          Launch AI Plant Doctor <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </ObservatoryCard>
                  </BotanicalReveal>

                  {/* Pillar 2: Plant Identifier */}
                  <BotanicalReveal delay={0.08} className="lg:col-span-5">
                    <ObservatoryCard
                      interactive
                      padding="lg"
                      className="h-full flex flex-col justify-between bg-gradient-to-br from-[#FFFFFF] to-[#F1ECE0] dark:from-[#153026] dark:to-[#10251D]"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FF806B] font-semibold">
                            02 · Botanical Taxonomy
                          </span>
                          <div className="w-10 h-10 rounded-xl bg-[#FF806B]/15 text-[#FF806B] flex items-center justify-center">
                            <Search className="w-5 h-5" />
                          </div>
                        </div>
                        <h3 className="text-xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                          Plant Identifier
                        </h3>
                        <p className="text-sm text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                          Identify indoor houseplants, ornamentals, herbs, and native flora with candidate species comparison, toxicity flags, and instant care profiles.
                        </p>
                      </div>

                      <div className="pt-5 flex items-center justify-between border-t border-[#174C38]/10 dark:border-[#B6CDB4]/14 mt-6">
                        <button
                          type="button"
                          onClick={() => navigateToTool('plant-identifier')}
                          className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#174C38] dark:text-[#00D69A] hover:underline cursor-pointer"
                        >
                          Open Identifier Tool <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDiagSubMode('identify');
                            navigateToView('diagnostics');
                          }}
                          className="text-xs font-medium text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#10251D] dark:hover:text-[#FAF7EE] cursor-pointer"
                        >
                          Identify Studio →
                        </button>
                      </div>
                    </ObservatoryCard>
                  </BotanicalReveal>
                </div>

                {/* Row 2: 3 Distinct Focus Modules (Leaf Health Scanner + Disease Detection + My Garden) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Pillar 3: Leaf Health Scanner */}
                  <BotanicalReveal delay={0.05} className="md:col-span-4">
                    <ObservatoryCard interactive padding="lg" className="h-full flex flex-col justify-between space-y-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#56C7C0] font-semibold">
                            03 · Foliar Optics
                          </span>
                          <div className="w-9 h-9 rounded-xl bg-[#56C7C0]/16 text-[#0F6B50] dark:text-[#56C7C0] flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                        </div>
                        <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                          Leaf Health Scanner
                        </h3>
                        <p className="text-xs sm:text-sm text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                          Evaluate chlorophyll vibrancy, margin crispness, spotting patterns, and hydration balance in seconds.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToTool('leaf-health')}
                        className="w-fit inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#174C38] dark:text-[#56C7C0] hover:underline cursor-pointer"
                      >
                        Scan Leaf Health <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </ObservatoryCard>
                  </BotanicalReveal>

                  {/* Pillar 4: Disease Detection */}
                  <BotanicalReveal delay={0.1} className="md:col-span-4">
                    <ObservatoryCard interactive padding="lg" className="h-full flex flex-col justify-between space-y-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#F5CA62] font-semibold">
                            04 · Pathogen Triage
                          </span>
                          <div className="w-9 h-9 rounded-xl bg-[#F5CA62]/20 text-[#946800] dark:text-[#F5CA62] flex items-center justify-center">
                            <Bug className="w-4 h-4" />
                          </div>
                        </div>
                        <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                          Disease Detection
                        </h3>
                        <p className="text-xs sm:text-sm text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                          Spot fungal mildew, bacterial blight, and sap-sucking pests early with step-by-step isolation guidance.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToTool('disease-detector')}
                        className="w-fit inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#174C38] dark:text-[#F5CA62] hover:underline cursor-pointer"
                      >
                        Run Disease Detector <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </ObservatoryCard>
                  </BotanicalReveal>

                  {/* Pillar 5: My Garden */}
                  <BotanicalReveal delay={0.15} className="md:col-span-4">
                    <ObservatoryCard interactive padding="none" className="h-full overflow-hidden flex flex-col justify-between">
                      <div className="h-32 overflow-hidden bg-[#174C38] relative">
                        <BotanicalImage
                          src={BOTANICAL_IMAGES.gardenConservatory}
                          alt="My Garden sunlit indoor conservatory"
                          commonName="My Garden"
                          aspectClassName="h-32"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#10251D]/80 to-transparent" />
                        <span className="absolute bottom-3 left-4 text-[11px] font-mono uppercase tracking-[0.18em] text-[#C7F36B]">
                          05 · Living Collection
                        </span>
                      </div>
                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                            My Garden & Sanctuary
                          </h3>
                          <p className="mt-1.5 text-xs sm:text-sm text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
                            Manage plant profiles, watering logs, 2D floor plans, local weather care alerts, and time-lapse growth progressions.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSanctuaryTab('my-plants');
                            navigateToView('sanctuary');
                          }}
                          className="w-fit inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#174C38] dark:text-[#00D69A] hover:underline cursor-pointer"
                        >
                          Enter My Garden <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </ObservatoryCard>
                  </BotanicalReveal>
                </div>

                {/* Row 3: GREENY AI Assistant Full-Width Midnight Botanical Spotlight */}
                <BotanicalReveal delay={0.08}>
                  <ObservatoryCard variant="emerald" padding="lg" className="overflow-hidden relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#00D69A]/18 blur-3xl"
                    />
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="max-w-2xl space-y-3">
                        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[#C7F36B]">
                          <Sprout className="w-4 h-4 text-[#00D69A]" />
                          <span>06 · Conversational 3D Botanical Intelligence</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#FAF7EE]">
                          GREENY — Your 3D Voice & Visual Plant Companion
                        </h3>
                        <p className="text-sm text-[#B6CDB4] leading-relaxed">
                          Ask plant-care questions by voice or text in English or தமிழ், navigate directly to any diagnostic tool, inspect your garden memory, and watch GREENY react in real-time 3D.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => navigateToView('greeny')}
                          className="px-5 py-3 rounded-xl bg-[#00D69A] hover:bg-[#C7F36B] text-[#10251D] font-display font-bold text-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          Open GREENY 3D Studio
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSanctuaryTab('dashboard');
                            navigateToView('sanctuary');
                          }}
                          className="px-5 py-3 rounded-xl bg-[#193A2E] hover:bg-[#1D4334] text-[#FAF7EE] border border-[#B6CDB4]/25 font-display font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Open Observatory Dashboard
                        </button>
                      </div>
                    </div>
                  </ObservatoryCard>
                </BotanicalReveal>
              </section>
            </div>
          )}

          {activeView === 'diagnostics' && (
            <DiagnosticLaboratory
              activeSubMode={diagSubMode}
              onSubModeChange={setDiagSubMode}
              onDiagnosisSaved={() => loadWorkspace(authToken)}
              authToken={authToken}
              plants={plantsList}
              diagnoses={workspaceData?.diagnoses || []}
              onAskPlantDoctor={(prefill) => {
                setAiToolPrefill(prefill);
                navigateToTool(normalizeToolSlug(prefill.toolId) || 'leaf-health');
              }}
            />
          )}

          {activeView === 'virtual-3d' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">
                    Interactive 3D & AR Virtual Conservatory
                  </h1>
                  <p className="text-xs sm:text-sm text-[#4A665B] dark:text-[#B6CDB4] mt-1">
                    Select specimens to reposition, customize pot finishes, activate AR room projection, or enable procedural Botanical Ambience.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToTool('garden-coach')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] text-xs font-display font-bold hover:brightness-110 transition-all cursor-pointer"
                >
                  <Compass className="w-4 h-4" /> AI Personal Garden Coach
                </button>
              </div>
              <VirtualGarden3D mode="studio" />
            </div>
          )}

          {activeView === 'intelligence' && (
            <IntelligenceHub
              activeToolSlug={activeToolSlug}
              onSelectTool={navigateToTool}
              workspaceData={workspaceData}
              onRefreshWorkspace={() => loadWorkspace(authToken)}
              onLaunchDiagnostic={(subMode) => {
                setDiagSubMode(subMode);
                navigateToView('diagnostics');
              }}
              authToken={authToken}
              prefillContext={aiToolPrefill}
              onClearPrefill={() => setAiToolPrefill(null)}
            />
          )}

          {activeView === 'greeny' && (
            <GreenyAssistant
              mode="page"
              plants={plantsList}
              authToken={authToken}
              onNavigate={handleGreenyNavigate}
            />
          )}

          {activeView === 'sanctuary' && (
            <SanctuaryManager
              activeTab={sanctuaryTab}
              onTabChange={setSanctuaryTab}
              workspaceData={workspaceData}
              firestoreNotes={firestoreNotes}
              firestoreLayouts={firestoreLayouts}
              onRefresh={() => loadWorkspace(authToken)}
              onNavigateToSection={(sec) => {
                if (sec === 'doctor') {
                  setDiagSubMode('doctor');
                  navigateToView('diagnostics');
                } else if (sec === 'greeny') {
                  navigateToView('greeny');
                }
              }}
              authToken={authToken}
            />
          )}

          {activeView === 'ecosystem' && (
            <EcosystemHub
              activeSection={ecosystemSec}
              onSectionChange={setEcosystemSec}
              workspaceData={workspaceData}
              onRefresh={() => loadWorkspace(authToken)}
              authToken={authToken}
            />
          )}

          {activeView === 'workspace' && (
            <WorkspaceBotanicalHub
              plants={plantsList}
              diagnoses={diagnosesList}
              prefill={workspacePrefill}
              onClearPrefill={() => setWorkspacePrefill(null)}
            />
          )}
        </PageTransition>
      </main>

      {/* Observatory Footer */}
      <footer className="border-t border-[#174C38]/12 dark:border-[#B6CDB4]/14 bg-white/80 dark:bg-[#0B1B15]/90 backdrop-blur-md px-6 py-6 mt-12">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-[#4A665B] dark:text-[#B6CDB4]">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">MYPLANTCARE</span>
            <span>·</span>
            <span>AI Botanical Observatory</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => {
                setEcosystemSec('legal');
                navigateToView('ecosystem');
              }}
              className="hover:text-[#00D69A] transition-colors cursor-pointer"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => {
                setEcosystemSec('legal');
                navigateToView('ecosystem');
              }}
              className="hover:text-[#00D69A] transition-colors cursor-pointer"
            >
              Contact Us
            </button>
            <button
              type="button"
              onClick={() => {
                setEcosystemSec('legal');
                navigateToView('ecosystem');
              }}
              className="hover:text-[#00D69A] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => {
                setEcosystemSec('legal');
                navigateToView('ecosystem');
              }}
              className="hover:text-[#00D69A] transition-colors cursor-pointer"
            >
              Terms & Conditions
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSproutLoader(true);
                setTimeout(() => setShowSproutLoader(false), 2200);
              }}
              className="hover:text-[#00D69A] font-mono transition-colors cursor-pointer"
            >
              Replay Seed-to-Plant Animation
            </button>
          </div>
        </div>
      </footer>

      {/* Custom Botanical Seed-to-Plant Sprouting Overlay */}
      {showSproutLoader && (
        <div
          role="status"
          aria-live="polite"
          onClick={() => setShowSproutLoader(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251D]/92 backdrop-blur-md p-6"
        >
          <div className="max-w-sm w-full p-8 rounded-3xl border border-[#00D69A]/40 bg-[#153026] text-center space-y-4 shadow-2xl">
            <svg viewBox="0 0 120 120" className="w-24 h-24 mx-auto" aria-hidden="true">
              <ellipse cx="60" cy="96" rx="36" ry="8" fill="#10251D" />
              <ellipse cx="60" cy="92" rx="7" ry="5" fill="#F5CA62" />
              <path
                d="M60 92 Q60 62 60 36"
                stroke="#00D69A"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M60 64 C40 58 32 42 48 36 C56 34 60 48 60 64 Z" fill="#00D69A" />
              <path d="M60 52 C80 46 88 30 72 24 C64 22 60 36 60 52 Z" fill="#C7F36B" />
              <circle cx="60" cy="26" r="4" fill="#F5CA62" />
            </svg>
            <div className="text-xs font-mono tracking-widest text-[#00D69A]">
              MYPLANTCARE BOTANICAL ENGINE
            </div>
            <h3 className="text-lg font-display font-bold text-[#FAF7EE]">
              Your Plants. Your Garden. Powered by AI.
            </h3>
            <p className="text-xs text-[#B6CDB4]">
              Synchronizing Plant Memory, Gemini AI Diagnostics & 3D Conservatory...
            </p>
          </div>
        </div>
      )}

      {/* Floating GREENY AI Assistant Button on Every Page */}
      {activeView !== 'greeny' && !mobileSidebarOpen && (
        <GreenyAssistant
          mode="floating"
          plants={plantsList}
          authToken={authToken}
          onNavigate={handleGreenyNavigate}
        />
      )}

      {/* Botanical Achievements & Badges Modal */}
      <BotanicalAchievementsModal
        isOpen={showAchievementsModal}
        onClose={() => setShowAchievementsModal(false)}
        userStats={{
          wateringCount: realWateringCount,
          streakDays: realCompletedTasksCount > 0 ? Math.min(30, realCompletedTasksCount * 3) : 0,
          rescuesCount: diagnosesCount,
          climateLogsCount: workspaceData?.climateLogs?.length || 0,
          synergyRunsCount: firestoreLayouts.length > 0 ? 1 : 0,
          qrScansCount: plantsList.length > 0 ? 1 : 0,
          arSnapshotsCount: 0,
          sharesCount: 0,
        }}
      />
    </div>
  );
}
