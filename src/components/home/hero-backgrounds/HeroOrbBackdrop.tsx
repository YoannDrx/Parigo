"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { SearchMode } from "@/types";
import { useHomeReducedMotion } from "../HomeMotion";
import { supportsHardwareAcceleratedWebGl, supportsWebGl } from "../webgl-capability";

const Orb = dynamic(() => import("./reactbits/Orb"), { ssr: false });

const ORB_HUES = {
  "catalog-light": 125,
  "catalog-dark": 145,
  "ai-light": 0,
  "ai-dark": 282,
} as const;

const ORB_BACKGROUNDS = {
  light: "#F2F1ED",
  dark: "#0B110D",
} as const;

type DataSavingNavigator = Navigator & {
  connection?: EventTarget & {
    saveData?: boolean;
    addEventListener?: EventTarget["addEventListener"];
    removeEventListener?: EventTarget["removeEventListener"];
  };
};

const mediaQueryStores = new Map<string, MediaQueryList>();

function getMediaQuery(query: string) {
  let media = mediaQueryStores.get(query);
  if (!media) {
    media = window.matchMedia(query);
    mediaQueryStores.set(query, media);
  }
  return media;
}

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const media = getMediaQuery(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => getMediaQuery(query).matches,
    () => false,
  );
}

function useSaveData() {
  return useSyncExternalStore(
    (callback) => {
      const connection = (navigator as DataSavingNavigator).connection;
      connection?.addEventListener?.("change", callback);
      return () => connection?.removeEventListener?.("change", callback);
    },
    () => Boolean((navigator as DataSavingNavigator).connection?.saveData),
    () => false,
  );
}

type RendererCapability = "disabled" | "software" | "hardware";

function useEnhancedRenderer(disabled: boolean, allowSoftwareRenderer: boolean, eager: boolean) {
  const [capability, setCapability] = useState<RendererCapability>("disabled");

  useEffect(() => {
    if (disabled || capability !== "disabled") return;
    let cancelled = false;
    const enable = () => {
      const hardwareAccelerated = supportsHardwareAcceleratedWebGl();
      const nextCapability = hardwareAccelerated
        ? "hardware"
        : allowSoftwareRenderer && supportsWebGl()
          ? "software"
          : "disabled";
      if (!cancelled) setCapability(nextCapability);
    };
    if (eager) {
      enable();
      return () => {
        cancelled = true;
      };
    }
    const idleId = window.requestIdleCallback?.(enable);
    const timeoutId = idleId === undefined ? window.setTimeout(enable, 500) : undefined;
    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [allowSoftwareRenderer, capability, disabled, eager]);

  return disabled ? "disabled" : capability;
}

class RendererBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function HeroOrbBackdrop({ mode: searchMode }: { mode: SearchMode }) {
  const { theme } = useTheme();
  const mode = searchMode === "keyword" ? "catalog" : "ai";
  const palette = `${mode}-${theme}` as keyof typeof ORB_HUES;
  const reduceMotion = useHomeReducedMotion();
  const saveData = useSaveData();
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const mobileViewport = useMediaQuery("(max-width: 767px)");
  const [failed, setFailed] = useState(false);
  const mobileRendererRequired = mobileViewport;
  const rendererDisabled = failed || (!mobileRendererRequired && (reduceMotion || saveData));
  const rendererCapability = useEnhancedRenderer(rendererDisabled, mobileRendererRequired, mobileRendererRequired);
  const enhanced = rendererCapability !== "disabled";
  const renderer = enhanced ? "ogl" : "fallback";
  const motionEnabled = mobileRendererRequired || !reduceMotion;
  const fullQuality = rendererCapability !== "software";

  return (
    <div
      aria-hidden="true"
      className="hero-background absolute inset-0 overflow-hidden"
      data-hero-background="orb"
      data-orb-setup="original"
      data-orb-palette={palette}
      data-motion={motionEnabled ? "animated" : "static"}
      data-renderer={renderer}
      data-renderer-capability={rendererCapability}
      data-testid="hero-orb-backdrop"
    >
      <div className="hero-background__fallback absolute inset-0" />
      {enhanced ? (
        <RendererBoundary onError={() => setFailed(true)}>
          <div className="hero-background__engine absolute inset-0">
            <Orb
              hue={ORB_HUES[palette]}
              hoverIntensity={5}
              rotateOnHover={!coarsePointer}
              forceHoverState={false}
              backgroundColor={ORB_BACKGROUNDS[theme]}
              centerOnTitle={mobileViewport}
              interactionExclusionSelector="[data-orb-safe-zone]"
              interactionExclusionPadding={14}
              motionEnabled={motionEnabled}
              quality={fullQuality ? "full" : "software-performance"}
              renderScale={fullQuality ? 1 : 0.25}
              maxFps={fullQuality ? 60 : 24}
            />
          </div>
        </RendererBoundary>
      ) : null}
    </div>
  );
}
