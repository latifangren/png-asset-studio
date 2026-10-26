import {
  DEFAULT_STONE_STYLE,
  GlyphDefinition,
  StoneStyleConfig,
  getGlyphByChar,
} from './glyphCatalog';
import {
  clamp,
  computeEDT2D,
  evaluateCracksAtPoint,
  evaluateCratersAtPoint,
  lerp,
  smoothstep,
} from './stoneMath';

const glyphDataUrlCache = new Map<string, string>();

export function getStyleCacheKey(
  char: string,
  style: StoneStyleConfig,
  renderSize: number
): string {
  return [
    char,
    renderSize,
    style.bevelStrength.toFixed(2),
    style.outlineThickness.toFixed(2),
    style.purpleRimIntensity.toFixed(2),
    style.craterDepth.toFixed(2),
    style.crackIntensity.toFixed(2),
    style.warmthShift.toFixed(0),
  ].join('|');
}

export function clearGlyphCache(): void {
  glyphDataUrlCache.clear();
}

/**
 * Draws the chubby cartoon stone silhouette for a glyph, preserving generous
 * rounded inner counters (holes inside A, B, D, O, P, Q, R, 0, 4, 6, 8, 9) and
 * the signature dome-arched 'A' and deep-canyon 'U' of the "ABOUT" reference.
 */
function drawBaseGlyphMask(
  mctx: CanvasRenderingContext2D,
  char: string,
  workSize: number,
  widthScale: number
): void {
  mctx.clearRect(0, 0, workSize, workSize);
  mctx.save();

  const cx = workSize * 0.5;
  const cy = workSize * 0.485;
  mctx.translate(cx, cy);
  mctx.scale(widthScale, 1.0);

  if (char === 'A') {
    // Custom rounded dome-arch 'A' calibrated to the exact cap-height & limb weight of B, O, U, T
    const s = workSize * 0.295;
    mctx.fillStyle = '#FFFFFF';
    mctx.strokeStyle = '#FFFFFF';
    mctx.lineJoin = 'round';
    mctx.lineCap = 'round';
    mctx.lineWidth = s * 0.62;

    mctx.beginPath();
    // Left leg -> rounded top arch -> right leg
    mctx.moveTo(-s * 0.56, s * 0.52);
    mctx.quadraticCurveTo(-s * 0.42, -s * 0.54, 0, -s * 0.54);
    mctx.quadraticCurveTo(s * 0.42, -s * 0.54, s * 0.56, s * 0.52);
    mctx.stroke();

    // Crossbar
    mctx.lineWidth = s * 0.48;
    mctx.beginPath();
    mctx.moveTo(-s * 0.38, s * 0.22);
    mctx.lineTo(s * 0.38, s * 0.22);
    mctx.stroke();

    // Punch clean oval/teardrop counter hole inside A
    mctx.globalCompositeOperation = 'destination-out';
    mctx.beginPath();
    mctx.ellipse(0, -s * 0.02, s * 0.145, s * 0.2, 0, 0, Math.PI * 2);
    mctx.fill();
    mctx.globalCompositeOperation = 'source-over';
    mctx.restore();
    return;
  }

  // Use Fredoka 700 + Lilita One for open counters, or Titan One with counter preservation
  const fontSize = Math.round(workSize * 0.63);
  mctx.font = `900 ${fontSize}px "Titan One", "Lilita One", "Fredoka", "Arial Black", sans-serif`;
  mctx.textAlign = 'center';
  mctx.textBaseline = 'middle';
  mctx.lineJoin = 'round';
  mctx.lineCap = 'round';
  mctx.miterLimit = 2;

  // Moderate outer rounding stroke so limbs are plump without choking counters
  mctx.strokeStyle = '#FFFFFF';
  mctx.fillStyle = '#FFFFFF';
  mctx.lineWidth = workSize * 0.016;
  mctx.strokeText(char, 0, 0);
  mctx.fillText(char, 0, 0);

  // Ensure open, well-proportioned inner counters matching the ABOUT reference
  mctx.globalCompositeOperation = 'destination-out';
  const rUnit = workSize * 0.01;

  if (char === 'B') {
    mctx.beginPath();
    // Upper D-shaped counter
    mctx.ellipse(-rUnit * 1.0, -rUnit * 9.5, rUnit * 4.4, rUnit * 3.8, 0, 0, Math.PI * 2);
    // Lower D-shaped counter
    mctx.ellipse(-rUnit * 0.8, rUnit * 8.8, rUnit * 4.8, rUnit * 4.2, 0, 0, Math.PI * 2);
    mctx.fill();
  } else if (char === 'O' || char === '0') {
    mctx.beginPath();
    mctx.ellipse(
      0,
      0,
      char === 'O' ? rUnit * 5.6 : rUnit * 4.6,
      char === 'O' ? rUnit * 7.4 : rUnit * 8.2,
      0,
      0,
      Math.PI * 2
    );
    mctx.fill();
  } else if (char === 'Q') {
    mctx.beginPath();
    mctx.ellipse(0, -rUnit * 1.0, rUnit * 5.2, rUnit * 6.8, 0, 0, Math.PI * 2);
    mctx.fill();
  } else if (char === 'D') {
    mctx.beginPath();
    mctx.ellipse(-rUnit * 1.2, 0, rUnit * 5.0, rUnit * 8.2, 0, 0, Math.PI * 2);
    mctx.fill();
  } else if (char === 'P' || char === 'R') {
    mctx.beginPath();
    mctx.ellipse(-rUnit * 1.0, -rUnit * 8.2, rUnit * 4.8, rUnit * 4.4, 0, 0, Math.PI * 2);
    mctx.fill();
  } else if (char === 'U') {
    // Widen the U top canyon so it matches the ABOUT reference U
    mctx.beginPath();
    mctx.roundRect(-rUnit * 5.2, -rUnit * 28, rUnit * 10.4, rUnit * 31, rUnit * 5.2);
    mctx.fill();
  } else if (char === '8') {
    mctx.beginPath();
    mctx.ellipse(0, -rUnit * 9.2, rUnit * 4.4, rUnit * 3.8, 0, 0, Math.PI * 2);
    mctx.ellipse(0, rUnit * 8.8, rUnit * 5.0, rUnit * 4.3, 0, 0, Math.PI * 2);
    mctx.fill();
  } else if (char === '6') {
    mctx.beginPath();
    mctx.ellipse(0, rUnit * 7.8, rUnit * 4.8, rUnit * 4.4, 0, 0, Math.PI * 2);
    mctx.fill();
  } else if (char === '9') {
    mctx.beginPath();
    mctx.ellipse(0, -rUnit * 7.8, rUnit * 4.8, rUnit * 4.4, 0, 0, Math.PI * 2);
    mctx.fill();
  } else if (char === '4') {
    mctx.beginPath();
    mctx.moveTo(rUnit * 1.5, -rUnit * 10.5);
    mctx.lineTo(-rUnit * 6.5, rUnit * 3.5);
    mctx.lineTo(rUnit * 1.5, rUnit * 3.5);
    mctx.closePath();
    mctx.fill();
  }

  mctx.globalCompositeOperation = 'source-over';
  mctx.restore();
}

/**
 * Renders a single glyph (A-Z or 0-9) into an HTMLCanvasElement with 100% transparent
 * PNG background, matching the carved 3D cartoon stone style of the ABOUT reference.
 */
export function renderStoneGlyphToCanvas(
  glyph: GlyphDefinition,
  targetCanvas: HTMLCanvasElement,
  style: StoneStyleConfig = DEFAULT_STONE_STYLE,
  overrideSize?: number
): void {
  const outSize = overrideSize ?? style.size;
  targetCanvas.width = outSize;
  targetCanvas.height = outSize;

  const workSize = outSize <= 280 ? outSize : outSize <= 512 ? 360 : 480;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = workSize;
  maskCanvas.height = workSize;
  const mctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!mctx) return;

  drawBaseGlyphMask(mctx, glyph.char, workSize, glyph.widthScale);

  const rawMaskData = mctx.getImageData(0, 0, workSize, workSize).data;
  const totalPixels = workSize * workSize;

  const fgMask = new Uint8Array(totalPixels);
  const bgMask = new Uint8Array(totalPixels);

  let minX = workSize;
  let maxX = 0;
  let minY = workSize;
  let maxY = 0;

  for (let y = 0; y < workSize; y++) {
    const row = y * workSize;
    for (let x = 0; x < workSize; x++) {
      const i = row + x;
      const isInside = rawMaskData[i * 4 + 3] > 120 ? 1 : 0;
      fgMask[i] = isInside;
      bgMask[i] = isInside ? 0 : 1;
      if (isInside) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX >= maxX || minY >= maxY) {
    minX = Math.floor(workSize * 0.2);
    maxX = Math.floor(workSize * 0.8);
    minY = Math.floor(workSize * 0.2);
    maxY = Math.floor(workSize * 0.8);
  }

  const boxW = Math.max(1, maxX - minX);
  const boxH = Math.max(1, maxY - minY);
  const boxCx = (minX + maxX) * 0.5;
  const boxCy = (minY + maxY) * 0.5;
  const normScale = Math.max(boxW, boxH);

  const distOut = computeEDT2D(fgMask, workSize, workSize);
  const distIn = computeEDT2D(bgMask, workSize, workSize);

  const heightMap = new Float32Array(totalPixels);
  const craterBowlMap = new Float32Array(totalPixels);
  const craterShadowMap = new Float32Array(totalPixels);
  const craterHighlightMap = new Float32Array(totalPixels);
  const crackCreviceMap = new Float32Array(totalPixels);
  const crackLipMap = new Float32Array(totalPixels);

  const bevelRadiusPx = workSize * 0.072 * clamp(style.bevelStrength, 0.5, 1.6);

  for (let y = 0; y < workSize; y++) {
    const row = y * workSize;
    const ny = (y - boxCy) / normScale;
    for (let x = 0; x < workSize; x++) {
      const i = row + x;
      const dIn = distIn[i];
      if (dIn <= 0) continue;

      const nx = (x - boxCx) / normScale;

      const edgeBevel = Math.pow(smoothstep(0, bevelRadiusPx, dIn), 0.56);
      const radialSq = nx * nx + ny * ny;
      const globalDome = Math.max(0, 1.0 - radialSq * 1.4) * 0.24;

      // Only carve craters well inside the stone limb (away from edges and inner holes)
      const interiorFade = smoothstep(workSize * 0.015, workSize * 0.036, dIn);
      const craterSample = evaluateCratersAtPoint(
        nx,
        ny,
        glyph.craters,
        style.craterDepth * interiorFade
      );

      const crackEdgeFade = smoothstep(0.0, workSize * 0.012, dIn);
      const crackSample = evaluateCracksAtPoint(
        nx,
        ny,
        glyph.cracks,
        style.crackIntensity * crackEdgeFade
      );

      craterBowlMap[i] = craterSample.bowlDepth;
      craterShadowMap[i] = craterSample.innerShadow;
      craterHighlightMap[i] = craterSample.rimHighlight;

      crackCreviceMap[i] = crackSample.creviceDark;
      crackLipMap[i] = crackSample.lipHighlight;

      heightMap[i] =
        edgeBevel +
        globalDome -
        craterSample.bowlDepth * 0.32 -
        crackSample.grooveDepth * 0.38;
    }
  }

  const outImageData = mctx.createImageData(workSize, workSize);
  const outPixels = outImageData.data;

  const blackOutlinePx =
    workSize * 0.038 * clamp(style.outlineThickness, 0.5, 1.6);
  const extrudeDownPx = Math.max(
    1,
    Math.round(workSize * 0.024 * clamp(style.outlineThickness, 0.5, 1.6))
  );
  const purpleRimPx =
    workSize * 0.008 * clamp(style.purpleRimIntensity, 0, 1.2);
  const aaWidth = 1.25;

  const lx = -0.53;
  const ly = -0.72;
  const lz = 0.45;
  const warmth = style.warmthShift;

  for (let y = 0; y < workSize; y++) {
    const row = y * workSize;
    const yUp = Math.max(0, y - extrudeDownPx);
    const rowUp = yUp * workSize;
    const ny = (y - boxCy) / normScale;

    for (let x = 0; x < workSize; x++) {
      const i = row + x;
      const pIdx = i * 4;

      const dIn = distIn[i];
      const dOutHere = distOut[i];
      const dOutShifted = distOut[rowUp + x];
      const dCasing = Math.min(dOutHere, dOutShifted + 0.3);

      const totalOuterRadius = blackOutlinePx + purpleRimPx;

      if (dIn <= 0 && dCasing > totalOuterRadius + aaWidth) {
        outPixels[pIdx] = 0;
        outPixels[pIdx + 1] = 0;
        outPixels[pIdx + 2] = 0;
        outPixels[pIdx + 3] = 0;
        continue;
      }

      if (dIn > 0) {
        const xL = Math.max(0, x - 2);
        const xR = Math.min(workSize - 1, x + 2);
        const yT = Math.max(0, y - 2);
        const yB = Math.min(workSize - 1, y + 2);

        const dhdx = (heightMap[row + xR] - heightMap[row + xL]) * 3.8;
        const dhdy =
          (heightMap[yB * workSize + x] - heightMap[yT * workSize + x]) * 3.8;

        let nxSurf = -dhdx;
        let nySurf = -dhdy;
        let nzSurf = 1.0;
        const invLen = 1.0 / Math.hypot(nxSurf, nySurf, nzSurf);
        nxSurf *= invLen;
        nySurf *= invLen;
        nzSurf *= invLen;

        const ndotl = clamp(nxSurf * lx + nySurf * ly + nzSurf * lz, -1, 1);

        const grain =
          (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 -
            Math.floor(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) -
            0.5) *
          3.0;

        const vertT = clamp(ny + 0.5, 0, 1);
        let r = lerp(226, 196, vertT) + warmth * 0.6 + grain;
        let g = lerp(211, 177, vertT) + warmth * 0.35 + grain;
        let b = lerp(187, 150, vertT) - warmth * 0.3 + grain;

        // 1. Top-Left Bevel Specular Highlight
        const bevelZone =
          1.0 - smoothstep(workSize * 0.012, bevelRadiusPx * 1.15, dIn);
        const topLeftFacing = smoothstep(0.36, 0.86, ndotl);
        const ridgeHighlight = clamp(
          topLeftFacing * (0.48 + 0.65 * bevelZone),
          0,
          1
        );
        r = lerp(r, 253, ridgeHighlight * 0.9);
        g = lerp(g, 247, ridgeHighlight * 0.9);
        b = lerp(b, 234, ridgeHighlight * 0.9);

        // 2. Bottom-Right Bevel Shadow
        const bottomRightFacing = smoothstep(0.35, -0.35, ndotl);
        const edgeShadowWeight = clamp(
          bottomRightFacing * (0.38 + 0.75 * bevelZone),
          0,
          1
        );
        r = lerp(r, 124 + warmth * 0.3, edgeShadowWeight * 0.88);
        g = lerp(g, 106 + warmth * 0.15, edgeShadowWeight * 0.88);
        b = lerp(b, 82, edgeShadowWeight * 0.88);

        const rimShadow =
          (1.0 - smoothstep(0, bevelRadiusPx * 0.45, dIn)) *
          smoothstep(0.2, -0.25, nxSurf * -0.55 + nySurf * -0.83);
        r = lerp(r, 94, rimShadow * 0.7);
        g = lerp(g, 78, rimShadow * 0.7);
        b = lerp(b, 59, rimShadow * 0.7);

        // 3. Stone Crater / Pore Shading (Distinct recessed pores matching ABOUT)
        const cBowl = craterBowlMap[i];
        const cShad = craterShadowMap[i];
        const cHigh = craterHighlightMap[i];

        if (cBowl > 0.001) {
          r = lerp(r, 162, clamp(cBowl * 0.68, 0, 1));
          g = lerp(g, 143, clamp(cBowl * 0.68, 0, 1));
          b = lerp(b, 117, clamp(cBowl * 0.68, 0, 1));
        }
        if (cShad > 0.001) {
          r = lerp(r, 92, clamp(cShad * 0.95, 0, 1));
          g = lerp(g, 76, clamp(cShad * 0.95, 0, 1));
          b = lerp(b, 57, clamp(cShad * 0.95, 0, 1));
        }
        if (cHigh > 0.001) {
          r = lerp(r, 246, clamp(cHigh, 0, 1));
          g = lerp(g, 236, clamp(cHigh, 0, 1));
          b = lerp(b, 215, clamp(cHigh, 0, 1));
        }

        // 4. Chiseled Edge Cracks & Slash Grooves
        const crDark = crackCreviceMap[i];
        const crLip = crackLipMap[i];
        if (crLip > 0.001) {
          r = lerp(r, 248, clamp(crLip, 0, 1));
          g = lerp(g, 238, clamp(crLip, 0, 1));
          b = lerp(b, 220, clamp(crLip, 0, 1));
        }
        if (crDark > 0.001) {
          r = lerp(r, 68, clamp(crDark * 0.96, 0, 1));
          g = lerp(g, 54, clamp(crDark * 0.96, 0, 1));
          b = lerp(b, 39, clamp(crDark * 0.96, 0, 1));
        }

        const innerStrokeAA = smoothstep(0.6, 2.3, dIn);
        outPixels[pIdx] = Math.round(lerp(8, clamp(r, 0, 255), innerStrokeAA));
        outPixels[pIdx + 1] = Math.round(
          lerp(5, clamp(g, 0, 255), innerStrokeAA)
        );
        outPixels[pIdx + 2] = Math.round(
          lerp(10, clamp(b, 0, 255), innerStrokeAA)
        );
        outPixels[pIdx + 3] = 255;
      } else {
        let casingR = 8;
        let casingG = 5;
        let casingB = 10;

        if (purpleRimPx > 0.1 && dCasing > blackOutlinePx - 0.8) {
          const purpleT = smoothstep(
            blackOutlinePx - 0.8,
            blackOutlinePx + purpleRimPx * 0.65,
            dCasing
          );
          casingR = Math.round(lerp(8, 58, purpleT));
          casingG = Math.round(lerp(5, 9, purpleT));
          casingB = Math.round(lerp(10, 71, purpleT));
        }

        const alphaFactor =
          1.0 -
          smoothstep(
            totalOuterRadius - aaWidth * 0.5,
            totalOuterRadius + aaWidth * 0.5,
            dCasing
          );

        outPixels[pIdx] = casingR;
        outPixels[pIdx + 1] = casingG;
        outPixels[pIdx + 2] = casingB;
        outPixels[pIdx + 3] = Math.round(clamp(alphaFactor * 255, 0, 255));
      }
    }
  }

  mctx.putImageData(outImageData, 0, 0);

  const tctx = targetCanvas.getContext('2d');
  if (!tctx) return;
  tctx.clearRect(0, 0, outSize, outSize);
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = 'high';
  tctx.drawImage(maskCanvas, 0, 0, outSize, outSize);
}

export function renderStoneGlyphDataUrl(
  glyph: GlyphDefinition,
  style: StoneStyleConfig = DEFAULT_STONE_STYLE,
  renderSize?: number
): string {
  const actualSize = renderSize ?? style.size;
  const key = getStyleCacheKey(glyph.char, style, actualSize);
  const cached = glyphDataUrlCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  renderStoneGlyphToCanvas(glyph, canvas, style, actualSize);
  const dataUrl = canvas.toDataURL('image/png');
  glyphDataUrlCache.set(key, dataUrl);
  return dataUrl;
}

/**
 * Renders a multi-character game UI word/banner (like "ABOUT", "PLAY", "SCORE 190")
 * onto a transparent PNG canvas with tight overlapping kerning so adjacent black outlines
 * fuse into one cohesive banner just like the "ABOUT" reference image.
 */
export function renderStoneWordToCanvas(
  text: string,
  targetCanvas: HTMLCanvasElement,
  style: StoneStyleConfig = DEFAULT_STONE_STYLE,
  glyphHeightPx = 220
): void {
  const cleanChars = text
    .toUpperCase()
    .split('')
    .filter((c) => /[A-Z0-9 ]/.test(c))
    .slice(0, 18);

  if (cleanChars.length === 0) {
    targetCanvas.width = 400;
    targetCanvas.height = glyphHeightPx;
    return;
  }

  // Tight kerning advance (0.45 * glyphHeightPx) so adjacent letter outlines touch/merge like "ABOUT"
  const advances = cleanChars.map((ch) => {
    if (ch === ' ') return glyphHeightPx * 0.28;
    const def = getGlyphByChar(ch);
    const wScale = def ? def.widthScale : 1.0;
    return glyphHeightPx * 0.45 * wScale;
  });

  const padX = glyphHeightPx * 0.24;
  const totalWidth = Math.ceil(
    advances.reduce((acc, w) => acc + w, 0) + padX * 2
  );
  const totalHeight = Math.ceil(glyphHeightPx * 0.92);

  targetCanvas.width = totalWidth;
  targetCanvas.height = totalHeight;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, totalWidth, totalHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let cursorX = padX;
  for (let i = 0; i < cleanChars.length; i++) {
    const ch = cleanChars[i];
    const adv = advances[i];
    if (ch !== ' ') {
      const def = getGlyphByChar(ch);
      if (def) {
        const tempCanvas = document.createElement('canvas');
        renderStoneGlyphToCanvas(def, tempCanvas, style, glyphHeightPx);
        const drawX = cursorX + adv * 0.5 - glyphHeightPx * 0.5;
        const drawY = (totalHeight - glyphHeightPx) * 0.5;
        ctx.drawImage(tempCanvas, drawX, drawY, glyphHeightPx, glyphHeightPx);
      }
    }
    cursorX += adv;
  }
}

export function renderSpriteSheetAtlas(
  glyphs: GlyphDefinition[],
  style: StoneStyleConfig,
  cellSize = 256
): {
  canvas: HTMLCanvasElement;
  metadataJson: string;
} {
  const cols = 6;
  const rows = Math.ceil(glyphs.length / cols);
  const sheetW = cols * cellSize;
  const sheetH = rows * cellSize;

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetW;
  sheetCanvas.height = sheetH;
  const sctx = sheetCanvas.getContext('2d');

  const frames: Record<
    string,
    {
      char: string;
      category: string;
      frame: { x: number; y: number; w: number; h: number };
    }
  > = {};

  if (sctx) {
    sctx.clearRect(0, 0, sheetW, sheetH);
    const cellCanvas = document.createElement('canvas');

    glyphs.forEach((g, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * cellSize;
      const y = row * cellSize;

      renderStoneGlyphToCanvas(g, cellCanvas, style, cellSize);
      sctx.drawImage(cellCanvas, x, y, cellSize, cellSize);

      frames[g.filename] = {
        char: g.char,
        category: g.category,
        frame: { x, y, w: cellSize, h: cellSize },
      };
    });
  }

  const metadataJson = JSON.stringify(
    {
      meta: {
        app: 'StoneGlyph PNG Asset Studio',
        format: 'RGBA8888 (Transparent PNG)',
        cellSize: { w: cellSize, h: cellSize },
        sheetSize: { w: sheetW, h: sheetH },
        totalGlyphs: glyphs.length,
      },
      frames,
    },
    null,
    2
  );

  return { canvas: sheetCanvas, metadataJson };
}
