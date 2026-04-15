import React, {
  useMemo,
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TreeMode } from "../types";
import { loadSvgCandidates, sampleSvgVector3 } from "../utils/svgSampler";

interface LogoOrnamentsProps {
  mode: TreeMode;
  count: number;
}

export const LogoOrnaments: React.FC<LogoOrnamentsProps> = ({
  mode,
  count,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [candidates, setCandidates] = useState<[number, number][]>([]);

  useEffect(() => {
    loadSvgCandidates().then(setCandidates);
  }, []);

  const logoPoints = useMemo(
    () => sampleSvgVector3(candidates, count),
    [candidates, count],
  );

  const instanceData = useMemo(() => {
    if (logoPoints.length === 0) return [];
    return Array.from({ length: count }, (_, i) => {
      const targetPos =
        logoPoints[i % logoPoints.length] || new THREE.Vector3();
      const r = 25 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;

      return {
        targetPos,
        chaosPos: new THREE.Vector3(
          Math.cos(theta) * r,
          10 + Math.random() * 15,
          Math.sin(theta) * r,
        ),
        speed: 2.0 + Math.random() * 2.5,
        scale: 0.06 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, [count, logoPoints]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const baseColor = new THREE.Color("#B30000"); // Rich Red
    const highlightColor = new THREE.Color("#FF1111");

    for (let i = 0; i < count; i++) {
      const color = baseColor.clone().lerp(highlightColor, Math.random() * 0.3);
      meshRef.current.setColorAt(i, color);
    }
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current || instanceData.length === 0) return;
    const isFormed = mode === TreeMode.FORMED;
    const t = state.clock.elapsedTime;

    instanceData.forEach((d, i) => {
      meshRef.current!.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      const dest = isFormed ? d.targetPos : d.chaosPos;
      dummy.position.lerp(dest, delta * d.speed);

      if (isFormed) {
        // Subtle hover animation
        dummy.position.y += Math.sin(t * 2 + d.phase) * 0.002;
        // Face "up"
        dummy.rotation.set(-Math.PI / 2, 0, 0);
      } else {
        dummy.rotation.x += delta * d.speed;
        dummy.rotation.y += delta * 0.5;
      }

      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {/* Box geometry creates the "ribbon" look when scaled small */}
      <boxGeometry args={[1, 1, 0.4]} />
      <meshStandardMaterial
        roughness={0.1}
        metalness={0.6}
        emissive="#220000"
        emissiveIntensity={0.5}
      />
    </instancedMesh>
  );
};
