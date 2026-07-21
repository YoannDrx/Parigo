"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export interface SignalFieldProps {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}

interface RibbonProps {
  color: string;
  amplitude: number;
  speed: number;
  offset: number;
  opacity: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}

function Ribbon({ color, amplitude, speed, offset, opacity, pointerX, pointerY }: RibbonProps) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(180 * 3), 3));
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.Line(geometry, material);
  }, [color, opacity]);

  useEffect(() => () => {
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }, [line]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime() * speed;
    const mouseX = pointerX.get();
    const mouseY = pointerY.get();
    const attribute = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let index = 0; index < attribute.count; index += 1) {
      const progress = index / (attribute.count - 1);
      const x = THREE.MathUtils.lerp(-7.6, 7.6, progress);
      const envelope = Math.sin(progress * Math.PI);
      const y = Math.sin(progress * 16 + time + offset) * amplitude * envelope;
      const detail = Math.sin(progress * 41 - time * 1.4) * amplitude * 0.22;
      attribute.setXYZ(
        index,
        x,
        y + detail - mouseY * 0.22,
        mouseX * 0.45 + Math.cos(progress * 8 + time) * 0.16,
      );
    }
    attribute.needsUpdate = true;
  });

  return <primitive object={line} />;
}

function Scene({ pointerX, pointerY }: SignalFieldProps) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, pointerX.get() * 0.08, 4.5, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -pointerY.get() * 0.05, 4.5, delta);
  });

  return (
    <group ref={group} rotation={[0.12, 0, -0.08]}>
      <Ribbon color="#6cff67" amplitude={1.54} speed={0.56} offset={0} opacity={1} pointerX={pointerX} pointerY={pointerY} />
      <Ribbon color="#dfffdc" amplitude={1.08} speed={0.4} offset={2.1} opacity={0.68} pointerX={pointerX} pointerY={pointerY} />
      <Ribbon color="#75a995" amplitude={1.88} speed={0.28} offset={4.2} opacity={0.46} pointerX={pointerX} pointerY={pointerY} />
    </group>
  );
}

export function SignalField({ pointerX, pointerY }: SignalFieldProps) {
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 48 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      frameloop="always"
    >
      <Scene pointerX={pointerX} pointerY={pointerY} />
    </Canvas>
  );
}
