/**
 * Preset loader: JSON is the source of truth, code only merges + validates.
 *
 * Layout:
 *   src/data/presets/base.json      — fields identical in every preset
 *   src/data/presets/<id>.json      — only the fields that differ for that preset
 *   src/data/examples-batch.json    — example batch (neutral sample data)
 *
 * Adding a preset = adding ONE file `src/data/presets/<new-id>.json` and one
 * import line below. No renderer, component, or MCP code needs to change.
 * Values are validated with zod at load time, so a broken JSON file fails
 * loudly here instead of producing a silently wrong PNG.
 */
import { z } from 'zod';
import type { BatchWordItem, StyleRecipe } from './types';
import baseJson from '../data/presets/base.json';
import greyStoneJson from '../data/presets/grey-stone.json';
import goldOchreJson from '../data/presets/gold-ochre.json';
import aboutStoneJson from '../data/presets/about-stone.json';
import woodPlankJson from '../data/presets/wood-plank.json';
import crystalIceJson from '../data/presets/crystal-ice.json';
import metallicIronJson from '../data/presets/metallic-iron.json';
import examplesBatchJson from '../data/examples-batch.json';

const gradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: z.string().min(1),
});

const styleRecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  badgeLabel: z.string(),
  shadingMode: z.enum(['hybrid-3d-bevel', 'fast-2d-layer']),
  fontFamily: z.string().min(1),
  fontSizePx: z.number().positive(),
  fontWeight: z.number().positive(),
  uppercaseOnly: z.boolean(),
  fixedHeightPx: z.number().positive(),
  autoTrimWidth: z.boolean(),
  paddingXFactor: z.number(),
  baselineRatio: z.number(),
  dropShadowOpacity: z.number().min(0).max(1),
  dropShadowOffsetY: z.number(),
  extrusionDepthPx: z.number().min(0),
  extrusionColor: z.string().min(1),
  strokeWidthPx: z.number().min(0),
  strokeColor: z.string().min(1),
  outerRimWidthPx: z.number().min(0),
  outerRimColor: z.string().min(1),
  bevelStrength: z.number(),
  gradientStops: z.array(gradientStopSchema).min(2),
  poreDensity: z.number().min(0),
  poreMinRadius: z.number().min(0),
  poreMaxRadius: z.number().min(0),
  poreShadowColor: z.string().min(1),
  poreRimColor: z.string().min(1),
  crackIntensity: z.number().min(0),
  crackColor: z.string().min(1),
  topHighlightWidthPx: z.number().min(0),
  topHighlightColor: z.string().min(1),
  topHighlightOpacity: z.number().min(0).max(1),
});

const batchItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  langFolder: z.string().min(1),
  presetId: z.string().min(1),
  filename: z.string().min(1),
});

function buildPreset(override: unknown): StyleRecipe {
  return styleRecipeSchema.parse({ ...baseJson, ...(override as Record<string, unknown>) });
}

export const BUILTIN_PRESETS: StyleRecipe[] = [
  greyStoneJson,
  goldOchreJson,
  aboutStoneJson,
  woodPlankJson,
  crystalIceJson,
  metallicIronJson,
].map(buildPreset);

export const PRESET_IDS: string[] = BUILTIN_PRESETS.map((p) => p.id);

export function getPresetById(id: string): StyleRecipe | undefined {
  return BUILTIN_PRESETS.find((p) => p.id.toLowerCase() === id.toLowerCase());
}

/** Example batch data. Kept separate from UI strings and from presets. */
export const EXAMPLE_BATCH_WORDS: BatchWordItem[] = z
  .array(batchItemSchema)
  .parse(examplesBatchJson);
