import React, { useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  Sparkles,
  Stethoscope,
  Box,
  Cpu,
  BookOpen,
  LayoutDashboard,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Menu,
  X,
  Home,
  Search,
  HeartPulse,
  Droplets,
  GraduationCap,
  Users,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react';
import type { MainView } from '../../App';
import type { DiagnosticSubMode } from '../DiagnosticLaboratory';
import type { SanctuaryTab } from '../SanctuaryManager';
import { GreenyCharacter3D } from '../greeny/GreenyCharacter3D';
import { DEFAULT_GREENY_CUSTOMIZATION } from '../greeny/GreenyTypes';

export interface ResponsiveNavigationProps {
  activeView: MainView;
  setActiveView: (view: MainView) => void;
  diagSubMode: DiagnosticSubMode;
  setDiagSubMode: (mode: DiagnosticSubMode) => void;
  sanctuaryTab: SanctuaryTab;
  setSanctuaryTab: (tab: SanctuaryTab) => void;
  ecosystemSec: 'library' | 'academy' | 'community' | 'marketplace' | 'legal';
  setEcosystemSec: (sec: 'library' | 'academy' | 'community' | 'marketplace' | 'legal') => void;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser: User | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 1. DESKTOP AND LAPTOP VERSION (> 768px)
 * Preserves the exact top navigation bar and secondary workspace command toolbar unchanged.
 * Hidden on screens 768px and below (`max-md:hidden`).
 */
export const DesktopNavigation: React.FC<ResponsiveNavigationProps> = ({
  activeView,
  setActiveView,
  diagSubMode,
  setDiagSubMode,
  sanctuaryTab,
  setSanctuaryTab,
  darkMode,
  setDarkMode,
  currentUser,
  onGoogleSignIn,
  onSignOut,
}) => {
  return (
    <>
      {/* Desktop Top Navigation Bar (> 768px) */}
      <header
        data-testid="desktop-top-nav"
        className="max-md:hidden sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-[#123D2A] bg-[#F7F9F2]/95 dark:bg-[#071B12]/95"
      >
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          data-greeny-nav="home"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('home');
          }}
          className="text-lg font-extrabold tracking-tight text-[#123D2A] dark:text-[#F7F9F2] whitespace-nowrap shrink-0"
        >
          MYPLANTCARE
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-[#F7F9F2]/80">
          <a
            href="#home"
            data-greeny-nav="home"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('home');
            }}
            className={`hover:text-[#00C878] transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'home' ? 'text-[#00C878] underline underline-offset-8' : ''
            }`}
          >
            Home
          </a>
          <a
            href="#plant-doctor"
            data-greeny-nav="diagnostics"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('diagnostics');
            }}
            className={`hover:text-[#00C878] transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'diagnostics' ? 'text-[#00C878] underline underline-offset-8' : ''
            }`}
          >
            Plant Doctor
          </a>
          <a
            href="#3d-garden"
            data-greeny-nav="virtual-3d"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('virtual-3d');
            }}
            className={`hover:text-[#00C878] transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'virtual-3d' ? 'text-[#00C878] underline underline-offset-8' : ''
            }`}
          >
            3D Garden
          </a>
          <a
            href="#intelligence"
            data-greeny-nav="intelligence"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('intelligence');
            }}
            className={`hover:text-[#00C878] transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'intelligence' ? 'text-[#00C878] underline underline-offset-8' : ''
            }`}
          >
            AI Intelligence
          </a>
          <a
            href="#sanctuary"
            data-greeny-nav="sanctuary"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('sanctuary');
            }}
            className={`hover:text-[#00C878] transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'sanctuary' ? 'text-[#00C878] underline underline-offset-8' : ''
            }`}
          >
            My Sanctuary
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            data-greeny-nav="greeny"
            onClick={() => setActiveView('greeny')}
            className="px-4 py-2 text-xs font-bold text-[#071B12] bg-[#00C878] rounded-xl hover:bg-[#B7F76B] transition-colors whitespace-nowrap shrink-0"
          >
            Meet Greeny AI
          </button>
        </div>
      </header>

      {/* Desktop Secondary Workspace Command Toolbar (> 768px) */}
      <div
        data-testid="desktop-secondary-toolbar"
        className="max-md:hidden border-b border-slate-200 dark:border-[#123D2A] bg-white/80 dark:bg-[#0B2419]/80 px-6 py-2.5"
      >
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              type="button"
              data-greeny-nav="home"
              onClick={() => setActiveView('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'home'
                  ? 'bg-[#123D2A] text-[#B7F76B]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]/60'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              data-greeny-nav="diagnostics"
              onClick={() => {
                setDiagSubMode('doctor');
                setActiveView('diagnostics');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'diagnostics' && diagSubMode === 'doctor'
                  ? 'bg-[#123D2A] text-[#B7F76B]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]/60'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" /> AI Plant Doctor
            </button>
            <button
              type="button"
              onClick={() => {
                setDiagSubMode('identify');
                setActiveView('diagnostics');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'diagnostics' && diagSubMode === 'identify'
                  ? 'bg-[#123D2A] text-[#B7F76B]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]/60'
              }`}
            >
              Identify Studio
            </button>
            <button
              type="button"
              onClick={() => {
                setDiagSubMode('rescue');
                setActiveView('diagnostics');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'diagnostics' && diagSubMode === 'rescue'
                  ? 'bg-[#123D2A] text-[#B7F76B]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]/60'
              }`}
            >
              Plant Rescue AI
            </button>
            <button
              type="button"
              data-greeny-nav="virtual-3d"
              onClick={() => setActiveView('virtual-3d')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'virtual-3d'
                  ? 'bg-[#123D2A] text-[#B7F76B]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]/60'
              }`}
            >
              <Box className="w-3.5 h-3.5" /> 3D Virtual Garden
            </button>
            <button
              type="button"
              data-greeny-nav="intelligence"
              onClick={() => setActiveView('intelligence')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'intelligence'
                  ? 'bg-[#123D2A] text-[#B7F76B]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]/60'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> AI Intelligence (11 Tools)
            </button>
            <button
              type="button"
              data-greeny-nav="sanctuary"
              onClick={() => {
                setSanctuaryTab('dashboard');
                setActiveView('sanctuary');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'sanctuary' && sanctuaryTab !== 'iot'
                  ? 'bg-[#123D2A] text-[#B7F76B]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> My Garden & 2D Map
            </button>
            <button
              type="button"
              onClick={() => {
                setSanctuaryTab('iot');
                setActiveView('sanctuary');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'sanctuary' && sanctuaryTab === 'iot'
                  ? 'bg-[#123D2A] text-[#B7F76B]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]/60'
              }`}
            >
              IoT Irrigation
            </button>
            <button
              type="button"
              data-greeny-nav="ecosystem"
              onClick={() => setActiveView('ecosystem')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'ecosystem'
                  ? 'bg-[#123D2A] text-[#B7F76B]'
                  : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-100 dark:hover:bg-[#123D2A]/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Library, Academy & Market
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle Light or Dark Theme"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-slate-700 dark:text-[#F7F9F2] whitespace-nowrap shrink-0"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-[#D4B56A]" /> : <Moon className="w-3.5 h-3.5 text-[#123D2A]" />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            {currentUser ? (
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#123D2A] text-slate-800 dark:text-[#F7F9F2] whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" /> {currentUser.displayName || currentUser.email}
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#123D2A] text-[#F7F9F2] hover:bg-[#00C878] hover:text-[#071B12] transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" /> Google Sign-In
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * 2. MOBILE HEADER (<= 768px)
 * Keeps only the website logo and hamburger menu button in the mobile header.
 * All top navigation options are hidden here and placed inside the left-side swipe sidebar.
 */
export const MobileHeader: React.FC<{
  setActiveView: (view: MainView) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ setActiveView, mobileSidebarOpen, setMobileSidebarOpen }) => {
  return (
    <header
      data-testid="mobile-header"
      className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-[#123D2A] bg-[#F7F9F2]/95 dark:bg-[#071B12]/95 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="mobile-hamburger-button"
          aria-label="Open navigation menu"
          aria-expanded={mobileSidebarOpen}
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 rounded-xl border border-slate-200 dark:border-[#123D2A] bg-white dark:bg-[#0B2419] text-[#123D2A] dark:text-[#00C878] hover:border-[#00C878] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('home');
          }}
          className="text-base font-extrabold tracking-tight text-[#123D2A] dark:text-[#F7F9F2] flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#00C878] inline-block" />
          MYPLANTCARE
        </a>
      </div>

      <span className="text-[10px] font-mono text-slate-500 dark:text-[#B7F76B]/80">
        Swipe Right → Menu
      </span>
    </header>
  );
};

/**
 * 3. SWIPE GESTURE HANDLER (<= 768px)
 * Detects left-edge swipe right (`startX <= 28px`, `deltaX > 50px`) to open the sidebar
 * and right-to-left swipe (`deltaX < -50px`) when open to close it.
 * Also provides an invisible 18px left-edge touch strip on mobile devices and Escape key closing.
 */
export const SwipeGestureHandler: React.FC<{
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ mobileSidebarOpen, setMobileSidebarOpen }) => {
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    trackingOpen: boolean;
    trackingClose: boolean;
  }>({
    startX: 0,
    startY: 0,
    trackingOpen: false,
    trackingClose: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  // Prevent background page scrolling while mobile sidebar is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mobileSidebarOpen && window.innerWidth <= 768) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth > 768) return;
      const touch = e.touches[0];
      if (!touch) return;
      const startX = touch.clientX;
      const startY = touch.clientY;
      // Left edge threshold (<= 30px) to open sidebar without interfering with 3D canvas or carousels
      const isLeftEdge = !mobileSidebarOpen && startX <= 30;
      const isClosableSwipe = mobileSidebarOpen;

      touchStateRef.current = {
        startX,
        startY,
        trackingOpen: isLeftEdge,
        trackingClose: isClosableSwipe,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (window.innerWidth > 768) return;
      const state = touchStateRef.current;
      if (!state.trackingOpen && !state.trackingClose) return;
      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;

      // Ignore vertical scroll gestures
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      if (state.trackingOpen && deltaX > 52 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        state.trackingOpen = false;
        setMobileSidebarOpen(true);
      } else if (state.trackingClose && deltaX < -52 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        state.trackingClose = false;
        setMobileSidebarOpen(false);
      }
    };

    const onTouchEnd = () => {
      touchStateRef.current.trackingOpen = false;
      touchStateRef.current.trackingClose = false;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  return (
    <div
      data-testid="mobile-left-edge-swipe-zone"
      aria-hidden="true"
      className="md:hidden fixed left-0 top-14 bottom-0 w-3 z-30 pointer-events-auto"
    />
  );
};

/**
 * 4. NAVIGATION OVERLAY (<= 768px)
 * Semi-transparent dark backdrop behind the open mobile sidebar.
 */
export const NavigationOverlay: React.FC<{
  mobileSidebarOpen: boolean;
  onClose: () => void;
}> = ({ mobileSidebarOpen, onClose }) => {
  if (!mobileSidebarOpen) return null;
  return (
    <div
      data-testid="mobile-navigation-overlay"
      onClick={onClose}
      aria-hidden="true"
      className="md:hidden fixed inset-0 z-50 bg-black/65 backdrop-blur-xs transition-opacity duration-300"
    />
  );
};

/**
 * 5. MOBILE LEFT-SIDE SWIPE SIDEBAR (<= 768px)
 * Width: 78vw, max-width: 320px, height: 100dvh, fixed left-0 top-0, rounded right corners.
 * Preserves ALL existing navigation items in the exact order with icons, active indicators,
 * 3D GREENY mascot in the header, and theme/account controls at the bottom.
 */
export const MobileSidebar: React.FC<ResponsiveNavigationProps> = ({
  activeView,
  setActiveView,
  diagSubMode,
  setDiagSubMode,
  sanctuaryTab,
  setSanctuaryTab,
  ecosystemSec,
  setEcosystemSec,
  darkMode,
  setDarkMode,
  currentUser,
  onGoogleSignIn,
  onSignOut,
  mobileSidebarOpen,
  setMobileSidebarOpen,
}) => {
  const handleSelectNav = (action: () => void) => {
    action();
    setMobileSidebarOpen(false);
  };

  return (
    <aside
      data-testid="mobile-sidebar-drawer"
      aria-label="Mobile Navigation Sidebar"
      aria-hidden={!mobileSidebarOpen}
      className={`md:hidden fixed left-0 top-0 z-50 w-[78vw] max-w-[320px] h-[100dvh] rounded-r-3xl shadow-2xl border-r border-slate-200 dark:border-[#123D2A] bg-[#F7F9F2] dark:bg-[#071B12] text-[#071B12] dark:text-[#F7F9F2] flex flex-col justify-between overflow-hidden transition-transform duration-300 ease-out ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
      }`}
    >
      {/* SIDEBAR HEADER: MyPlantCare Logo + Name + Cute Small 3D GREENY + Close Button */}
      <div className="p-4 border-b border-slate-200 dark:border-[#123D2A] bg-white/90 dark:bg-[#0B2419]/90 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl border border-[#00C878]/40 bg-[#071B12] overflow-hidden shrink-0 flex items-center justify-center">
            {mobileSidebarOpen && (
              <GreenyCharacter3D
                animationState="GREETING"
                customization={DEFAULT_GREENY_CUSTOMIZATION}
                speechAmplitude={0.18}
                size="floating"
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-extrabold tracking-tight text-[#123D2A] dark:text-white truncate">
              MYPLANTCARE
            </div>
            <div className="text-[11px] font-mono text-[#00C878] truncate">
              GREENY 3D · Botanical AI
            </div>
          </div>
        </div>

        <button
          type="button"
          data-testid="mobile-sidebar-close-button"
          aria-label="Close navigation menu"
          onClick={() => setMobileSidebarOpen(false)}
          className="p-2 rounded-xl border border-slate-200 dark:border-[#123D2A] bg-slate-100 dark:bg-[#123D2A] text-slate-700 dark:text-[#F7F9F2] hover:border-[#00C878] transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* SCROLLABLE NAVIGATION ITEMS LIST (ALL EXISTING OPTIONS IN ORDER) */}
      <nav
        aria-label="All MyPlantCare Navigation Options"
        className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4"
      >
        {/* Primary Navigation Section */}
        <div className="space-y-1.5">
          <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-[#B7F76B]/70">
            Primary Navigation
          </div>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('home'))}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeView === 'home'
                ? 'bg-[#00C878]/15 dark:bg-[#123D2A] text-[#00C878] dark:text-[#B7F76B] border border-[#00C878]/50'
                : 'text-slate-700 dark:text-[#F7F9F2]/85 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Home className="w-4 h-4 text-[#00C878]" />
              <span>Home</span>
            </span>
            {activeView === 'home' && <span className="w-2 h-2 rounded-full bg-[#00C878]" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('diagnostics'))}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeView === 'diagnostics'
                ? 'bg-[#00C878]/15 dark:bg-[#123D2A] text-[#00C878] dark:text-[#B7F76B] border border-[#00C878]/50'
                : 'text-slate-700 dark:text-[#F7F9F2]/85 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Stethoscope className="w-4 h-4 text-[#00C878]" />
              <span>Plant Doctor</span>
            </span>
            {activeView === 'diagnostics' && <span className="w-2 h-2 rounded-full bg-[#00C878]" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('virtual-3d'))}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeView === 'virtual-3d'
                ? 'bg-[#00C878]/15 dark:bg-[#123D2A] text-[#00C878] dark:text-[#B7F76B] border border-[#00C878]/50'
                : 'text-slate-700 dark:text-[#F7F9F2]/85 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Box className="w-4 h-4 text-[#00C878]" />
              <span>3D Garden</span>
            </span>
            {activeView === 'virtual-3d' && <span className="w-2 h-2 rounded-full bg-[#00C878]" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('intelligence'))}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeView === 'intelligence'
                ? 'bg-[#00C878]/15 dark:bg-[#123D2A] text-[#00C878] dark:text-[#B7F76B] border border-[#00C878]/50'
                : 'text-slate-700 dark:text-[#F7F9F2]/85 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-[#00C878]" />
              <span>AI Intelligence</span>
            </span>
            {activeView === 'intelligence' && <span className="w-2 h-2 rounded-full bg-[#00C878]" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('sanctuary'))}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeView === 'sanctuary'
                ? 'bg-[#00C878]/15 dark:bg-[#123D2A] text-[#00C878] dark:text-[#B7F76B] border border-[#00C878]/50'
                : 'text-slate-700 dark:text-[#F7F9F2]/85 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4 text-[#00C878]" />
              <span>My Sanctuary</span>
            </span>
            {activeView === 'sanctuary' && <span className="w-2 h-2 rounded-full bg-[#00C878]" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('greeny'))}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeView === 'greeny'
                ? 'bg-[#00C878] text-[#071B12]'
                : 'bg-[#00C878]/20 text-[#123D2A] dark:text-[#B7F76B] border border-[#00C878]/40'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4" />
              <span>Meet Greeny AI</span>
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace Command Modules (Exact Secondary Bar Options) */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-[#123D2A]">
          <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-[#B7F76B]/70">
            Workspace Modules
          </div>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('home'))}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeView === 'home'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-700 dark:text-[#F7F9F2]/80 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Home className="w-3.5 h-3.5 text-[#00C878]" />
              <span>Overview</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setDiagSubMode('doctor');
                setActiveView('diagnostics');
              })
            }
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeView === 'diagnostics' && diagSubMode === 'doctor'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-700 dark:text-[#F7F9F2]/80 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Stethoscope className="w-3.5 h-3.5 text-[#00C878]" />
              <span>AI Plant Doctor</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setDiagSubMode('identify');
                setActiveView('diagnostics');
              })
            }
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeView === 'diagnostics' && diagSubMode === 'identify'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-700 dark:text-[#F7F9F2]/80 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-[#00C878]" />
              <span>Identify Studio</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setDiagSubMode('rescue');
                setActiveView('diagnostics');
              })
            }
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeView === 'diagnostics' && diagSubMode === 'rescue'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-700 dark:text-[#F7F9F2]/80 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <HeartPulse className="w-3.5 h-3.5 text-[#00C878]" />
              <span>Plant Rescue AI</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('virtual-3d'))}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeView === 'virtual-3d'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-700 dark:text-[#F7F9F2]/80 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Box className="w-3.5 h-3.5 text-[#00C878]" />
              <span>3D Virtual Garden</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('intelligence'))}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeView === 'intelligence'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-700 dark:text-[#F7F9F2]/80 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Cpu className="w-3.5 h-3.5 text-[#00C878]" />
              <span>AI Intelligence (11 Tools)</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setSanctuaryTab('dashboard');
                setActiveView('sanctuary');
              })
            }
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeView === 'sanctuary' && sanctuaryTab !== 'iot'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-700 dark:text-[#F7F9F2]/80 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-3.5 h-3.5 text-[#00C878]" />
              <span>My Garden & 2D Map</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setSanctuaryTab('iot');
                setActiveView('sanctuary');
              })
            }
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeView === 'sanctuary' && sanctuaryTab === 'iot'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-700 dark:text-[#F7F9F2]/80 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Droplets className="w-3.5 h-3.5 text-[#00C878]" />
              <span>IoT Irrigation</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setEcosystemSec('library');
                setActiveView('ecosystem');
              })
            }
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              activeView === 'ecosystem' && ecosystemSec === 'library'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-700 dark:text-[#F7F9F2]/80 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <BookOpen className="w-3.5 h-3.5 text-[#00C878]" />
              <span>Library, Academy & Market</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setEcosystemSec('academy');
                setActiveView('ecosystem');
              })
            }
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl text-xs font-medium transition-all ${
              activeView === 'ecosystem' && ecosystemSec === 'academy'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#00C878]" />
              <span>Learning Centre</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setEcosystemSec('community');
                setActiveView('ecosystem');
              })
            }
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl text-xs font-medium transition-all ${
              activeView === 'ecosystem' && ecosystemSec === 'community'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-3.5 h-3.5 text-[#00C878]" />
              <span>Community</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setEcosystemSec('marketplace');
                setActiveView('ecosystem');
              })
            }
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl text-xs font-medium transition-all ${
              activeView === 'ecosystem' && ecosystemSec === 'marketplace'
                ? 'bg-[#123D2A] text-[#B7F76B]'
                : 'text-slate-600 dark:text-[#F7F9F2]/75 hover:bg-slate-200/60 dark:hover:bg-[#0B2419]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#00C878]" />
              <span>Plant Marketplace</span>
            </span>
          </button>
        </div>
      </nav>

      {/* SIDEBAR BOTTOM SECTION: Theme Switcher + User Profile / Login / Logout */}
      <div className="p-3.5 border-t border-slate-200 dark:border-[#123D2A] bg-white/90 dark:bg-[#0B2419]/90 space-y-2 shrink-0">
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-slate-200 dark:border-[#123D2A] bg-slate-50 dark:bg-[#071B12] text-slate-800 dark:text-[#F7F9F2]"
        >
          <span className="flex items-center gap-2">
            {darkMode ? (
              <Sun className="w-4 h-4 text-[#D4B56A]" />
            ) : (
              <Moon className="w-4 h-4 text-[#123D2A]" />
            )}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </span>
          <span className="text-[10px] font-mono text-[#00C878]">Theme</span>
        </button>

        {currentUser ? (
          <button
            type="button"
            onClick={() => {
              onSignOut();
              setMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-100 dark:bg-[#123D2A] text-slate-800 dark:text-[#F7F9F2]"
          >
            <span className="flex items-center gap-2 truncate">
              <LogOut className="w-4 h-4 text-[#00C878] shrink-0" />
              <span className="truncate">{currentUser.displayName || currentUser.email}</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400 shrink-0">Sign Out</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onGoogleSignIn();
              setMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[#123D2A] text-[#F7F9F2] hover:bg-[#00C878] hover:text-[#071B12] transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Google Sign-In</span>
          </button>
        )}
      </div>
    </aside>
  );
};
