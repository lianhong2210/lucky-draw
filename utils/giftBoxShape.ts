/**
 * Procedurally samples particle positions + colors that form a 3D present box:
 * a red box with a slightly wider lid, a gold ribbon crossing every face,
 * and a four-loop gold bow on top. Coordinates are in the Experience group's
 * local space (floor at y = 0).
 */

const BODY = { hx: 3.2, hz: 3.2, y0: 0, y1: 4.6 };
const LID = { hx: 3.5, hz: 3.5, y0: 4.6, y1: 5.8 };
const RIBBON_HALF_WIDTH = 0.5;
const RIBBON_LIFT = 0.06; // push ribbon slightly off the box surface

const BOW_CENTER_Y = LID.y1;
const BOW_LOOP_RADIUS = 1.05;
const BOW_TUBE_RADIUS = 0.22;
const KNOT_RADIUS = 0.45;

const BOX_RED: [number, number, number] = [0.78, 0.04, 0.1];
const EDGE_RED: [number, number, number] = [1.0, 0.22, 0.22];
const GOLD: [number, number, number] = [1.0, 0.8, 0.22];

type Vec3 = [number, number, number];
type Box = typeof BODY;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Random point on the surface of a box (bottom face skipped — it sits on the floor or the body). */
function sampleBoxSurface(b: Box): { p: Vec3; face: string } {
  const w = b.hx * 2;
  const d = b.hz * 2;
  const h = b.y1 - b.y0;
  const areas = [
    ["top", w * d],
    ["front", w * h],
    ["back", w * h],
    ["left", d * h],
    ["right", d * h],
  ] as const;
  const total = areas.reduce((s, [, a]) => s + a, 0);
  let r = Math.random() * total;
  let face: string = "top";
  for (const [f, a] of areas) {
    if (r < a) {
      face = f;
      break;
    }
    r -= a;
  }

  const x = rand(-b.hx, b.hx);
  const y = rand(b.y0, b.y1);
  const z = rand(-b.hz, b.hz);
  switch (face) {
    case "top":
      return { p: [x, b.y1, z], face };
    case "front":
      return { p: [x, y, b.hz], face };
    case "back":
      return { p: [x, y, -b.hz], face };
    case "left":
      return { p: [-b.hx, y, z], face };
    default:
      return { p: [b.hx, y, z], face };
  }
}

/** Is a surface point covered by the ribbon (a cross band through the box centre)? */
function isRibbon(p: Vec3, face: string): boolean {
  const onX = Math.abs(p[0]) < RIBBON_HALF_WIDTH;
  const onZ = Math.abs(p[2]) < RIBBON_HALF_WIDTH;
  if (face === "top") return onX || onZ;
  if (face === "front" || face === "back") return onX;
  return onZ;
}

function liftOffSurface(p: Vec3, face: string): Vec3 {
  const [x, y, z] = p;
  switch (face) {
    case "top":
      return [x, y + RIBBON_LIFT, z];
    case "front":
      return [x, y, z + RIBBON_LIFT];
    case "back":
      return [x, y, z - RIBBON_LIFT];
    case "left":
      return [x - RIBBON_LIFT, y, z];
    default:
      return [x + RIBBON_LIFT, y, z];
  }
}

/** Random point along one of the 12 edges of a box. */
function sampleBoxEdge(b: Box): Vec3 {
  const edge = Math.floor(Math.random() * 12);
  const sx = Math.random() < 0.5 ? -b.hx : b.hx;
  const sz = Math.random() < 0.5 ? -b.hz : b.hz;
  const sy = Math.random() < 0.5 ? b.y0 : b.y1;
  if (edge < 4) return [rand(-b.hx, b.hx), sy, sz]; // along X
  if (edge < 8) return [sx, sy, rand(-b.hz, b.hz)]; // along Z
  return [sx, rand(b.y0, b.y1), sz]; // vertical
}

/** Random point on one of four bow loops, or the centre knot. */
function sampleBow(): Vec3 {
  if (Math.random() < 0.15) {
    // Knot: small sphere where the loops meet
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    return [
      KNOT_RADIUS * Math.sin(v) * Math.cos(u),
      BOW_CENTER_Y + 0.3 + KNOT_RADIUS * Math.cos(v),
      KNOT_RADIUS * Math.sin(v) * Math.sin(u),
    ];
  }

  // Loop direction in the XZ plane (along the ribbon bands)
  const dirAngle = (Math.floor(Math.random() * 4) * Math.PI) / 2;
  const dx = Math.cos(dirAngle);
  const dz = Math.sin(dirAngle);

  // Loop is a tilted ellipse in the plane spanned by (dir, up)
  const t = Math.random() * Math.PI * 2;
  const along = BOW_LOOP_RADIUS * (1 + Math.cos(t)); // 0 at knot, 2R at tip
  const up = 0.3 + 0.7 * BOW_LOOP_RADIUS * Math.sin(t) + along * 0.35;

  // Tube thickness
  const tu = Math.random() * Math.PI * 2;
  const tr = BOW_TUBE_RADIUS * Math.sqrt(Math.random());
  const side = Math.cos(tu) * tr;

  return [
    dx * along - dz * side,
    BOW_CENTER_Y + up + Math.sin(tu) * tr,
    dz * along + dx * side,
  ];
}

/**
 * Fills target (xyz) and colors (rgb) arrays with `count` present-box particles.
 */
export function fillGiftBoxTargets(
  target: Float32Array,
  colors: Float32Array,
  count: number,
): void {
  const jitter = 0.04;
  const put = (i: number, p: Vec3, c: Vec3) => {
    target[i * 3] = p[0] + (Math.random() - 0.5) * jitter;
    target[i * 3 + 1] = p[1] + (Math.random() - 0.5) * jitter;
    target[i * 3 + 2] = p[2] + (Math.random() - 0.5) * jitter;
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  };

  const edgeEnd = Math.floor(count * 0.18);
  const ribbonEnd = edgeEnd + Math.floor(count * 0.2);
  const bowEnd = ribbonEnd + Math.floor(count * 0.16);

  for (let i = 0; i < count; i++) {
    // The lid has ~1/3 of the body's surface; split samples accordingly.
    const box = Math.random() < 0.3 ? LID : BODY;

    if (i < edgeEnd) {
      put(i, sampleBoxEdge(box), EDGE_RED);
    } else if (i < ribbonEnd) {
      // Rejection-sample until the point lands on the ribbon band
      let s = sampleBoxSurface(box);
      while (!isRibbon(s.p, s.face)) s = sampleBoxSurface(box);
      put(i, liftOffSurface(s.p, s.face), GOLD);
    } else if (i < bowEnd) {
      put(i, sampleBow(), GOLD);
    } else {
      const s = sampleBoxSurface(box);
      if (isRibbon(s.p, s.face)) {
        put(i, liftOffSurface(s.p, s.face), GOLD);
      } else {
        put(i, s.p, BOX_RED);
      }
    }
  }
}
