import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const PageTransition: React.FC<{
  viewKey: string;
  children: React.ReactNode;
}> = ({ viewKey, children }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key={viewKey}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

export const BotanicalReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = '' }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.4,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const AnimatedMetricValue: React.FC<{
  value: number;
  suffix?: string;
  decimals?: number;
}> = ({ value, suffix = '', decimals = 0 }) => {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const startVal = prevValueRef.current;
    prevValueRef.current = value;
    if (prefersReducedMotion || !Number.isFinite(value) || startVal === value) {
      setDisplayValue(value);
      return;
    }
    const durationMs = 420;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startVal + (value - startVal) * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, prefersReducedMotion]);

  const formatted =
    decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString();

  return (
    <span className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
};

export const FloatingBotanicalParticles: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return null;

  const leaves = [
    { top: '10%', left: '6%', size: 22, delay: 0, dur: 10, color: 'text-[#00D69A]/18 dark:text-[#00D69A]/22' },
    { top: '24%', left: '91%', size: 18, delay: 1.4, dur: 12, color: 'text-[#174C38]/12 dark:text-[#C7F36B]/18' },
    { top: '64%', left: '4%', size: 16, delay: 2.2, dur: 11, color: 'text-[#56C7C0]/18 dark:text-[#56C7C0]/20' },
    { top: '78%', left: '88%', size: 20, delay: 0.8, dur: 13, color: 'text-[#00D69A]/14 dark:text-[#C7F36B]/16' },
  ];

  const spores = [
    { top: '18%', left: '22%', size: 5, delay: 0.3, dur: 7, bg: 'bg-[#00D69A]/35' },
    { top: '38%', left: '78%', size: 4, delay: 1.8, dur: 8.5, bg: 'bg-[#C7F36B]/55 dark:bg-[#C7F36B]/35' },
    { top: '52%', left: '16%', size: 4, delay: 1.1, dur: 9, bg: 'bg-[#56C7C0]/40' },
    { top: '70%', left: '72%', size: 6, delay: 2.6, dur: 7.8, bg: 'bg-[#F5CA62]/40' },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {leaves.map((leaf, idx) => (
        <motion.svg
          key={`leaf-${idx}`}
          viewBox="0 0 24 24"
          width={leaf.size}
          height={leaf.size}
          style={{ top: leaf.top, left: leaf.left }}
          className={`absolute ${leaf.color}`}
          animate={{
            y: [0, -14, 4, 0],
            x: [0, 8, -5, 0],
            rotate: [0, 12, -7, 0],
          }}
          transition={{
            duration: leaf.dur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: leaf.delay,
          }}
        >
          <path
            fill="currentColor"
            d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z"
          />
        </motion.svg>
      ))}
      {spores.map((spore, idx) => (
        <motion.span
          key={`spore-${idx}`}
          style={{ top: spore.top, left: spore.left, width: spore.size, height: spore.size }}
          className={`absolute rounded-full ${spore.bg}`}
          animate={{
            y: [0, -18, 0],
            opacity: [0.35, 0.9, 0.35],
            scale: [1, 1.35, 1],
          }}
          transition={{
            duration: spore.dur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: spore.delay,
          }}
        />
      ))}
    </div>
  );
};

export const BotanicalSkeleton: React.FC<{ className?: string }> = ({ className = 'h-24 w-full' }) => (
  <div
    aria-hidden="true"
    className={`rounded-2xl bg-[#E9F0E6]/75 dark:bg-[#153026]/80 border border-[#174C38]/10 dark:border-[#00D69A]/15 animate-pulse ${className}`}
  />
);
