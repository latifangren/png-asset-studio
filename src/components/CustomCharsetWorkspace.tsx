import React, { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../i18n';
import {
  Archive,
  Download,
  FileCode,
  Grid,
  Search,
} from 'lucide-react';
import {
  DEFAULT_CHARSET_STRING,
  StyleRecipe,
  getSafeCharFilename,
  parseCharsetString,
} from '../utils/styleRecipe';
import {
  renderCharTileDataUrl,
  renderUniversalAtlasBundle,
} from '../utils/universalRenderer';
import { buildZipArchive, dataUrlToUint8Array } from '../utils/zipBuilder';
import { PreviewBgMode, getPreviewBgClass } from './GlyphCard';

interface CustomCharsetWorkspaceProps {
  recipe: StyleRecipe;
  bgMode: PreviewBgMode;
  onNotice: (msg: string) => void;
}

export const CustomCharsetWorkspace: React.FC<CustomCharsetWorkspaceProps> = ({
  recipe,
  bgMode,
  onNotice,
}) => {
  const { t } = useLocale();
  const [charsetInput, setCharsetInput] = useState(DEFAULT_CHARSET_STRING);
  const [tileSize, setTileSize] = useState<number>(256);
  const [searchQuery, setSearchQuery] = useState('');
  const [charUrls, setCharUrls] = useState<Record<string, string>>({});

  const parsedChars = useMemo(
    () => parseCharsetString(charsetInput),
    [charsetInput]
  );

  const visibleChars = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return parsedChars;
    return parsedChars.filter(
      (ch) =>
        ch.toLowerCase().includes(q) ||
        getSafeCharFilename(ch).toLowerCase().includes(q)
    );
  }, [parsedChars, searchQuery]);

  // Progressive chunked rendering for all characters in the custom charset
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // continue
        }
      }
      if (cancelled) return;

      const previewRes = 192;
      const chunk = 14;
      const nextMap: Record<string, string> = {};

      for (let i = 0; i < parsedChars.length; i += chunk) {
        if (cancelled) return;
        const slice = parsedChars.slice(i, i + chunk);
        for (const ch of slice) {
          nextMap[ch] = renderCharTileDataUrl(
            ch,
            { ...recipe, uppercaseOnly: false },
            previewRes
          );
        }
        setCharUrls({ ...nextMap });
        if (i + chunk < parsedChars.length) {
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [parsedChars, recipe]);

  const handleAppendChars = (extra: string) => {
    const merged = parseCharsetString(charsetInput + extra).join('');
    setCharsetInput(merged);
  };

  const handleDownloadSingleChar = (ch: string) => {
    const url = renderCharTileDataUrl(
      ch,
      { ...recipe, uppercaseOnly: false },
      tileSize
    );
    const fname = getSafeCharFilename(ch);
    const link = document.createElement('a');
    link.download = fname;
    link.href = url;
    link.click();
    onNotice(`Mengunduh ${fname} (${tileSize}×${tileSize}px PNG Transparan)...`);
  };

  const handleDownloadAllCharsZip = () => {
    if (parsedChars.length === 0) return;
    const entries = parsedChars.map((ch) => {
      const url = renderCharTileDataUrl(
        ch,
        { ...recipe, uppercaseOnly: false },
        tileSize
      );
      return {
        filename: getSafeCharFilename(ch),
        data: dataUrlToUint8Array(url),
      };
    });

    const zipBytes = buildZipArchive(entries);
    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `Charset_${recipe.id}_${parsedChars.length}chars_${tileSize}px.zip`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    onNotice(
      `Paket ZIP berisi ${parsedChars.length} karakter PNG transparan (${tileSize}×${tileSize}px) berhasil diunduh!`
    );
  };

  const handleDownloadAtlasAndBMFontZip = () => {
    if (parsedChars.length === 0) return;
    const { sheetDataUrl, atlasJson, bmfontFnt } = renderUniversalAtlasBundle(
      parsedChars,
      { ...recipe, uppercaseOnly: false },
      tileSize
    );
    const encoder = new TextEncoder();
    const baseName = `${recipe.id}_atlas_${tileSize}px`;

    const zipBytes = buildZipArchive([
      {
        filename: `${baseName}.png`,
        data: dataUrlToUint8Array(sheetDataUrl),
      },
      {
        filename: `${baseName}.json`,
        data: encoder.encode(atlasJson),
      },
      {
        filename: `${baseName}.fnt`,
        data: encoder.encode(bmfontFnt),
      },
    ]);

    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${baseName}_BMFont_SpriteSheet.zip`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    onNotice(
      `Paket Sprite Sheet (.PNG) + Koordinat (.JSON) + BMFont (.FNT) berhasil diunduh!`
    );
  };

  const bgClass = getPreviewBgClass(bgMode);

  return (
    <section
      id="charset-section"
      className="border border-slate-800 bg-[#151F32] rounded-2xl p-6 space-y-6"
    >
      {/* Header & Export Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <p className="text-xs font-mono text-amber-400">
            {t('charset.headerEyebrow')}
          </p>
          <h2 className="text-xl font-bold text-slate-100 mt-0.5">
            {t('charset.headerTitle', { count: parsedChars.length })}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t('charset.headerDescStart')}<strong className="text-slate-200">{recipe.fontFamily}</strong>) {t('charset.headerDescMiddle')} (<strong className="text-amber-300">{recipe.name}</strong>) {t('charset.headerDescEnd')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadAtlasAndBMFontZip}
            className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileCode className="w-4 h-4 text-amber-400" />
            <span>{t('charset.exportAtlas')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAllCharsZip}
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Archive className="w-4 h-4" />
            <span>{t('charset.downloadAll', { count: parsedChars.length })}</span>
          </button>
        </div>
      </div>

      {/* Custom Charset String Editor & Toolbar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end bg-slate-900/70 p-4 rounded-xl border border-slate-800">
        <div className="xl:col-span-6 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="charset-string-input"
              className="text-xs font-semibold text-slate-300 whitespace-nowrap"
            >
              {t('charset.listLabel')}
            </label>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCharsetInput(DEFAULT_CHARSET_STRING)}
                className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                {t('charset.resetAz')}
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={() => handleAppendChars('abcdefghijklmnopqrstuvwxyz')}
                className="text-[11px] font-mono text-emerald-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                {t('charset.addLower')}
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={() => handleAppendChars('!?+-:%$#&()')}
                className="text-[11px] font-mono text-sky-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                {t('charset.addSymbols')}
              </button>
            </div>
          </div>
          <input
            id="charset-string-input"
            type="text"
            value={charsetInput}
            onChange={(e) => setCharsetInput(e.target.value)}
            placeholder={t('charset.charsetPlaceholder')}
            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs font-mono tracking-wider text-slate-100 focus:outline-none"
          />
        </div>

        <div className="xl:col-span-3 space-y-1.5">
          <label
            htmlFor="charset-search"
            className="block text-xs font-semibold text-slate-300"
          >
            {t('charset.filterLabel')}
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="charset-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('charset.searchPlaceholder')}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 focus:outline-none"
            />
          </div>
        </div>

        <div className="xl:col-span-3 space-y-1.5">
          <label
            htmlFor="charset-tilesize"
            className="block text-xs font-semibold text-slate-300"
          >
            Resolusi Tile per Karakter:
          </label>
          <select
            id="charset-tilesize"
            value={tileSize}
            onChange={(e) => setTileSize(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-amber-300 focus:outline-none cursor-pointer"
          >
            <option value={128}>{t('charset.sizeLight')}</option>
            <option value={256}>{t('charset.sizeStandard')}</option>
            <option value={512}>{t('charset.sizeSharp')}</option>
            <option value={1024}>{t('charset.sizeUltra')}</option>
          </select>
        </div>
      </div>

      {/* Character Cards Grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3"
        data-testid="universal-charset-grid"
      >
        {visibleChars.map((ch, idx) => {
          const fname = getSafeCharFilename(ch);
          const previewUrl = charUrls[ch];

          return (
            <article
              key={`${ch}-${idx}`}
              className="flex flex-col border border-slate-800 bg-slate-900/60 rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
            >
              <div
                className={`aspect-square w-full flex items-center justify-center p-2.5 ${bgClass} border-b border-slate-800/80`}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`Karakter ${ch} (${fname})`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain select-none"
                    loading="lazy"
                  />
                ) : (
                  <span className="font-mono text-lg font-bold text-slate-400">
                    {ch}
                  </span>
                )}
              </div>

              <div className="p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                  <span className="text-slate-100 font-bold">
                    &lsquo;{ch}&rsquo;
                  </span>
                  <span className="truncate max-w-[90px] text-amber-300/90">
                    {fname}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadSingleChar(ch)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3 h-3 shrink-0" />
                  <span>{t('common.downloadPng')}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
