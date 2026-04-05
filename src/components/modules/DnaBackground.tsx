"use client";

// 3D DNA 이중나선 배경 애니메이션
// React Three Fiber (Three.js WebGL) — lazy import로 번들 분리
// prefers-reduced-motion 대응 포함

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── 상수 ────────────────────────────────────────────────────────────────────
const TURNS = 2.5;          // 나선 회전 수
const SEGMENTS = 80;        // 나선 세밀도
const RADIUS = 1.3;         // 나선 반지름
const HEIGHT = 7;           // 나선 전체 높이
const BASE_PAIR_EVERY = 8;  // 염기쌍 간격 (segment 단위)
const ROTATE_SPEED = 0.25;  // Y축 회전 속도 (rad/s)

const COLOR_STRAND_1  = "#3b82f6"; // Electric Blue (NEAR 포인트)
const COLOR_STRAND_2  = "#10b981"; // Emerald Green
const COLOR_BASE_PAIR = "#a78bfa"; // Violet
const COLOR_NODE_1    = "#60a5fa";
const COLOR_NODE_2    = "#34d399";

// ─── DNA 나선 계산 ────────────────────────────────────────────────────────────
function useHelixData() {
  return useMemo(() => {
    const pts1: THREE.Vector3[] = [];
    const pts2: THREE.Vector3[] = [];
    const basePairs: { mid: THREE.Vector3; quat: THREE.Quaternion; len: number }[] = [];
    const nodes1: THREE.Vector3[] = [];
    const nodes2: THREE.Vector3[] = [];

    for (let i = 0; i <= SEGMENTS; i++) {
      const t = (i / SEGMENTS) * TURNS * Math.PI * 2;
      const y = (i / SEGMENTS) * HEIGHT - HEIGHT / 2;

      const p1 = new THREE.Vector3(RADIUS * Math.cos(t), y, RADIUS * Math.sin(t));
      const p2 = new THREE.Vector3(RADIUS * Math.cos(t + Math.PI), y, RADIUS * Math.sin(t + Math.PI));

      pts1.push(p1);
      pts2.push(p2);

      if (i % BASE_PAIR_EVERY === 0) {
        nodes1.push(p1.clone());
        nodes2.push(p2.clone());

        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const len = dir.length();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.normalize()
        );
        basePairs.push({ mid, quat, len });
      }
    }

    const curve1 = new THREE.CatmullRomCurve3(pts1);
    const curve2 = new THREE.CatmullRomCurve3(pts2);
    const geo1 = new THREE.TubeGeometry(curve1, SEGMENTS, 0.055, 8, false);
    const geo2 = new THREE.TubeGeometry(curve2, SEGMENTS, 0.055, 8, false);

    return { geo1, geo2, basePairs, nodes1, nodes2 };
  }, []);
}

// ─── DNA 메시 컴포넌트 ────────────────────────────────────────────────────────
function DnaHelix() {
  const groupRef = useRef<THREE.Group>(null);
  const { geo1, geo2, basePairs, nodes1, nodes2 } = useHelixData();

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * ROTATE_SPEED;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 나선 1 — Electric Blue */}
      <mesh geometry={geo1}>
        <meshStandardMaterial
          color={COLOR_STRAND_1}
          emissive={COLOR_STRAND_1}
          emissiveIntensity={0.4}
          transparent
          opacity={0.75}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* 나선 2 — Emerald */}
      <mesh geometry={geo2}>
        <meshStandardMaterial
          color={COLOR_STRAND_2}
          emissive={COLOR_STRAND_2}
          emissiveIntensity={0.4}
          transparent
          opacity={0.75}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* 염기쌍 (base pairs) */}
      {basePairs.map((bp, i) => (
        <mesh
          key={`bp-${i}`}
          position={bp.mid.toArray()}
          quaternion={bp.quat.toArray() as [number, number, number, number]}
        >
          <cylinderGeometry args={[0.028, 0.028, bp.len, 6]} />
          <meshStandardMaterial
            color={COLOR_BASE_PAIR}
            emissive={COLOR_BASE_PAIR}
            emissiveIntensity={0.3}
            transparent
            opacity={0.55}
          />
        </mesh>
      ))}

      {/* 노드 구체 — 나선 1 */}
      {nodes1.map((pos, i) => (
        <mesh key={`n1-${i}`} position={pos.toArray()}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial
            color={COLOR_NODE_1}
            emissive={COLOR_NODE_1}
            emissiveIntensity={0.9}
            transparent
            opacity={0.95}
          />
        </mesh>
      ))}

      {/* 노드 구체 — 나선 2 */}
      {nodes2.map((pos, i) => (
        <mesh key={`n2-${i}`} position={pos.toArray()}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial
            color={COLOR_NODE_2}
            emissive={COLOR_NODE_2}
            emissiveIntensity={0.9}
            transparent
            opacity={0.95}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── 배경 컴포넌트 (export) ───────────────────────────────────────────────────
export function DnaBackground() {
  // prefers-reduced-motion 대응 — 접근성 설정 시 렌더링 생략
  if (typeof window !== "undefined") {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: 0, opacity: 0.18 }}
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent", width: "100%", height: "100%" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 4, 4]} intensity={2} color={COLOR_STRAND_1} />
        <pointLight position={[-4, -4, -4]} intensity={1.2} color={COLOR_STRAND_2} />
        <pointLight position={[0, 6, 2]} intensity={0.8} color="#ffffff" />
        <DnaHelix />
      </Canvas>
    </div>
  );
}
