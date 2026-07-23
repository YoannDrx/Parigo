"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useSpring, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

interface CarouselProps {
  children: ReactNode[];
  itemsPerView?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  gap?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showIndicators?: boolean;
  showArrows?: boolean;
}

export function Carousel({
  children,
  itemsPerView = { mobile: 2, tablet: 3, desktop: 5 },
  gap = 24,
  autoPlay = false,
  autoPlayInterval = 5000,
  showIndicators = true,
  showArrows = true,
}: CarouselProps) {
  const { locale } = useI18n();
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleItems, setVisibleItems] = useState(itemsPerView.desktop);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const items = children;
  const itemCount = items.length;

  // Motion values for smooth animations
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });

  // Calculate visible items and container width based on screen size
  useEffect(() => {
    const updateDimensions = () => {
      if (window.innerWidth < 640) {
        setVisibleItems(itemsPerView.mobile);
      } else if (window.innerWidth < 1024) {
        setVisibleItems(itemsPerView.tablet);
      } else {
        setVisibleItems(itemsPerView.desktop);
      }

      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [itemsPerView]);

  const currentGap = typeof gap === "number" ? gap : 24;
  const itemWidth =
    containerWidth > 0
      ? (containerWidth - currentGap * (visibleItems - 1)) / visibleItems
      : 200;
  const totalWidth = itemCount * itemWidth + (itemCount - 1) * currentGap;
  const maxScroll = Math.max(0, totalWidth - containerWidth);
  const totalPages = Math.ceil(itemCount / visibleItems);
  const pageWidth = containerWidth > 0 ? containerWidth + currentGap : 0;

  // Update x position when page changes
  useEffect(() => {
    if (containerWidth > 0) {
      const targetX = -currentPage * pageWidth;
      const clampedX = Math.max(-maxScroll, Math.min(0, targetX));
      x.set(clampedX);
    }
  }, [currentPage, pageWidth, maxScroll, containerWidth, x]);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || totalPages <= 1) return;

    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, totalPages]);

  const goToPage = useCallback(
    (pageIndex: number) => {
      setCurrentPage(Math.max(0, Math.min(totalPages - 1, pageIndex)));
    },
    [totalPages]
  );

  const goToPrevious = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  // Handle drag end - snap to nearest page
  const handleDragEnd = (_: never, info: PanInfo) => {
    setIsDragging(false);
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Determine direction based on velocity and offset
    if (Math.abs(velocity) > 500) {
      if (velocity > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    } else if (Math.abs(offset) > containerWidth * 0.2) {
      if (offset > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    } else {
      // Snap back to current page
      const targetX = -currentPage * pageWidth;
      const clampedX = Math.max(-maxScroll, Math.min(0, targetX));
      x.set(clampedX);
    }
  };

  // Handle wheel/trackpad scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    let accumulatedDelta = 0;

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal scroll or shift+scroll
      const deltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);

      if (Math.abs(deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault();

        accumulatedDelta += deltaX;

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (accumulatedDelta > 50) {
            goToNext();
          } else if (accumulatedDelta < -50) {
            goToPrevious();
          }
          accumulatedDelta = 0;
        }, 50);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      clearTimeout(scrollTimeout);
    };
  }, [goToNext, goToPrevious]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  if (itemCount === 0) return null;

  return (
    <div
      className="relative group/carousel"
      ref={containerRef}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      {/* Carousel container - padding for shadows */}
      <div className="overflow-x-clip overflow-y-visible py-2 -my-2 px-1 -mx-1">
        <motion.div
          ref={trackRef}
          className="flex pb-2"
          style={{
            x: springX,
            gap: `${currentGap}px`,
            cursor: isDragging ? "grabbing" : "grab",
          }}
          drag="x"
          dragConstraints={{
            left: -maxScroll,
            right: 0,
          }}
          dragElastic={0.1}
          dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
        >
          {items.map((child, index) => (
            <motion.div
              key={index}
              className="flex-shrink-0"
              style={{
                width:
                  itemWidth > 0
                    ? itemWidth
                    : `calc(${100 / visibleItems}% - ${((visibleItems - 1) * currentGap) / visibleItems}px)`,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              {child}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Navigation buttons */}
      {showArrows && canGoPrevious && (
        <button
          onClick={goToPrevious}
          className="parigo-frame absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-[var(--line-strong)] bg-[var(--surface)] opacity-0 transition-all hover:-translate-y-[calc(50%+1px)] hover:translate-x-[-1px] group-hover/carousel:opacity-100 focus:opacity-100"
          aria-label={locale === "fr" ? "Précédent" : "Previous"}
        >
          <ChevronLeft className="w-5 h-5 text-[var(--color-black)]" />
        </button>
      )}

      {showArrows && canGoNext && (
        <button
          onClick={goToNext}
          className="parigo-frame absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-[var(--line-strong)] bg-[var(--surface)] opacity-0 transition-all hover:-translate-y-[calc(50%+1px)] hover:translate-x-[1px] group-hover/carousel:opacity-100 focus:opacity-100"
          aria-label={locale === "fr" ? "Suivant" : "Next"}
        >
          <ChevronRight className="w-5 h-5 text-[var(--color-black)]" />
        </button>
      )}

      {/* Progress indicator */}
      {showIndicators && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {/* Dots indicator */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, pageIndex) => (
              <button
                key={pageIndex}
                onClick={() => goToPage(pageIndex)}
                className={`transition-all duration-300 rounded-full ${
                  pageIndex === currentPage
                    ? "w-8 h-3 bg-[var(--color-primary)]"
                    : "w-3 h-3 bg-[var(--color-gray-300)] hover:bg-[var(--color-gray-400)]"
                }`}
                aria-label={`Aller à la page ${pageIndex + 1}`}
                aria-current={pageIndex === currentPage ? "true" : undefined}
              />
            ))}
          </div>

          {/* Page counter */}
          <span className="ml-4 text-sm text-[var(--color-gray-500)] font-medium tabular-nums">
            {currentPage + 1} / {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
