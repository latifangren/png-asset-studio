import fontsJson from '../data/fonts.json';

export interface FontOption {
  family: string;
  label: string;
  source: 'builtin' | 'uploaded' | 'google';
}

export const INITIAL_FONT_OPTIONS: FontOption[] = fontsJson as FontOption[];

const VALID_FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];

export function isValidFontFilename(filename: string): boolean {
  const lower = filename.trim().toLowerCase();
  return VALID_FONT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function sanitizeFontFamilyName(rawName: string): string {
  const withoutExt = rawName.replace(/\.(ttf|otf|woff2?)$/i, '');
  const cleaned = withoutExt.replace(/[^a-zA-Z0-9 _-]/g, ' ').trim();
  return cleaned || 'CustomGameFont';
}

/**
 * Registers a binary font file (.ttf, .otf, .woff, .woff2) into document.fonts
 * using the browser's native FontFace API.
 */
export async function registerUploadedFontFile(
  file: File
): Promise<FontOption> {
  if (!isValidFontFilename(file.name)) {
    throw new Error(
      'Format file tidak didukung. Gunakan file font .ttf, .otf, .woff, atau .woff2.'
    );
  }

  const buffer = await file.arrayBuffer();
  const baseFamily = sanitizeFontFamilyName(file.name);
  // Ensure unique CSS family name
  const familyName = `${baseFamily}`;

  const fontFace = new FontFace(familyName, buffer, {
    style: 'normal',
    weight: '900',
  });

  const loadedFace = await fontFace.load();
  document.fonts.add(loadedFace);
  await document.fonts.ready;

  return {
    family: familyName,
    label: `${familyName} (Custom Upload)`,
    source: 'uploaded',
  };
}

/**
 * Dynamically loads a Google Font by family name (e.g., "Luckiest Guy", "Cinzel", "Press Start 2P")
 */
export async function loadGoogleFontByName(
  rawFamily: string
): Promise<FontOption> {
  const family = rawFamily.trim().replace(/\s+/g, ' ');
  if (!family) {
    throw new Error('Masukkan nama Google Font terlebih dahulu.');
  }

  const encoded = encodeURIComponent(family).replace(/%20/g, '+');
  const linkId = `gf-${family.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  if (!document.getElementById(linkId)) {
    await new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700;900&display=swap`;
      link.onload = () => resolve();
      link.onerror = () =>
        reject(
          new Error(
            `Gagal memuat Google Font "${family}". Pastikan ejaan nama font benar.`
          )
        );
      document.head.appendChild(link);
    });
  }

  try {
    await document.fonts.load(`900 48px "${family}"`);
    await document.fonts.ready;
  } catch {
    // Fallback if weight 900 is unavailable
    await document.fonts.load(`48px "${family}"`);
  }

  return {
    family,
    label: `${family} (Google Font)`,
    source: 'google',
  };
}
