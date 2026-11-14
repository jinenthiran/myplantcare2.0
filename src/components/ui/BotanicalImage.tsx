import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sprout, RefreshCw, ImageOff, Wrench } from 'lucide-react';
import { resolveBotanicalImageUrl } from '../../utils/botanicalImageResolver';
import { ImageVerificationStatus } from '../../data/plants/types';

interface BotanicalImageProps {
  src?: string | null;
  alt: string;
  commonName?: string;
  scientificName?: string;
  verificationStatus?: ImageVerificationStatus;
  className?: string;
  aspectClassName?: string;
  containerClassName?: string;
  fitMode?: 'cover' | 'contain';
  priority?: boolean;
  decorative?: boolean;
  lazy?: boolean;
  rootMargin?: string;
  onStatusChange?: (status: 'loaded' | 'error', src: string) => void;
  onRequestImageFix?: () => void;
}

export const BotanicalImage: React.FC<BotanicalImageProps> = ({
  src,
  alt,
  commonName,
  scientificName,
  verificationStatus,
  className = '',
  aspectClassName = 'h-44',
  containerClassName = '',
  fitMode = 'cover',
  priority = false,
  decorative = false,
  lazy = true,
  rootMargin = '280px 0px',
  onStatusChange,
  onRequestImageFix,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState<boolean>(() => priority || !lazy);
  const [retryToken, setRetryToken] = useState<number>(0);

  const primaryResolved = useMemo(() => {
    const resolved = resolveBotanicalImageUrl(src, scientificName || commonName || alt);
    if (!resolved) return '';
    if (retryToken > 0 && /^https?:\/\//i.test(resolved)) {
      const sep = resolved.includes('?') ? '&' : '?';
      return `${resolved}${sep}_r=${retryToken}`;
    }
    return resolved;
  }, [src, scientificName, commonName, alt, retryToken]);

  const isHeldForReview =
    verificationStatus === 'needs_review' && (!src || !String(src).trim());

  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    primaryResolved && !isHeldForReview ? 'loading' : 'error'
  );
  const lastSrcRef = useRef<string>(primaryResolved);
  const lastHeldRef = useRef<boolean>(isHeldForReview);

  // IntersectionObserver for lazy viewport entry
  useEffect(() => {
    if (priority || !lazy || isInView) {
      if (!isInView) setIsInView(true);
      return;
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [priority, lazy, rootMargin, isInView]);

  // Only reset loading state when source/held state changes, and handle already-cached <img> elements
  useEffect(() => {
    const srcChanged = lastSrcRef.current !== primaryResolved || lastHeldRef.current !== isHeldForReview;
    lastSrcRef.current = primaryResolved;
    lastHeldRef.current = isHeldForReview;

    if (!primaryResolved || isHeldForReview) {
      setStatus('error');
      return;
    }

    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete) {
      if (imgEl.naturalWidth >= 16 && imgEl.naturalHeight >= 16) {
        setStatus('loaded');
        onStatusChange?.('loaded', primaryResolved);
        return;
      }
      if (imgEl.naturalWidth === 0 && srcChanged) {
        setStatus('loading');
        return;
      }
    }

    if (srcChanged) {
      setStatus('loading');
    }
  }, [primaryResolved, isHeldForReview, isInView, onStatusChange]);

  const descriptiveAlt = useMemo(() => {
    if (decorative) return '';
    if (scientificName && !alt.toLowerCase().includes(scientificName.toLowerCase())) {
      return `${commonName || alt} (${scientificName}) — botanical reference photograph`;
    }
    return alt;
  }, [decorative, scientificName, commonName, alt]);

  if (!isInView) {
    return (
      <div
        ref={containerRef}
        aria-hidden="true"
        className={`relative overflow-hidden bg-[#FAF7EE] dark:bg-[#10251D] ${aspectClassName} ${containerClassName}`}
      >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#FAF7EE] via-[#B6CDB4]/25 to-[#FAF7EE] dark:from-[#10251D] dark:via-[#153026] dark:to-[#10251D]" />
      </div>
    );
  }

  if (!primaryResolved || isHeldForReview || status === 'error') {
    if (decorative) {
      return (
        <div
          ref={containerRef}
          aria-hidden="true"
          className={`relative overflow-hidden bg-gradient-to-br from-[#174C38] via-[#153026] to-[#10251D] ${aspectClassName} ${containerClassName}`}
        />
      );
    }

    const statusLabel =
      !primaryResolved || isHeldForReview
        ? 'Image awaiting verification'
        : 'Image unavailable';

    return (
      <div
        ref={containerRef}
        role="img"
        aria-label={`${descriptiveAlt} (${statusLabel})`}
        data-image-fallback="true"
        className={`relative overflow-hidden bg-gradient-to-br from-[#FAF7EE] to-[#EDE7D5] dark:from-[#153026] dark:to-[#10251D] flex flex-col items-center justify-center p-4 text-center border-b border-[#B6CDB4]/35 dark:border-[#174C38]/60 ${aspectClassName} ${containerClassName}`}
      >
        <div className="w-10 h-10 rounded-xl bg-[#174C38]/12 dark:bg-[#00D69A]/15 flex items-center justify-center mb-2">
          {primaryResolved && status === 'error' ? (
            <ImageOff className="w-5 h-5 text-[#FF806B]" />
          ) : (
            <Sprout className="w-5 h-5 text-[#174C38] dark:text-[#00D69A]" />
          )}
        </div>
        <div className="text-xs font-bold text-[#10251D] dark:text-white line-clamp-1">
          {commonName || alt}
        </div>
        {scientificName && (
          <div className="text-[11px] italic text-[#10251D]/70 dark:text-[#B6CDB4] line-clamp-1">
            {scientificName}
          </div>
        )}
        <div className="mt-1.5 px-2 py-0.5 rounded-md bg-[#F5CA62]/20 dark:bg-[#F5CA62]/15 border border-[#F5CA62]/45 text-[10px] font-semibold text-[#7A5600] dark:text-[#F5CA62]">
          {statusLabel}
        </div>
        {(primaryResolved || onRequestImageFix) && (
          <div className="mt-2 flex items-center gap-1.5">
            {primaryResolved && status === 'error' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRetryToken((n) => n + 1);
                  setStatus('loading');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FFFFFF] dark:bg-[#10251D] border border-[#174C38]/20 dark:border-[#00D69A]/30 text-[10px] font-semibold text-[#174C38] dark:text-[#00D69A] hover:brightness-105 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Retry
              </button>
            )}
            {onRequestImageFix && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestImageFix();
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#174C38] dark:bg-[#00D69A] text-[10px] font-bold text-[#FFFFFF] dark:text-[#10251D] hover:brightness-110 cursor-pointer"
              >
                <Wrench className="w-2.5 h-2.5" /> Fix Image
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const fitClass = fitMode === 'contain' ? 'object-contain p-1' : 'object-cover';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#FAF7EE] dark:bg-[#10251D] ${aspectClassName} ${containerClassName}`}
    >
      {status === 'loading' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#FAF7EE] via-[#B6CDB4]/25 to-[#FAF7EE] dark:from-[#10251D] dark:via-[#153026] dark:to-[#10251D]"
        />
      )}
      <img
        ref={imgRef}
        src={primaryResolved}
        alt={descriptiveAlt}
        aria-hidden={decorative || undefined}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth < 16 || el.naturalHeight < 16) {
            setStatus('error');
            onStatusChange?.('error', primaryResolved);
            return;
          }
          setStatus('loaded');
          onStatusChange?.('loaded', primaryResolved);
        }}
        onError={() => {
          setStatus('error');
          onStatusChange?.('error', primaryResolved);
        }}
        className={`w-full h-full ${fitClass} transition-opacity duration-300 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      />
    </div>
  );
};
