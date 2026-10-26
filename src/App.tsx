/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Bot,
  CheckCircle2,
  Grid,
  Layers,
  Search,
  Sparkles,
  Type,
} from 'lucide-react';
import {
  ALL_GLYPHS,
  DEFAULT_STONE_STYLE,
  GlyphDefinition,
  StoneStyleConfig,
  filterGlyphs,
} from './utils/glyphCatalog';
import {
  renderSpriteSheetAtlas,
  renderStoneGlyphDataUrl,
} from './utils/stoneRenderer';
import {
  BUILTIN_PRESETS,
  BatchWordItem,
  DEFAULT_BATCH_WORDS,
  StyleRecipe,
} from './utils/styleRecipe';
import { FontOption, INITIAL_FONT_OPTIONS } from './utils/fontLoader';
import { renderUniversalTextToCanvas } from './utils/universalRenderer';
import { buildZipArchive, dataUrlToUint8Array } from './utils/zipBuilder';
import { GlyphCard, PreviewBgMode } from './components/GlyphCard';
import { GlyphInspectModal } from './components/GlyphInspectModal';
import { ReferenceComparisonPanel } from './components/ReferenceComparisonPanel';
import { StyleAndFontSidebar } from './components/StyleAndFontSidebar';
import { WordAndBatchWorkspace } from './components/WordAndBatchWorkspace';
import { CustomCharsetWorkspace } from './components/CustomCharsetWorkspace';
import { McpConnectionModal } from './components/McpConnectionModal';
import { useLocale } from './i18n';

const CUSTOM_PRESETS_STORAGE_KEY = 'stoneglyph_universal_custom_presets_v1';

export default function App() {
  const { locale, setLocale, t } = useLocale();
  // Active workspace tab
  const [activeWorkspace, setActiveWorkspace] = useState<
    'word-batch' | 'custom-charset' | 'classic-about'
  >('word-batch');

  // Universal StyleRecipe state (defaults to Grey Stone HD 96px matching webui_e6d485df.html)
  const [recipe, setRecipe] = useState<StyleRecipe>(BUILTIN_PRESETS[0]);

  // Dynamic font options (built-in + uploaded .ttf/.otf/.woff2 + loaded Google Fonts)
  const [fontOptions, setFontOptions] =
    useState<FontOption[]>(INITIAL_FONT_OPTIONS);

  // User-saved custom presets persisted in localStorage
  const [customPresets, setCustomPresets] = useState<StyleRecipe[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  // Batch multi-language words queue
  const [batchWords, setBatchWords] =
    useState<BatchWordItem[]>(DEFAULT_BATCH_WORDS);

  // Classic Turn-1 ABOUT Carved Stone Catalog state (preserved so zero features are lost)
  const [classicStyleConfig, setClassicStyleConfig] =
    useState<StoneStyleConfig>(DEFAULT_STONE_STYLE);
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'letter' | 'number' | 'reference'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bgMode, setBgMode] = useState<PreviewBgMode>('checker-dark');
  const [inspectedGlyph, setInspectedGlyph] = useState<GlyphDefinition | null>(
    null
  );
  const [glyphUrls, setGlyphUrls] = useState<Record<string, string>>({});
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);

  const showNotice = useCallback((msg: string) => {
    setExportStatus(msg);
    setTimeout(() => {
      setExportStatus((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  const handleAddFontOption = useCallback((opt: FontOption) => {
    setFontOptions((prev) => {
      if (prev.some((f) => f.family.toLowerCase() === opt.family.toLowerCase())) {
        return prev;
      }
      return [opt, ...prev];
    });
  }, []);

  const handleSaveCustomPreset = useCallback(
    (name: string) => {
      const newPreset: StyleRecipe = {
        ...recipe,
        id: `custom-${Date.now()}`,
        name,
        badgeLabel: `Font: ${recipe.fontFamily}`,
      };
      setCustomPresets((prev) => {
        const next = [...prev, newPreset];
        try {
          localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      setRecipe(newPreset);
      showNotice(`Preset kustom "${name}" berhasil disimpan!`);
    },
    [recipe, showNotice]
  );

  const handleDeleteCustomPreset = useCallback(
    (id: string) => {
      setCustomPresets((prev) => {
        const next = prev.filter((p) => p.id !== id);
        try {
          localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      if (recipe.id === id) {
        setRecipe(BUILTIN_PRESETS[0]);
      }
      showNotice('Preset kustom dihapus.');
    },
    [recipe.id, showNotice]
  );

  // Render classic ABOUT 36 glyphs when viewing the Classic ABOUT tab
  useEffect(() => {
    if (activeWorkspace !== 'classic-about') return;
    let cancelled = false;

    const runRender = async () => {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // continue
        }
      }
      if (cancelled) return;

      const previewSize = 240;
      const chunkSize = 12;
      const accumulated: Record<string, string> = {};

      for (let i = 0; i < ALL_GLYPHS.length; i += chunkSize) {
        if (cancelled) return;
        const slice = ALL_GLYPHS.slice(i, i + chunkSize);
        for (const g of slice) {
          accumulated[g.char] = renderStoneGlyphDataUrl(
            g,
            classicStyleConfig,
            previewSize
          );
        }
        setGlyphUrls({ ...accumulated });
        if (i + chunkSize < ALL_GLYPHS.length) {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          );
        }
      }
    };

    runRender();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace, classicStyleConfig]);

  const filteredGlyphs = useMemo(
    () => filterGlyphs(ALL_GLYPHS, categoryFilter, searchQuery),
    [categoryFilter, searchQuery]
  );

  const filteredLetters = useMemo(
    () => filteredGlyphs.filter((g) => g.category === 'letter'),
    [filteredGlyphs]
  );

  const filteredNumbers = useMemo(
    () => filteredGlyphs.filter((g) => g.category === 'number'),
    [filteredGlyphs]
  );

  const handleDownloadClassicGlyph = useCallback(
    (glyph: GlyphDefinition, customSize?: number) => {
      const targetSize = customSize ?? classicStyleConfig.size;
      const pngDataUrl = renderStoneGlyphDataUrl(
        glyph,
        classicStyleConfig,
        targetSize
      );
      const link = document.createElement('a');
      link.download = customSize
        ? `${glyph.char}_${targetSize}px.png`
        : glyph.filename;
      link.href = pngDataUrl;
      link.click();
      showNotice(
        `Berhasil mengunduh ${link.download} (${targetSize}×${targetSize}px PNG Transparan)`
      );
    },
    [classicStyleConfig, showNotice]
  );

  const handleDownloadPrimaryBundleZip = useCallback(() => {
    const allPresets = [...BUILTIN_PRESETS, ...customPresets];
    const tempCanvas = document.createElement('canvas');

    const entries = batchWords.map((item) => {
      const rowPreset =
        allPresets.find((p) => p.id === item.presetId) || recipe;
      const effectiveRecipe: StyleRecipe = {
        ...rowPreset,
        fontFamily: recipe.fontFamily,
        fixedHeightPx: recipe.fixedHeightPx,
      };
      renderUniversalTextToCanvas(item.text, tempCanvas, effectiveRecipe);
      const dataUrl = tempCanvas.toDataURL('image/png');
      return {
        filename: `words/${item.langFolder}/${item.filename}`,
        data: dataUrlToUint8Array(dataUrl),
      };
    });

    const zipBytes = buildZipArchive(entries);
    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `Universal_GameUI_Words_${recipe.fixedHeightPx}px.zip`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showNotice(
      `Paket ZIP berisi ${batchWords.length} kata tombol PNG transparan berhasil diunduh!`
    );
  }, [batchWords, customPresets, recipe, showNotice]);

  const handleDownloadClassicAll36Zip = useCallback(() => {
    const entries = ALL_GLYPHS.map((glyph) => {
      const dataUrl = renderStoneGlyphDataUrl(
        glyph,
        classicStyleConfig,
        classicStyleConfig.size
      );
      return {
        filename: glyph.filename,
        data: dataUrlToUint8Array(dataUrl),
      };
    });

    const zipBytes = buildZipArchive(entries);
    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `StoneGlyph_ABOUT_A-Z_0-9_${classicStyleConfig.size}px.zip`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showNotice('Paket 36 file PNG transparan (A-Z & 0-9) berhasil diunduh!');
  }, [classicStyleConfig, showNotice]);

  const handleDownloadClassicSpriteSheet = useCallback(() => {
    const { canvas, metadataJson } = renderSpriteSheetAtlas(
      ALL_GLYPHS,
      classicStyleConfig,
      256
    );
    const sheetDataUrl = canvas.toDataURL('image/png');
    const encoder = new TextEncoder();

    const zipBytes = buildZipArchive([
      {
        filename: 'StoneGlyph_SpriteSheet_A-Z_0-9.png',
        data: dataUrlToUint8Array(sheetDataUrl),
      },
      {
        filename: 'StoneGlyph_Atlas_Metadata.json',
        data: encoder.encode(metadataJson),
      },
    ]);

    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'StoneGlyph_SpriteSheet_Atlas.zip';
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showNotice('Sprite Sheet Atlas 6×6 (.PNG + .JSON) berhasil diunduh!');
  }, [classicStyleConfig, showNotice]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0F172A] text-slate-100">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0F172A]/95 backdrop-blur-xs border-b border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveWorkspace('word-batch');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          {t('app.wordmark')}
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label={t('nav.main')}
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          <a
            href="#word-batch"
            onClick={(e) => {
              e.preventDefault();
              setActiveWorkspace('word-batch');
            }}
            className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
              activeWorkspace === 'word-batch' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            {t('nav.wordBatch')}
          </a>
          <a
            href="#custom-charset"
            onClick={(e) => {
              e.preventDefault();
              setActiveWorkspace('custom-charset');
            }}
            className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
              activeWorkspace === 'custom-charset'
                ? 'text-amber-400 font-semibold'
                : ''
            }`}
          >
            {t('nav.charset')}
          </a>
          <a
            href="#classic-about"
            onClick={(e) => {
              e.preventDefault();
              setActiveWorkspace('classic-about');
            }}
            className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
              activeWorkspace === 'classic-about'
                ? 'text-amber-400 font-semibold'
                : ''
            }`}
          >
            {t('nav.classic')}
          </a>
        </nav>

        {/* Zone 3: 1 primary action & MCP Agent connection modal trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <label className="sr-only" htmlFor="locale-select">{t('app.language')}</label>
          <select
            id="locale-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'id')}
            className="px-2 py-2 text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
          >
            <option value="id">{t('app.languageIndonesian')}</option>
            <option value="en">{t('app.languageEnglish')}</option>
          </select>
          <button
            type="button"
            onClick={() => setIsMcpModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-300 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
            title={t('actions.mcpTitle')}
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('actions.mcpAgent')}</span>
          </button>
          <button
            type="button"
            onClick={
              activeWorkspace === 'classic-about'
                ? handleDownloadClassicAll36Zip
                : handleDownloadPrimaryBundleZip
            }
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {activeWorkspace === 'classic-about'
              ? t('actions.downloadClassic')
              : t('actions.downloadBatch')}
          </button>
        </div>
      </header>

      {/* Main Studio Container */}
      <main
        id="top"
        className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-7 space-y-6"
      >
        {/* Export Toast Notification */}
        {exportStatus && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-950/90 border border-emerald-700/70 text-emerald-200 text-xs font-medium"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{exportStatus}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportStatus(null)}
              className="text-emerald-300 hover:text-white text-xs underline cursor-pointer"
            >
              {t('actions.close')}
            </button>
          </div>
        )}

        {/* Studio Hero & Workspace Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1.5 max-w-3xl">
            <p className="text-xs font-mono text-amber-400">
              {t('app.heroEyebrow')}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight text-balance">
              {t('app.heroTitle')}
            </h1>
            <p className="text-sm text-slate-400">
              Mendukung <strong className="text-slate-200">Upload Custom Font (.TTF/.OTF/.WOFF2)</strong>, Google Fonts dinamis, 6 preset material (termasuk <strong className="text-slate-200">Grey Stone EN</strong>, <strong className="text-slate-200">Gold Ochre ID</strong>, & <strong className="text-slate-200">Batu ABOUT</strong>), editor gradien bebas, tinggi kanvas terkunci <span className="font-mono text-amber-300">96px HD</span>, serta ekspor <span className="font-mono text-amber-300">.PNG / .ZIP / BMFont (.fnt)</span>.
            </p>
          </div>

          {/* 3-Mode Workspace Segmented Switcher */}
          <div className="flex items-center gap-1 p-1.5 bg-[#151F32] rounded-xl border border-slate-800 self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveWorkspace('word-batch')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeWorkspace === 'word-batch'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>{t('tabs.word')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveWorkspace('custom-charset')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeWorkspace === 'custom-charset'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>{t('tabs.charset')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveWorkspace('classic-about')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeWorkspace === 'classic-about'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('tabs.classic')}</span>
            </button>
          </div>
        </div>

        {/* Universal Workspaces (Mode 1 & Mode 2 share the Universal Font & Material Sidebar) */}
        {activeWorkspace !== 'classic-about' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 4 Columns: Dynamic Font Uploader, Material Presets, Sliders & Gradient Editor */}
            <div className="lg:col-span-4">
              <StyleAndFontSidebar
                recipe={recipe}
                onChangeRecipe={setRecipe}
                fontOptions={fontOptions}
                onAddFontOption={handleAddFontOption}
                customPresets={customPresets}
                onSaveCustomPreset={handleSaveCustomPreset}
                onDeleteCustomPreset={handleDeleteCustomPreset}
                onNotice={showNotice}
              />
            </div>

            {/* Right 8 Columns: Active Generator Workspace */}
            <div className="lg:col-span-8">
              {activeWorkspace === 'word-batch' ? (
                <WordAndBatchWorkspace
                  recipe={recipe}
                  onChangeRecipe={setRecipe}
                  customPresets={customPresets}
                  batchWords={batchWords}
                  onChangeBatchWords={setBatchWords}
                  bgMode={bgMode}
                  onBgModeChange={setBgMode}
                  onNotice={showNotice}
                />
              ) : (
                <CustomCharsetWorkspace
                  recipe={recipe}
                  bgMode={bgMode}
                  onNotice={showNotice}
                />
              )}
            </div>
          </div>
        ) : (
          /* Mode 3: Classic Carved Stone ABOUT 36-Glyph Catalog & Reference Comparison */
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 p-3.5 rounded-xl bg-[#151F32] border border-slate-800 items-center">
              <div className="xl:col-span-5 flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800/80 overflow-x-auto">
                {(
                  [
                    { id: 'all', label: 'Semua (36)' },
                    { id: 'letter', label: 'Huruf A–Z (26)' },
                    { id: 'number', label: 'Angka 1–9 & 0 (10)' },
                    { id: 'reference', label: 'Referensi ABOUT (5)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      categoryFilter === tab.id
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="xl:col-span-3 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Cari karakter huruf atau angka"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari karakter (mis. A, Q, 9, 0)..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 focus:outline-none rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="xl:col-span-2 flex items-center justify-between gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <label
                  htmlFor="select-classic-size"
                  className="text-xs text-slate-400 whitespace-nowrap"
                >
                  Ukuran PNG:
                </label>
                <select
                  id="select-classic-size"
                  value={classicStyleConfig.size}
                  onChange={(e) =>
                    setClassicStyleConfig({
                      ...classicStyleConfig,
                      size: Number(e.target.value),
                    })
                  }
                  className="bg-transparent text-xs font-mono font-semibold text-amber-300 focus:outline-none cursor-pointer"
                >
                  <option value={256} className="bg-slate-900 text-slate-100">
                    256×256 px
                  </option>
                  <option value={512} className="bg-slate-900 text-slate-100">
                    512×512 px
                  </option>
                  <option value={1024} className="bg-slate-900 text-slate-100">
                    1024×1024 px
                  </option>
                </select>
              </div>

              <div className="xl:col-span-2 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleDownloadClassicSpriteSheet}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer whitespace-nowrap"
                >
                  <Grid className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sprite Sheet</span>
                </button>
              </div>
            </div>

            {filteredLetters.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h2 className="text-base font-bold text-slate-100">
                      Huruf Alfabet A – Z ({filteredLetters.length} File PNG Transparan)
                    </h2>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    A.png s/d Z.png · {classicStyleConfig.size}×{classicStyleConfig.size}px
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {filteredLetters.map((glyph) => (
                    <GlyphCard
                      key={glyph.id}
                      glyph={glyph}
                      dataUrl={glyphUrls[glyph.char]}
                      exportSize={classicStyleConfig.size}
                      bgMode={bgMode}
                      onDownloadGlyph={handleDownloadClassicGlyph}
                      onInspectGlyph={setInspectedGlyph}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredNumbers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h2 className="text-base font-bold text-slate-100">
                      Angka Numerik 1 – 9 dan 0 ({filteredNumbers.length} File PNG Transparan)
                    </h2>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    1.png s/d 9.png & 0.png · {classicStyleConfig.size}×{classicStyleConfig.size}px
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                  {filteredNumbers.map((glyph) => (
                    <GlyphCard
                      key={glyph.id}
                      glyph={glyph}
                      dataUrl={glyphUrls[glyph.char]}
                      exportSize={classicStyleConfig.size}
                      bgMode={bgMode}
                      onDownloadGlyph={handleDownloadClassicGlyph}
                      onInspectGlyph={setInspectedGlyph}
                    />
                  ))}
                </div>
              </div>
            )}

            <ReferenceComparisonPanel
              styleConfig={classicStyleConfig}
              bgMode={bgMode}
              glyphUrls={glyphUrls}
              onDownloadGlyph={handleDownloadClassicGlyph}
              onInspectGlyph={setInspectedGlyph}
            />
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 mt-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>
            StoneGlyph Universal Game UI Text, Word & Bitmap Font Studio
          </span>
          <div className="flex items-center gap-4 font-mono tabular-nums">
            <span>Font Aktif: {recipe.fontFamily}</span>
            <span aria-hidden="true">·</span>
            <span>Preset: {recipe.name}</span>
            <span aria-hidden="true">·</span>
            <span>Tinggi Kanvas: {recipe.fixedHeightPx}px</span>
          </div>
        </div>
      </footer>

      <GlyphInspectModal
        glyph={inspectedGlyph}
        styleConfig={classicStyleConfig}
        bgMode={bgMode}
        onBgModeChange={setBgMode}
        onClose={() => setInspectedGlyph(null)}
        onDownloadGlyph={handleDownloadClassicGlyph}
      />

      <McpConnectionModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
        onNotice={showNotice}
      />
    </div>
  );
}
