import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  BUILTIN_PRESETS,
  DEFAULT_BATCH_WORDS,
  DEFAULT_CHARSET_STRING,
  generateBMFontDescriptor,
  parseCharsetString,
  StyleRecipe,
} from '../utils/styleRecipe';
import { INITIAL_FONT_OPTIONS } from '../utils/fontLoader';

export function createStoneGlyphMcpServer(): McpServer {
  const server = new McpServer({
    name: 'stoneglyph-game-ui-asset-studio',
    version: '1.0.0',
  });

  // TOOL 1: list_presets
  server.tool(
    'list_presets',
    'Mengembalikan daftar semua preset material teks game yang tersedia (Stone, Gold, ABOUT 3D, Wood, Ice, Metal) beserta ringkasan palet warnanya.',
    {},
    async () => {
      const presets = BUILTIN_PRESETS.map((p) => ({
        id: p.id,
        name: p.name,
        badgeLabel: p.badgeLabel,
        fontFamily: p.fontFamily,
        shadingMode: p.shadingMode,
        fixedHeightPx: p.fixedHeightPx,
        gradientStops: p.gradientStops,
        strokeColor: p.strokeColor,
        extrusionColor: p.extrusionColor,
        poreDensity: p.poreDensity,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: presets.length,
                presets,
                guidance:
                  'Gunakan get_preset_recipe dengan presetId untuk mendapatkan parameter lengkap.',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // TOOL 2: get_preset_recipe
  server.tool(
    'get_preset_recipe',
    'Mengambil resep style lengkap (parameter shader, gradien, 3D extrusion, stroke, dan pori) untuk preset tertentu.',
    {
      preset_id: z
        .string()
        .describe('ID preset (mis. grey-stone, gold-ochre, about-stone, wood-plank, crystal-ice, metallic-iron)'),
    },
    async ({ preset_id }) => {
      const found = BUILTIN_PRESETS.find(
        (p) => p.id.toLowerCase() === preset_id.toLowerCase()
      );
      if (!found) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Preset dengan ID "${preset_id}" tidak ditemukan. Pilihan valid: ${BUILTIN_PRESETS.map((p) => p.id).join(', ')}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(found, null, 2),
          },
        ],
      };
    }
  );

  // TOOL 3: calculate_word_dimensions
  server.tool(
    'calculate_word_dimensions',
    'Menghitung estimasi dimensi kanvas piksel (lebar x tinggi) untuk kata tombol game dengan tinggi standar (mis. 96px HD) dan padding in-game.',
    {
      text: z.string().describe('Teks kata tombol game (mis. SETTINGS, INVENTORY, PENGATURAN)'),
      font_family: z
        .string()
        .default('Titan One')
        .describe('Nama font (mis. Titan One, Lilita One, Fredoka, Bungee, Impact)'),
      font_size_px: z.number().default(70).describe('Ukuran huruf dalam px (default 70 untuk 96px height)'),
      canvas_height_px: z.number().default(96).describe('Tinggi kanvas terkunci (standar in-game HD adalah 96px)'),
      stroke_width_px: z.number().default(9).describe('Ketebalan garis kontur stroke'),
    },
    async ({ text, font_family, font_size_px, canvas_height_px, stroke_width_px }) => {
      const clean = text.trim().toUpperCase() || 'SETTINGS';
      // Heuristic approximation of width for standard chunky game fonts
      const avgCharWidth = font_size_px * 0.64;
      const approxTextWidth = Math.ceil(clean.length * avgCharWidth);
      const paddingX = Math.max(30, Math.ceil(stroke_width_px * 3));
      const approxTotalWidth = approxTextWidth + paddingX;

      const safeFilename = clean.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') + '.png';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                text: clean,
                fontFamily: font_family,
                estimatedDimensions: {
                  widthPx: approxTotalWidth,
                  heightPx: canvas_height_px,
                  aspectRatio: `${approxTotalWidth}:${canvas_height_px}`,
                },
                inGameSpecs: {
                  isStandardHdHeight: canvas_height_px === 96,
                  safeFilename,
                  suggestedPathEn: `web/public/hd/menu/words/en/${safeFilename}`,
                  suggestedPathId: `web/public/hd/menu/words/id/${safeFilename}`,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // TOOL 4: generate_game_word_specs
  server.tool(
    'generate_game_word_specs',
    'Menghasilkan spesifikasi lengkap aset tombol game UI (kata, preset warna, folder bahasa, dan konfigurasi render) siap dipasang di game engine.',
    {
      text: z.string().describe('Teks kata tombol UI'),
      preset_id: z
        .enum([
          'grey-stone',
          'gold-ochre',
          'about-stone',
          'wood-plank',
          'crystal-ice',
          'metallic-iron',
        ])
        .default('grey-stone')
        .describe('Pilihan material preset'),
      lang_folder: z.string().default('en').describe('Folder bahasa (en, id, jp, es, dll.)'),
    },
    async ({ text, preset_id, lang_folder }) => {
      const preset = BUILTIN_PRESETS.find((p) => p.id === preset_id)!;
      const cleanText = text.trim().toUpperCase() || 'BUTTON';
      const cleanName = cleanText.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
      const filename = `${cleanName}.png`;
      const targetPath = `web/public/hd/menu/words/${lang_folder}/${filename}`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                text: cleanText,
                filename,
                langFolder: lang_folder,
                targetPath,
                preset: {
                  id: preset.id,
                  name: preset.name,
                  fontFamily: preset.fontFamily,
                  shadingMode: preset.shadingMode,
                  heightPx: preset.fixedHeightPx,
                  strokeColor: preset.strokeColor,
                  extrusionColor: preset.extrusionColor,
                },
                integrationGuide: [
                  `1. Simpan file PNG transparan ke: ${targetPath}`,
                  `2. Gunakan tinggi terkunci ${preset.fixedHeightPx}px agar tidak terdistorsi di UI game`,
                  `3. Format warna: RGBA 32-bit dengan saluran alpha transparan penuh`,
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // TOOL 5: list_available_fonts
  server.tool(
    'list_available_fonts',
    'Mengembalikan daftar font bawaan dan instruksi cara memuat Google Fonts atau upload custom file .ttf/.otf/.woff2.',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                builtinFonts: INITIAL_FONT_OPTIONS,
                customFontUploadSupport: {
                  supportedFormats: ['.ttf', '.otf', '.woff', '.woff2'],
                  webApi: 'FontFace API (100% client-side zero-latency registration)',
                },
                googleFontsSupport: {
                  method: 'Dynamic Google Fonts Loader by family name',
                  examples: ['Luckiest Guy', 'Cinzel', 'Press Start 2P', 'Bebas Neue', 'Rubik Mono One'],
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // TOOL 6: generate_bmfont_fnt_manifest
  server.tool(
    'generate_bmfont_fnt_manifest',
    'Menghasilkan file deskriptor AngelCode BMFont (.fnt) standar industri untuk engine game Unity, Godot, Phaser, Construct, atau Cocos2d dari daftar karakter kustom.',
    {
      charset: z
        .string()
        .default(DEFAULT_CHARSET_STRING)
        .describe('Daftar karakter kustom (mis. ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789)'),
      font_family: z.string().default('Titan One').describe('Nama font'),
      font_size_px: z.number().default(70).describe('Ukuran font'),
      cell_size_px: z.number().default(256).describe('Ukuran kotak cell per karakter (128, 256, 512)'),
      image_filename: z.string().default('font_atlas.png').describe('Nama file atlas PNG'),
    },
    async ({ charset, font_family, font_size_px, cell_size_px, image_filename }) => {
      const chars = parseCharsetString(charset);
      const cols = Math.max(1, Math.ceil(Math.sqrt(chars.length)));
      const rows = Math.max(1, Math.ceil(chars.length / cols));
      const sheetW = cols * cell_size_px;
      const sheetH = rows * cell_size_px;

      const charEntries = chars.map((ch, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return {
          char: ch,
          x: col * cell_size_px,
          y: row * cell_size_px,
          w: cell_size_px,
          h: cell_size_px,
        };
      });

      const fntContent = generateBMFontDescriptor({
        fontFamily: font_family,
        fontSizePx: font_size_px,
        cellSize: cell_size_px,
        sheetWidth: sheetW,
        sheetHeight: sheetH,
        imageFilename: image_filename,
        chars: charEntries,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalChars: chars.length,
                sheetDimensions: { width: sheetW, height: sheetH },
                bmfontFnt: fntContent,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // TOOL 7: generate_batch_queue_config
  server.tool(
    'generate_batch_queue_config',
    'Menghasilkan konfigurasi antrean batch kata multi-bahasa lengkap (mis. pasangan EN dan ID) siap ekspor ke ZIP.',
    {
      pairs: z
        .array(
          z.object({
            en: z.string().describe('Teks bahasa Inggris'),
            id: z.string().describe('Teks bahasa Indonesia'),
            en_preset: z.string().default('grey-stone').describe('Preset untuk versi EN'),
            id_preset: z.string().default('gold-ochre').describe('Preset untuk versi ID'),
          })
        )
        .optional()
        .describe('Daftar pasangan kata EN dan ID kustom'),
    },
    async ({ pairs }) => {
      const defaultPairs = [
        { en: 'SETTINGS', id: 'PENGATURAN', en_preset: 'grey-stone', id_preset: 'gold-ochre' },
        { en: 'EXTRAS', id: 'EKSTRA', en_preset: 'grey-stone', id_preset: 'gold-ochre' },
        { en: 'ABOUT', id: 'TENTANG', en_preset: 'about-stone', id_preset: 'gold-ochre' },
        { en: 'PLAY', id: 'MAINKAN', en_preset: 'grey-stone', id_preset: 'gold-ochre' },
        { en: 'INVENTORY', id: 'INVENTARIS', en_preset: 'grey-stone', id_preset: 'gold-ochre' },
      ];

      const activePairs = pairs && pairs.length > 0 ? pairs : defaultPairs;
      const batchItems = activePairs.flatMap((p, idx) => {
        const cleanEn = p.en.trim().toUpperCase();
        const cleanId = p.id.trim().toUpperCase();
        const enFile = cleanEn.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') + '.png';
        const idFile = cleanId.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') + '.png';

        return [
          {
            id: `bw-en-${idx}`,
            text: cleanEn,
            langFolder: 'en',
            presetId: p.en_preset,
            filename: enFile,
            targetPath: `words/en/${enFile}`,
          },
          {
            id: `bw-id-${idx}`,
            text: cleanId,
            langFolder: 'id',
            presetId: p.id_preset,
            filename: idFile,
            targetPath: `words/id/${idFile}`,
          },
        ];
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalItems: batchItems.length,
                batchItems,
                zipStructureNote: 'Saat diunduh, ZIP akan berisi folder words/en/ dan words/id/',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // RESOURCES
  server.resource(
    'presets',
    'stoneglyph://presets',
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(BUILTIN_PRESETS, null, 2),
        },
      ],
    })
  );

  server.resource(
    'in-game-specs',
    'stoneglyph://specs/in-game',
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: `# In-Game Asset Placement Standards
- Fixed Height: 96px (Standard HD menu button height)
- Padding: 30px horizontal minimum or 3x stroke width
- Color Space: RGBA 32-bit with full transparency
- Directory Structure:
  - English words: web/public/hd/menu/words/en/<name>.png
  - Indonesian words: web/public/hd/menu/words/id/<name>.png
- Supported Formats: Individual PNG, Sprite Sheet (.png + .json), AngelCode BMFont (.fnt + .png)
`,
        },
      ],
    })
  );

  // PROMPTS
  server.prompt(
    'create-game-menu-buttons',
    {
      genre: z.string().describe('Genre game (mis. Prehistoric Stone Age, RPG Fantasy, Sci-Fi, Magic Frost)'),
      buttons: z.string().describe('Daftar tombol yang dibutuhkan (pisahkan dengan koma, mis. PLAY, SETTINGS, QUEST, SHOP)'),
    },
    ({ genre, buttons }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Saya sedang mengembangkan game dengan genre "${genre}". Tolong rekomendasikan preset material yang cocok di PNG Asset Studio untuk tombol-tombol berikut: ${buttons}. Berikan nama file PNG yang tepat dan folder penempatannya di proyek game.`,
          },
        },
      ],
    })
  );

  return server;
}
