"use client";

import dynamic from "next/dynamic";
import React, { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { SearchMode } from "@/types";
import { HeroGradflowRenderer } from "../HeroGradientBackdrop";
import { useHomeReducedMotion } from "../HomeMotion";
import { supportsHardwareAcceleratedWebGl } from "../webgl-capability";
import { getHeroPalette, hexToUnitRgb } from "./presets";
import {
  HERO_BACKGROUND_OPTIONS,
  type HeroBackgroundId,
  type HeroBackgroundMode,
  type HeroPalette,
  type HeroRendererKind,
} from "./types";

const FloatingLines = dynamic(() => import("./reactbits/FloatingLines"), { ssr: false });
const SoftAurora = dynamic(() => import("./reactbits/SoftAurora"), { ssr: false });
const Iridescence = dynamic(() => import("./reactbits/Iridescence"), { ssr: false });
const Waves = dynamic(() => import("./reactbits/Waves"), { ssr: false });
const Orb = dynamic(() => import("./reactbits/Orb"), { ssr: false });
const GhostFibers = dynamic(() => import("./reactbits/GhostFibers"), { ssr: false });
const GradientWaves = dynamic(() => import("./reactbits/GradientWaves"), { ssr: false });
const WebThreads = dynamic(() => import("./reactbits/WebThreads"), { ssr: false });
const LiquidEther = dynamic(() => import("./reactbits/LiquidEther"), { ssr: false });

type DataSavingNavigator = Navigator & {
  connection?: EventTarget & { saveData?: boolean; addEventListener?: EventTarget["addEventListener"]; removeEventListener?: EventTarget["removeEventListener"] };
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

function useStageVisibility(ref: React.RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}

function useEnhancedRenderer(backgroundId: HeroBackgroundId, disabled: boolean) {
  const [enabledFor, setEnabledFor] = useState<HeroBackgroundId | null>(null);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    const enable = () => {
      if (cancelled) return;
      if (backgroundId === "waves" || supportsHardwareAcceleratedWebGl()) setEnabledFor(backgroundId);
    };
    const idleId = window.requestIdleCallback?.(enable);
    const timeoutId = idleId === undefined ? window.setTimeout(enable, 500) : undefined;
    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [backgroundId, disabled]);

  return !disabled && enabledFor === backgroundId;
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

function rendererFor(backgroundId: HeroBackgroundId): Exclude<HeroRendererKind, "fallback"> {
  return HERO_BACKGROUND_OPTIONS.find((option) => option.id === backgroundId)?.renderer ?? "gradflow";
}

function veilOpacityFor(backgroundId: HeroBackgroundId, palette: HeroPalette, theme: "light" | "dark") {
  if (backgroundId === "gradflow") return 0.32;
  if (backgroundId === "floating-lines") return theme === "light" ? 0.48 : 0.58;
  if (backgroundId === "waves" || backgroundId === "ghost-fibers" || backgroundId === "web-threads") return 0.24;
  if (theme === "light" && (backgroundId === "gradient-waves" || backgroundId === "liquid-ether")) return 0.4;
  if (theme === "light" && (backgroundId === "soft-aurora" || backgroundId === "orb")) return 0.52;
  if (theme === "light" && backgroundId === "iridescence") return 0.62;
  return palette.contentVeil;
}

function BackgroundEngine({
  backgroundId,
  coarsePointer,
  mobileViewport,
  mode,
  palette,
  theme,
}: {
  backgroundId: HeroBackgroundId;
  coarsePointer: boolean;
  mobileViewport: boolean;
  mode: HeroBackgroundMode;
  palette: HeroPalette;
  theme: "light" | "dark";
}) {
  const lightMode = theme === "light";
  const interactive = !coarsePointer;

  switch (backgroundId) {
    case "gradflow":
      return <HeroGradflowRenderer mode={mode} theme={theme} />;
    case "floating-lines":
      return <FloatingLines linesGradient={[palette.primary, palette.secondary, palette.highlight]} enabledWaves={["top", "middle", "bottom"]} lineCount={8} lineDistance={8} animationSpeed={1} interactive={interactive} bendRadius={8} bendStrength={-2} parallax={interactive} backgroundColor={palette.base} lightMode={lightMode} />;
    case "soft-aurora":
      return <SoftAurora speed={0.6} scale={1.5} brightness={1} color1={palette.highlight} color2={palette.primary} noiseFrequency={2.5} noiseAmplitude={1} bandHeight={0.5} bandSpread={1} octaveDecay={0.1} layerOffset={0} colorSpeed={1} enableMouseInteraction={interactive} mouseInfluence={0.25} lightMode={lightMode} />;
    case "iridescence":
      return <Iridescence color={hexToUnitRgb(lightMode ? palette.secondary : palette.primary)} speed={1} amplitude={0.1} mouseReact={interactive} />;
    case "waves":
      return <Waves lineColor={palette.primary} backgroundColor="transparent" waveSpeedX={0.0125} waveSpeedY={0.005} waveAmpX={32} waveAmpY={16} xGap={10} yGap={32} friction={0.925} tension={0.005} maxCursorMove={interactive ? 100 : 0} />;
    case "orb":
      return <Orb hue={mode === "catalog" ? 145 : 282} hoverIntensity={5} rotateOnHover={interactive} forceHoverState={false} backgroundColor={palette.base} centerOnTitle={mobileViewport} />;
    case "ghost-fibers":
      return <GhostFibers lineColor={palette.primary} glowColor={palette.secondary} speed={0.2} scale={2} rotation={0} rotationSpeed={0.25} layers={4} waveAmplitude={0.015} waveFrequency={3} waveSpeed={0.15} layerSpeed={0.08} twist={0.1} twistFrequency={5} twistSpeed={1.2} lineFrequency={5} lineSpacing={2} lineSharpness={16} glowFalloff={10} glowIntensity={1.6} brightness={2} blueBoost={1.25} vignette={0.8} grain={0.05} lightMode={lightMode} dpr={1} fps={60} paused={false} />;
    case "gradient-waves":
      return <GradientWaves horizonColor={palette.primary} waveColor={palette.secondary} crestColor={palette.highlight} speed={0.4} amplitude={2.5} waveScale={0.6} waveRatio={0.9} swell={35} turbulence={20} tilt={1.11} zoom={1} height={5.5} fogDepth={15} detail="medium" brightness={lightMode ? 0.78 : 1} opacity={1} mouseInteraction={interactive} parallaxStrength={0.5} grain grainIntensity={0.05} />;
    case "web-threads":
      return <WebThreads color1={palette.primary} color2={palette.secondary} color3={palette.highlight} speed={0.2} threadCount={6} frequency={5} spread={0.18} taper={1} position={0.5} fanMode="center" glow={0.02} falloff={0.6} thickness={1.1} brightness={lightMode ? 0.9 : 0.6} opacity={1} mirror shimmer={false} grain grainIntensity={0.05} mouseInteraction={interactive} mouseStrength={0.3} backgroundColor={palette.base} lightMode={lightMode} />;
    case "liquid-ether":
      return <LiquidEther colors={[palette.primary, palette.secondary, palette.highlight]} mouseForce={20} cursorSize={100} resolution={0.5} isViscous viscous={30} iterationsViscous={32} iterationsPoisson={32} isBounce={false} autoDemo autoSpeed={0.5} autoIntensity={2.2} backgroundColor={palette.base} lightMode={lightMode} autoResumeDelay={1000} />;
  }
}

export function HeroBackgroundLab({
  backgroundId,
  mode: searchMode,
  onBackgroundChange,
  selectLabel,
}: {
  backgroundId: HeroBackgroundId;
  mode: SearchMode;
  onBackgroundChange: (backgroundId: HeroBackgroundId) => void;
  selectLabel: string;
}) {
  const { theme } = useTheme();
  const mode: HeroBackgroundMode = searchMode === "keyword" ? "catalog" : "ai";
  const { key: paletteKey, palette } = getHeroPalette(theme, mode);
  const reduceMotion = useHomeReducedMotion();
  const saveData = useSaveData();
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const mobileViewport = useMediaQuery("(max-width: 767px)");
  const stageRef = useRef<HTMLDivElement>(null);
  const visible = useStageVisibility(stageRef);
  const [failedId, setFailedId] = useState<HeroBackgroundId | null>(null);
  const enhanced = useEnhancedRenderer(backgroundId, reduceMotion || saveData || !visible || failedId === backgroundId);
  const renderer: HeroRendererKind = enhanced ? rendererFor(backgroundId) : "fallback";
  const fallbackFamily = backgroundId === "orb" ? "orb"
    : backgroundId === "gradient-waves" ? "horizon"
      : backgroundId === "soft-aurora" || backgroundId === "iridescence" || backgroundId === "liquid-ether" ? "mesh"
        : "lines";
  const style = {
    "--hero-bg": palette.base,
    "--hero-soft": palette.soft,
    "--hero-primary": palette.primary,
    "--hero-secondary": palette.secondary,
    "--hero-highlight": palette.highlight,
    "--hero-veil-opacity": String(veilOpacityFor(backgroundId, palette, theme)),
  } as React.CSSProperties;

  return (
    <>
      <div
        ref={stageRef}
        aria-hidden="true"
        className="hero-gradflow hero-background absolute inset-0 overflow-hidden"
        data-gradient-mode={mode}
        data-gradient-preset={`${mode}-${theme}`}
        data-hero-background={backgroundId}
        data-hero-palette={paletteKey}
        data-motion={reduceMotion ? "static" : "animated"}
        data-renderer={renderer}
        data-testid="hero-gradient-backdrop"
        style={style}
      >
        <div className="hero-gradflow__fallback hero-background__fallback absolute inset-0" data-fallback-family={fallbackFamily} />
        {enhanced ? (
          <RendererBoundary key={`${backgroundId}-${paletteKey}`} onError={() => setFailedId(backgroundId)}>
            <BackgroundEngine backgroundId={backgroundId} coarsePointer={coarsePointer} mobileViewport={mobileViewport} mode={mode} palette={palette} theme={theme} />
          </RendererBoundary>
        ) : null}
        <div className="hero-gradflow__veil hero-background__veil pointer-events-none absolute inset-0" />
      </div>

      <label className="hero-background-select absolute left-4 top-4 z-30 md:left-8 md:top-8">
        <span className="sr-only">{selectLabel}</span>
        <select
          aria-label={selectLabel}
          value={backgroundId}
          onChange={(event) => {
            const nextId = event.target.value as HeroBackgroundId;
            setFailedId(null);
            onBackgroundChange(nextId);
          }}
        >
          {HERO_BACKGROUND_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
    </>
  );
}
