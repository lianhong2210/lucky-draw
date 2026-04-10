import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * OrbitBalls (LuckyBalls3D) - 20 metallic 3D spheres orbiting the tree
 *
 * Features:
 * - 20 balls orbit around the foliage/ornaments in circular rings
 * - Each ball stores an image from uploadedPhotos
 * - Finger pointer (index finger) highlights the closest ball
 * - Pinch gesture picks the highlighted ball
 * - Picked ball explodes and reveals its stored image
 * - Horizontal swipe rotates the orbit
 * - Auto-rotation when no swipe input
 */

const BALL_COUNT = 20;
const BALL_RADIUS = 0.8;

// Distribute balls across 2 orbit rings at different heights
const ORBIT_RINGS = [
  { y: 3, radius: 6.5, count: 10, speed: 0.15 }, // Lower ring - wider
  { y: 7, radius: 5.0, count: 10, speed: -0.12 }, // Upper ring - tighter, opposite dir
];

const BALL_COLORS = [
  "#FF4444",
  "#44AAFF",
  "#44FF88",
  "#FFD700",
  "#CC44FF",
  "#FF8844",
  "#44FFFF",
  "#88FF44",
  "#FF44AA",
  "#AABB44",
  "#FF6666",
  "#6688FF",
  "#66FF99",
  "#FFEE44",
  "#DD66FF",
  "#FFAA66",
  "#66FFEE",
  "#AAFF66",
  "#FF66CC",
  "#CCDD66",
];

const BALL_EMISSIVE = [
  "#440000",
  "#000044",
  "#004400",
  "#443300",
  "#220044",
  "#441100",
  "#004444",
  "#114400",
  "#440022",
  "#223300",
  "#440000",
  "#000044",
  "#004400",
  "#443300",
  "#220044",
  "#441100",
  "#004444",
  "#114400",
  "#440022",
  "#223300",
];

type BallPhase = "ORBITING" | "PICKED" | "EXPLODING" | "GONE";

interface BallState {
  ringIndex: number;
  indexInRing: number;
  phase: BallPhase;
  imageUrl: string | null;
  color: string;
  emissive: string;
}

interface LuckyBalls3DProps {
  active: boolean;
  twoHandsDetected: boolean;
  peaceGestureDetected: boolean;
  uploadedPhotos: string[];
  onPhotoSelected: (photoUrl: string | null) => void;
  onDone: () => void;
  fingerRayOrigin: React.RefObject<THREE.Vector3>;
  fingerRayDir: React.RefObject<THREE.Vector3>;
  fingerDetected: boolean;
  isPinching: boolean;
  orbitOffsetRef: React.RefObject<number>;
}

export const LuckyBalls3D: React.FC<LuckyBalls3DProps> = ({
  active,
  twoHandsDetected,
  peaceGestureDetected,
  uploadedPhotos,
  onPhotoSelected,
  onDone,
  fingerRayOrigin,
  fingerRayDir,
  fingerDetected,
  isPinching,
  orbitOffsetRef,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const ballRefs = useRef<(THREE.Mesh | null)[]>(
    new Array(BALL_COUNT).fill(null),
  );
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const highlightedRef = useRef(-1);
  const [pickedIndex, setPickedIndex] = useState<number>(-1);
  const pickedRef = useRef(-1);
  const explodeStartRef = useRef(0);
  const ballPhasesRef = useRef<BallPhase[]>(
    new Array(BALL_COUNT).fill("ORBITING"),
  );
  const [phase, setPhase] = useState<"IDLE" | "ACTIVE" | "EXPLODING" | "DONE">(
    "IDLE",
  );
  const phaseRef = useRef<"IDLE" | "ACTIVE" | "EXPLODING" | "DONE">("IDLE");
  const hasTriggeredRef = useRef(false);
  const autoRotationRef = useRef(0);
  const pinchCooldownRef = useRef(0);

  // Assign images to balls
  const ballStates = useMemo<BallState[]>(() => {
    const states: BallState[] = [];
    let globalIndex = 0;
    for (let ringIdx = 0; ringIdx < ORBIT_RINGS.length; ringIdx++) {
      const ring = ORBIT_RINGS[ringIdx];
      for (let i = 0; i < ring.count; i++) {
        const imageUrl =
          uploadedPhotos.length > 0
            ? uploadedPhotos[globalIndex % uploadedPhotos.length]
            : null;
        states.push({
          ringIndex: ringIdx,
          indexInRing: i,
          phase: "ORBITING",
          imageUrl,
          color: BALL_COLORS[globalIndex % BALL_COLORS.length],
          emissive: BALL_EMISSIVE[globalIndex % BALL_EMISSIVE.length],
        });
        globalIndex++;
      }
    }
    return states;
  }, [uploadedPhotos]);

  // Compute ball world position given time and orbit offset
  const getBallPosition = useCallback(
    (ballIndex: number, time: number, orbitOffset: number): THREE.Vector3 => {
      const state = ballStates[ballIndex];
      if (!state) return new THREE.Vector3();
      const ring = ORBIT_RINGS[state.ringIndex];
      const angleStep = (Math.PI * 2) / ring.count;
      const angle =
        state.indexInRing * angleStep + time * ring.speed + orbitOffset;
      const x = ring.radius * Math.cos(angle);
      const z = ring.radius * Math.sin(angle);
      const y = ring.y + Math.sin(time * 1.5 + state.indexInRing * 0.8) * 0.3;
      return new THREE.Vector3(x, y, z);
    },
    [ballStates],
  );

  // Start when activated
  useEffect(() => {
    if (active && phaseRef.current === "IDLE" && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      phaseRef.current = "ACTIVE";
      setPhase("ACTIVE");
      ballPhasesRef.current = new Array(BALL_COUNT).fill("ORBITING");
    }
  }, [active]);

  const cleanup = useCallback(() => {
    phaseRef.current = "IDLE";
    setPhase("IDLE");
    setHighlightedIndex(-1);
    highlightedRef.current = -1;
    setPickedIndex(-1);
    pickedRef.current = -1;
    hasTriggeredRef.current = false;
    ballPhasesRef.current = new Array(BALL_COUNT).fill("ORBITING");
  }, []);

  // Handle pinch to pick
  useEffect(() => {
    if (
      isPinching &&
      highlightedRef.current >= 0 &&
      phaseRef.current === "ACTIVE" &&
      pickedRef.current < 0 &&
      pinchCooldownRef.current <= 0
    ) {
      const idx = highlightedRef.current;
      if (ballPhasesRef.current[idx] === "ORBITING") {
        pickedRef.current = idx;
        setPickedIndex(idx);
        ballPhasesRef.current[idx] = "PICKED";
        pinchCooldownRef.current = 2; // 2 second cooldown
      }
    }
  }, [isPinching]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const delta = state.clock.getDelta() || 0.016;

    if (!groupRef.current) return;
    if (phaseRef.current === "IDLE") return;

    // Decrease pinch cooldown
    if (pinchCooldownRef.current > 0) {
      pinchCooldownRef.current -= delta;
    }

    // Auto-rotation
    autoRotationRef.current += delta * 0.3;
    const orbitOffset = autoRotationRef.current + (orbitOffsetRef.current || 0);

    // --- Find closest ball to finger ray ---
    let closestIdx = -1;
    let closestDist = Infinity;

    if (fingerDetected && pickedRef.current < 0) {
      const rayOrigin = fingerRayOrigin.current;
      const rayDir = fingerRayDir.current;

      for (let i = 0; i < BALL_COUNT; i++) {
        if (ballPhasesRef.current[i] !== "ORBITING") continue;

        const mesh = ballRefs.current[i];
        if (!mesh) continue;

        // Get world position of ball
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);

        // Distance from ray to sphere center
        const toCenter = worldPos.clone().sub(rayOrigin);
        const projLen = toCenter.dot(rayDir);
        if (projLen < 0) continue; // Behind camera

        const closest = rayOrigin
          .clone()
          .add(rayDir.clone().multiplyScalar(projLen));
        const dist = closest.distanceTo(worldPos);

        if (dist < BALL_RADIUS * 5 && dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }
    }

    if (closestIdx !== highlightedRef.current) {
      highlightedRef.current = closestIdx;
      setHighlightedIndex(closestIdx);
    }

    // --- Update each ball ---
    for (let i = 0; i < BALL_COUNT; i++) {
      const mesh = ballRefs.current[i];
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const ballPhase = ballPhasesRef.current[i];

      if (ballPhase === "ORBITING") {
        // Move to orbit position
        const targetPos = getBallPosition(i, t, orbitOffset);
        mesh.position.lerp(targetPos, 0.1);
        mesh.rotation.y = t * 0.5 + i;

        // Highlight effect - strong glow + scale pulse when pointed at
        const isHighlighted = i === highlightedRef.current;
        if (isHighlighted) {
          const pulse = 1.6 + Math.sin(t * 6) * 0.2; // pulsing scale
          mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, pulse, 0.2));
          mat.emissiveIntensity = THREE.MathUtils.lerp(
            mat.emissiveIntensity,
            6.0,
            0.2,
          );
          mat.emissive.set("#FFFFFF"); // bright white glow
          mat.roughness = 0.0;
        } else {
          mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 1.0, 0.1));
          mat.emissiveIntensity = THREE.MathUtils.lerp(
            mat.emissiveIntensity,
            0.3,
            0.1,
          );
          mat.emissive.set(ballStates[i].emissive); // restore original emissive
          mat.roughness = 0.15;
        }
        mat.opacity = 1;
      } else if (ballPhase === "PICKED") {
        // Enlarge and glow
        const targetScale = 2.5;
        mesh.scale.setScalar(
          THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.08),
        );
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.emissiveIntensity,
          5.0,
          0.08,
        );
        mesh.rotation.y += delta * 3;

        // After reaching target scale, start exploding
        if (mesh.scale.x > 2.3) {
          ballPhasesRef.current[i] = "EXPLODING";
          explodeStartRef.current = t;
          phaseRef.current = "EXPLODING";
          setPhase("EXPLODING");
        }
      } else if (ballPhase === "EXPLODING") {
        const elapsed = t - explodeStartRef.current;
        const progress = Math.min(elapsed / 0.6, 1);

        mesh.scale.setScalar(2.5 + progress * 8);
        mat.opacity = 1 - progress;
        mat.emissiveIntensity = 5 + progress * 10;

        if (progress >= 1) {
          ballPhasesRef.current[i] = "GONE";
          mesh.visible = false;

          // Fire photo callback
          const ballState = ballStates[i];
          if (ballState?.imageUrl) {
            onPhotoSelected(ballState.imageUrl);
          } else {
            onPhotoSelected(null);
          }

          // Reset back to ACTIVE so more balls can be picked
          pickedRef.current = -1;
          setPickedIndex(-1);
          highlightedRef.current = -1;
          setHighlightedIndex(-1);
          phaseRef.current = "ACTIVE";
          setPhase("ACTIVE");
        }
      } else if (ballPhase === "GONE") {
        mesh.visible = false;
      }
    }
  });

  if (phaseRef.current === "IDLE" || phase === "IDLE") {
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* Ambient light for ball area */}
      <pointLight
        position={[0, 5, 0]}
        intensity={2}
        color="#D4AF37"
        distance={20}
        decay={2}
      />

      {/* Spotlight that follows highlighted ball */}
      <spotLight
        position={[0, 15, 5]}
        angle={0.5}
        penumbra={0.8}
        intensity={3}
        color="#FFFFFF"
        castShadow
        distance={25}
        decay={1.5}
      />

      {/* 20 Orbit Balls */}
      {ballStates.map((bs, i) => (
        <mesh
          key={i}
          ref={(el) => {
            ballRefs.current[i] = el;
          }}
          position={[0, ORBIT_RINGS[bs.ringIndex].y, 0]}
          scale={1}
        >
          <sphereGeometry args={[BALL_RADIUS, 24, 24]} />
          <meshStandardMaterial
            color={bs.color}
            emissive={bs.emissive}
            emissiveIntensity={0.3}
            roughness={0.15}
            metalness={0.7}
            transparent
            opacity={1}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};
