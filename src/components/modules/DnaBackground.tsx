"use client";

// 3D DNA 이중나선 배경 애니메이션
// React Three Fiber (Three.js WebGL) — lazy import로 번들 분리
// 마우스 틸트 + 마우스 근접 시 색상 변경 + prefers-reduced-motion 대응

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── 상수 ────────────────────────────────────────────────────────────────────
const TURNS = 2.5;
const SEGMENTS = 80;
const RADIUS = 2.93;
const HEIGHT = 15.75;
const BASE_PAIR_EVERY = 5;
const NODE_EVERY = 8;
const ROTATE_SPEED   = 0.055;  // X축 자동 회전 (가로 나선이 제자리에서 스핀)
const TILT_Y_MAX = 0.22;       // 마우스 X → Y축 틸트
const TILT_Z_MAX = 0.12;       // 마우스 Y → Z축 틸트
const LERP_SPEED = 2.5;
const HOVER_THRESHOLD = 0.13; // 스크린 공간 근접 거리 (NDC 단위)

const COLOR_STRAND_1  = "#3b82f6";
const COLOR_STRAND_2  = "#10b981";
const COLOR_BASE_PAIR = "#a78bfa";
const COLOR_NODE_1    = "#60a5fa";
const COLOR_NODE_2    = "#34d399";
const COLOR_HOVER_NODE = "#ffffff";  // 호버 시 구체 — 흰색
const COLOR_HOVER_LINE = "#fbbf24";  // 호버 시 직선 — Amber(금색)

type MouseNorm = { x: number; y: number };

// ─── DNA 나선 계산 ────────────────────────────────────────────────────────────
function useHelixData() {
  return useMemo(() => {
    const pts1: THREE.Vector3[] = [];
    const pts2: THREE.Vector3[] = [];
    const basePairs: {
      mid: THREE.Vector3;
      quat: THREE.Quaternion;
      len: number;
      p1: THREE.Vector3;
      p2: THREE.Vector3;
    }[] = [];
    const nodes1: THREE.Vector3[] = [];
    const nodes2: THREE.Vector3[] = [];

    for (let i = 0; i <= SEGMENTS; i++) {
      const t = (i / SEGMENTS) * TURNS * Math.PI * 2;
      const x = (i / SEGMENTS) * HEIGHT - HEIGHT / 2;

      // 나선을 X축(가로) 방향으로 배치
      const p1 = new THREE.Vector3(x, RADIUS * Math.cos(t), RADIUS * Math.sin(t));
      const p2 = new THREE.Vector3(x, RADIUS * Math.cos(t + Math.PI), RADIUS * Math.sin(t + Math.PI));

      pts1.push(p1);
      pts2.push(p2);

      if (i % BASE_PAIR_EVERY === 0) {
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const len = dir.length();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0), // cylinderGeometry 기본 축은 Y
          dir.normalize()
        );
        basePairs.push({ mid, quat, len, p1: p1.clone(), p2: p2.clone() });
      }

      if (i % NODE_EVERY === 0) {
        nodes1.push(p1.clone());
        nodes2.push(p2.clone());
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
function DnaHelix({ mouseRef }: { mouseRef: React.RefObject<MouseNorm> }) {
  const groupRef = useRef<THREE.Group>(null);
  const { geo1, geo2, basePairs, nodes1, nodes2 } = useHelixData();

  // 염기쌍별 material ref (직선 + 구체 1 + 구체 2)
  const lineMatRefs  = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const node1MatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const node2MatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const prevHovered  = useRef<number>(-1);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // X축 자동 회전 — 가로로 누운 나선이 제자리에서 스핀
    groupRef.current.rotation.x += delta * ROTATE_SPEED;

    // 마우스 틸트
    const mx = mouseRef.current?.x ?? 0;
    const my = mouseRef.current?.y ?? 0;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, mx * TILT_Y_MAX, delta * LERP_SPEED
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z, -my * TILT_Z_MAX, delta * LERP_SPEED
    );

    // 스크린 공간 근접 감지 — pointer-events 없이 동작
    const mouse = new THREE.Vector2(mx, my);
    let closestIdx = -1;
    let closestDist = HOVER_THRESHOLD;

    basePairs.forEach((bp, i) => {
      // p1, p2 양쪽 모두 체크 — 가까운 쪽 거리 사용
      const world1 = bp.p1.clone().applyMatrix4(groupRef.current!.matrixWorld);
      const proj1 = world1.project(state.camera);
      const dist1 = Math.hypot(proj1.x - mouse.x, proj1.y - mouse.y);

      const world2 = bp.p2.clone().applyMatrix4(groupRef.current!.matrixWorld);
      const proj2 = world2.project(state.camera);
      const dist2 = Math.hypot(proj2.x - mouse.x, proj2.y - mouse.y);

      const dist = Math.min(dist1, dist2);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    // 이전 호버 해제
    const prev = prevHovered.current;
    if (prev !== -1 && prev !== closestIdx) {
      lineMatRefs.current[prev]?.color.set(COLOR_BASE_PAIR);
      lineMatRefs.current[prev]?.emissive.set(COLOR_BASE_PAIR);
      node1MatRefs.current[prev]?.color.set(COLOR_NODE_1);
      node1MatRefs.current[prev]?.emissive.set(COLOR_NODE_1);
      node2MatRefs.current[prev]?.color.set(COLOR_NODE_2);
      node2MatRefs.current[prev]?.emissive.set(COLOR_NODE_2);
    }

    // 현재 호버 적용
    if (closestIdx !== -1 && closestIdx !== prev) {
      lineMatRefs.current[closestIdx]?.color.set(COLOR_HOVER_LINE);
      lineMatRefs.current[closestIdx]?.emissive.set(COLOR_HOVER_LINE);
      node1MatRefs.current[closestIdx]?.color.set(COLOR_HOVER_NODE);
      node1MatRefs.current[closestIdx]?.emissive.set(COLOR_HOVER_NODE);
      node2MatRefs.current[closestIdx]?.color.set(COLOR_HOVER_NODE);
      node2MatRefs.current[closestIdx]?.emissive.set(COLOR_HOVER_NODE);
    }

    prevHovered.current = closestIdx;
  });

  return (
    <group ref={groupRef} scale={[3, 3, 3]}>
      {/* 나선 1 — Electric Blue */}
      <mesh geometry={geo1}>
        <meshStandardMaterial
          color={COLOR_STRAND_1}
          emissive={COLOR_STRAND_1}
          emissiveIntensity={0.2}
          transparent opacity={0.55}
          roughness={0.3} metalness={0.1}
        />
      </mesh>

      {/* 나선 2 — Emerald */}
      <mesh geometry={geo2}>
        <meshStandardMaterial
          color={COLOR_STRAND_2}
          emissive={COLOR_STRAND_2}
          emissiveIntensity={0.2}
          transparent opacity={0.55}
          roughness={0.3} metalness={0.1}
        />
      </mesh>

      {/* 염기쌍 직선 + 끝점 구체 */}
      {basePairs.map((bp, i) => (
        <group key={`bp-${i}`}>
          {/* 연결 직선 */}
          <mesh
            position={bp.mid.toArray()}
            quaternion={bp.quat.toArray() as [number, number, number, number]}
          >
            <cylinderGeometry args={[0.028, 0.028, bp.len, 6]} />
            <meshStandardMaterial
              ref={(m) => { lineMatRefs.current[i] = m; }}
              color={COLOR_BASE_PAIR}
              emissive={COLOR_BASE_PAIR}
              emissiveIntensity={0.15}
              transparent opacity={0.38}
            />
          </mesh>
          {/* 끝점 구체 — 나선 1 쪽 */}
          <mesh position={bp.p1.toArray()}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial
              ref={(m) => { node1MatRefs.current[i] = m; }}
              color={COLOR_NODE_1}
              emissive={COLOR_NODE_1}
              emissiveIntensity={0.4}
              transparent opacity={0.7}
            />
          </mesh>
          {/* 끝점 구체 — 나선 2 쪽 */}
          <mesh position={bp.p2.toArray()}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial
              ref={(m) => { node2MatRefs.current[i] = m; }}
              color={COLOR_NODE_2}
              emissive={COLOR_NODE_2}
              emissiveIntensity={0.4}
              transparent opacity={0.7}
            />
          </mesh>
        </group>
      ))}

      {/* 나선 노드 구체 — 나선 1 */}
      {nodes1.map((pos, i) => (
        <mesh key={`n1-${i}`} position={pos.toArray()}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial
            color={COLOR_NODE_1} emissive={COLOR_NODE_1}
            emissiveIntensity={0.5} transparent opacity={0.75}
          />
        </mesh>
      ))}

      {/* 나선 노드 구체 — 나선 2 */}
      {nodes2.map((pos, i) => (
        <mesh key={`n2-${i}`} position={pos.toArray()}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial
            color={COLOR_NODE_2} emissive={COLOR_NODE_2}
            emissiveIntensity={0.5} transparent opacity={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── 배경 컴포넌트 (export) ───────────────────────────────────────────────────
export function DnaBackground() {
  if (typeof window !== "undefined") {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return null;
  }

  const mouseRef = useRef<MouseNorm>({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      };
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: 0, opacity: 0.11 }}
    >
      <Canvas
        camera={{ position: [0, 4, 22], fov: 58 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent", width: "100%", height: "100%" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 4, 4]} intensity={2} color={COLOR_STRAND_1} />
        <pointLight position={[-4, -4, -4]} intensity={1.2} color={COLOR_STRAND_2} />
        <pointLight position={[0, 6, 2]} intensity={0.8} color="#ffffff" />
        <DnaHelix mouseRef={mouseRef} />
      </Canvas>
    </div>
  );
}
