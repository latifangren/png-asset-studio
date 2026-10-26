/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Grid,
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
import { PreviewBgMode } from './components/GlyphCard';
import { GlyphInspectModal } from './components/GlyphInspectModal';
import { StyleAndFontSidebar } from './components/StyleAndFontSidebar';
import { WordAndBatchWorkspace } from './components/WordAndBatchWorkspace';
import { CustomCharsetWorkspace } from './components/CustomCharsetWorkspace';
import { McpConnectionModal } from './components/McpConnectionModal';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { ClassicCatalog } from './components/ClassicCatalog';
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
      showNotice(t('notices.presetSaved', { name }));
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
      showNotice(t('notices.presetDeleted'));
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
        t('notices.classicGlyphDownloaded', { file: link.download, size: targetSize })
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
      t('notices.batchZipDownloaded', { count: batchWords.length })
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
    link.download = `PNGAssetStudio_ABOUT_A-Z_0-9_${classicStyleConfig.size}px.zip`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showNotice(t('notices.classicZipDownloaded'));
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
        filename: 'PNGAssetStudio_SpriteSheet_A-Z_0-9.png',
        data: dataUrlToUint8Array(sheetDataUrl),
      },
      {
        filename: 'PNGAssetStudio_Atlas_Metadata.json',
        data: encoder.encode(metadataJson),
      },
    ]);

    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'PNGAssetStudio_SpriteSheet_Atlas.zip';
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showNotice(t('notices.spriteSheetDownloaded'));
  }, [classicStyleConfig, showNotice]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0F172A] text-slate-100">
      <AppHeader
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        onOpenMcp={() => setIsMcpModalOpen(true)}
        onDownloadBundle={
          activeWorkspace === 'classic-about'
            ? handleDownloadClassicAll36Zip
            : handleDownloadPrimaryBundleZip
        }
      />

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
          <ClassicCatalog
            categoryFilter={categoryFilter}
            onCategoryFilter={setCategoryFilter}
            searchQuery={searchQuery}
            onSearchQuery={setSearchQuery}
            classicStyleConfig={classicStyleConfig}
            onClassicStyleConfig={setClassicStyleConfig}
            filteredLetters={filteredLetters}
            filteredNumbers={filteredNumbers}
            glyphUrls={glyphUrls}
            bgMode={bgMode}
            onDownloadClassicGlyph={handleDownloadClassicGlyph}
            onInspectGlyph={setInspectedGlyph}
            onDownloadClassicSpriteSheet={handleDownloadClassicSpriteSheet}
          />
        )}
      </main>

      <AppFooter recipe={recipe} />

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
