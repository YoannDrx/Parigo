"use client";

/* eslint-disable react-hooks/exhaustive-deps */

/*
 * Adapted from React Bits (Orb, TS-TW variant).
 * Copyright (c) 2026 David Haz.
 * Licensed under the React Bits MIT + Commons Clause License Condition v1.0.
 * Source: https://reactbits.dev/backgrounds/orb
 */

import { Mesh, Program, Renderer, Triangle, Vec3 } from 'ogl';
import { useEffect, useRef } from 'react';

interface OrbProps {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
  backgroundColor?: string;
  centerOnTitle?: boolean;
  interactionExclusionSelector?: string;
  interactionExclusionPadding?: number;
  horizontalWaves?: boolean;
  motionEnabled?: boolean;
  quality?: 'full' | 'software-performance';
  renderScale?: number;
  tapToToggle?: boolean;
  maxFps?: number;
  animateWhileIdle?: boolean;
  waveBleed?: number;
  waveFrequency?: number;
}

export default function Orb({
  hue = 0,
  hoverIntensity = 0.2,
  rotateOnHover = true,
  forceHoverState = false,
  backgroundColor = '#000000',
  centerOnTitle = false,
  interactionExclusionSelector,
  interactionExclusionPadding = 0,
  horizontalWaves = false,
  motionEnabled = true,
  quality = 'full',
  renderScale = 1,
  tapToToggle = false,
  maxFps = 60,
  animateWhileIdle = true,
  waveBleed = 1.08,
  waveFrequency = 8
}: OrbProps) {
  const ctnDom = useRef<HTMLDivElement>(null);

  const vert = /* glsl */ `
    precision highp float;
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const frag = /* glsl */ `
    precision highp float;

    uniform float iTime;
    uniform vec3 iResolution;
    uniform float hue;
    uniform float hover;
    uniform float rot;
    uniform float hoverIntensity;
    uniform float horizontalWaves;
    uniform float waveBleed;
    uniform float waveFrequency;
    uniform vec3 backgroundColor;
    uniform vec2 orbCenter;
    varying vec2 vUv;

    vec3 rgb2yiq(vec3 c) {
      float y = dot(c, vec3(0.299, 0.587, 0.114));
      float i = dot(c, vec3(0.596, -0.274, -0.322));
      float q = dot(c, vec3(0.211, -0.523, 0.312));
      return vec3(y, i, q);
    }
    
    vec3 yiq2rgb(vec3 c) {
      float r = c.x + 0.956 * c.y + 0.621 * c.z;
      float g = c.x - 0.272 * c.y - 0.647 * c.z;
      float b = c.x - 1.106 * c.y + 1.703 * c.z;
      return vec3(r, g, b);
    }
    
    vec3 adjustHue(vec3 color, float hueDeg) {
      float hueRad = hueDeg * 3.14159265 / 180.0;
      vec3 yiq = rgb2yiq(color);
      float cosA = cos(hueRad);
      float sinA = sin(hueRad);
      float i = yiq.y * cosA - yiq.z * sinA;
      float q = yiq.y * sinA + yiq.z * cosA;
      yiq.y = i;
      yiq.z = q;
      return yiq2rgb(yiq);
    }
    
    vec3 hash33(vec3 p3) {
      p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
      p3 += dot(p3, p3.yxz + 19.19);
      return -1.0 + 2.0 * fract(vec3(
        p3.x + p3.y,
        p3.x + p3.z,
        p3.y + p3.z
      ) * p3.zyx);
    }
    
    float snoise3(vec3 p) {
      const float K1 = 0.333333333;
      const float K2 = 0.166666667;
      vec3 i = floor(p + (p.x + p.y + p.z) * K1);
      vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
      vec3 e = step(vec3(0.0), d0 - d0.yzx);
      vec3 i1 = e * (1.0 - e.zxy);
      vec3 i2 = 1.0 - e.zxy * (1.0 - e);
      vec3 d1 = d0 - (i1 - K2);
      vec3 d2 = d0 - (i2 - K1);
      vec3 d3 = d0 - 0.5;
      vec4 h = max(0.6 - vec4(
        dot(d0, d0),
        dot(d1, d1),
        dot(d2, d2),
        dot(d3, d3)
      ), 0.0);
      vec4 n = h * h * h * h * vec4(
        dot(d0, hash33(i)),
        dot(d1, hash33(i + i1)),
        dot(d2, hash33(i + i2)),
        dot(d3, hash33(i + 1.0))
      );
      return dot(vec4(31.316), n);
    }
    
    vec4 extractAlpha(vec3 colorIn) {
      float a = max(max(colorIn.r, colorIn.g), colorIn.b);
      return vec4(colorIn.rgb / (a + 1e-5), a);
    }
    
    const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078);
    const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725);
    const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000);
    const float innerRadius = 0.6;
    const float noiseScale = 0.65;
    
    float light1(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * attenuation);
    }
    
    float light2(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * dist * attenuation);
    }
    
    vec4 draw(vec2 uv) {
      vec3 color1 = adjustHue(baseColor1, hue);
      vec3 color2 = adjustHue(baseColor2, hue);
      vec3 color3 = adjustHue(baseColor3, hue);
      
      float ang = atan(uv.y, uv.x);
      float len = length(uv);
      float invLen = len > 0.0 ? 1.0 / len : 0.0;
      
      float bgLuminance = dot(backgroundColor, vec3(0.299, 0.587, 0.114));
      
      float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
      float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
      float d0 = distance(uv, (r0 * invLen) * uv);
      float v0 = light1(1.0, 10.0, d0);

      v0 *= smoothstep(r0 * 1.05, r0, len);
      float innerFade = smoothstep(r0 * 0.8, r0 * 0.95, len);
      v0 *= mix(innerFade, 1.0, bgLuminance * 0.7);
      float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;
      
      float a = iTime * -1.0;
      vec2 pos = vec2(cos(a), sin(a)) * r0;
      float d = distance(uv, pos);
      float v1 = light2(1.5, 5.0, d);
      v1 *= light1(1.0, 50.0, d0);
      
      float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
      float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
      
      vec3 colBase = mix(color1, color2, cl);
      float fadeAmount = mix(1.0, 0.1, bgLuminance);
      
      vec3 darkCol = mix(color3, colBase, v0);
      darkCol = (darkCol + v1) * v2 * v3;
      darkCol = clamp(darkCol, 0.0, 1.0);
      
      vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
      lightCol = mix(backgroundColor, lightCol, v0);
      lightCol = clamp(lightCol, 0.0, 1.0);
      
      vec3 finalCol = mix(darkCol, lightCol, bgLuminance);
      
      return extractAlpha(finalCol);
    }
    
    vec4 mainImage(vec2 fragCoord) {
      vec2 center = iResolution.xy * orbCenter;
      float size = min(iResolution.x, iResolution.y);
      vec2 circularUv = (fragCoord - center) / size * 2.0;

      // On hover, morph the centered sphere into a wide pair of horizontal
      // wave fronts. Independent X/Y normalization lets the waves bleed past
      // every edge of the hero without increasing the canvas resolution.
      vec2 waveUv = (fragCoord - center) / (iResolution.xy * 0.5 * waveBleed);
      float waveShape =
        sin(waveUv.x * waveFrequency - iTime * 0.65) * 0.78 +
        sin(waveUv.x * waveFrequency * 0.40625 + iTime * 0.32) * 0.22;
      waveUv.x *= 0.32;
      waveUv.y += hoverIntensity * 0.1 * waveShape;

      float waveMorph = hover * horizontalWaves;
      vec2 uv = mix(circularUv, waveUv, waveMorph);
      
      float angle = rot;
      float s = sin(angle);
      float c = cos(angle);
      uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
      
      float legacyHover = hover * (1.0 - horizontalWaves);
      uv.x += legacyHover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
      uv.y += legacyHover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);
      
      vec4 orb = draw(uv);
      float bgLuminance = dot(backgroundColor, vec3(0.299, 0.587, 0.114));
      float edgeStart = mix(1.05, 0.82, bgLuminance);
      float edgeEnd = mix(1.35, 0.87, bgLuminance);
      edgeStart = mix(edgeStart, 1.05, waveMorph);
      edgeEnd = mix(edgeEnd, 1.35, waveMorph);
      float edgeMask = 1.0 - smoothstep(edgeStart, edgeEnd, length(uv));
      orb.a *= edgeMask;
      return orb;
    }
    
    void main() {
      vec2 fragCoord = vUv * iResolution.xy;
      vec4 col = mainImage(fragCoord);
      float bgLuminance = dot(backgroundColor, vec3(0.299, 0.587, 0.114));
      if (bgLuminance > 0.5) {
        gl_FragColor = vec4(mix(backgroundColor, col.rgb, col.a), 1.0);
      } else {
        gl_FragColor = vec4(col.rgb * col.a, col.a);
      }
    }
  `;

  useEffect(() => {
    const container = ctnDom.current;
    if (!container) return;
    const mountedContainer: HTMLDivElement = container;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
        },
        hue: { value: hue },
        hover: { value: 0 },
        rot: { value: 0 },
        hoverIntensity: { value: hoverIntensity },
        horizontalWaves: { value: horizontalWaves ? 1 : 0 },
        waveBleed: { value: waveBleed },
        waveFrequency: { value: waveFrequency },
        backgroundColor: { value: hexToVec3(backgroundColor) },
        orbCenter: { value: new Float32Array([0.5, 0.5]) }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    const hero = container.closest<HTMLElement>('.home-hero');
    const title = hero?.querySelector<HTMLElement>('h1') ?? null;
    let centerUpdateFrame: number | undefined;
    const renderRequest: { current?: () => void } = {};

    function updateOrbCenter() {
      const center = program.uniforms.orbCenter.value as Float32Array;
      if (!centerOnTitle || !title) {
        center[0] = 0.5;
        center[1] = 0.5;
        mountedContainer.dataset.orbCenterX = "0.500";
        mountedContainer.dataset.orbCenterY = "0.500";
        return;
      }
      const containerRect = mountedContainer.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      if (containerRect.width === 0 || containerRect.height === 0) return;
      center[0] = Math.min(0.85, Math.max(0.15, (titleRect.left + titleRect.width / 2 - containerRect.left) / containerRect.width));
      center[1] = Math.min(0.85, Math.max(0.15, 1 - (titleRect.top + titleRect.height / 2 - containerRect.top) / containerRect.height));
      mountedContainer.dataset.orbCenterX = center[0].toFixed(3);
      mountedContainer.dataset.orbCenterY = center[1].toFixed(3);
    }

    function scheduleOrbCenterUpdate() {
      if (centerUpdateFrame !== undefined) return;
      centerUpdateFrame = requestAnimationFrame(() => {
        centerUpdateFrame = undefined;
        updateOrbCenter();
      });
    }

    function resize() {
      if (!container) return;
      // Full quality on every viewport, capped at the desktop Retina baseline so
      // high-density phones do not shade substantially more pixels than desktop.
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1)) * renderScale;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width * dpr, height * dpr);
      gl.canvas.style.width = width + 'px';
      gl.canvas.style.height = height + 'px';
      program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
      mountedContainer.dataset.activeMaxFps = maxFps.toString();
      mountedContainer.dataset.activeRenderScale = renderScale.toString();
      updateOrbCenter();
      // Resizing clears the WebGL drawing buffer, so request exactly one repaint.
      // Center-only updates are intentionally deferred to the next scheduled frame:
      // on software renderers this avoids shading the full-resolution hero several
      // times while the title and fonts settle during initial page load.
      renderRequest.current?.();
    }
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', scheduleOrbCenterUpdate, { passive: true });
    window.addEventListener('pageshow', scheduleOrbCenterUpdate);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', scheduleOrbCenterUpdate);
    visualViewport?.addEventListener('scroll', scheduleOrbCenterUpdate);
    resize();
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.some((entry) => entry.target === container)) {
        resize();
        return;
      }
      updateOrbCenter();
    });
    resizeObserver.observe(container);
    if (title) resizeObserver.observe(title);
    const settleFrame = requestAnimationFrame(updateOrbCenter);
    const settleTimeout = window.setTimeout(updateOrbCenter, 700);

    let targetHover = 0;
    let tapWaveActive = false;
    let tapStart: { pointerId: number; x: number; y: number } | null = null;
    let lastRenderTime = 0;
    let currentRot = 0;
    const rotationSpeed = 0.3;
    const exclusionZones = interactionExclusionSelector
      ? Array.from(document.querySelectorAll(interactionExclusionSelector))
      : [];

    const isInsideInteractionExclusion = (clientX: number, clientY: number) => {
      const pointedElement = document.elementFromPoint(clientX, clientY);
      return Boolean(
        interactionExclusionSelector && pointedElement?.closest(interactionExclusionSelector)
      ) || exclusionZones.some((zone) => {
        const rect = zone.getBoundingClientRect();
        return clientX >= rect.left - interactionExclusionPadding
          && clientX <= rect.right + interactionExclusionPadding
          && clientY >= rect.top - interactionExclusionPadding
          && clientY <= rect.bottom + interactionExclusionPadding;
      });
    };

    const isInsideRestingOrb = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const size = Math.min(width, height);
      if (size <= 0) return false;
      const orbCenter = program.uniforms.orbCenter.value as Float32Array;
      const uvX = ((clientX - rect.left - width * orbCenter[0]) / size) * 2.0;
      const uvY = ((clientY - rect.top - height * (1 - orbCenter[1])) / size) * 2.0;
      return Math.sqrt(uvX * uvX + uvY * uvY) < 0.8;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isInsideInteractionExclusion(e.clientX, e.clientY)) {
        targetHover = 0;
        mountedContainer.dataset.orbInteraction = 'safe';
        return;
      }

      if (isInsideRestingOrb(e.clientX, e.clientY)) {
        targetHover = 1;
        mountedContainer.dataset.orbInteraction = 'active';
      } else {
        targetHover = 0;
        mountedContainer.dataset.orbInteraction = 'idle';
      }
    };

    const handleMouseLeave = () => {
      targetHover = 0;
      mountedContainer.dataset.orbInteraction = 'idle';
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      tapStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = tapStart;
      tapStart = null;
      if (!start || start.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
      if (isInsideInteractionExclusion(event.clientX, event.clientY)) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('a,button,input,textarea,select,[role="button"]')) return;
      if (!tapWaveActive && !isInsideRestingOrb(event.clientX, event.clientY)) return;

      tapWaveActive = !tapWaveActive;
      mountedContainer.dataset.orbTapState = tapWaveActive ? 'waves' : 'orb';
      mountedContainer.dataset.orbInteraction = tapWaveActive ? 'active' : 'idle';
      scheduleAnimationFrame(true);
    };

    if (motionEnabled && !tapToToggle) {
      window.addEventListener('mousemove', handleMouseMove);
      document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    }
    if (tapToToggle && hero) {
      mountedContainer.dataset.orbTapState = 'orb';
      hero.addEventListener('pointerdown', handlePointerDown);
      hero.addEventListener('pointerup', handlePointerUp);
    }

    let rafId: number | undefined;
    let inViewport = true;
    let pageVisible = !document.hidden;

    const scheduleAnimationFrame = (force = false) => {
      if (rafId !== undefined || (!force && (!motionEnabled || !inViewport || !pageVisible))) return;
      rafId = requestAnimationFrame(update);
    };
    renderRequest.current = () => scheduleAnimationFrame(true);

    function update(t: number) {
      rafId = undefined;
      if (!inViewport || !pageVisible) return;
      const frameInterval = 1000 / Math.max(1, maxFps);
      // requestAnimationFrame is already synchronized to the display. Applying a
      // strict 16.67 ms gate at 60 FPS can accidentally discard every other frame.
      if (motionEnabled && maxFps < 60 && lastRenderTime > 0 && t - lastRenderTime < frameInterval) {
        scheduleAnimationFrame();
        return;
      }
      const dt = lastRenderTime > 0 ? (t - lastRenderTime) * 0.001 : 0;
      lastRenderTime = t;
      program.uniforms.iTime.value = motionEnabled ? t * 0.001 : 0;

      const effectiveHover = motionEnabled
        ? forceHoverState || (tapToToggle && tapWaveActive) ? 1 : targetHover
        : 0;
      program.uniforms.hover.value += (effectiveHover - program.uniforms.hover.value) * 0.1;

      if (rotateOnHover && effectiveHover > 0.5) {
        currentRot += dt * rotationSpeed;
      }
      program.uniforms.rot.value = currentRot;

      renderer.render({ scene: mesh });
      const hoverIsSettling = Math.abs(effectiveHover - program.uniforms.hover.value) > 0.001;
      if (animateWhileIdle || effectiveHover > 0 || hoverIsSettling) {
        scheduleAnimationFrame();
      }
    }

    const syncAnimationActivity = () => {
      const active = inViewport && pageVisible;
      mountedContainer.dataset.renderActive = active ? 'true' : 'false';
      if (!active && rafId !== undefined) {
        cancelAnimationFrame(rafId);
        rafId = undefined;
      } else if (active) {
        lastRenderTime = 0;
        scheduleAnimationFrame(!motionEnabled);
      }
    };

    const visibilityObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          inViewport = entry.isIntersecting;
          syncAnimationActivity();
        }, { rootMargin: '120px' })
      : null;
    visibilityObserver?.observe(container);

    const handleVisibilityChange = () => {
      pageVisible = !document.hidden;
      syncAnimationActivity();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    mountedContainer.dataset.renderActive = 'true';
    scheduleAnimationFrame(true);

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      if (centerUpdateFrame !== undefined) cancelAnimationFrame(centerUpdateFrame);
      cancelAnimationFrame(settleFrame);
      window.clearTimeout(settleTimeout);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scheduleOrbCenterUpdate);
      window.removeEventListener('pageshow', scheduleOrbCenterUpdate);
      visualViewport?.removeEventListener('resize', scheduleOrbCenterUpdate);
      visualViewport?.removeEventListener('scroll', scheduleOrbCenterUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      visibilityObserver?.disconnect();
      resizeObserver.disconnect();
      if (motionEnabled && !tapToToggle) {
        window.removeEventListener('mousemove', handleMouseMove);
        document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (tapToToggle && hero) {
        hero.removeEventListener('pointerdown', handlePointerDown);
        hero.removeEventListener('pointerup', handlePointerUp);
      }
      container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState, backgroundColor, centerOnTitle, interactionExclusionSelector, interactionExclusionPadding, horizontalWaves, motionEnabled, renderScale, tapToToggle, maxFps, animateWhileIdle, waveBleed, waveFrequency]);

  return (
    <div
      ref={ctnDom}
      className="orb-container"
      data-orb-quality={quality}
      data-max-fps={maxFps}
      data-animation-mode={animateWhileIdle ? 'continuous' : 'interaction'}
      data-orb-center={centerOnTitle ? 'title' : 'canvas'}
      data-orb-force-hover={forceHoverState ? 'active' : 'inactive'}
      data-orb-hover-effect={horizontalWaves ? 'horizontal-waves' : 'distortion'}
      data-orb-rotation={rotateOnHover ? 'enabled' : 'disabled'}
      data-orb-tap-state={tapToToggle ? 'orb' : undefined}
      data-orb-tap-toggle={tapToToggle ? 'enabled' : 'disabled'}
      data-render-scale={renderScale}
      data-wave-amplitude={horizontalWaves ? (hoverIntensity * 0.1).toFixed(2) : undefined}
      data-wave-bleed={horizontalWaves ? waveBleed : undefined}
      data-wave-frequency={horizontalWaves ? waveFrequency : undefined}
    />
  );
}

function hslToRgb(h: number, s: number, l: number) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return new Vec3(r, g, b);
}

function hexToVec3(color: string) {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    return new Vec3(r, g, b);
  }

  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return new Vec3(parseInt(rgbMatch[1]) / 255, parseInt(rgbMatch[2]) / 255, parseInt(rgbMatch[3]) / 255);
  }

  const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]) / 360;
    const s = parseInt(hslMatch[2]) / 100;
    const l = parseInt(hslMatch[3]) / 100;
    return hslToRgb(h, s, l);
  }

  return new Vec3(0, 0, 0);
}
