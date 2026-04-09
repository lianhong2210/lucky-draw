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
 * LuckyBalls3D - 5 metallic 3D spheres roulette in the scene
 *
 * Flow:
 * 1. Logo explodes (CHAOS) → after 2s + two hands → 5 balls materialize
 * 2. A spotlight sweeps across the balls, highlighting each in turn for 5s
 * 3. One ball is picked → enlarges → explodes (scales out + fades)
 * 4. Callback fires with a random photo URL → parent shows polaroid HTML overlay
 * 5. User hides both hands → parent closes overlay and resets
 */

type Phase =
  | "IDLE"
  | "APPEARING"
  | "SCROLLING"
  | "PICKED"
  | "EXPLODING"
  | "DONE";

const BALL_COLORS = ["#FF4444", "#44AAFF", "#44FF88", "#FFD700", "#CC44FF"];
const BALL_EMISSIVE = ["#440000", "#000044", "#004400", "#443300", "#220044"];
const SCROLL_DURATION = 5; // seconds
const BALL_SPACING = 6;
const BALL_Y = 7; // height in scene (middle of tree area)
const BALL_Z = -2; // in front of logo
const BALL_RADIUS = 2.5;

interface LuckyBalls3DProps {
  active: boolean;
  twoHandsDetected: boolean;
  peaceGestureDetected: boolean;
  uploadedPhotos: string[];
  onPhotoSelected: (photoUrl: string | null) => void;
  onDone: () => void;
}

export const LuckyBalls3D: React.FC<LuckyBalls3DProps> = ({
  active,
  twoHandsDetected,
  peaceGestureDetected,
  uploadedPhotos,
  onPhotoSelected,
  onDone,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const spotlightRef = useRef<THREE.SpotLight>(null);
  const spotTargetRef = useRef<THREE.Object3D>(null);
  const ballRefs = useRef<(THREE.Mesh | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);

  const [phase, setPhase] = useState<Phase>("IDLE");
  const phaseRef = useRef<Phase>("IDLE");
  const scrollStartRef = useRef(0);
  const highlightRef = useRef(0);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [pickedIndex, setPickedIndex] = useState(-1);
  const explodeStartRef = useRef(0);
  const hasTriggeredRef = useRef(false);
  const appearedRef = useRef(0);
  const prePickedIndexRef = useRef(-1); // random winner decided at scroll start
  const lastSwitchTimeRef = useRef(0); // track when highlight last switched
  const randomPhotoIndexRef = useRef(-1); // random photo decided at scroll start

  // Ball center positions (arc arrangement)
  const ballPositions = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * BALL_SPACING;
      positions.push(new THREE.Vector3(x, BALL_Y, BALL_Z));
    }
    return positions;
  }, []);

  // Start appearing when activated
  useEffect(() => {
    if (active && phaseRef.current === "IDLE" && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      phaseRef.current = "APPEARING";
      setPhase("APPEARING");
      appearedRef.current = 0;
    }
  }, [active]);

  // When hands hidden during DONE phase → close
  useEffect(() => {
    if (phaseRef.current === "DONE" && !peaceGestureDetected) {
      onPhotoSelected(null);
      cleanup();
      onDone();
    }
  }, [peaceGestureDetected, onDone, onPhotoSelected]);

  // Reset when deactivated externally
  useEffect(() => {
    if (!active && phaseRef.current !== "IDLE") {
      cleanup();
    }
  }, [active]);

  const cleanup = useCallback(() => {
    phaseRef.current = "IDLE";
    setPhase("IDLE");
    setHighlightIndex(0);
    setPickedIndex(-1);
    highlightRef.current = 0;
    hasTriggeredRef.current = false;
    appearedRef.current = 0;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const delta = state.clock.getDelta() || 0.016;

    if (!groupRef.current) return;

    // ── APPEARING: balls scale up from 0 quickly (0.3s) ──
    if (phaseRef.current === "APPEARING") {
      appearedRef.current += delta;
      const progress = Math.min(appearedRef.current / 0.3, 1);

      ballRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        // Staggered appear
        const stagger = i * 0.04;
        const localProgress = Math.max(
          0,
          Math.min(1, (progress - stagger) / (1 - stagger)),
        );
        const eased = 1 - Math.pow(1 - localProgress, 3); // ease out cubic
        mesh.scale.setScalar(eased);
        mesh.position.copy(ballPositions[i]);
      });

      if (progress >= 1) {
        phaseRef.current = "SCROLLING";
        setPhase("SCROLLING");
        scrollStartRef.current = t;
        // Pre-decide the random winner and random photo
        prePickedIndexRef.current = Math.floor(Math.random() * 5);
        if (uploadedPhotos.length > 0) {
          randomPhotoIndexRef.current = Math.floor(
            Math.random() * uploadedPhotos.length,
          );
        }
      }
    }

    // ── SCROLLING: randomly highlight balls, slowing down over 5 seconds ──
    if (phaseRef.current === "SCROLLING") {
      const elapsed = t - scrollStartRef.current;
      const progress = Math.min(elapsed / SCROLL_DURATION, 1);

      // Interval between switches: starts at 0.08s, slows to 0.6s
      const interval = 0.08 + progress * progress * 0.52;
      const timeSinceSwitch = t - lastSwitchTimeRef.current;

      if (timeSinceSwitch >= interval) {
        lastSwitchTimeRef.current = t;
        // Pick a random DIFFERENT ball
        let next;
        do {
          next = Math.floor(Math.random() * 5);
        } while (next === highlightRef.current && progress < 0.95);

        // In the last 5% of time, snap to the pre-picked winner
        if (progress >= 0.95) {
          next = prePickedIndexRef.current;
        }

        highlightRef.current = next;
        setHighlightIndex(next);
      }

      const currentHighlight = highlightRef.current;

      // Update ball visuals
      ballRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const isHighlighted = i === currentHighlight;
        const targetScale = isHighlighted ? 1.3 : 0.9;
        const currentScale = mesh.scale.x;
        mesh.scale.setScalar(
          THREE.MathUtils.lerp(currentScale, targetScale, 0.15),
        );

        // Glow when highlighted
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.emissiveIntensity,
          isHighlighted ? 2.5 : 0.3,
          0.15,
        );
      });

      // Move spotlight to highlighted ball
      if (spotTargetRef.current) {
        const targetPos = ballPositions[currentHighlight];
        spotTargetRef.current.position.lerp(targetPos, 0.2);
      }

      // Done scrolling - use pre-picked winner
      if (progress >= 1) {
        const finalPick = prePickedIndexRef.current;
        setPickedIndex(finalPick);
        highlightRef.current = finalPick;
        setHighlightIndex(finalPick);
        phaseRef.current = "PICKED";
        setPhase("PICKED");
        explodeStartRef.current = t;
      }
    }

    // ── PICKED: selected ball enlarges, others shrink ──
    if (phaseRef.current === "PICKED") {
      const elapsed = t - explodeStartRef.current;

      ballRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (i === pickedIndex) {
          // Enlarge
          const targetScale = 2.0;
          mesh.scale.setScalar(
            THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.08),
          );
          mat.emissiveIntensity = THREE.MathUtils.lerp(
            mat.emissiveIntensity,
            4.0,
            0.08,
          );
        } else {
          // Shrink and fade
          mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 0, 0.1));
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, 0.1);
        }
      });

      // Move spotlight to picked ball
      if (spotTargetRef.current && pickedIndex >= 0) {
        spotTargetRef.current.position.lerp(ballPositions[pickedIndex], 0.1);
      }

      // After 1.5s → explode
      if (elapsed > 1.5) {
        phaseRef.current = "EXPLODING";
        setPhase("EXPLODING");
        explodeStartRef.current = t;
      }
    }

    // ── EXPLODING: ball scales up rapidly and fades ──
    if (phaseRef.current === "EXPLODING") {
      const elapsed = t - explodeStartRef.current;
      const progress = Math.min(elapsed / 0.6, 1);

      ballRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (i === pickedIndex) {
          mesh.scale.setScalar(2.0 + progress * 6);
          mat.opacity = 1 - progress;
          mat.emissiveIntensity = 4 + progress * 8;
        }
      });

      // Spotlight flares
      if (spotlightRef.current) {
        spotlightRef.current.intensity = 5 + progress * 20;
      }

      if (progress >= 1) {
        // Fire photo callback using pre-picked random photo
        if (uploadedPhotos.length > 0 && randomPhotoIndexRef.current >= 0) {
          onPhotoSelected(uploadedPhotos[randomPhotoIndexRef.current]);
        } else {
          onPhotoSelected(null);
        }
        phaseRef.current = "DONE";
        setPhase("DONE");
      }
    }

    // ── Gentle idle float for all visible balls ──
    if (phaseRef.current === "SCROLLING" || phaseRef.current === "APPEARING") {
      ballRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        mesh.position.y = ballPositions[i].y + Math.sin(t * 2 + i * 1.2) * 0.15;
        mesh.rotation.y = t * 0.5 + i;
      });
    }
  });

  if (phase === "IDLE" || phase === "DONE") {
    // In DONE we hide the 3D balls, the polaroid is shown via HTML overlay
    if (phase === "DONE") return null;
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* Spotlight that sweeps across the balls */}
      <spotLight
        ref={spotlightRef}
        position={[0, BALL_Y + 6, BALL_Z + 3]}
        angle={0.4}
        penumbra={0.8}
        intensity={5}
        color="#FFFFFF"
        castShadow
        distance={20}
        decay={1.5}
      />
      {/* Spotlight target (invisible) */}
      <object3D ref={spotTargetRef} position={[0, BALL_Y, BALL_Z]} />
      {/* Connect spotlight to target */}
      {spotlightRef.current && spotTargetRef.current && (
        <primitive
          object={spotlightRef.current}
          target={spotTargetRef.current}
        />
      )}

      {/* 5 Balls */}
      {BALL_COLORS.map((color, i) => (
        <mesh
          key={i}
          ref={(el) => {
            ballRefs.current[i] = el;
          }}
          position={ballPositions[i].toArray()}
          scale={0}
        >
          <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={BALL_EMISSIVE[i]}
            emissiveIntensity={0.3}
            roughness={0.1}
            metalness={0.6}
            transparent
            opacity={1}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Ambient fill for the ball area */}
      <pointLight
        position={[0, BALL_Y + 2, BALL_Z + 4]}
        intensity={1.5}
        color="#D4AF37"
        distance={15}
        decay={2}
      />
    </group>
  );
};
