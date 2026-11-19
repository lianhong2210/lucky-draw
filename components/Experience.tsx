import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import React, { useRef } from "react";
import * as THREE from "three";
import { TreeMode } from "../types";
import { Foliage } from "./Foliage";
import { LuckyBalls3D } from "./LuckyBalls";
import { Polaroids } from "./Polaroids";

interface ExperienceProps {
  mode: TreeMode;
  uploadedPhotos: string[];
  onClosestPhotoChange?: (photoUrl: string | null) => void; // Currently Not Used
  luckyBallsActive: boolean;
  luckyPhoto: { name: string; imageUrl: string; department: string };
  onLuckyPhotoSelected: (
    photo: { name: string; imageUrl: string; department: string } | null,
  ) => void;
  handPosition: { x: number; y: number; detected: boolean };
  isGrabbing: boolean;
  orbitOffsetRef: number;
  pickedResetCount: number;
}

export const Experience: React.FC<ExperienceProps> = ({
  mode,
  uploadedPhotos,
  luckyBallsActive,
  luckyPhoto,
  onLuckyPhotoSelected,
  handPosition,
  isGrabbing,
  orbitOffsetRef,
  pickedResetCount,
}) => {
  const controlsRef = useRef<any>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const palmRayOrigin = useRef(new THREE.Vector3());
  const palmRayDir = useRef(new THREE.Vector3());

  // Update palm raycaster only - camera stays fixed
  useFrame(() => {
    const camera = controlsRef.current?.object;
    if (camera && handPosition.detected) {
      // Convert mirrored palm position to NDC (-1 to 1)
      const ndcX = (1 - handPosition.x - 0.5) * 2;
      const ndcY = -(handPosition.y - 0.5) * 2;
      const ndc = new THREE.Vector2(ndcX, ndcY);
      raycaster.current.setFromCamera(ndc, camera);
      palmRayOrigin.current.copy(raycaster.current.ray.origin);
      palmRayDir.current.copy(raycaster.current.ray.direction);
    }
  });
  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
        minDistance={10}
        maxDistance={30}
        enableDamping
        dampingFactor={0.05}
        enabled={true}
      />

      {/* Lighting Setup for Maximum Luxury */}
      <Environment preset="dawn" background={false} blur={0.8} />

      <ambientLight intensity={0.2} color="#004422" />
      <spotLight
        position={[10, 20, 10]}
        angle={0.2}
        penumbra={1}
        intensity={2}
        color="#fff5cc"
        castShadow
      />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#D4AF37" />

      <group position={[0, -5, 0]}>
        <Foliage mode={mode} count={6000} />
        {/* <LogoOrnaments mode={mode} count={400} /> */}
        <Polaroids mode={mode} uploadedPhotos={uploadedPhotos} />
        <LuckyBalls3D
          active={luckyBallsActive}
          onPhotoSelected={onLuckyPhotoSelected}
          palmRayOrigin={palmRayOrigin}
          palmRayDir={palmRayDir}
          handPositionDetected={handPosition.detected}
          isGrabbing={isGrabbing}
          orbitOffsetRef={orbitOffsetRef}
          luckyPhoto={luckyPhoto}
          pickedResetCount={pickedResetCount}
        />

        {/* Floor Reflections */}
        <ContactShadows
          opacity={0.7}
          scale={30}
          blur={2}
          far={4.5}
          color="#000000"
        />
      </group>

      <EffectComposer enableNormalPass={false} resolutionScale={0.2}>
        <Bloom
          luminanceThreshold={0.8}
          mipmapBlur
          intensity={1.5}
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
        <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  );
};
