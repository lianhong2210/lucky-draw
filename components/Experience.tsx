import React, { useRef } from "react";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useFrame, useThree } from "@react-three/fiber";
import { Foliage } from "./Foliage";
import { LogoOrnaments } from "./Ornaments";
import { Polaroids } from "./Polaroids";
import { LuckyBalls3D } from "./LuckyBalls";
import { TreeMode } from "../types";
import * as THREE from "three";

interface ExperienceProps {
  mode: TreeMode;
  handPosition: { x: number; y: number; detected: boolean };
  uploadedPhotos: string[];
  twoHandsDetected: boolean;
  onClosestPhotoChange?: (photoUrl: string | null) => void;
  luckyBallsActive: boolean;
  luckyPhoto: { name: string; imageUrl: string };
  onLuckyPhotoSelected: (
    photo: { name: string; imageUrl: string } | null,
  ) => void;
  onLuckyBallsDone: () => void;
  indexFingerPos: { x: number; y: number; detected: boolean };
  isGrabbing: boolean;
  isGrabbingRef: React.RefObject<boolean>;
  orbitOffsetRef: React.RefObject<number>;
}

export const Experience: React.FC<ExperienceProps> = ({
  mode,
  handPosition,
  uploadedPhotos,
  twoHandsDetected,
  onClosestPhotoChange,
  luckyBallsActive,
  luckyPhoto,
  onLuckyPhotoSelected,
  onLuckyBallsDone,
  indexFingerPos,
  isGrabbing,
  isGrabbingRef,
  orbitOffsetRef,
}) => {
  const controlsRef = useRef<any>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const fingerRayOrigin = useRef(new THREE.Vector3());
  const fingerRayDir = useRef(new THREE.Vector3());

  // Update finger raycaster only - camera stays fixed
  useFrame(() => {
    const camera = controlsRef.current?.object;
    if (camera && indexFingerPos.detected) {
      // Convert mirrored finger position to NDC (-1 to 1)
      const ndcX = (1 - indexFingerPos.x - 0.5) * 2;
      const ndcY = -(indexFingerPos.y - 0.5) * 2;
      const ndc = new THREE.Vector2(ndcX, ndcY);
      raycaster.current.setFromCamera(ndc, camera);
      fingerRayOrigin.current.copy(raycaster.current.ray.origin);
      fingerRayDir.current.copy(raycaster.current.ray.direction);
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
        <Foliage mode={mode} count={3500} />
        {/* <LogoOrnaments mode={mode} count={400} /> */}
        <Polaroids
          mode={mode}
          uploadedPhotos={uploadedPhotos}
          twoHandsDetected={twoHandsDetected}
          onClosestPhotoChange={onClosestPhotoChange}
        />
        <LuckyBalls3D
          active={luckyBallsActive}
          twoHandsDetected={twoHandsDetected}
          uploadedPhotos={uploadedPhotos}
          onPhotoSelected={onLuckyPhotoSelected}
          onDone={onLuckyBallsDone}
          fingerRayOrigin={fingerRayOrigin}
          fingerRayDir={fingerRayDir}
          fingerDetected={indexFingerPos.detected}
          isGrabbing={isGrabbing}
          isGrabbingRef={isGrabbingRef}
          orbitOffsetRef={orbitOffsetRef}
          luckyPhoto={luckyPhoto}
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
