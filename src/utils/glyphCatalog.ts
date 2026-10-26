export type GlyphCategory = 'letter' | 'number';

export interface CraterSpec {
  /** Normalized X relative to glyph box (-0.42 to +0.42) */
  x: number;
  /** Normalized Y relative to glyph box (-0.42 to +0.42) */
  y: number;
  /** Normalized radius X (0.025 to 0.075) */
  rx: number;
  /** Normalized radius Y (0.025 to 0.075) */
  ry: number;
  /** Rotation in radians */
  angle: number;
  /** Depth multiplier (0.7 to 1.35) */
  depth: number;
}

export interface CrackSpec {
  /** Start point normalized (-0.48 to +0.48) */
  x1: number;
  y1: number;
  /** End point normalized (-0.48 to +0.48) */
  x2: number;
  y2: number;
  /** Width normalized (0.012 to 0.028) */
  width: number;
  /** Depth multiplier (0.8 to 1.4) */
  depth: number;
}

export interface GlyphDefinition {
  id: string;
  char: string;
  name: string;
  filename: string;
  category: GlyphCategory;
  index: number;
  isReferenceChar: boolean;
  /** Width scale adjustment so wide/narrow glyphs match reference proportions */
  widthScale: number;
  craters: CraterSpec[];
  cracks: CrackSpec[];
}

export interface StoneStyleConfig {
  /** Export canvas resolution in px (256, 512, 1024) */
  size: number;
  /** Bevel roundness radius multiplier (0.5 to 1.5, default 1.0) */
  bevelStrength: number;
  /** Outer black stroke thickness multiplier (0.6 to 1.5, default 1.0) */
  outlineThickness: number;
  /** Subtle dark purple outer rim intensity (0 to 1, default 0.88, matching ABOUT reference) */
  purpleRimIntensity: number;
  /** Crater & pore depth multiplier (0 to 1.5, default 1.0) */
  craterDepth: number;
  /** Chiseled crack intensity (0 to 1.5, default 1.0) */
  crackIntensity: number;
  /** Warmth of stone palette (-20 to +20, default 0) */
  warmthShift: number;
}

export const DEFAULT_STONE_STYLE: StoneStyleConfig = {
  size: 512,
  bevelStrength: 1.0,
  outlineThickness: 1.0,
  purpleRimIntensity: 0.88,
  craterDepth: 1.0,
  crackIntensity: 1.0,
  warmthShift: 0,
};

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hand-calibrated crater & crack maps for A, B, O, U, T matching the uploaded
 * reference image (/assets/reference/about_6ec0e8d9.png), plus deterministic
 * art-directed maps for the remaining letters and digits 1-9, 0.
 */
const HAND_TUNED_FEATURES: Record<
  string,
  { craters: CraterSpec[]; cracks: CrackSpec[]; widthScale?: number }
> = {
  A: {
    widthScale: 1.05,
    craters: [
      { x: -0.04, y: -0.24, rx: 0.046, ry: 0.038, angle: -0.35, depth: 1.2 },
      { x: 0.14, y: -0.14, rx: 0.038, ry: 0.032, angle: 0.2, depth: 1.05 },
      { x: -0.25, y: -0.05, rx: 0.045, ry: 0.036, angle: -0.4, depth: 1.15 },
      { x: 0.24, y: 0.02, rx: 0.034, ry: 0.03, angle: 0.1, depth: 1.0 },
      { x: -0.28, y: 0.21, rx: 0.054, ry: 0.038, angle: -0.35, depth: 1.25 },
      { x: -0.18, y: 0.28, rx: 0.032, ry: 0.028, angle: 0, depth: 1.0 },
      { x: 0.26, y: 0.29, rx: 0.029, ry: 0.025, angle: 0.2, depth: 0.95 },
      { x: -0.1, y: -0.33, rx: 0.026, ry: 0.022, angle: 0, depth: 0.9 },
    ],
    cracks: [
      // Prominent diagonal slash below the counter hole of A
      { x1: 0.01, y1: 0.22, x2: 0.21, y2: 0.13, width: 0.025, depth: 1.3 },
      // Edge fracture on upper right leg
      { x1: 0.26, y1: 0.09, x2: 0.38, y2: 0.03, width: 0.018, depth: 1.1 },
      // Inner left leg notch
      { x1: -0.13, y1: 0.26, x2: -0.22, y2: 0.35, width: 0.018, depth: 1.05 },
    ],
  },
  B: {
    widthScale: 0.98,
    craters: [
      { x: -0.21, y: -0.26, rx: 0.048, ry: 0.038, angle: -0.2, depth: 1.2 },
      { x: -0.05, y: -0.24, rx: 0.028, ry: 0.025, angle: 0.1, depth: 0.95 },
      { x: 0.16, y: -0.27, rx: 0.038, ry: 0.03, angle: 0.2, depth: 1.05 },
      { x: -0.22, y: -0.12, rx: 0.027, ry: 0.024, angle: 0, depth: 0.9 },
      { x: -0.22, y: 0.05, rx: 0.042, ry: 0.034, angle: -0.3, depth: 1.1 },
      { x: 0.23, y: 0.12, rx: 0.035, ry: 0.028, angle: 0.3, depth: 1.0 },
      { x: 0.14, y: 0.27, rx: 0.046, ry: 0.034, angle: -0.2, depth: 1.15 },
      { x: -0.16, y: 0.3, rx: 0.036, ry: 0.028, angle: 0.1, depth: 1.0 },
    ],
    cracks: [
      // Bottom-left edge crack on B
      { x1: -0.33, y1: 0.34, x2: -0.17, y2: 0.21, width: 0.022, depth: 1.25 },
      // Bottom-center edge crack on B
      { x1: 0.01, y1: 0.39, x2: 0.12, y2: 0.26, width: 0.021, depth: 1.2 },
      // Upper-right lobe notch
      { x1: 0.19, y1: -0.14, x2: 0.31, y2: -0.2, width: 0.019, depth: 1.1 },
    ],
  },
  O: {
    widthScale: 1.02,
    craters: [
      { x: 0.05, y: -0.27, rx: 0.048, ry: 0.04, angle: -0.2, depth: 1.2 },
      { x: -0.12, y: -0.16, rx: 0.035, ry: 0.028, angle: 0.1, depth: 1.0 },
      { x: 0.27, y: -0.12, rx: 0.045, ry: 0.038, angle: 0.3, depth: 1.15 },
      { x: -0.26, y: 0.02, rx: 0.042, ry: 0.034, angle: -0.2, depth: 1.1 },
      { x: 0.19, y: 0.21, rx: 0.06, ry: 0.048, angle: -0.25, depth: 1.3 },
      { x: 0.27, y: 0.27, rx: 0.032, ry: 0.028, angle: 0.1, depth: 1.0 },
      { x: -0.15, y: 0.27, rx: 0.034, ry: 0.029, angle: 0, depth: 1.0 },
      { x: -0.02, y: 0.31, rx: 0.03, ry: 0.026, angle: 0.2, depth: 0.95 },
    ],
    cracks: [
      // Right outer edge crack on O
      { x1: 0.28, y1: 0.07, x2: 0.41, y2: 0.15, width: 0.02, depth: 1.2 },
      // Upper-left fracture
      { x1: -0.32, y1: -0.19, x2: -0.21, y2: -0.12, width: 0.018, depth: 1.05 },
    ],
  },
  U: {
    widthScale: 1.0,
    craters: [
      { x: -0.25, y: -0.2, rx: 0.048, ry: 0.038, angle: -0.2, depth: 1.2 },
      { x: 0.24, y: -0.21, rx: 0.042, ry: 0.034, angle: 0.2, depth: 1.1 },
      { x: 0.25, y: -0.01, rx: 0.048, ry: 0.036, angle: -0.3, depth: 1.15 },
      { x: 0.2, y: 0.12, rx: 0.044, ry: 0.034, angle: -0.2, depth: 1.1 },
      { x: -0.21, y: 0.18, rx: 0.039, ry: 0.033, angle: 0.1, depth: 1.05 },
      { x: -0.26, y: 0.26, rx: 0.03, ry: 0.026, angle: 0, depth: 0.95 },
      { x: -0.02, y: 0.27, rx: 0.054, ry: 0.042, angle: -0.15, depth: 1.25 },
    ],
    cracks: [
      // Bottom-right diagonal crack on U
      { x1: 0.06, y1: 0.28, x2: 0.19, y2: 0.39, width: 0.022, depth: 1.25 },
      // Mid-right hairline crack
      { x1: 0.23, y1: 0.14, x2: 0.36, y2: 0.21, width: 0.017, depth: 1.0 },
    ],
  },
  T: {
    widthScale: 1.0,
    craters: [
      { x: -0.24, y: -0.23, rx: 0.05, ry: 0.04, angle: -0.2, depth: 1.2 },
      { x: -0.02, y: -0.28, rx: 0.03, ry: 0.026, angle: 0, depth: 0.95 },
      { x: 0.22, y: -0.25, rx: 0.048, ry: 0.04, angle: 0.15, depth: 1.2 },
      { x: 0.29, y: -0.16, rx: 0.032, ry: 0.028, angle: 0, depth: 1.0 },
      { x: 0.06, y: 0.25, rx: 0.036, ry: 0.03, angle: 0.1, depth: 1.05 },
      { x: -0.02, y: 0.33, rx: 0.03, ry: 0.026, angle: -0.1, depth: 0.95 },
    ],
    cracks: [
      // Prominent diagonal slash cracks across the lower stem of T (matching ABOUT reference)
      { x1: -0.03, y1: 0.09, x2: 0.15, y2: -0.05, width: 0.024, depth: 1.35 },
      { x1: -0.15, y1: 0.25, x2: 0.0, y2: 0.12, width: 0.022, depth: 1.3 },
      // Top-left stem notch
      { x1: -0.19, y1: -0.13, x2: -0.19, y2: -0.03, width: 0.016, depth: 1.0 },
    ],
  },
};

function generateFeaturesForChar(
  char: string,
  index: number
): { craters: CraterSpec[]; cracks: CrackSpec[]; widthScale: number } {
  if (HAND_TUNED_FEATURES[char]) {
    const preset = HAND_TUNED_FEATURES[char];
    return {
      craters: preset.craters,
      cracks: preset.cracks,
      widthScale: preset.widthScale ?? 1.0,
    };
  }

  const rand = createSeededRandom(char.charCodeAt(0) * 1337 + index * 97);

  let widthScale = 1.0;
  if (char === 'I' || char === '1') widthScale = 0.85;
  else if (char === 'M' || char === 'W') widthScale = 1.06;
  else if (char === 'J' || char === 'L') widthScale = 0.95;

  const anchors: Array<[number, number]> = [
    [-0.22, -0.25],
    [0.2, -0.24],
    [-0.24, 0.0],
    [0.23, -0.02],
    [0.0, -0.25],
    [-0.21, 0.23],
    [0.2, 0.24],
    [0.02, 0.26],
    [-0.04, 0.02],
    [0.12, 0.12],
  ];

  const craters: CraterSpec[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const [ax, ay] = anchors[i];
    const jitterX = (rand() - 0.5) * 0.08;
    const jitterY = (rand() - 0.5) * 0.08;
    const isLarge = i % 3 === 0;
    const rx = isLarge ? 0.044 + rand() * 0.014 : 0.028 + rand() * 0.012;
    const ry = rx * (0.78 + rand() * 0.22);
    craters.push({
      x: Number((ax + jitterX).toFixed(3)),
      y: Number((ay + jitterY).toFixed(3)),
      rx: Number(rx.toFixed(3)),
      ry: Number(ry.toFixed(3)),
      angle: Number(((rand() - 0.5) * 0.8).toFixed(2)),
      depth: Number((0.95 + rand() * 0.32).toFixed(2)),
    });
  }

  const cracks: CrackSpec[] = [
    {
      x1: Number((-0.28 + rand() * 0.14).toFixed(3)),
      y1: Number((0.19 + rand() * 0.14).toFixed(3)),
      x2: Number((-0.11 + rand() * 0.12).toFixed(3)),
      y2: Number((0.06 + rand() * 0.12).toFixed(3)),
      width: Number((0.02 + rand() * 0.005).toFixed(3)),
      depth: 1.25,
    },
    {
      x1: Number((0.08 + rand() * 0.15).toFixed(3)),
      y1: Number((-0.05 + rand() * 0.18).toFixed(3)),
      x2: Number((0.26 + rand() * 0.12).toFixed(3)),
      y2: Number((-0.17 + rand() * 0.15).toFixed(3)),
      width: Number((0.019 + rand() * 0.005).toFixed(3)),
      depth: 1.2,
    },
    {
      x1: Number((-0.09 + rand() * 0.16).toFixed(3)),
      y1: Number((0.25 + rand() * 0.1).toFixed(3)),
      x2: Number((0.07 + rand() * 0.14).toFixed(3)),
      y2: Number((0.14 + rand() * 0.1).toFixed(3)),
      width: 0.02,
      depth: 1.15,
    },
  ];

  return { craters, cracks, widthScale };
}

export const LETTERS_LIST = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const;

export const NUMBERS_LIST = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
] as const;

export const REFERENCE_CHARS = new Set(['A', 'B', 'O', 'U', 'T']);

export const ALL_GLYPHS: GlyphDefinition[] = [
  ...LETTERS_LIST.map((char, idx) => {
    const features = generateFeaturesForChar(char, idx);
    return {
      id: `letter_${char}`,
      char,
      name: `Huruf ${char}`,
      filename: `${char}.png`,
      category: 'letter' as const,
      index: idx + 1,
      isReferenceChar: REFERENCE_CHARS.has(char),
      widthScale: features.widthScale,
      craters: features.craters,
      cracks: features.cracks,
    };
  }),
  ...NUMBERS_LIST.map((char, idx) => {
    const features = generateFeaturesForChar(char, 26 + idx);
    return {
      id: `number_${char}`,
      char,
      name: `Angka ${char}`,
      filename: `${char}.png`,
      category: 'number' as const,
      index: 26 + idx + 1,
      isReferenceChar: false,
      widthScale: features.widthScale,
      craters: features.craters,
      cracks: features.cracks,
    };
  }),
];

export function filterGlyphs(
  glyphs: GlyphDefinition[],
  categoryFilter: 'all' | 'letter' | 'number' | 'reference',
  searchQuery: string
): GlyphDefinition[] {
  const q = searchQuery.trim().toUpperCase();
  return glyphs.filter((g) => {
    if (categoryFilter === 'letter' && g.category !== 'letter') return false;
    if (categoryFilter === 'number' && g.category !== 'number') return false;
    if (categoryFilter === 'reference' && !g.isReferenceChar) return false;
    if (!q) return true;
    return (
      g.char.toUpperCase().includes(q) ||
      g.name.toUpperCase().includes(q) ||
      g.filename.toUpperCase().includes(q)
    );
  });
}

export function getGlyphByChar(char: string): GlyphDefinition | undefined {
  const upper = char.toUpperCase();
  return ALL_GLYPHS.find((g) => g.char === upper);
}
