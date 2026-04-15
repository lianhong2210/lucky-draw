import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import PhotoListing from "../src/listing/sample.json";

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

const BALL_RADIUS = 0.8;

// Distribute balls across 2 orbit rings at different heights
const INITIAL_ORBIT_RINGS = [
  { y: 3, radius: 30, count: 10, speed: 0.15 }, // Lower ring - wider
  { y: 7, radius: 30, count: 10, speed: -0.12 }, // Upper ring - tighter, opposite dir
];
const ORBIT_RINGS = [
  { y: 3, radius: 7.5, count: 10, speed: 0.15 }, // Lower ring - wider
  { y: 7, radius: 6, count: 10, speed: -0.12 }, // Upper ring - tighter, opposite dir
];
const BALL_COUNT = ORBIT_RINGS.reduce((acc, cur) => (acc += cur.count), 0);

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
  // imageUrl: string | null;
  color: string;
  emissive: string;
  // globalIndex: number;
  isInitial: boolean;
}

interface LuckyBalls3DProps {
  active: boolean;
  twoHandsDetected: boolean;
  uploadedPhotos: string[];
  onPhotoSelected: (photo: { name: string; imageUrl: string } | null) => void;
  onDone: () => void;
  fingerRayOrigin: React.RefObject<THREE.Vector3>;
  fingerRayDir: React.RefObject<THREE.Vector3>;
  fingerDetected: boolean;
  isPinching: boolean;
  isPinchingRef: React.RefObject<boolean>;
  orbitOffsetRef: React.RefObject<number>;
  luckyPhoto: { name: string; imageUrl: string };
}

export const LuckyBalls3D: React.FC<LuckyBalls3DProps> = ({
  active,
  twoHandsDetected,
  uploadedPhotos,
  onPhotoSelected,
  onDone,
  fingerRayOrigin,
  fingerRayDir,
  fingerDetected,
  isPinching,
  isPinchingRef,
  orbitOffsetRef,
  luckyPhoto,
}) => {
  const photos = useRef<{ name: string; imageUrl: string }[]>(PhotoListing);
  const pickedPhotos = useRef<{ name: string; imageUrl: string }[]>([]);
  const ballStates = useRef<BallState[]>([]);
  const readyToNextBatchRef = useRef(false);
  const groupRef = useRef<THREE.Group>(null);
  const ballRefs = useRef<(THREE.Mesh | null)[]>([]);
  const highlightedRef = useRef(-1);
  const pickedRef = useRef(-1);
  const explodeStartRef = useRef(0);
  const phaseRef = useRef<"IDLE" | "ACTIVE" | "EXPLODING" | "DONE">("IDLE");
  const hasTriggeredRef = useRef(false);
  const autoRotationRef = useRef(0);
  const pinchCooldownRef = useRef(0);
  const ballLertRef = useRef(0.5);
  const isBallReadyRef = useRef(false);

  const getBallCountWithBatch = () => {
    return photos.current.length >= BALL_COUNT
      ? BALL_COUNT
      : photos.current.length;
  };

  const assignBallPosition = (initial=false) => {
    const maxLength = getBallCountWithBatch();

    if (maxLength === 0) {
      ballStates.current = [];
      return;
    }

    if (initial){
      // Reset ball states and ring positions
      ballStates.current = [];
      let currentBallIndex = 0;
      for (let ringIdx = 0; ringIdx < INITIAL_ORBIT_RINGS.length; ringIdx++) {
        const ring = INITIAL_ORBIT_RINGS[ringIdx];
        for (let i = 0; i < ring.count; i++) {
          if (currentBallIndex >= maxLength) {
            break;
          }
          ballStates.current[currentBallIndex] = {
            phase: "ORBITING",
            color: BALL_COLORS[currentBallIndex % BALL_COLORS.length],
            emissive: BALL_EMISSIVE[currentBallIndex % BALL_EMISSIVE.length],
            ringIndex: ringIdx,
            indexInRing: i,
            isInitial: true
          };
          currentBallIndex++;
        }
      }
      
    } else {
      // Reset ball states and ring positions
      ballStates.current = [];
      let currentBallIndex = 0;
      for (let ringIdx = 0; ringIdx < ORBIT_RINGS.length; ringIdx++) {
        const ring = ORBIT_RINGS[ringIdx];
        for (let i = 0; i < ring.count; i++) {
          if (currentBallIndex >= maxLength) {
            break;
          }
          ballStates.current[currentBallIndex] = {
            phase: "ORBITING",
            color: BALL_COLORS[currentBallIndex % BALL_COLORS.length],
            emissive: BALL_EMISSIVE[currentBallIndex % BALL_EMISSIVE.length],
            ringIndex: ringIdx,
            indexInRing: i,
            isInitial: false
          };
          currentBallIndex++;
        }
      }
    }


  };

  // Compute ball world position given time and orbit offset
  const getBallPosition = (
    ballIndex: number,
    time: number,
    orbitOffset: number,
  ): THREE.Vector3 => {
    const state = ballStates.current[ballIndex];
    if (!state) return new THREE.Vector3();
    const ring = state.isInitial ? INITIAL_ORBIT_RINGS[state.ringIndex] : ORBIT_RINGS[state.ringIndex];
    const angleStep = (Math.PI * 2) / ring.count;
    const angle =
      state.indexInRing * angleStep + time * ring.speed + orbitOffset;
    const x = ring.radius * Math.cos(angle);
    const z = ring.radius * Math.sin(angle);
    const y = ring.y + Math.sin(time * 1.5 + state.indexInRing * 0.8) * 0.3;
    return new THREE.Vector3(x, y, z);
  };

  // Start when activated
  useEffect(() => {
    if (active && phaseRef.current === "IDLE" && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      phaseRef.current = "ACTIVE";
      assignBallPosition(true);

      setTimeout(()=>{
        // Ball speed (Returning to original orbit)
        ballLertRef.current = 0.15
        assignBallPosition()
      },2000)

      setTimeout(() => {
        // Ball speed (After returned to original orbit)
        ballLertRef.current = 0.3
        isBallReadyRef.current = true
      },5000)
    }
  }, [active]);

  // const cleanup = useCallback(() => {
  //   phaseRef.current = "IDLE";
  //   highlightedRef.current = -1;
  //   pickedRef.current = -1;
  //   hasTriggeredRef.current = false;
  // }, []);

  const nextBatch = () => {
    highlightedRef.current = -1;
    pickedRef.current = -1;
    hasTriggeredRef.current = false;
    assignBallPosition();
  };

  useFrame((state) => {
    if (
      isPinchingRef.current &&
      !luckyPhoto &&
      isBallReadyRef.current &&
      highlightedRef.current >= 0 &&
      phaseRef.current === "ACTIVE" &&
      pickedRef.current < 0 &&
      pinchCooldownRef.current <= 0
    ) {
      const ballCount = getBallCountWithBatch();
      if (ballCount === 0) return;
      const idx = highlightedRef.current;
      if (ballStates.current[idx].phase === "ORBITING") {
        pickedRef.current = idx;
        ballStates.current[idx].phase = "PICKED";
        pinchCooldownRef.current = 4; // 4-second cooldown
      }
    }
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

      const ballCountForRay = ballStates.current.length;
      if (ballCountForRay === 0) return;

      for (let i = 0; i < ballCountForRay; i++) {
        if (ballStates.current[i].phase !== "ORBITING") continue;

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

        if (dist < BALL_RADIUS && dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }
    }

    if (closestIdx !== highlightedRef.current) {
      highlightedRef.current = closestIdx;
    }

    if (luckyPhoto && !readyToNextBatchRef.current) {
      readyToNextBatchRef.current = true;
      pinchCooldownRef.current = 4.0;
    }
    if (!luckyPhoto && readyToNextBatchRef.current) {
      readyToNextBatchRef.current = false;
      pinchCooldownRef.current = 2.0; // prevent the close-pinch from picking a ball
      // Don't reset all balls - just allow picking the next one
      pickedRef.current = -1;
      highlightedRef.current = -1;
      phaseRef.current = "ACTIVE";

      // Check if all balls in current batch are gone
      const allGone =
        ballStates.current.length > 0 &&
        ballStates.current.every((bs) => bs.phase === "GONE");
      if (allGone) {
        // Filter out already picked photos
        const remaining = photos.current.filter(
          (p) => !pickedPhotos.current.includes(p),
        );
        if (remaining.length > 0) {
          photos.current = remaining;
          nextBatch();
        }
        // If no remaining photos, do nothing - all images have been picked
      }
    }

    // --- Update each ball ---
    const ballCountForUpdate = ballStates.current.length;
    if (ballCountForUpdate === 0) return;

    for (let i = 0; i < ballCountForUpdate; i++) {
      if (!ballStates.current[i]) break;

      const mesh = ballRefs.current[i];
      if (!mesh) continue;

      const mat = mesh.material as THREE.MeshStandardMaterial;
      const ballPhase = ballStates.current[i].phase;

      if (ballPhase !== "GONE") {
        mesh.visible = true;
      }

      if (ballPhase === "ORBITING") {
        // Move to orbit position
        const targetPos = getBallPosition(i, t, orbitOffset);
        mesh.position.lerp(targetPos, ballLertRef.current || 0.3);
        mesh.rotation.y = t * 0.5 + i;

        // Highlight effect - strong glow + scale pulse when pointed at
        const isHighlighted = i === highlightedRef.current;
        if (isHighlighted) {
          const pulse = 1 + Math.sin(t * 6) * 0.2; // pulsing scale
          mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, pulse, 0.2));
          mat.emissiveIntensity = THREE.MathUtils.lerp(
            mat.emissiveIntensity,
            1.0,
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
          mat.emissive.set(ballStates.current[i].emissive); // restore original emissive
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
          ballStates.current[i].phase = "EXPLODING";
          explodeStartRef.current = t;
          phaseRef.current = "EXPLODING";
        }
      } else if (ballPhase === "EXPLODING") {
        const elapsed = t - explodeStartRef.current;
        const progress = Math.min(elapsed / 0.6, 1);

        mesh.scale.setScalar(2.5 + progress * 8);
        mat.opacity = 1 - progress;
        mat.emissiveIntensity = 5 + progress * 10;

        if (progress >= 1) {
          ballStates.current[i].phase = "GONE";
          mesh.visible = false;

          // Fire random photo callback
          const randomIndex = Math.floor(Math.random() * photos.current.length);
          const imageUrl = photos.current[randomIndex];

          if (imageUrl) {
            pickedPhotos.current.push(imageUrl);
            onPhotoSelected(imageUrl);
          } else {
            onPhotoSelected(null);
          }

          // Reset back to ACTIVE so more balls can be picked
          pickedRef.current = -1;
          highlightedRef.current = -1;
          phaseRef.current = "ACTIVE";
        }
      } else if (ballPhase === "GONE") {
        mesh.visible = false;
      }
    }
  });

  if (phaseRef.current === "IDLE") {
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

      {/* Orbit Balls */}
      {ballStates.current.map((bs, i) => (
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
