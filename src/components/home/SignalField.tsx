"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface RibbonProps {
  color: string;
  amplitude: number;
  speed: number;
  offset: number;
  opacity: number;
}

function Ribbon({ color, amplitude, speed, offset, opacity }: RibbonProps) {
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

  useFrame(({ clock, pointer }) => {
    const time = clock.getElapsedTime() * speed;
    const attribute = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let index = 0; index < attribute.count; index += 1) {
      const progress = index / (attribute.count - 1);
      const x = THREE.MathUtils.lerp(-7.6, 7.6, progress);
      const envelope = Math.sin(progress * Math.PI);
      const y = Math.sin(progress * 16 + time + offset) * amplitude * envelope;
      const detail = Math.sin(progress * 41 - time * 1.4) * amplitude * 0.22;
      attribute.setXYZ(index, x, y + detail + pointer.y * 0.22, pointer.x * 0.45 + Math.cos(progress * 8 + time) * 0.16);
    }
    attribute.needsUpdate = true;
  });

  return <primitive object={line} />;
}

function Scene() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ pointer }) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.08, 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.05, 0.04);
  });

  return (
    <group ref={group} rotation={[0.12, 0, -0.08]}>
      <Ribbon color="#6cff67" amplitude={1.28} speed={0.56} offset={0} opacity={0.98} />
      <Ribbon color="#dfffdc" amplitude={0.84} speed={0.4} offset={2.1} opacity={0.56} />
      <Ribbon color="#75a995" amplitude={1.62} speed={0.28} offset={4.2} opacity={0.34} />
    </group>
  );
}

export function SignalField() {
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 48 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      frameloop="always"
    >
      <Scene />
    </Canvas>
  );
}
