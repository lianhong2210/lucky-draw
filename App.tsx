import React, {
  useState,
  Suspense,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
import { Experience } from "./components/Experience";
import { UIOverlay } from "./components/UIOverlay";
import { GestureController } from "./components/GestureController";
import { TreeMode } from "./types";
import {
  getItem,
  removeItem,
  setItem,
} from "./src/utility/localStorageControl";
import localStorageConfig from "./src/configs/localStorage";

// Simple Error Boundary to catch 3D resource loading errors (like textures)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error loading 3D scene:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can customize this fallback UI
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-[#D4AF37] font-serif p-8 text-center">
          <div>
            <h2 className="text-2xl mb-2">Something went wrong</h2>
            <p className="opacity-70">
              A resource failed to load (likely a missing image). Check the
              console for details.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  // States
  const [mode, setMode] = useState<TreeMode>(TreeMode.FORMED);
  const [handPosition, setHandPosition] = useState<{
    x: number;
    y: number;
    detected: boolean;
  }>({ x: 0.5, y: 0.5, detected: false });
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [luckyBallsActive, setLuckyBallsActive] = useState(false);
  const [luckyPhoto, setLuckyPhoto] = useState<{
    name: string;
    imageUrl: string;
    department: string;
  } | null>(null);
  const [pickedNames, setPickedNames] = useState<string[]>([]);
  const [isXButtonHovered, setIsXButtonHovered] = useState(false);
  const [pickedResetCount, setPickedResetCount] = useState(0);

  // Ref for hand gesture
  const isGrabbingRef = useRef(false);
  const isFirstChaosRef = useRef(true);
  const isChaosReadyRef = useRef(false);

  // Ref
  const orbitOffsetRef = useRef(0);
  const chaosTimerRef = useRef<number | null>(null) as React.MutableRefObject<
    number | null
  >;
  const hasInitialized = useRef(false);
  const isXBtnReadyRef = useRef(false);

  // Check for share parameter in URL on mount
  useEffect(() => {
    const loadSharedPhotos = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shareId = urlParams.get("share");

      if (!shareId) return;

      try {
        // Try API first (works in vercel dev and production)
        try {
          const response = await fetch(`/api/share?id=${shareId}`);
          const data = await response.json();

          if (response.ok && data.success) {
            setUploadedPhotos(data.images);
            return;
          }
        } catch (apiError) {
          console.log("API not available, trying localStorage fallback");
        }

        // Fallback to localStorage if API fails (pure vite dev mode)
        const shareDataStr = localStorage.getItem(`share_${shareId}`);
        if (shareDataStr) {
          const shareData = JSON.parse(shareDataStr);
          setUploadedPhotos(shareData.images);
        } else {
          console.error("Share not found");
        }
      } catch (error) {
        console.error("Error loading shared photos:", error);
      }
    };

    loadSharedPhotos();

    setTimeout(() => {
      isChaosReadyRef.current = true;
    }, 5000);
  }, []);

  const handleSetMode = (mode: React.SetStateAction<TreeMode>) => {
    if (isChaosReadyRef.current) setMode(mode);
  };

  const handleHandPosition = (x: number, y: number, detected: boolean) => {
    setHandPosition({ x, y, detected });
  };

  const handleGrabDetected = (grabbing: boolean) => {
    isGrabbingRef.current = grabbing;
  };

  const handleSwipe = (deltaX: number) => {
    orbitOffsetRef.current += deltaX * 35; // amplify swipe into orbit rotation
  };

  // Track when logo explodes (mode goes to CHAOS) - after 2s, mark ready for lucky balls
  useEffect(() => {
    if (mode === TreeMode.CHAOS) {
      // Start 3-second timer
      chaosTimerRef.current = window.setTimeout(() => {}, 3000);
      if (isFirstChaosRef.current) {
        isFirstChaosRef.current = false;
        setLuckyBallsActive(true);
      }
    }
    return () => {
      if (chaosTimerRef.current) clearTimeout(chaosTimerRef.current);
    };
  }, [mode]);

  useEffect(() => {
    // Ensure this only runs once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const prevPickedNames: string[] =
      getItem(localStorageConfig.pickedNames) || [];

    if (prevPickedNames.length > 0) {
      setPickedNames(prevPickedNames);
    }
  }, []);

  useEffect(() => {
    if (luckyPhoto) {
      setTimeout(() => {
        isXBtnReadyRef.current = true;
      }, 1000);
    }
  }, [luckyPhoto]);

  const handleLuckyPhotoSelected = (
    photo: { name: string; imageUrl: string; department: string } | null,
  ) => {
    setLuckyPhoto(photo);
    if (photo) {
      // Store picked names into local storage
      setItem(
        localStorageConfig.pickedNames,
        JSON.stringify([...pickedNames, photo.name]),
      );

      setPickedNames((prev) => [...prev, photo.name]);
    }
  };

  const resetPickedRecord = () => {
    removeItem(localStorageConfig.pickedNames);
    setPickedNames([]);
    setPickedResetCount((prev) => prev + 1);
  };

  // Ref for the close button to detect grab-over-button
  const closeButtonRef = useRef<HTMLDivElement>(null);

  // Close lucky photo when user grabs on the close button
  const handleCloseLuckyPhoto = useCallback(() => {
    if (!isXBtnReadyRef.current) return;

    setLuckyPhoto(null);
    setLuckyBallsActive(false);
    isXBtnReadyRef.current = false;
  }, []);

  // Detect grab gesture over the close button and hover state
  useEffect(() => {
    if (!luckyPhoto || !handPosition.detected || !closeButtonRef.current) {
      setIsXButtonHovered(false);
      return;
    }

    const btn = closeButtonRef.current.getBoundingClientRect();
    // Convert finger pos (0-1 normalized, mirrored X) to screen pixels
    const fingerX = (1 - handPosition.x) * window.innerWidth;
    const fingerY = handPosition.y * window.innerHeight;

    // Add generous hit area padding around the button
    const padding = 30;

    // Check if hand is hovering over the X button
    if (
      fingerX >= btn.left - padding &&
      fingerX <= btn.right + padding &&
      fingerY >= btn.top - padding &&
      fingerY <= btn.bottom + padding
    ) {
      setIsXButtonHovered(true);
      // Trigger close on grab
      if (isGrabbingRef.current) {
        handleCloseLuckyPhoto();
      }
    } else {
      setIsXButtonHovered(false);
    }
  }, [luckyPhoto, isGrabbingRef.current, handPosition, handleCloseLuckyPhoto]);

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-black via-[#001a0d] to-[#0a2f1e]">
      <ErrorBoundary>
        <Canvas
          dpr={[0.5, 0.75]}
          camera={{ position: [0, 4, 20], fov: 45 }}
          gl={{
            antialias: false,
            stencil: false,
            alpha: false,
            powerPreference: "low-power",
          }}
          shadows
        >
          <Suspense fallback={null}>
            <Experience
              mode={mode}
              uploadedPhotos={uploadedPhotos}
              luckyBallsActive={luckyBallsActive}
              luckyPhoto={luckyPhoto}
              onLuckyPhotoSelected={handleLuckyPhotoSelected}
              handPosition={handPosition}
              isGrabbing={isGrabbingRef.current}
              orbitOffsetRef={orbitOffsetRef.current}
              pickedResetCount={pickedResetCount}
            />
          </Suspense>
        </Canvas>
      </ErrorBoundary>

      <Loader
        containerStyles={{ background: "#000" }}
        innerStyles={{ width: "300px", height: "10px", background: "#333" }}
        barStyles={{ background: "#D4AF37", height: "10px" }}
        dataStyles={{ color: "#D4AF37", fontFamily: "Cinzel" }}
      />

      <UIOverlay
        pickedNames={pickedNames}
        resetPickedRecord={resetPickedRecord}
      />

      {/* Gesture Control Module */}
      <GestureController
        currentMode={mode}
        onModeChange={handleSetMode}
        onHandPosition={handleHandPosition}
        onGrabDetected={handleGrabDetected}
        onSwipe={handleSwipe}
      />

      {/* Finger Pointer Overlay - follows index finger */}
      {handPosition.detected && (
        <div
          className="fixed z-[60] pointer-events-none"
          style={{
            left: `${(1 - handPosition.x) * 100}%`,
            top: `${handPosition.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 transition-all duration-100 ${
              isGrabbingRef.current
                ? "border-red-400 bg-red-400/40 scale-75"
                : "border-[#D4AF37] bg-[#D4AF37]/20"
            }`}
            style={{
              boxShadow: isGrabbingRef.current
                ? "0 0 16px rgba(248,113,113,0.6)"
                : "0 0 16px rgba(212,175,55,0.5)",
            }}
          />
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      )}

      {/* Lucky Photo Polaroid Overlay - shown after ball explodes */}
      {luckyPhoto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div className="relative z-50 transform transition-all duration-500 ease-out animate-scale-in">
            <div
              className="bg-white p-4 pb-8 shadow-2xl"
              style={{
                minWidth: "60vmin",
                maxWidth: "80vmin",
                minHeight: "275px",
                maxHeight: "80vh",
              }}
            >
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-6 bg-gradient-to-b from-[#D4AF37] to-[#C5A028] rounded-sm shadow-lg"></div>
              <img
                src={luckyPhoto.imageUrl}
                alt={luckyPhoto.name}
                className="w-[280px] aspect-square object-cover mx-auto block mt-5 rounded-2xl"
              />
              <div className="text-center mt-6 font-serif text-gray-700 text-[40px] mx-auto px-6 max-w-[75vmin] break-words line-clamp-2">
                {luckyPhoto.name}
              </div>
              <div className="text-center mt-2 font-serif text-gray-700 text-[25px] italic px-6 mx-auto max-w-[75vmin] break-words line-clamp-2">
                {luckyPhoto.department}
              </div>
            </div>
            <div
              ref={closeButtonRef}
              onClick={handleCloseLuckyPhoto}
              className={`absolute top-2 right-2 flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#D4AF37] backdrop-blur-sm cursor-pointer pointer-events-auto transition-all duration-200 group ${
                isXButtonHovered && !!isXBtnReadyRef.current
                  ? "bg-[#D4AF37] scale-110 shadow-[0_0_20px_rgba(212,175,55,0.6)]"
                  : "bg-black/60 hover:bg-[#D4AF37]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 transition-colors ${
                  isXButtonHovered && !!isXBtnReadyRef.current
                    ? "text-black"
                    : "text-[#D4AF37] group-hover:text-black"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
