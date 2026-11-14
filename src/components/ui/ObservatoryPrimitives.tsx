import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ScanLine, Sparkles } from 'lucide-react';
import { BotanicalImage } from './BotanicalImage';

export interface ObservatoryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'glass' | 'emerald' | 'subtle';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const ObservatoryCard: React.FC<ObservatoryCardProps> = ({
  variant = 'surface',
  interactive = false,
  padding = 'md',
  className = '',
  children,
  ...rest
}) => {
  const variantClass = {
    surface: 'obs-card',
    glass: 'obs-glass',
    emerald:
      'bg-[#10251D] dark:bg-[#0B1B15] text-[#FAF7EE] border border-[#00D69A]/25 shadow-[0_20px_50px_-24px_rgba(0,214,154,0.3)]',
    subtle:
      'bg-[#F1ECE0]/70 dark:bg-[#153026]/70 border border-[#174C38]/10 dark:border-[#B6CDB4]/14',
  }[variant];

  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding];

  return (
    <div
      className={`rounded-2xl ${variantClass} ${interactive ? 'obs-card-interactive' : ''} ${paddingClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export const ObservatorySectionHeader: React.FC<{
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}> = ({ eyebrow, title, subtitle, action, align = 'left', className = '' }) => (
  <div
    className={`flex flex-col ${
      align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'
    } gap-4 ${className}`}
  >
    <div className={align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-2xl'}>
      <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[#0F6B50] dark:text-[#00D69A] mb-2">
        {eyebrow}
      </p>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold tracking-tight text-[#10251D] dark:text-[#FAF7EE]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2.5 text-sm sm:text-base text-[#4A665B] dark:text-[#B6CDB4] leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const MagneticButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  }
> = ({ variant = 'primary', className = '', children, ...props }) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLButtonElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
    setOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  const variantClasses = {
    primary:
      'bg-[#174C38] hover:bg-[#10251D] dark:bg-[#00D69A] dark:hover:bg-[#C7F36B] text-[#FAF7EE] dark:text-[#10251D] shadow-lg shadow-[#174C38]/20 dark:shadow-[#00D69A]/20',
    secondary:
      'bg-[#FFFFFF] hover:bg-[#F1ECE0] dark:bg-[#153026] dark:hover:bg-[#193A2E] text-[#10251D] dark:text-[#FAF7EE] border border-[#174C38]/20 dark:border-[#00D69A]/30',
    outline:
      'bg-transparent hover:bg-[#174C38]/8 dark:hover:bg-[#00D69A]/12 text-[#174C38] dark:text-[#00D69A] border border-[#174C38]/25 dark:border-[#00D69A]/35',
    ghost:
      'bg-transparent hover:bg-[#174C38]/8 dark:hover:bg-[#FAF7EE]/8 text-[#10251D] dark:text-[#FAF7EE]',
  }[variant];

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        prefersReducedMotion
          ? undefined
          : {
              transform: `translate3d(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px, 0)`,
              transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, color 180ms ease, box-shadow 180ms ease',
            }
      }
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Interactive mouse-reactive botanical specimen stage for the Observatory hero.
 * Strictly renders real imagery and an optical AI scanning reticle without fabricating scan telemetry.
 */
export const InteractiveSpecimenStage: React.FC<{
  onLaunchScanner: () => void;
  onOpenGarden: () => void;
}> = ({ onLaunchScanner, onOpenGarden }) => {
  const prefersReducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 50, py: 50 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - ny) * 10,
      ry: (nx - 0.5) * 12,
      px: nx * 100,
      py: ny * 100,
    });
  };

  const resetPointer = () => {
    setTilt({ rx: 0, ry: 0, px: 50, py: 50 });
  };

  return (
    <div
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      className="relative w-full max-w-[540px] mx-auto select-none"
      style={{ perspective: '1100px' }}
    >
      {/* Orbital observatory rings behind the specimen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 sm:-inset-10 flex items-center justify-center"
      >
        <div className="w-full aspect-square rounded-full border border-dashed border-[#174C38]/18 dark:border-[#00D69A]/25 animate-obs-orbit" />
        <div className="absolute w-[82%] aspect-square rounded-full border border-[#00D69A]/20 dark:border-[#C7F36B]/20 animate-obs-orbit-reverse" />
      </div>

      {/* Main 3D-tilting Observatory Specimen Frame */}
      <div
        style={
          prefersReducedMotion
            ? undefined
            : {
                transform: `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
                transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
              }
        }
        className="relative rounded-3xl overflow-hidden border border-[#174C38]/18 dark:border-[#00D69A]/35 bg-[#10251D] shadow-[0_28px_70px_-24px_rgba(16,37,29,0.55)] dark:shadow-[0_30px_80px_-24px_rgba(0,214,154,0.28)]"
      >
        {/* Interactive cursor spotlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 opacity-75 transition-opacity duration-300"
          style={{
            background: `radial-gradient(280px circle at ${tilt.px}% ${tilt.py}%, rgba(0, 214, 154, 0.22), transparent 65%)`,
          }}
        />

        {/* Specimen visual */}
        <div className="relative h-[360px] sm:h-[430px] w-full overflow-hidden">
          <BotanicalImage
            commonName="Monstera Deliciosa"
            scientificName="Monstera deliciosa"
            alt="Interactive botanical specimen in the AI Observatory optical frame"
            aspectClassName="h-full"
            className="w-full h-full object-cover scale-[1.03]"
            priority
            lazy={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10251D] via-[#10251D]/25 to-[#10251D]/30" />

          {/* Optical Scanner Reticle Corners */}
          <div aria-hidden="true" className="pointer-events-none absolute top-14 bottom-28 left-5 right-5 sm:top-16 sm:bottom-28 sm:left-7 sm:right-7 z-20">
            <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-[#00D69A] rounded-tl-lg" />
            <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-[#00D69A] rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-[#C7F36B] rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-[#C7F36B] rounded-br-lg" />

            {/* Continuous optical sweep line (no fake metrics) */}
            {!prefersReducedMotion && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#00D69A] to-transparent shadow-[0_0_16px_2px_rgba(0,214,154,0.8)] animate-scanline" />
              </div>
            )}
          </div>

          {/* Top Observatory Optical Bar */}
          <div className="absolute top-5 left-5 right-5 z-30 flex items-center justify-between text-[11px] font-mono text-[#FAF7EE]/90">
            <span className="inline-flex items-center gap-1.5 bg-[#10251D]/85 border border-[#00D69A]/35 px-2.5 py-1 rounded-md">
              <ScanLine className="w-3.5 h-3.5 text-[#00D69A]" />
              OPTICAL SCANNER READY
            </span>
            <span className="bg-[#10251D]/85 border border-[#FAF7EE]/15 px-2.5 py-1 rounded-md text-[#C7F36B]">
              GEMINI VISION
            </span>
          </div>

          {/* Bottom Interactive Action Strip */}
          <div className="absolute bottom-0 inset-x-0 z-30 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#C7F36B]">
                Live Botanical Diagnostics
              </p>
              <p className="mt-1 text-sm sm:text-base font-display font-semibold text-[#FAF7EE]">
                Point your camera or upload a photo for real AI analysis
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onLaunchScanner}
                className="px-3.5 py-2 rounded-xl bg-[#00D69A] hover:bg-[#C7F36B] text-[#10251D] text-xs font-display font-bold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Start Scan
              </button>
              <button
                type="button"
                onClick={onOpenGarden}
                className="px-3 py-2 rounded-xl bg-[#153026]/90 hover:bg-[#193A2E] text-[#FAF7EE] border border-[#B6CDB4]/25 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                My Garden
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Docked observatory telemetry strip below the specimen card (never overlaps optical reticle text) */}
      <div className="mt-3.5 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-[#FFFFFF] dark:bg-[#153026] border border-[#174C38]/15 dark:border-[#00D69A]/35 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#00D69A]/15 text-[#0F6B50] dark:text-[#00D69A] flex items-center justify-center shrink-0 font-display font-bold text-sm">
            19
          </div>
          <div className="min-w-0">
            <p className="text-xs font-display font-bold text-[#10251D] dark:text-[#FAF7EE] truncate">
              Specialized AI Tools
            </p>
            <p className="text-[11px] text-[#4A665B] dark:text-[#B6CDB4] truncate">
              Species ID · Disease · Soil · Roots
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-[#FAF7EE] dark:bg-[#10251D] border border-[#174C38]/12 dark:border-[#00D69A]/25 text-[10px] font-mono font-semibold text-[#174C38] dark:text-[#C7F36B] whitespace-nowrap shrink-0">
          CAM + UPLOAD
        </span>
      </div>
    </div>
  );
};

export const ObservatoryEmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="rounded-2xl border border-dashed border-[#174C38]/22 dark:border-[#B6CDB4]/25 bg-[#F1ECE0]/55 dark:bg-[#153026]/55 p-8 sm:p-10 text-center flex flex-col items-center justify-center">
    <div className="w-12 h-12 rounded-2xl bg-[#00D69A]/14 text-[#0F6B50] dark:text-[#00D69A] flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-display font-bold text-[#10251D] dark:text-[#FAF7EE]">{title}</h3>
    <p className="mt-1.5 text-sm text-[#4A665B] dark:text-[#B6CDB4] max-w-md">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);
