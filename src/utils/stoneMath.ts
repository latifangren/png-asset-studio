import { CrackSpec, CraterSpec } from './glyphCatalog';

export function clamp(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const INF = 1e12;

/**
 * 1D Squared Euclidean Distance Transform (Felzenszwalb & Huttenlocher, O(n))
 */
function edt1d(
  f: Float64Array,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
  n: number
): void {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;

  for (let q = 1; q < n; q++) {
    let s =
      (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s =
        (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) {
      k++;
    }
    const dx = q - v[k];
    d[q] = dx * dx + f[v[k]];
  }
}

/**
 * Computes exact 2D Euclidean Distance Transform (in pixels) for a binary mask.
 * Pixels where `mask[i] > 0` have distance 0; pixels where `mask[i] === 0` get
 * their exact Euclidean distance to the nearest non-zero pixel.
 */
export function computeEDT2D(
  mask: Uint8Array,
  width: number,
  height: number
): Float32Array {
  const size = width * height;
  const grid = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    grid[i] = mask[i] > 0 ? 0 : INF;
  }

  const maxDim = Math.max(width, height);
  const f = new Float64Array(maxDim);
  const d = new Float64Array(maxDim);
  const v = new Int32Array(maxDim);
  const z = new Float64Array(maxDim + 1);

  // Transform along columns
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      f[y] = grid[y * width + x];
    }
    edt1d(f, d, v, z, height);
    for (let y = 0; y < height; y++) {
      grid[y * width + x] = d[y];
    }
  }

  // Transform along rows and take square root
  const out = new Float32Array(size);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      f[x] = grid[rowOffset + x];
    }
    edt1d(f, d, v, z, width);
    for (let x = 0; x < width; x++) {
      out[rowOffset + x] = Math.sqrt(d[x]);
    }
  }

  return out;
}

export interface CraterSample {
  /** 0 outside crater, up to 1 inside crater bowl */
  bowlDepth: number;
  /** Directional inner shadow (stronger on top-left inner wall of crater) */
  innerShadow: number;
  /** Directional lower-right catch-light rim */
  rimHighlight: number;
}

/**
 * Evaluates all craters at normalized glyph coordinates (nx, ny) in [-0.5, 0.5].
 */
export function evaluateCratersAtPoint(
  nx: number,
  ny: number,
  craters: CraterSpec[],
  craterDepthMult: number
): CraterSample {
  if (craterDepthMult <= 0.001) {
    return { bowlDepth: 0, innerShadow: 0, rimHighlight: 0 };
  }

  let maxBowl = 0;
  let totalShadow = 0;
  let totalHighlight = 0;

  for (let i = 0; i < craters.length; i++) {
    const c = craters[i];
    const dx = nx - c.x;
    const dy = ny - c.y;

    // Quick bounding box rejection
    const maxR = Math.max(c.rx, c.ry) * 1.45;
    if (Math.abs(dx) > maxR || Math.abs(dy) > maxR) continue;

    const cosA = Math.cos(c.angle);
    const sinA = Math.sin(c.angle);
    const rx = (dx * cosA + dy * sinA) / c.rx;
    const ry = (-dx * sinA + dy * cosA) / c.ry;
    const distSq = rx * rx + ry * ry;

    if (distSq < 1.8) {
      const dist = Math.sqrt(distSq);
      // Unrotated normalized offset along light direction (top-left -> bottom-right)
      const lightProj = (dx / c.rx) * 0.62 + (dy / c.ry) * 0.78;

      if (dist < 1.0) {
        // Smooth concave bowl with crisp edge (matching ABOUT pores)
        const edgeSoft = 1.0 - smoothstep(0.68, 1.0, dist);
        const bowl = edgeSoft * c.depth * craterDepthMult;
        if (bowl > maxBowl) maxBowl = bowl;

        // Top-left inner wall of the pore is in shadow (lightProj < 0.15)
        const shadowWall =
          smoothstep(0.45, -0.55, lightProj) *
          smoothstep(1.0, 0.72, dist) *
          c.depth *
          craterDepthMult;
        totalShadow = Math.max(totalShadow, shadowWall * 0.92 + bowl * 0.28);

        // Lower-right inner floor catches warm bounce light
        const innerBounce =
          smoothstep(-0.1, 0.75, lightProj) *
          smoothstep(0.3, 0.85, dist) *
          smoothstep(1.0, 0.82, dist) *
          0.35 *
          craterDepthMult;
        totalHighlight = Math.max(totalHighlight, innerBounce);
      } else if (dist < 1.32) {
        // Subtle outer lower-right catch-light lip around the crater rim
        const rimFactor =
          (1.0 - Math.abs(dist - 1.12) / 0.2) *
          smoothstep(0.0, 0.85, lightProj) *
          0.42 *
          craterDepthMult;
        if (rimFactor > totalHighlight) {
          totalHighlight = rimFactor;
        }
      }
    }
  }

  return {
    bowlDepth: clamp(maxBowl, 0, 1.3),
    innerShadow: clamp(totalShadow, 0, 1.0),
    rimHighlight: clamp(totalHighlight, 0, 0.85),
  };
}

export interface CrackSample {
  /** Crevice dark factor (0 to 1) */
  creviceDark: number;
  /** Lower-right chiseled lip highlight (0 to 1) */
  lipHighlight: number;
  /** Height depression */
  grooveDepth: number;
}

/**
 * Evaluates chiseled V-groove cracks at normalized glyph coordinates (nx, ny).
 */
export function evaluateCracksAtPoint(
  nx: number,
  ny: number,
  cracks: CrackSpec[],
  crackIntensity: number
): CrackSample {
  if (crackIntensity <= 0.001) {
    return { creviceDark: 0, lipHighlight: 0, grooveDepth: 0 };
  }

  let maxCrevice = 0;
  let maxLip = 0;
  let maxGroove = 0;

  for (let i = 0; i < cracks.length; i++) {
    const cr = cracks[i];
    const vx = cr.x2 - cr.x1;
    const vy = cr.y2 - cr.y1;
    const lenSq = vx * vx + vy * vy;
    if (lenSq < 1e-6) continue;

    const wx = nx - cr.x1;
    const wy = ny - cr.y1;
    const tRaw = (wx * vx + wy * vy) / lenSq;
    if (tRaw < -0.05 || tRaw > 1.05) continue;

    const t = clamp(tRaw, 0, 1);
    const len = Math.sqrt(lenSq);
    // Unit normal perpendicular to crack segment, oriented toward bottom-right
    let nxPerp = -vy / len;
    let nyPerp = vx / len;
    if (nxPerp * 0.6 + nyPerp * 0.8 < 0) {
      nxPerp = -nxPerp;
      nyPerp = -nyPerp;
    }

    // Subtle organic wave along the crack length
    const wave = Math.sin(t * Math.PI * 2.5 + i * 1.7) * 0.0035;
    const px = cr.x1 + t * vx + nxPerp * wave;
    const py = cr.y1 + t * vy + nyPerp * wave;

    const dx = nx - px;
    const dy = ny - py;
    const perpDist = dx * nxPerp + dy * nyPerp;
    const absDist = Math.hypot(dx, dy);

    // Taper width at both ends (sharp chiseled tips)
    const taper = Math.sin(t * Math.PI);
    const halfWidth = cr.width * (0.25 + 0.85 * taper) * 0.55;

    if (absDist < halfWidth * 2.6 && taper > 0.02) {
      // Main dark V-groove crevice
      if (absDist < halfWidth) {
        const groove = (1.0 - absDist / halfWidth) * cr.depth * crackIntensity;
        if (groove > maxGroove) maxGroove = groove;
        if (groove > maxCrevice) maxCrevice = groove;
      }
      // Bright chiseled catch-light lip on the lower-right side of the groove
      const lipCenter = halfWidth * 1.05;
      const lipSpan = halfWidth * 1.1;
      if (perpDist > 0 && perpDist < lipCenter + lipSpan) {
        const lipProfile = 1.0 - Math.abs(perpDist - lipCenter) / lipSpan;
        if (lipProfile > 0) {
          const lip = lipProfile * taper * 0.78 * cr.depth * crackIntensity;
          if (lip > maxLip) maxLip = lip;
        }
      }
    }
  }

  return {
    creviceDark: clamp(maxCrevice, 0, 1.0),
    lipHighlight: clamp(maxLip, 0, 0.9),
    grooveDepth: clamp(maxGroove, 0, 1.0),
  };
}
