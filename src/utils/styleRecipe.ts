/**
 * Compatibility shim — DO NOT add new preset data here.
 *
 * Canonical types live in `src/core/types.ts`, canonical preset data lives
 * in `src/data/presets/*.json`, and loading/validation lives in
 * `src/core/recipe.ts`. This file only re-exports them so existing imports
 * (`App`, workspaces, MCP, tests) keep working unchanged, plus the two
 * small helpers that have not moved yet (charset parsing, BMFont text).
 * Next migration step: move generateBMFontDescriptor to src/core/bmfont.ts.
 */
export type {
  BatchWordItem,
  CanvasSizeMode,
  GradientStop,
  ShadingMode,
  StyleRecipe,
} from '../core/types';
export {
  BUILTIN_PRESETS,
  EXAMPLE_BATCH_WORDS,
  getPresetById,
  PRESET_IDS,
} from '../core/recipe';
import { EXAMPLE_BATCH_WORDS } from '../core/recipe';
import type { BatchWordItem } from '../core/types';

/** Back-compat name: the batch shipped with the studio. See data/examples-batch.json. */
export const DEFAULT_BATCH_WORDS: BatchWordItem[] = EXAMPLE_BATCH_WORDS;

export const DEFAULT_CHARSET_STRING =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';

/**
 * Parses an arbitrary user charset string into unique ordered printable characters
 */
export function parseCharsetString(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ch of raw) {
    if (ch.trim() === '') continue;
    if (!seen.has(ch)) {
      seen.add(ch);
      result.push(ch);
    }
  }
  return result;
}

/**
 * Generates a safe filename for any character (including symbols like '?', '/', ':', '*')
 */
export function getSafeCharFilename(ch: string): string {
  if (/^[a-zA-Z0-9_-]$/.test(ch)) {
    return /^[a-z]$/.test(ch) ? `lower_${ch}.png` : `${ch}.png`;
  }
  return `char_${ch.charCodeAt(0)}.png`;
}

/**
 * Generates an industry-standard AngelCode BMFont (.fnt) text descriptor
 * for Unity, Godot, Phaser, Construct, and Cocos2d.
 */
export function generateBMFontDescriptor(params: {
  fontFamily: string;
  fontSizePx: number;
  cellSize: number;
  sheetWidth: number;
  sheetHeight: number;
  imageFilename: string;
  chars: Array<{ char: string; x: number; y: number; w: number; h: number }>;
}): string {
  const {
    fontFamily,
    fontSizePx,
    cellSize,
    sheetWidth,
    sheetHeight,
    imageFilename,
    chars,
  } = params;

  const lines: string[] = [
    `info face="${fontFamily}" size=${fontSizePx} bold=1 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1,0`,
    `common lineHeight=${cellSize} base=${Math.round(cellSize * 0.74)} scaleW=${sheetWidth} scaleH=${sheetHeight} pages=1 packed=0 alphaChnl=0 redChnl=4 greenChnl=4 blueChnl=4`,
    `page id=0 file="${imageFilename}"`,
    `chars count=${chars.length}`,
  ];

  for (const item of chars) {
    const code = item.char.charCodeAt(0);
    const xadvance = Math.round(item.w * 0.76);
    lines.push(
      `char id=${code}   x=${item.x}    y=${item.y}    width=${item.w}    height=${item.h}    xoffset=0     yoffset=0     xadvance=${xadvance}    page=0  chnl=15`
    );
  }

  return lines.join('\n') + '\n';
}
