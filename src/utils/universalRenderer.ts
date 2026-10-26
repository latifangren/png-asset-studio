import { clamp, computeEDT2D, lerp, smoothstep } from './stoneMath';
import {
  StyleRecipe,
  generateBMFontDescriptor,
  getSafeCharFilename,
} from './styleRecipe';

export interface RenderDimensions {
  width: number;
  height: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return [r, g, b];
  }
  const num = parseInt(clean.slice(0, 6), 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function createDeterministicRng(text: string): () => number {
  let seed = 1337;
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i) * (i + 1)) % 233280;
  }
  if (seed <= 0) seed = 49297;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * Core universal renderer that renders any text string (single word, phrase, or single character)
 * onto a target HTMLCanvasElement using a data-driven StyleRecipe (zero hardcoded shapes).
 */
export function renderUniversalTextToCanvas(
  rawText: string,
  canvas: HTMLCanvasElement,
  recipe: StyleRecipe,
  options?: {
    /** If set, renders into a square tile of this size (for individual char PNGs / Sprite Sheet) */
    squareTileSize?: number;
  }
): RenderDimensions {
  const displayStr = (
    recipe.uppercaseOnly ? rawText.toUpperCase() : rawText
  ).trim() || 'SETTINGS';

  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: 0, height: 0 };

  const isSquareTile = Boolean(options?.squareTileSize);
  const scaleFactor = isSquareTile
    ? (options!.squareTileSize! / 96) * 0.78
    : recipe.fixedHeightPx / 96;

  const fontSize = Math.max(
    16,
    Math.round(recipe.fontSizePx * scaleFactor)
  );
  const strokeW = Math.max(
    0,
    Math.round(recipe.strokeWidthPx * scaleFactor)
  );
  const rimW = Math.max(
    0,
    recipe.outerRimWidthPx * scaleFactor
  );
  const depth = Math.max(
    0,
    Math.round(recipe.extrusionDepthPx * scaleFactor)
  );
  const dropOffsetY = Math.max(
    1,
    Math.round(recipe.dropShadowOffsetY * scaleFactor)
  );

  const fontSpec = `${recipe.fontWeight} ${fontSize}px "${recipe.fontFamily}", sans-serif`;
  ctx.font = fontSpec;
  const metrics = ctx.measureText(displayStr);

  let w: number;
  let h: number;
  let x: number;
  let y: number;

  if (isSquareTile) {
    w = options!.squareTileSize!;
    h = options!.squareTileSize!;
    x = Math.round((w - metrics.width) / 2);
    y = Math.round(h * 0.72);
  } else {
    h = Math.max(32, Math.round(recipe.fixedHeightPx));
    const paddingX = Math.max(
      Math.round(30 * scaleFactor),
      Math.ceil((strokeW + rimW) * recipe.paddingXFactor)
    );
    w = Math.max(48, Math.ceil(metrics.width + paddingX));
    x = Math.round((w - metrics.width) / 2);
    y = Math.round(h * recipe.baselineRatio);
  }

  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;
  ctx.font = fontSpec;

  // STAGE 1: Soft Ambient Drop Shadow
  if (recipe.dropShadowOpacity > 0.01) {
    ctx.save();
    ctx.lineWidth = strokeW + rimW * 2 + Math.round(5 * scaleFactor);
    const shadowRgba = `rgba(0, 0, 0, ${clamp(recipe.dropShadowOpacity, 0, 1)})`;
    ctx.strokeStyle = shadowRgba;
    ctx.fillStyle = shadowRgba;
    ctx.strokeText(displayStr, x, y + dropOffsetY);
    ctx.fillText(displayStr, x, y + dropOffsetY);
    ctx.restore();
  }

  // STAGE 2: Outer Rim Halo (e.g. dark purple rim #3A0947 in ABOUT preset)
  if (rimW > 0.2) {
    ctx.save();
    for (let d = depth; d >= 0; d--) {
      ctx.lineWidth = strokeW + rimW * 2 + (d > 0 ? 1 : 0);
      ctx.strokeStyle = recipe.outerRimColor;
      ctx.fillStyle = recipe.outerRimColor;
      ctx.strokeText(displayStr, x, y + d);
    }
    ctx.restore();
  }

  // STAGE 3: Multi-Pass 3D Bottom Extrusion
  if (depth > 0) {
    ctx.save();
    for (let d = depth; d >= 1; d--) {
      ctx.lineWidth = strokeW + Math.max(1, Math.round(1 * scaleFactor));
      ctx.strokeStyle = recipe.extrusionColor;
      ctx.fillStyle = recipe.extrusionColor;
      ctx.strokeText(displayStr, x, y + d);
      ctx.fillText(displayStr, x, y + d);
    }
    ctx.restore();
  }

  // STAGE 4: Dark Outer Contour Stroke
  if (strokeW > 0) {
    ctx.save();
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = recipe.strokeColor;
    ctx.strokeText(displayStr, x, y);
    ctx.restore();
  }

  // STAGE 5: Base Fill Gradient & Optional 3D Distance-Field Bevel Shading
  const fillCanvas = document.createElement('canvas');
  fillCanvas.width = w;
  fillCanvas.height = h;
  const fCtx = fillCanvas.getContext('2d', { willReadFrequently: true });

  if (fCtx) {
    fCtx.font = fontSpec;
    fCtx.lineJoin = 'round';
    fCtx.lineCap = 'round';

    const gradTop = y - fontSize + Math.round(6 * scaleFactor);
    const gradBottom = y;
    const grad = fCtx.createLinearGradient(0, gradTop, 0, gradBottom);

    const sortedStops = [...recipe.gradientStops].sort(
      (a, b) => a.offset - b.offset
    );
    for (const stop of sortedStops) {
      grad.addColorStop(clamp(stop.offset, 0, 1), stop.color);
    }

    fCtx.fillStyle = grad;
    fCtx.fillText(displayStr, x, y);

    const imgData = fCtx.getImageData(0, 0, w, h);
    const pixels = imgData.data;
    const totalPixels = w * h;

    // Build interior mask from rendered font glyphs
    const bgMask = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      bgMask[i] = pixels[i * 4 + 3] > 128 ? 0 : 1;
    }

    // If Hybrid 3D Bevel mode is enabled, compute exact 2D Euclidean Distance Transform
    // and apply 3D normal-mapped bevel lighting over the user's gradient
    let distIn: Float32Array | null = null;
    if (
      recipe.shadingMode === 'hybrid-3d-bevel' &&
      recipe.bevelStrength > 0.02
    ) {
      distIn = computeEDT2D(bgMask, w, h);
      const bevelRadius = Math.max(
        2.5,
        fontSize * 0.13 * clamp(recipe.bevelStrength, 0.2, 1.8)
      );

      const heightMap = new Float32Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        const d = distIn[i];
        if (d > 0) {
          heightMap[i] = Math.pow(smoothstep(0, bevelRadius, d), 0.58);
        }
      }

      const [hiR, hiG, hiB] = hexToRgb(recipe.topHighlightColor || '#ffffff');
      const bottomStopColor =
        sortedStops[sortedStops.length - 1]?.color || '#554c3d';
      const [shR, shG, shB] = hexToRgb(bottomStopColor);

      // Key light from top-left (-0.52, -0.72, 0.46)
      const lx = -0.52;
      const ly = -0.72;
      const lz = 0.46;

      for (let py = 1; py < h - 1; py++) {
        const row = py * w;
        for (let px = 1; px < w - 1; px++) {
          const i = row + px;
          const d = distIn[i];
          if (d <= 0) continue;

          const dhdx = (heightMap[row + px + 1] - heightMap[row + px - 1]) * 3.2;
          const dhdy =
            (heightMap[(py + 1) * w + px] - heightMap[(py - 1) * w + px]) * 3.2;

          let nx = -dhdx;
          let ny = -dhdy;
          let nz = 1.0;
          const inv = 1.0 / Math.hypot(nx, ny, nz);
          nx *= inv;
          ny *= inv;
          nz *= inv;

          const ndotl = clamp(nx * lx + ny * ly + nz * lz, -1, 1);
          const bevelZone = 1.0 - smoothstep(1.0, bevelRadius * 1.15, d);

          const pIdx = i * 4;
          let r = pixels[pIdx];
          let g = pixels[pIdx + 1];
          let b = pixels[pIdx + 2];

          // Top-left bevel ridge specular boost
          const highlightWeight =
            smoothstep(0.38, 0.88, ndotl) *
            (0.3 + 0.65 * bevelZone) *
            clamp(recipe.bevelStrength, 0, 1.4);
          r = lerp(r, hiR, clamp(highlightWeight * 0.72, 0, 0.9));
          g = lerp(g, hiG, clamp(highlightWeight * 0.72, 0, 0.9));
          b = lerp(b, hiB, clamp(highlightWeight * 0.72, 0, 0.9));

          // Bottom-right bevel shadow depth
          const shadowWeight =
            smoothstep(0.32, -0.35, ndotl) *
            (0.25 + 0.65 * bevelZone) *
            clamp(recipe.bevelStrength, 0, 1.4);
          r = lerp(r, shR * 0.68, clamp(shadowWeight * 0.7, 0, 0.85));
          g = lerp(g, shG * 0.68, clamp(shadowWeight * 0.7, 0, 0.85));
          b = lerp(b, shB * 0.68, clamp(shadowWeight * 0.7, 0, 0.85));

          pixels[pIdx] = Math.round(clamp(r, 0, 255));
          pixels[pIdx + 1] = Math.round(clamp(g, 0, 255));
          pixels[pIdx + 2] = Math.round(clamp(b, 0, 255));
        }
      }

      fCtx.putImageData(imgData, 0, 0);
    }

    // STAGE 6: Procedural Stone Pores / Micro Pits & Chiseled Cracks (strictly inside glyph mask)
    const rawMask = fCtx.getImageData(0, 0, w, h).data;
    const rnd = createDeterministicRng(displayStr);
    const stepGrid = Math.max(3, Math.round(4 * scaleFactor));

    if (recipe.poreDensity > 0) {
      const densityProb = clamp(recipe.poreDensity / 100, 0, 0.85);
      const [rimR, rimG, rimB] = hexToRgb(recipe.poreRimColor || '#ffffff');

      for (let py = stepGrid * 2; py < h - stepGrid * 2; py += stepGrid) {
        for (let px = stepGrid; px < w - stepGrid; px += stepGrid) {
          const i = py * w + px;
          const alpha = rawMask[i * 4 + 3];
          // Ensure pit stays inside the glyph face (not spilling over outer stroke)
          const insideSafe = distIn ? distIn[i] > 2.2 * scaleFactor : alpha > 220;

          if (insideSafe && rnd() < densityProb) {
            const minR = recipe.poreMinRadius * scaleFactor;
            const maxR = recipe.poreMaxRadius * scaleFactor;
            // Mix of fine micro-pits and occasional larger stone craters
            const isCrater = rnd() < 0.22;
            const r = isCrater
              ? minR + (maxR - minR) * (0.65 + rnd() * 0.45)
              : minR + rnd() * (maxR - minR) * 0.7;

            const ox = px + (rnd() * 2 - 1) * scaleFactor;
            const oy = py + (rnd() * 2 - 1) * scaleFactor;

            // Dark shadow pit
            fCtx.beginPath();
            fCtx.fillStyle = recipe.poreShadowColor;
            fCtx.arc(ox, oy, r, 0, Math.PI * 2);
            fCtx.fill();

            // Sunlit rim at bottom of pit
            fCtx.beginPath();
            fCtx.strokeStyle = `rgba(${rimR}, ${rimG}, ${rimB}, 0.72)`;
            fCtx.lineWidth = Math.max(0.7, 0.75 * scaleFactor);
            fCtx.arc(ox, oy + 0.4 * scaleFactor, r, 0, Math.PI);
            fCtx.stroke();
          }
        }
      }
    }

    // Chiseled V-Groove Surface Cracks (constrained inside the glyph face using destination-in)
    if (recipe.crackIntensity > 0) {
      fCtx.save();
      fCtx.globalCompositeOperation = 'source-atop';
      const numCracks = Math.max(
        1,
        Math.round(
          (displayStr.length * 1.6 * recipe.crackIntensity) / 50
        )
      );
      const [rimR, rimG, rimB] = hexToRgb(recipe.poreRimColor || '#ffffff');

      for (let c = 0; c < numCracks; c++) {
        // Pick a candidate point inside the text bounds
        const cx = x + rnd() * Math.max(20, metrics.width);
        const cy = y - fontSize * (0.15 + rnd() * 0.65);
        const len = (5 + rnd() * 10) * scaleFactor;
        const angle = -0.65 + (rnd() - 0.5) * 0.5; // Diagonal slash angle like ABOUT reference
        const dx = Math.cos(angle) * len;
        const dy = Math.sin(angle) * len;

        // Sunlit lower-right catch-light lip
        fCtx.beginPath();
        fCtx.strokeStyle = `rgba(${rimR}, ${rimG}, ${rimB}, 0.68)`;
        fCtx.lineWidth = Math.max(1.0, 1.2 * scaleFactor);
        fCtx.moveTo(cx + 0.8 * scaleFactor, cy + 0.9 * scaleFactor);
        fCtx.lineTo(cx + dx + 0.8 * scaleFactor, cy + dy + 0.9 * scaleFactor);
        fCtx.stroke();

        // Dark chiseled crevice line
        fCtx.beginPath();
        fCtx.strokeStyle = recipe.crackColor || recipe.poreShadowColor;
        fCtx.lineWidth = Math.max(1.0, 1.35 * scaleFactor);
        fCtx.moveTo(cx, cy);
        fCtx.lineTo(cx + dx, cy + dy);
        fCtx.stroke();
      }
      fCtx.restore();
    }

    // Draw the shaded & textured fill layer onto the main canvas
    ctx.drawImage(fillCanvas, 0, 0);
  }

  // STAGE 7: Top Sunlit Edge Highlight
  if (recipe.topHighlightWidthPx > 0 && recipe.topHighlightOpacity > 0.01) {
    ctx.save();
    const [hr, hg, hb] = hexToRgb(recipe.topHighlightColor || '#ffffff');
    ctx.lineWidth = recipe.topHighlightWidthPx * scaleFactor;
    ctx.strokeStyle = `rgba(${hr}, ${hg}, ${hb}, ${clamp(
      recipe.topHighlightOpacity,
      0,
      1
    )})`;
    ctx.strokeText(displayStr, x, y - Math.max(1, Math.round(1 * scaleFactor)));
    ctx.restore();
  }

  return { width: w, height: h };
}

/**
 * Renders a single character into a PNG Data URL at the specified square tile resolution.
 */
export function renderCharTileDataUrl(
  char: string,
  recipe: StyleRecipe,
  tileSize = 256
): string {
  const canvas = document.createElement('canvas');
  renderUniversalTextToCanvas(char, canvas, recipe, {
    squareTileSize: tileSize,
  });
  return canvas.toDataURL('image/png');
}

/**
 * Renders a complete Sprite Sheet Atlas (.PNG) + JSON coordinates + BMFont (.fnt) descriptor
 * for an arbitrary array of characters using the active StyleRecipe.
 */
export function renderUniversalAtlasBundle(
  chars: string[],
  recipe: StyleRecipe,
  cellSize = 256
): {
  sheetDataUrl: string;
  atlasJson: string;
  bmfontFnt: string;
} {
  const cols = Math.max(1, Math.ceil(Math.sqrt(chars.length)));
  const rows = Math.max(1, Math.ceil(chars.length / cols));
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
      code: number;
      frame: { x: number; y: number; w: number; h: number };
    }
  > = {};

  const bmfontChars: Array<{
    char: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }> = [];

  if (sctx) {
    sctx.clearRect(0, 0, sheetW, sheetH);
    const tileCanvas = document.createElement('canvas');

    chars.forEach((ch, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * cellSize;
      const y = row * cellSize;

      renderUniversalTextToCanvas(ch, tileCanvas, recipe, {
        squareTileSize: cellSize,
      });
      sctx.drawImage(tileCanvas, x, y, cellSize, cellSize);

      const fname = getSafeCharFilename(ch);
      frames[fname] = {
        char: ch,
        code: ch.charCodeAt(0),
        frame: { x, y, w: cellSize, h: cellSize },
      };

      bmfontChars.push({ char: ch, x, y, w: cellSize, h: cellSize });
    });
  }

  const imageFilename = `${recipe.id}_atlas_${cellSize}px.png`;

  const atlasJson = JSON.stringify(
    {
      meta: {
        app: 'Universal Game UI Text & Bitmap Font Studio',
        preset: recipe.name,
        fontFamily: recipe.fontFamily,
        format: 'RGBA8888 (Transparent PNG)',
        cellSize: { w: cellSize, h: cellSize },
        sheetSize: { w: sheetW, h: sheetH },
        totalChars: chars.length,
      },
      frames,
    },
    null,
    2
  );

  const bmfontFnt = generateBMFontDescriptor({
    fontFamily: recipe.fontFamily,
    fontSizePx: recipe.fontSizePx,
    cellSize,
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    imageFilename,
    chars: bmfontChars,
  });

  return {
    sheetDataUrl: sheetCanvas.toDataURL('image/png'),
    atlasJson,
    bmfontFnt,
  };
}
