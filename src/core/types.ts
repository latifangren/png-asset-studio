/**
 * Core data types for png-asset-studio.
 *
 * These types are product-neutral: no preset name, game name, or UI string
 * lives here. They were moved verbatim from the original
 * `src/utils/styleRecipe.ts`, except one fix: CanvasSizeMode previously
 * contained `' auto-trim'` (leading space) and was unused. It is now
 * `'auto-trim'`.
 */
export type ShadingMode = 'hybrid-3d-bevel' | 'fast-2d-layer';
export type CanvasSizeMode = 'fixed-height' | 'auto-trim' | 'square-tile';

export interface GradientStop {
  offset: number; // 0.0 to 1.0
  color: string; // Hex color e.g. '#fff7db'
}

export interface StyleRecipe {
  id: string;
  name: string;
  badgeLabel: string;
  shadingMode: ShadingMode;

  // Font & Typography
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  uppercaseOnly: boolean;

  // Canvas Dimension Policy (for Word / Button generator)
  fixedHeightPx: number; // Default 96px HD in-game standard
  autoTrimWidth: boolean;
  paddingXFactor: number; // Multiplier of strokeWidth (default 3)
  baselineRatio: number; // Default 0.74 for 96px canvas

  // 3D Extrusion, Contour Stroke & Rim
  dropShadowOpacity: number; // 0 to 1 (default 0.45)
  dropShadowOffsetY: number; // Default 6px
  extrusionDepthPx: number; // 0 to 16px (default 5px)
  extrusionColor: string;
  strokeWidthPx: number; // 0 to 24px (default 9px)
  strokeColor: string;
  outerRimWidthPx: number; // 0 to 6px
  outerRimColor: string;

  // Base Fill & 3D Bevel
  bevelStrength: number; // 0 to 1.5 (used in hybrid-3d-bevel mode)
  gradientStops: GradientStop[];

  // Procedural Surface Texture (Pores / Pits & Cracks)
  poreDensity: number; // 0 to 60 (%)
  poreMinRadius: number;
  poreMaxRadius: number;
  poreShadowColor: string;
  poreRimColor: string;
  crackIntensity: number; // 0 to 100 (%)
  crackColor: string;

  // Top Sunlit Highlight
  topHighlightWidthPx: number;
  topHighlightColor: string;
  topHighlightOpacity: number;
}

export interface BatchWordItem {
  id: string;
  text: string;
  langFolder: string; // Free language code, e.g. 'en', 'id', 'jp' — NOT a UI locale
  presetId: string;
  filename: string;
}

export interface FontOptionLike {
  family: string;
  label: string;
  source: 'builtin' | 'uploaded' | 'google';
}
