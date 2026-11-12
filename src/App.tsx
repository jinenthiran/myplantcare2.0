/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  Sparkles,
  Stethoscope,
  Box,
  Cpu,
  Compass,
  BookOpen,
  LayoutDashboard,
  Sun,
  Moon,
  ArrowRight,
  LogIn,
  LogOut,
} from 'lucide-react';
import {
  auth,
  googleAuthProvider,
  syncUserPreferencesToFirestore,
  subscribeToBotanicalNotes,
  subscribeToGardenLayouts,
} from './lib/firebase';
import { VirtualGarden3D } from './components/VirtualGarden3D';
import { GreenyAssistant } from './components/GreenyAssistant';
import { DiagnosticLaboratory, DiagnosticSubMode } from './components/DiagnosticLaboratory';
import { IntelligenceHub, IntelligenceTool } from './components/IntelligenceHub';
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

export type MainView =
  | 'home'
  | 'diagnostics'
  | 'virtual-3d'
  | 'intelligence'
  | 'greeny'
  | 'sanctuary'
  | 'ecosystem';

export default function App() {
  const [activeView, setActiveView] = useState<MainView>(() => {
    try {
      const saved = sessionStorage.getItem('myplantcare_active_view') as MainView | null;
      if (saved && ['home', 'diagnostics', 'virtual-3d', 'intelligence', 'greeny', 'sanctuary', 'ecosystem'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'home';
  });
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
  const [intelTool, setIntelTool] = useState<IntelligenceTool>('soil');
  const [sanctuaryTab, setSanctuaryTab] = useState<SanctuaryTab>('dashboard');
  const [ecosystemSec, setEcosystemSec] = useState<'library' | 'academy' | 'community' | 'marketplace' | 'legal'>(
    'library'
  );
  const [showSproutLoader, setShowSproutLoader] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

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
      if (
        ['home', 'diagnostics', 'virtual-3d', 'intelligence', 'greeny', 'sanctuary', 'ecosystem'].includes(
          targetView
        )
      ) {
        setActiveView(targetView as MainView);
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
    []
  );

  const [darkMode, setDarkMode] = useState<boolean>(true);
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
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
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
            preferredModel: 'gemini-4-argon',
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
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error('Google sign-in popup closed or blocked:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const plantsList = workspaceData?.plants || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F2] dark:bg-[#071B12] text-[#071B12] dark:text-[#F7F9F2] transition-colors">
      {/* 1. Desktop & Laptop Navigation (> 768px) — Preserved Unchanged */}
      <DesktopNavigation
        activeView={activeView}
        setActiveView={setActiveView}
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

      {/* 2. Mobile Header + Left-Side Swipe Sidebar Navigation (<= 768px) */}
      <MobileHeader
        setActiveView={setActiveView}
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
        setActiveView={setActiveView}
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
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-8">
        {activeView === 'home' && (
          <div className="space-y-14">
            {/* Hero Section (2-Column Asymmetric Split + Full-Width KPI Row Below) */}
            <section className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                  <div className="text-xs font-mono tracking-wider text-[#00C878]">
                    GROW BETTER · CARE SMARTER · LIVE GREENER
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                    The Future of Plant Care Is Intelligent.
                  </h1>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed max-w-xl">
                    Discover, understand and protect every plant with the power of artificial intelligence. Unite multimodal disease diagnostics, voice-enabled botanical memory, live microclimate telemetry, and an interactive 3D sanctuary.
                  </p>

                  <div className="flex flex-wrap items-center gap-3.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveView('diagnostics')}
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#00C878] text-[#071B12] font-bold text-sm hover:bg-[#B7F76B] transition-colors whitespace-nowrap shrink-0"
                    >
                      Explore MyPlantCare <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('greeny')}
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] text-slate-900 dark:text-[#F7F9F2] font-bold text-sm hover:border-[#00C878] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-4 h-4 text-[#00C878]" /> Meet Your AI Companion
                    </button>
                  </div>

                  <div className="pt-2 text-xs text-slate-500 dark:text-[#F7F9F2]/65">
                    Trusted by home gardeners, agricultural researchers, and botanical conservatories · English & Tamil (தமிழ்) Voice AI
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <VirtualGarden3D mode="hero" initialPlants={plantsList.length > 0 ? undefined : undefined} />
                </div>
              </div>

              {/* Full-Width 4-Column Botanical Telemetry Strip Below Hero Split */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
                  <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Active Sanctuary Plants</div>
                  <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                    {plantsList.length || 4} Specimens
                  </div>
                  <div className="text-xs text-[#00C878] mt-1">91.5% Mean Canopy Health</div>
                </div>
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
                  <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Disease & Nutrient Vision</div>
                  <div className="text-2xl font-extrabold font-mono text-[#00C878] mt-1 tabular-nums">
                    8-Element N-P-K+
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60 mt-1">Bio-Rational Safe Protocols</div>
                </div>
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
                  <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">Water & Compost Impact</div>
                  <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                    {workspaceData?.eco?.waterSavedLiters || 164} L Saved
                  </div>
                  <div className="text-xs text-[#B7F76B] mt-1">31.5 kg Organic Vermicompost</div>
                </div>
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419]">
                  <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/65">GREENY Bilingual Voice AI</div>
                  <div className="text-2xl font-extrabold font-mono text-[#D4B56A] mt-1 tabular-nums">
                    EN + தமிழ்
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#F7F9F2]/60 mt-1">6 Dynamic 3D Emotion States</div>
                </div>
              </div>
            </section>

            {/* Core Ecosystem Capabilities Grid */}
            <section className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-[#00C878]">INTEGRATED BOTANICAL ARCHITECTURE</div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    Every Dimension of Plant Intelligence in One Sanctuary
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-[#00C878]">01. COMPUTER VISION & PATHOLOGY</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      AI Plant Doctor & Identification Studio
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
                      Scan leaves via mobile camera or photo upload to identify species, evaluate foliar symptoms, and receive safe organic treatments with clear scientific disclaimers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDiagSubMode('doctor');
                      setActiveView('diagnostics');
                    }}
                    className="w-fit text-xs font-bold text-[#00C878] hover:underline"
                  >
                    Launch Diagnostic Studio →
                  </button>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-[#00C878]">02. CONVERSATIONAL & VOICE AI</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      GREENY Super Assistant (English & Tamil)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
                      Converse naturally by voice or text. GREENY remembers every plant in your sanctuary, its past yellow-leaf episodes, and upcoming fertilizer schedules.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('greeny')}
                    className="w-fit text-xs font-bold text-[#00C878] hover:underline"
                  >
                    Talk with GREENY AI →
                  </button>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-[#00C878]">03. SPATIAL HORTICULTURE</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Interactive 3D Virtual Garden & Designer
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
                      Arrange procedural 3D Monstera, Krishna Tulsi, Ficus, and Areca Palms in real time, customize pot finishes, and generate AI garden blueprints.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('virtual-3d')}
                    className="w-fit text-xs font-bold text-[#00C878] hover:underline"
                  >
                    Enter 3D Conservatory →
                  </button>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-[#00C878]">04. RHIZOSPHERE & HYDRATION</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Soil, Water & Live Weather Intelligence
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
                      Combine real-time Open-Meteo weather telemetry with pot-size evapotranspiration math and pH/N-P-K soil balancing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIntelTool('water');
                      setActiveView('intelligence');
                    }}
                    className="w-fit text-xs font-bold text-[#00C878] hover:underline"
                  >
                    Open Soil & Water Engine →
                  </button>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-[#00C878]">05. LONGITUDINAL CARE MEMORY</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Plant Memory, Growth Tracker & Smart Calendar
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
                      Track monthly height and leaf development, manage recurring watering/pruning schedules, and quantify your Eco-Impact Score.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSanctuaryTab('my-plants');
                      setActiveView('sanctuary');
                    }}
                    className="w-fit text-xs font-bold text-[#00C878] hover:underline"
                  >
                    Manage My Plants →
                  </button>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-[#00C878]">06. KNOWLEDGE & EXCHANGE</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Botanical Library, Academy, Community & Market
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#F7F9F2]/80 leading-relaxed">
                      Master root respiration in interactive quizzes, share organic tips with fellow growers, and reserve verified plants and compost.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEcosystemSec('library');
                      setActiveView('ecosystem');
                    }}
                    className="w-fit text-xs font-bold text-[#00C878] hover:underline"
                  >
                    Explore Library & Community →
                  </button>
                </div>
              </div>
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
          />
        )}

        {activeView === 'virtual-3d' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Interactive 3D Virtual Garden Conservatory
                </h1>
                <p className="text-xs text-slate-500 dark:text-[#F7F9F2]/70">
                  Click any 3D plant to select it · Use the bottom control dock to add specimens, adjust X/Z coordinates, cycle pot finishes, or toggle lighting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIntelTool('designer');
                  setActiveView('intelligence');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00C878] text-[#071B12] text-xs font-bold"
              >
                <Compass className="w-4 h-4" /> Open AI 2D/Spatial Blueprint Designer
              </button>
            </div>
            <VirtualGarden3D mode="studio" />
          </div>
        )}

        {activeView === 'intelligence' && (
          <IntelligenceHub
            activeTool={intelTool}
            onToolChange={setIntelTool}
            workspaceData={workspaceData}
            onRefreshWorkspace={() => loadWorkspace(authToken)}
            authToken={authToken}
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
                setActiveView('diagnostics');
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
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#071B12] px-6 py-6 mt-12">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-[#F7F9F2]/60">
          <div>
            <span className="font-bold text-slate-900 dark:text-white">MYPLANTCARE</span> · Grow Better. Care Smarter. Live Greener.
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => {
                setEcosystemSec('legal');
                setActiveView('ecosystem');
              }}
              className="hover:text-[#00C878]"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => {
                setEcosystemSec('legal');
                setActiveView('ecosystem');
              }}
              className="hover:text-[#00C878]"
            >
              Contact Us
            </button>
            <button
              type="button"
              onClick={() => {
                setEcosystemSec('legal');
                setActiveView('ecosystem');
              }}
              className="hover:text-[#00C878]"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => {
                setEcosystemSec('legal');
                setActiveView('ecosystem');
              }}
              className="hover:text-[#00C878]"
            >
              Terms & Conditions
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSproutLoader(true);
                setTimeout(() => setShowSproutLoader(false), 2200);
              }}
              className="hover:text-[#00C878] font-mono"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B12]/90 backdrop-blur-md p-6"
        >
          <div className="max-w-sm w-full p-8 rounded-3xl border border-[#00C878]/40 bg-[#0B2419] text-center space-y-4 shadow-2xl">
            <svg
              viewBox="0 0 120 120"
              className="w-24 h-24 mx-auto"
              aria-hidden="true"
            >
              {/* Soil mound */}
              <ellipse cx="60" cy="96" rx="36" ry="8" fill="#123D2A" />
              {/* Seed */}
              <ellipse cx="60" cy="92" rx="7" ry="5" fill="#D4B56A" />
              {/* Sprouting Stem */}
              <path
                d="M60 92 Q60 62 60 36"
                stroke="#00C878"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Left & Right Unfurling Botanical Leaves */}
              <path
                d="M60 64 C40 58 32 42 48 36 C56 34 60 48 60 64 Z"
                fill="#00C878"
              />
              <path
                d="M60 52 C80 46 88 30 72 24 C64 22 60 36 60 52 Z"
                fill="#B7F76B"
              />
              <circle cx="60" cy="26" r="4" fill="#D4B56A" />
            </svg>
            <div className="text-xs font-mono tracking-widest text-[#B7F76B]">
              MYPLANTCARE BOTANICAL ENGINE
            </div>
            <h3 className="text-lg font-bold text-white">
              Grow Better. Care Smarter. Live Greener.
            </h3>
            <p className="text-xs text-[#F7F9F2]/75">
              Synchronizing Plant Memory, Gemini AI Diagnostics & 3D Conservatory...
            </p>
          </div>
        </div>
      )}

      {/* Floating GREENY AI Assistant Button on Every Page (temporarily hidden when mobile sidebar is open to avoid overlap) */}
      {activeView !== 'greeny' && !mobileSidebarOpen && (
        <GreenyAssistant
          mode="floating"
          plants={plantsList}
          authToken={authToken}
          onNavigate={handleGreenyNavigate}
        />
      )}
    </div>
  );
}
