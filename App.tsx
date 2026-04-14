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
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [twoHandsDetected, setTwoHandsDetected] = useState(false);
  const [closestPhoto, setClosestPhoto] = useState<string | null>(null);
  const [luckyBallsActive, setLuckyBallsActive] = useState(false);
  const [luckyBallsReady, setLuckyBallsReady] = useState(false);
  const [luckyPhoto, setLuckyPhoto] = useState<string | null>(null);

  // New state for finger pointer, pinch, swipe
  const [indexFingerPos, setIndexFingerPos] = useState<{
    x: number;
    y: number;
    detected: boolean;
  }>({ x: 0.5, y: 0.5, detected: false });
  const [isPinching, setIsPinching] = useState(false);

  // Ref
  const orbitOffsetRef = useRef(0);
  const chaosTimerRef = useRef<number | null>(null) as React.MutableRefObject<
    number | null
  >;
  const luckyBallsUsedRef = useRef(false);

  // Check for share parameter in URL on mount
  useEffect(() => {
    const loadSharedPhotos = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shareId = urlParams.get("share");

      if (!shareId) return;

      setIsSharedView(true);
      setIsLoadingShare(true);

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
      } finally {
        setIsLoadingShare(false);
      }
    };

    loadSharedPhotos();
  }, []);

  const toggleMode = () => {
    setMode((prev) =>
      prev === TreeMode.FORMED ? TreeMode.CHAOS : TreeMode.FORMED,
    );
  };

  const handleHandPosition = (x: number, y: number, detected: boolean) => {
    setHandPosition({ x, y, detected });
  };

  const handleTwoHandsDetected = (detected: boolean) => {
    setTwoHandsDetected(detected);
  };

  const handleIndexFingerPosition = (
    x: number,
    y: number,
    detected: boolean,
  ) => {
    setIndexFingerPos({ x, y, detected });
  };

  const handlePinchDetected = (pinching: boolean) => {
    setIsPinching(pinching);
  };

  const handleSwipe = (deltaX: number) => {
    orbitOffsetRef.current += deltaX * 3; // amplify swipe into orbit rotation
  };

  const handleClosestPhotoChange = (photoUrl: string | null) => {
    setClosestPhoto(photoUrl);
  };

  // Track when logo explodes (mode goes to CHAOS) - after 2s, mark ready for lucky balls
  useEffect(() => {
    if (mode === TreeMode.CHAOS) {
      // Start 2-second timer
      chaosTimerRef.current = window.setTimeout(() => {
        setLuckyBallsReady(true);
      }, 2000);
    } else {
      // Mode went back to FORMED - cancel timer and reset
      if (chaosTimerRef.current) {
        clearTimeout(chaosTimerRef.current);
        chaosTimerRef.current = null;
      }
      setLuckyBallsReady(false);
      luckyBallsUsedRef.current = false; // reset so it can trigger again next chaos
    }
    return () => {
      if (chaosTimerRef.current) clearTimeout(chaosTimerRef.current);
    };
  }, [mode]);

  // Activate orbit balls once a hand is detected - they stay visible permanently
  useEffect(() => {
    if (handPosition.detected && !luckyBallsActive) {
      setLuckyBallsActive(true);
    }
  }, [handPosition.detected, luckyBallsActive]);

  const handleLuckyBallsClose = () => {
    setLuckyBallsActive(false);
    setLuckyPhoto(null);
  };

  const handleLuckyPhotoSelected = (photoUrl: string | null) => {
    setLuckyPhoto(photoUrl);
  };

  const handleLuckyBallsDone = () => {
    setLuckyBallsActive(false);
    setLuckyPhoto(null);
  };

  // Ref for the close button to detect pinch-over-button
  const closeButtonRef = useRef<HTMLDivElement>(null);

  // Close lucky photo when user pinches on the close button
  const handleCloseLuckyPhoto = useCallback(() => {
    setLuckyPhoto(null);
    setLuckyBallsActive(false);
  }, []);

  // Detect pinch gesture over the close button
  useEffect(() => {
    if (
      !luckyPhoto ||
      !isPinching ||
      !indexFingerPos.detected ||
      !closeButtonRef.current
    )
      return;

    const btn = closeButtonRef.current.getBoundingClientRect();
    // Convert finger pos (0-1 normalized, mirrored X) to screen pixels
    const fingerX = (1 - indexFingerPos.x) * window.innerWidth;
    const fingerY = indexFingerPos.y * window.innerHeight;

    // Add generous hit area padding around the button
    const padding = 30;
    if (
      fingerX >= btn.left - padding &&
      fingerX <= btn.right + padding &&
      fingerY >= btn.top - padding &&
      fingerY <= btn.bottom + padding
    ) {
      handleCloseLuckyPhoto();
    }
  }, [luckyPhoto, isPinching, indexFingerPos, handleCloseLuckyPhoto]);

  const handlePhotosUpload = (photos: string[]) => {
    setUploadedPhotos(photos);
  };

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-black via-[#001a0d] to-[#0a2f1e]">
      <ErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 4, 20], fov: 45 }}
          gl={{ antialias: false, stencil: false, alpha: false }}
          shadows
        >
          <Suspense fallback={null}>
            <Experience
              mode={mode}
              handPosition={handPosition}
              uploadedPhotos={uploadedPhotos}
              twoHandsDetected={twoHandsDetected}
              onClosestPhotoChange={handleClosestPhotoChange}
              luckyBallsActive={luckyBallsActive}
              luckyPhoto={luckyPhoto}
              onLuckyPhotoSelected={handleLuckyPhotoSelected}
              onLuckyBallsDone={handleLuckyBallsDone}
              indexFingerPos={indexFingerPos}
              isPinching={isPinching}
              orbitOffsetRef={orbitOffsetRef}
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
        mode={mode}
        onToggle={toggleMode}
        onPhotosUpload={handlePhotosUpload}
        hasPhotos={uploadedPhotos.length > 0}
        uploadedPhotos={uploadedPhotos}
        isSharedView={isSharedView}
      />

      {/* Loading indicator for shared photos */}
      {isLoadingShare && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-[#D4AF37] font-serif text-xl">
            加载分享的照片中...
          </div>
        </div>
      )}

      {/* Gesture Control Module */}
      <GestureController
        currentMode={mode}
        onModeChange={setMode}
        onHandPosition={handleHandPosition}
        onTwoHandsDetected={handleTwoHandsDetected}
        onIndexFingerPosition={handleIndexFingerPosition}
        onPinchDetected={handlePinchDetected}
        onSwipe={handleSwipe}
      />

      {/* Finger Pointer Overlay - follows index finger */}
      {indexFingerPos.detected && (
        <div
          className="fixed z-[60] pointer-events-none"
          style={{
            left: `${(1 - indexFingerPos.x) * 100}%`,
            top: `${indexFingerPos.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 transition-all duration-100 ${
              isPinching
                ? "border-red-400 bg-red-400/40 scale-75"
                : "border-[#D4AF37] bg-[#D4AF37]/20"
            }`}
            style={{
              boxShadow: isPinching
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
              style={{ width: "60vmin", maxWidth: "600px" }}
            >
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-6 bg-gradient-to-b from-[#D4AF37] to-[#C5A028] rounded-sm shadow-lg"></div>
              <img
                src={luckyPhoto}
                alt="Lucky Memory"
                className="w-full aspect-square object-cover"
              />
              <div className="text-center mt-4 font-serif text-gray-700 text-lg">
                Lucky Memory
              </div>
            </div>
            <div
              ref={closeButtonRef}
              onClick={handleCloseLuckyPhoto}
              className="mt-6 mx-auto flex items-center justify-center gap-2 px-8 py-3 rounded-full border-2 border-[#D4AF37] bg-black/60 backdrop-blur-sm cursor-pointer pointer-events-auto transition-all duration-200 hover:bg-[#D4AF37] hover:text-black group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-[#D4AF37] group-hover:text-black transition-colors"
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
              <span className="text-[#D4AF37] font-serif text-sm tracking-wider group-hover:text-black transition-colors">
                Pinch here to close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
