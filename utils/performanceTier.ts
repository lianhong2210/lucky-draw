/**
 * Performance tier detection for adaptive rendering quality.
 * Detects device capabilities and returns configuration values
 * that components use to scale their visual complexity.
 */

export type PerformanceTier = "low" | "medium" | "high";

export interface PerfConfig {
  tier: PerformanceTier;
  /** Number of foliage particles */
  particleCount: number;
  /** Number of ornament instances */
  ornamentCount: number;
  /** Whether to enable post-processing bloom */
  enableBloom: boolean;
  /** Whether to enable vignette + noise post-processing */
  enableExtraEffects: boolean;
  /** Whether to enable ContactShadows */
  enableContactShadows: boolean;
  /** Whether to enable hover animations on ornaments */
  enableOrnamentHover: boolean;
  /** Sphere geometry segments for lucky balls */
  sphereSegments: number;
  /** Whether to enable the Environment map */
  enableEnvironment: boolean;
  /** Whether spotlight should cast shadows */
  enableSpotlightShadow: boolean;
}

const TIER_CONFIGS: Record<PerformanceTier, PerfConfig> = {
  low: {
    tier: "low",
    particleCount: 4000,
    ornamentCount: 150,
    enableBloom: false,
    enableExtraEffects: false,
    enableContactShadows: false,
    enableOrnamentHover: false,
    sphereSegments: 12,
    enableEnvironment: false,
    enableSpotlightShadow: false,
  },
  medium: {
    tier: "medium",
    particleCount: 8000,
    ornamentCount: 250,
    enableBloom: true,
    enableExtraEffects: false,
    enableContactShadows: true,
    enableOrnamentHover: true,
    sphereSegments: 16,
    enableEnvironment: true,
    enableSpotlightShadow: false,
  },
  high: {
    tier: "high",
    particleCount: 12000,
    ornamentCount: 400,
    enableBloom: true,
    enableExtraEffects: true,
    enableContactShadows: true,
    enableOrnamentHover: true,
    sphereSegments: 24,
    enableEnvironment: true,
    enableSpotlightShadow: true,
  },
};

/**
 * Detect the performance tier of the current device.
 * Uses hardware concurrency, device memory, and GPU renderer string as heuristics.
 */
export function detectPerformanceTier(): PerformanceTier {
  let score = 0;

  // 1. Hardware concurrency (logical CPU cores)
  const cores = navigator.hardwareConcurrency || 2;
  if (cores >= 8) score += 2;
  else if (cores >= 4) score += 1;
  // else score += 0 (low)

  // 2. Device memory (Chrome/Edge only)
  const mem = (navigator as any).deviceMemory;
  if (mem !== undefined) {
    if (mem >= 8) score += 2;
    else if (mem >= 4) score += 1;
    // else score += 0
  } else {
    // Unknown memory - assume medium
    score += 1;
  }

  // 3. Try to detect GPU via WebGL renderer string
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension(
        "WEBGL_debug_renderer_info",
      );
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext)
          .getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          .toLowerCase();

        // Known low-end GPUs / integrated graphics
        const lowEndPatterns = [
          "intel hd",
          "intel uhd",
          "intel(r) hd",
          "intel(r) uhd",
          "mali-4",
          "mali-t",
          "adreno 3",
          "adreno 4",
          "adreno 5",
          "powervr",
          "videocore",
          "swiftshader",
          "llvmpipe",
          "mesa",
          "microsoft basic",
        ];
        const isLowEnd = lowEndPatterns.some((p) => renderer.includes(p));

        const highEndPatterns = [
          "rtx",
          "rx 6",
          "rx 7",
          "radeon pro",
          "apple m",
          "geforce gtx 10",
          "geforce gtx 16",
          "geforce gtx 20",
          "nvidia",
          "adreno 7",
        ];
        const isHighEnd = highEndPatterns.some((p) => renderer.includes(p));

        if (isHighEnd) score += 2;
        else if (!isLowEnd) score += 1;
        // else score += 0
      } else {
        score += 1; // Unknown GPU, assume medium
      }
    }
  } catch {
    score += 1;
  }

  // 4. Check if mobile (generally lower performance)
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini/i.test(
    navigator.userAgent,
  );
  if (isMobile) score -= 1;

  // Determine tier from score (max possible ~6)
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

/**
 * Get the performance configuration for the detected (or specified) tier.
 */
export function getPerformanceConfig(tier?: PerformanceTier): PerfConfig {
  const resolvedTier = tier ?? detectPerformanceTier();
  return TIER_CONFIGS[resolvedTier];
}
