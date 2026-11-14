import React, { useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { motion, useDragControls, PanInfo, AnimatePresence } from 'motion/react';
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
  Map,
  FileText,
} from 'lucide-react';
import type { MainView } from '../../App';
import type { DiagnosticSubMode } from '../DiagnosticLaboratory';
import type { SanctuaryTab } from '../SanctuaryManager';
import { GreenyCharacter3D } from '../greeny/GreenyCharacter3D';
import { DEFAULT_GREENY_CUSTOMIZATION } from '../greeny/GreenyTypes';

export interface ResponsiveNavigationProps {
  activeView: MainView;
  setActiveView: (view: MainView) => void;
  onOpenAiToolsGrid?: () => void;
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
 * 1. DESKTOP AND LAPTOP NAVIGATION (> 768px)
 * 3-Zone AI Botanical Observatory header + streamlined workspace command bar.
 */
export const DesktopNavigation: React.FC<ResponsiveNavigationProps> = ({
  activeView,
  setActiveView,
  onOpenAiToolsGrid,
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
  const navLinkClass = (isActive: boolean) =>
    `relative py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      isActive
        ? 'text-[#10251D] dark:text-[#00D69A] font-bold after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-[#00D69A] after:rounded-full'
        : 'text-[#4A665B] dark:text-[#B6CDB4] hover:text-[#174C38] dark:hover:text-[#FAF7EE]'
    }`;

  const toolbarBtnClass = (isActive: boolean) =>
    `flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
      isActive
        ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] shadow-sm'
        : 'text-[#4A665B] dark:text-[#B6CDB4] hover:bg-[#E9F0E6] dark:hover:bg-[#193A2E] hover:text-[#10251D] dark:hover:text-[#FAF7EE]'
    }`;

  return (
    <>
      <header
        data-testid="desktop-top-nav"
        className="max-[769px]:hidden sticky top-0 z-40 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 bg-[#FAF7EE]/88 dark:bg-[#10251D]/88 backdrop-blur-xl transition-colors"
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 lg:gap-8 px-6 py-3.5">
          {/* Zone 1: Wordmark */}
          <a
            href="#top"
            data-greeny-nav="home"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('home');
            }}
            className="font-display text-lg font-extrabold tracking-tight text-[#10251D] dark:text-[#FAF7EE] whitespace-nowrap shrink-0 flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D69A] rounded-lg px-1"
          >
            <span
              className="inline-flex w-2.5 h-2.5 rounded-sm rotate-45 bg-gradient-to-tr from-[#00D69A] to-[#C7F36B]"
              aria-hidden="true"
            />
            MYPLANTCARE
          </a>

          {/* Zone 2: Primary Single-Line Links */}
          <nav className="flex items-center gap-5 lg:gap-7 text-sm font-medium">
            <a
              href="#home"
              data-greeny-nav="home"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('home');
              }}
              className={navLinkClass(activeView === 'home')}
            >
              Observatory
            </a>
            <a
              href="#plant-doctor"
              data-greeny-nav="diagnostics"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('diagnostics');
              }}
              className={navLinkClass(activeView === 'diagnostics')}
            >
              Plant Doctor
            </a>
            <a
              href="/ai-tools"
              data-greeny-nav="intelligence"
              onClick={(e) => {
                e.preventDefault();
                if (onOpenAiToolsGrid) {
                  onOpenAiToolsGrid();
                } else {
                  setActiveView('intelligence');
                }
              }}
              className={navLinkClass(activeView === 'intelligence')}
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
              className={navLinkClass(activeView === 'sanctuary')}
            >
              My Garden
            </a>
            <a
              href="#3d-garden"
              data-greeny-nav="virtual-3d"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('virtual-3d');
              }}
              className={navLinkClass(activeView === 'virtual-3d')}
            >
              3D Studio
            </a>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              data-greeny-nav="greeny"
              onClick={() => setActiveView('greeny')}
              className="px-4 py-2 text-xs font-display font-bold rounded-xl bg-[#174C38] hover:bg-[#10251D] dark:bg-[#00D69A] dark:hover:bg-[#C7F36B] text-[#FAF7EE] dark:text-[#10251D] transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Meet Greeny AI
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Secondary Workspace Command Ribbon (> 768px) */}
      <div
        data-testid="desktop-secondary-toolbar"
        className="max-[769px]:hidden border-b border-[#174C38]/10 dark:border-[#B6CDB4]/12 bg-[#FFFFFF]/88 dark:bg-[#0B1B15]/92 backdrop-blur-md px-4 lg:px-6 py-2 transition-colors"
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 py-0.5">
            <button
              type="button"
              data-greeny-nav="home"
              onClick={() => setActiveView('home')}
              className={toolbarBtnClass(activeView === 'home')}
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
              className={toolbarBtnClass(activeView === 'diagnostics' && diagSubMode === 'doctor')}
            >
              <Stethoscope className="w-3.5 h-3.5" /> AI Plant Doctor
            </button>
            <button
              type="button"
              data-greeny-nav="diagnostics"
              onClick={() => {
                setDiagSubMode('identify');
                setActiveView('diagnostics');
              }}
              className={toolbarBtnClass(activeView === 'diagnostics' && diagSubMode === 'identify')}
            >
              Identify Studio
            </button>
            <button
              type="button"
              data-greeny-nav="diagnostics"
              onClick={() => {
                setDiagSubMode('rescue');
                setActiveView('diagnostics');
              }}
              className={toolbarBtnClass(activeView === 'diagnostics' && diagSubMode === 'rescue')}
            >
              Plant Rescue AI
            </button>
            <button
              type="button"
              data-greeny-nav="intelligence"
              onClick={() => (onOpenAiToolsGrid ? onOpenAiToolsGrid() : setActiveView('intelligence'))}
              className={toolbarBtnClass(activeView === 'intelligence')}
            >
              <Cpu className="w-3.5 h-3.5" /> AI Tools Centre
            </button>
            <button
              type="button"
              data-greeny-nav="sanctuary"
              onClick={() => {
                setSanctuaryTab('dashboard');
                setActiveView('sanctuary');
              }}
              className={toolbarBtnClass(
                activeView === 'sanctuary' && sanctuaryTab !== 'iot' && sanctuaryTab !== 'garden-map'
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard & Garden
            </button>
            <button
              type="button"
              data-greeny-nav="sanctuary"
              onClick={() => {
                setSanctuaryTab('garden-map');
                setActiveView('sanctuary');
              }}
              className={toolbarBtnClass(activeView === 'sanctuary' && sanctuaryTab === 'garden-map')}
            >
              <Map className="w-3.5 h-3.5" /> 2D Floor Plan
            </button>
            <button
              type="button"
              data-greeny-nav="sanctuary"
              onClick={() => {
                setSanctuaryTab('iot');
                setActiveView('sanctuary');
              }}
              className={toolbarBtnClass(activeView === 'sanctuary' && sanctuaryTab === 'iot')}
            >
              IoT Irrigation
            </button>
            <button
              type="button"
              data-greeny-nav="virtual-3d"
              onClick={() => setActiveView('virtual-3d')}
              className={toolbarBtnClass(activeView === 'virtual-3d')}
            >
              <Box className="w-3.5 h-3.5" /> 3D & AR
            </button>
            <button
              type="button"
              data-greeny-nav="ecosystem"
              onClick={() => setActiveView('ecosystem')}
              className={toolbarBtnClass(activeView === 'ecosystem')}
            >
              <BookOpen className="w-3.5 h-3.5" /> Library & Academy
            </button>
            <button
              type="button"
              data-testid="nav-google-workspace-btn"
              data-greeny-nav="workspace"
              onClick={() => setActiveView('workspace')}
              className={toolbarBtnClass(activeView === 'workspace')}
            >
              <FileText className="w-3.5 h-3.5" /> Google Docs & Chat
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle Light or Dark Theme"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#174C38]/16 dark:border-[#B6CDB4]/20 bg-[#FAF7EE] dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] hover:border-[#00D69A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 text-[#F5CA62]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#174C38]" />
              )}
              {darkMode ? 'Light Ivory' : 'Midnight Dark'}
            </button>

            {currentUser ? (
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#FAF7EE] dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] border border-[#174C38]/16 dark:border-[#B6CDB4]/20 hover:border-[#FF806B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> {currentUser.displayName || currentUser.email}
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#10251D] dark:bg-[#193A2E] text-[#FAF7EE] dark:text-[#C7F36B] border border-transparent dark:border-[#00D69A]/30 hover:bg-[#174C38] dark:hover:bg-[#00D69A] dark:hover:text-[#10251D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
 */
export const MobileHeader: React.FC<{
  setActiveView: (view: MainView) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ setActiveView, mobileSidebarOpen, setMobileSidebarOpen }) => {
  return (
    <header
      data-testid="mobile-header"
      className="min-[769px]:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 bg-[#FAF7EE]/92 dark:bg-[#10251D]/92 backdrop-blur-xl transition-colors"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="mobile-hamburger-button"
          aria-label="Open navigation menu"
          aria-expanded={mobileSidebarOpen}
          onClick={() => setMobileSidebarOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#174C38]/16 dark:border-[#00D69A]/30 bg-white dark:bg-[#153026] text-[#10251D] dark:text-[#00D69A] hover:border-[#00D69A] transition-colors shadow-xs"
        >
          <Menu className="w-5 h-5" />
        </button>

        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('home');
          }}
          className="font-display text-base font-extrabold tracking-tight text-[#10251D] dark:text-[#FAF7EE] whitespace-nowrap flex items-center gap-2"
        >
          <span
            className="inline-flex w-2 h-2 rounded-sm rotate-45 bg-gradient-to-tr from-[#00D69A] to-[#C7F36B]"
            aria-hidden="true"
          />
          MYPLANTCARE
        </a>
      </div>

      <span className="text-[11px] font-mono text-[#4A665B] dark:text-[#B6CDB4]">
        OBSERVATORY
      </span>
    </header>
  );
};

/**
 * 3. SWIPE GESTURE HANDLER (<= 768px)
 */
export const SwipeGestureHandler: React.FC<{
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ mobileSidebarOpen, setMobileSidebarOpen }) => {
  const dragControls = useDragControls();
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
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'CANVAS' || target.closest('input[type="range"]'))) {
        return;
      }
      const touch = e.touches[0];
      if (!touch) return;
      const startX = touch.clientX;
      const startY = touch.clientY;
      touchStateRef.current = {
        startX,
        startY,
        trackingOpen: !mobileSidebarOpen && startX <= 28,
        trackingClose: mobileSidebarOpen,
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
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      if (state.trackingOpen && deltaX > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        state.trackingOpen = false;
        setMobileSidebarOpen(true);
      } else if (state.trackingClose && deltaX < -48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
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

  const handleEdgePanEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!mobileSidebarOpen && info.offset.x > 42 && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 1.3) {
      setMobileSidebarOpen(true);
    }
  };

  return (
    <motion.div
      data-testid="mobile-left-edge-swipe-zone"
      aria-hidden="true"
      drag="x"
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.05}
      dragSnapToOrigin
      onPanEnd={handleEdgePanEnd}
      onPointerDown={(e) => {
        if (!mobileSidebarOpen && e.clientX <= 28) {
          dragControls.start(e);
        }
      }}
      style={{ touchAction: 'pan-y' }}
      className="min-[769px]:hidden fixed left-0 top-14 bottom-0 w-6 z-30 pointer-events-auto"
    />
  );
};

/**
 * 4. NAVIGATION OVERLAY (<= 768px)
 */
export const NavigationOverlay: React.FC<{
  mobileSidebarOpen: boolean;
  onClose: () => void;
}> = ({ mobileSidebarOpen, onClose }) => {
  return (
    <AnimatePresence>
      {mobileSidebarOpen && (
        <motion.div
          data-testid="mobile-navigation-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          aria-hidden="true"
          className="min-[769px]:hidden fixed inset-0 z-[60] bg-[#10251D]/72 backdrop-blur-xs"
        />
      )}
    </AnimatePresence>
  );
};

/**
 * 5. MOBILE LEFT-SIDE SWIPE SIDEBAR (<= 768px)
 */
export const MobileSidebar: React.FC<ResponsiveNavigationProps> = ({
  activeView,
  setActiveView,
  onOpenAiToolsGrid,
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

  const handleDrawerDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -55 || info.velocity.x < -280) {
      setMobileSidebarOpen(false);
    }
  };

  const navItemClass = (isActive: boolean) =>
    `w-full min-h-[44px] flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
      isActive
        ? 'bg-[#00D69A]/14 dark:bg-[#193A2E] text-[#10251D] dark:text-[#C7F36B] border border-[#00D69A]/45'
        : 'text-[#10251D]/85 dark:text-[#FAF7EE]/85 hover:bg-white/80 dark:hover:bg-[#153026]'
    }`;

  const subModuleClass = (isActive: boolean) =>
    `w-full min-h-[44px] flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D]'
        : 'text-[#4A665B] dark:text-[#B6CDB4] hover:bg-white/80 dark:hover:bg-[#153026]'
    }`;

  return (
    <motion.aside
      data-testid="mobile-sidebar-drawer"
      aria-label="Mobile Navigation Sidebar"
      aria-hidden={!mobileSidebarOpen}
      initial={false}
      animate={{ x: mobileSidebarOpen ? 0 : '-100%' }}
      transition={{ type: 'spring', stiffness: 360, damping: 34 }}
      drag={mobileSidebarOpen ? 'x' : false}
      dragConstraints={{ left: -320, right: 0 }}
      dragElastic={{ left: 0.12, right: 0.02 }}
      onDragEnd={handleDrawerDragEnd}
      className={`min-[769px]:hidden fixed left-0 top-0 z-[70] w-[78vw] max-w-[320px] h-[100dvh] rounded-r-3xl shadow-2xl border-r border-[#174C38]/16 dark:border-[#00D69A]/22 bg-[#FAF7EE] dark:bg-[#10251D] text-[#10251D] dark:text-[#FAF7EE] flex flex-col justify-between overflow-hidden ${
        mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div className="p-4 border-b border-[#174C38]/12 dark:border-[#B6CDB4]/14 bg-white/95 dark:bg-[#0B1B15]/95 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl border border-[#00D69A]/35 bg-[#10251D] overflow-hidden shrink-0 flex items-center justify-center">
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
            <div className="font-display text-sm font-extrabold tracking-tight text-[#10251D] dark:text-[#FAF7EE] truncate">
              MYPLANTCARE
            </div>
            <div className="text-[11px] font-mono text-[#0F6B50] dark:text-[#00D69A] truncate">
              Botanical Observatory
            </div>
          </div>
        </div>

        <button
          type="button"
          data-testid="mobile-sidebar-close-button"
          aria-label="Close navigation menu"
          onClick={() => setMobileSidebarOpen(false)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#174C38]/15 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE] hover:border-[#00D69A] transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav
        aria-label="All MyPlantCare Navigation Options"
        className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4"
      >
        <div className="space-y-1.5">
          <div className="px-2 text-[11px] font-mono uppercase tracking-wider text-[#4A665B] dark:text-[#B6CDB4]">
            Primary Navigation
          </div>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('home'))}
            className={navItemClass(activeView === 'home')}
          >
            <span className="flex items-center gap-2.5">
              <Home className="w-4 h-4 text-[#00D69A]" />
              <span>Observatory Home</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('diagnostics'))}
            className={navItemClass(activeView === 'diagnostics')}
          >
            <span className="flex items-center gap-2.5">
              <Stethoscope className="w-4 h-4 text-[#00D69A]" />
              <span>Plant Doctor</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => (onOpenAiToolsGrid ? onOpenAiToolsGrid() : setActiveView('intelligence')))}
            className={navItemClass(activeView === 'intelligence')}
          >
            <span className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-[#00D69A]" />
              <span>AI Intelligence</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('sanctuary'))}
            className={navItemClass(activeView === 'sanctuary')}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4 text-[#00D69A]" />
              <span>My Garden</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('virtual-3d'))}
            className={navItemClass(activeView === 'virtual-3d')}
          >
            <span className="flex items-center gap-2.5">
              <Box className="w-4 h-4 text-[#00D69A]" />
              <span>3D & AR Garden</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav(() => setActiveView('greeny'))}
            className={`w-full min-h-[44px] flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeView === 'greeny'
                ? 'bg-[#00D69A] text-[#10251D]'
                : 'bg-[#174C38] text-[#FAF7EE] dark:bg-[#193A2E] dark:text-[#C7F36B] border border-[#00D69A]/35'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4" />
              <span>Meet Greeny AI</span>
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/14">
          <div className="px-2 text-[11px] font-mono uppercase tracking-wider text-[#4A665B] dark:text-[#B6CDB4]">
            Workspace Modules
          </div>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setDiagSubMode('doctor');
                setActiveView('diagnostics');
              })
            }
            className={subModuleClass(activeView === 'diagnostics' && diagSubMode === 'doctor')}
          >
            <span className="flex items-center gap-2.5">
              <Stethoscope className="w-3.5 h-3.5" />
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
            className={subModuleClass(activeView === 'diagnostics' && diagSubMode === 'identify')}
          >
            <span className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5" />
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
            className={subModuleClass(activeView === 'diagnostics' && diagSubMode === 'rescue')}
          >
            <span className="flex items-center gap-2.5">
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Plant Rescue AI</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectNav(() => {
                setSanctuaryTab('garden-map');
                setActiveView('sanctuary');
              })
            }
            className={subModuleClass(activeView === 'sanctuary' && sanctuaryTab === 'garden-map')}
          >
            <span className="flex items-center gap-2.5">
              <Map className="w-3.5 h-3.5" />
              <span>2D Garden Floor Plan</span>
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
            className={subModuleClass(activeView === 'sanctuary' && sanctuaryTab === 'iot')}
          >
            <span className="flex items-center gap-2.5">
              <Droplets className="w-3.5 h-3.5" />
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
            className={subModuleClass(activeView === 'ecosystem' && ecosystemSec === 'library')}
          >
            <span className="flex items-center gap-2.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Botanical Library</span>
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
            className={subModuleClass(activeView === 'ecosystem' && ecosystemSec === 'academy')}
          >
            <span className="flex items-center gap-2.5">
              <GraduationCap className="w-3.5 h-3.5" />
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
            className={subModuleClass(activeView === 'ecosystem' && ecosystemSec === 'community')}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-3.5 h-3.5" />
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
            className={subModuleClass(activeView === 'ecosystem' && ecosystemSec === 'marketplace')}
          >
            <span className="flex items-center gap-2.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Plant Marketplace</span>
            </span>
          </button>

          <button
            type="button"
            data-testid="mobile-nav-google-workspace-btn"
            onClick={() =>
              handleSelectNav(() => {
                setActiveView('workspace');
              })
            }
            className={subModuleClass(activeView === 'workspace')}
          >
            <span className="flex items-center gap-2.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Google Docs & Chat</span>
            </span>
          </button>
        </div>
      </nav>

      <div className="p-3.5 border-t border-[#174C38]/12 dark:border-[#B6CDB4]/14 bg-white/95 dark:bg-[#0B1B15]/95 space-y-2 shrink-0">
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-[#174C38]/15 dark:border-[#00D69A]/25 bg-[#FAF7EE] dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE]"
        >
          <span className="flex items-center gap-2">
            {darkMode ? (
              <Sun className="w-4 h-4 text-[#F5CA62]" />
            ) : (
              <Moon className="w-4 h-4 text-[#174C38]" />
            )}
            <span>{darkMode ? 'Light Ivory Theme' : 'Midnight Dark Theme'}</span>
          </span>
          <span className="text-[11px] font-mono text-[#00D69A]">Theme</span>
        </button>

        {currentUser ? (
          <button
            type="button"
            onClick={() => {
              onSignOut();
              setMobileSidebarOpen(false);
            }}
            className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-[#FAF7EE] dark:bg-[#153026] text-[#10251D] dark:text-[#FAF7EE]"
          >
            <span className="flex items-center gap-2 truncate">
              <LogOut className="w-4 h-4 text-[#00D69A] shrink-0" />
              <span className="truncate">{currentUser.displayName || currentUser.email}</span>
            </span>
            <span className="text-[11px] font-medium text-[#FF806B] shrink-0">Sign Out</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onGoogleSignIn();
              setMobileSidebarOpen(false);
            }}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[#174C38] dark:bg-[#00D69A] text-[#FAF7EE] dark:text-[#10251D] hover:brightness-110 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Google Sign-In</span>
          </button>
        )}
      </div>
    </motion.aside>
  );
};
