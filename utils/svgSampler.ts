import * as THREE from "three";

const CANVAS_SIZE = 256;

let cachedImage: HTMLImageElement | null = null;
let cachedCandidates: [number, number][] | null = null;
let loadPromise: Promise<[number, number][]> | null = null;

/**
 * Loads the meztiz.svg, renders it to a canvas, and extracts
 * all red-ish pixel positions as candidate sample points.
 */
export function loadSvgCandidates(): Promise<[number, number][]> {
  if (cachedCandidates) return Promise.resolve(cachedCandidates);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<[number, number][]>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cachedImage = img;
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const pixels = imageData.data;

      const candidates: [number, number][] = [];
      for (let y = 0; y < CANVAS_SIZE; y++) {
        for (let x = 0; x < CANVAS_SIZE; x++) {
          const idx = (y * CANVAS_SIZE + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const a = pixels[idx + 3];
          if (a > 128 && r > 80 && r > g * 2 && r > b * 2) {
            candidates.push([x, y]);
          }
        }
      }

      if (candidates.length === 0) {
        for (let y = 0; y < CANVAS_SIZE; y++) {
          for (let x = 0; x < CANVAS_SIZE; x++) {
            const idx = (y * CANVAS_SIZE + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];
            if (a > 128 && r + g + b > 30) {
              candidates.push([x, y]);
            }
          }
        }
      }

      cachedCandidates = candidates;
      resolve(candidates);
    };
    img.onerror = () => resolve([]);
    img.src = "/photos/meztiz.svg";
  });

  return loadPromise;
}

const SCALE = 14;

/**
 * Samples Vector3 points from the SVG pixel candidates.
 */
export function sampleSvgVector3(
  candidates: [number, number][],
  totalPoints: number,
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  if (candidates.length === 0) return points;

  for (let i = 0; i < totalPoints; i++) {
    const [px, py] = candidates[Math.floor(Math.random() * candidates.length)];
    const nx = (px / CANVAS_SIZE - 0.5) * SCALE;
    const ny = (0.5 - py / CANVAS_SIZE) * SCALE;
    const jitter = 0.03;
    points.push(
      new THREE.Vector3(
        nx + (Math.random() - 0.5) * jitter,
        ny + 8.5 + (Math.random() - 0.5) * jitter,
        (Math.random() - 0.5) * 0.15,
      ),
    );
  }
  return points;
}

/**
 * Fills a Float32Array with target positions sampled from SVG candidates.
 */
export function fillSvgTargetPositions(
  candidates: [number, number][],
  target: Float32Array,
  count: number,
): void {
  if (candidates.length === 0) return;
  for (let i = 0; i < count; i++) {
    const [px, py] = candidates[Math.floor(Math.random() * candidates.length)];
    const nx = (px / CANVAS_SIZE - 0.5) * SCALE;
    const ny = (0.5 - py / CANVAS_SIZE) * SCALE;
    const jitter = 0.04;
    target[i * 3] = nx + (Math.random() - 0.5) * jitter;
    target[i * 3 + 1] = ny + 8.5 + (Math.random() - 0.5) * jitter;
    target[i * 3 + 2] = 0.3 + Math.random() * 0.2; // behind the ornaments
  }
}
