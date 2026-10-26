import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_GLYPHS,
  LETTERS_LIST,
  NUMBERS_LIST,
  filterGlyphs,
  getGlyphByChar,
} from './glyphCatalog';
import { buildZipArchive, computeCrc32 } from './zipBuilder';
import {
  computeEDT2D,
  evaluateCratersAtPoint,
  evaluateCracksAtPoint,
} from './stoneMath';
import {
  BUILTIN_PRESETS,
  generateBMFontDescriptor,
  getSafeCharFilename,
  parseCharsetString,
} from './styleRecipe';
import {
  isValidFontFilename,
  sanitizeFontFamilyName,
} from './fontLoader';

test('ALL_GLYPHS contains exactly 26 letters A-Z and 10 digits 1-9, 0 (36 total)', () => {
  assert.equal(ALL_GLYPHS.length, 36);
  const letters = ALL_GLYPHS.filter((g) => g.category === 'letter');
  const numbers = ALL_GLYPHS.filter((g) => g.category === 'number');
  assert.equal(letters.length, 26);
  assert.equal(numbers.length, 10);

  assert.deepEqual(
    letters.map((g) => g.char),
    [...LETTERS_LIST]
  );
  assert.deepEqual(
    numbers.map((g) => g.char),
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
  );
  assert.deepEqual(
    numbers.map((g) => g.char),
    [...NUMBERS_LIST]
  );
});

test('Reference glyphs A, B, O, U, T are marked and have hand-calibrated stone craters and cracks', () => {
  for (const ch of ['A', 'B', 'O', 'U', 'T']) {
    const glyph = getGlyphByChar(ch);
    assert.ok(glyph, `Glyph ${ch} should exist`);
    assert.equal(glyph.isReferenceChar, true);
    assert.equal(glyph.filename, `${ch}.png`);
    assert.ok(glyph.craters.length >= 6, `Glyph ${ch} should have at least 6 craters`);
    assert.ok(glyph.cracks.length >= 2, `Glyph ${ch} should have at least 2 cracks`);
  }
});

test('filterGlyphs filters correctly by category and search query', () => {
  assert.equal(filterGlyphs(ALL_GLYPHS, 'all', '').length, 36);
  assert.equal(filterGlyphs(ALL_GLYPHS, 'letter', '').length, 26);
  assert.equal(filterGlyphs(ALL_GLYPHS, 'number', '').length, 10);
  assert.equal(filterGlyphs(ALL_GLYPHS, 'reference', '').length, 5);
  assert.equal(filterGlyphs(ALL_GLYPHS, 'all', 'Q').length, 1);
  assert.equal(filterGlyphs(ALL_GLYPHS, 'number', '0')[0].char, '0');
});

test('buildZipArchive generates a valid PKZIP archive with correct headers and entry count', () => {
  const sampleA = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const sampleB = new Uint8Array([1, 2, 3, 4, 5]);
  const zipBytes = buildZipArchive([
    { filename: 'A.png', data: sampleA },
    { filename: '0.png', data: sampleB },
  ]);

  const view = new DataView(zipBytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  const eocdOffset = zipBytes.byteLength - 22;
  assert.equal(view.getUint32(eocdOffset, true), 0x06054b50);
  assert.equal(view.getUint16(eocdOffset + 8, true), 2);
  assert.ok(computeCrc32(sampleA) > 0);
});

test('computeEDT2D computes exact Euclidean distances for a 5x5 grid with center pixel set', () => {
  const mask = new Uint8Array(25);
  mask[2 * 5 + 2] = 1;
  const dist = computeEDT2D(mask, 5, 5);
  assert.equal(dist[2 * 5 + 2], 0);
  assert.equal(dist[2 * 5 + 3], 1);
  assert.equal(dist[1 * 5 + 2], 1);
  assert.ok(Math.abs(dist[0 * 5 + 0] - Math.sqrt(8)) < 1e-4);
});

test('evaluateCratersAtPoint and evaluateCracksAtPoint produce non-zero depression at feature centers', () => {
  const glyphA = getGlyphByChar('A')!;
  const firstCrater = glyphA.craters[0];
  const sampleInside = evaluateCratersAtPoint(
    firstCrater.x,
    firstCrater.y,
    glyphA.craters,
    1.0
  );
  assert.ok(sampleInside.bowlDepth > 0.5);
  assert.ok(sampleInside.innerShadow > 0.1);

  const firstCrack = glyphA.cracks[0];
  const midX = (firstCrack.x1 + firstCrack.x2) / 2;
  const midY = (firstCrack.y1 + firstCrack.y2) / 2;
  const crackSample = evaluateCracksAtPoint(midX, midY, glyphA.cracks, 1.0);
  assert.ok(crackSample.creviceDark > 0.4);
});

test('BUILTIN_PRESETS includes all 6 universal material presets with valid gradient stops', () => {
  assert.equal(BUILTIN_PRESETS.length, 6);
  const ids = BUILTIN_PRESETS.map((p) => p.id);
  assert.deepEqual(ids, [
    'grey-stone',
    'gold-ochre',
    'about-stone',
    'wood-plank',
    'crystal-ice',
    'metallic-iron',
  ]);
  for (const preset of BUILTIN_PRESETS) {
    assert.ok(preset.gradientStops.length >= 3);
    assert.equal(preset.fixedHeightPx, 96);
  }
});

test('parseCharsetString deduplicates characters and preserves symbols and lowercase', () => {
  const parsed = parseCharsetString('AABbc123!?! ');
  assert.deepEqual(parsed, ['A', 'B', 'b', 'c', '1', '2', '3', '!', '?']);
  assert.equal(getSafeCharFilename('A'), 'A.png');
  assert.equal(getSafeCharFilename('a'), 'lower_a.png');
  assert.equal(getSafeCharFilename('?'), 'char_63.png');
});

test('generateBMFontDescriptor outputs valid AngelCode BMFont .fnt text format', () => {
  const fnt = generateBMFontDescriptor({
    fontFamily: 'Titan One',
    fontSizePx: 70,
    cellSize: 256,
    sheetWidth: 512,
    sheetHeight: 512,
    imageFilename: 'atlas.png',
    chars: [
      { char: 'A', x: 0, y: 0, w: 256, h: 256 },
      { char: '0', x: 256, y: 0, w: 256, h: 256 },
    ],
  });
  assert.ok(fnt.includes('info face="Titan One"'));
  assert.ok(fnt.includes('chars count=2'));
  assert.ok(fnt.includes('char id=65'));
  assert.ok(fnt.includes('char id=48'));
});

test('fontLoader helpers validate .ttf/.otf/.woff/.woff2 extensions and sanitize family names', () => {
  assert.equal(isValidFontFilename('PrehistoricRock.ttf'), true);
  assert.equal(isValidFontFilename('GameFont.OTF'), true);
  assert.equal(isValidFontFilename('WebFont.woff2'), true);
  assert.equal(isValidFontFilename('image.png'), false);
  assert.equal(sanitizeFontFamilyName('Prehistoric_Rock-Bold.ttf'), 'Prehistoric_Rock-Bold');
});
