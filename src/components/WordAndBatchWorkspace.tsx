import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n';
import {
  Archive,
  Download,
  FolderPlus,
  Layers,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  BUILTIN_PRESETS,
  BatchWordItem,
  StyleRecipe,
} from '../utils/styleRecipe';
import { renderUniversalTextToCanvas } from '../utils/universalRenderer';
import { buildZipArchive, dataUrlToUint8Array } from '../utils/zipBuilder';
import { PreviewBgMode, getPreviewBgClass } from './GlyphCard';

interface WordAndBatchWorkspaceProps {
  recipe: StyleRecipe;
  onChangeRecipe: (next: StyleRecipe) => void;
  customPresets: StyleRecipe[];
  batchWords: BatchWordItem[];
  onChangeBatchWords: (next: BatchWordItem[]) => void;
  bgMode: PreviewBgMode;
  onBgModeChange: (next: PreviewBgMode) => void;
  onNotice: (msg: string) => void;
}

const QUICK_WORD_CHIPS: Array<{
  word: string;
  presetId: string;
  lang: string;
  label: string;
}> = [
  { word: 'SETTINGS', presetId: 'grey-stone', lang: 'en', label: 'SETTINGS (EN)' },
  { word: 'EXTRAS', presetId: 'grey-stone', lang: 'en', label: 'EXTRAS (EN)' },
  { word: 'ABOUT', presetId: 'about-stone', lang: 'en', label: 'ABOUT (3D)' },
  { word: 'PENGATURAN', presetId: 'gold-ochre', lang: 'id', label: 'PENGATURAN (ID)' },
  { word: 'EKSTRA', presetId: 'gold-ochre', lang: 'id', label: 'EKSTRA (ID)' },
  { word: 'MAINKAN', presetId: 'gold-ochre', lang: 'id', label: 'MAINKAN (ID)' },
];

export const WordAndBatchWorkspace: React.FC<WordAndBatchWorkspaceProps> = ({
  recipe,
  onChangeRecipe,
  customPresets,
  batchWords,
  onChangeBatchWords,
  bgMode,
  onBgModeChange,
  onNotice,
}) => {
  const { t } = useLocale();
  const [wordText, setWordText] = useState('SETTINGS');
  const [activeLangFolder, setActiveLangFolder] = useState('en');
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 96 });
  const [renderTick, setRenderTick] = useState(0);

  // New batch row state
  const [newBatchText, setNewBatchText] = useState('');
  const [newBatchLang, setNewBatchLang] = useState('en');
  const [newBatchPresetId, setNewBatchPresetId] = useState('grey-stone');
  const [newBatchFilename, setNewBatchFilename] = useState('');

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const allPresets = [...BUILTIN_PRESETS, ...customPresets];

  useEffect(() => {
    const run = async () => {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // continue
        }
      }
      if (!mainCanvasRef.current) return;
      const dims = renderUniversalTextToCanvas(
        wordText,
        mainCanvasRef.current,
        recipe
      );
      setCanvasDims(dims);
    };
    run();
  }, [wordText, recipe, renderTick]);

  const handleSelectQuickWord = (
    word: string,
    presetId: string,
    lang: string
  ) => {
    setWordText(word);
    setActiveLangFolder(lang);
    const targetPreset = allPresets.find((p) => p.id === presetId);
    if (targetPreset) {
      onChangeRecipe({
        ...targetPreset,
        fontFamily: recipe.fontFamily,
      });
    }
  };

  const handleDownloadMainPng = () => {
    if (!mainCanvasRef.current) return;
    const cleanFile =
      wordText
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-') || 'stone-button';
    const link = document.createElement('a');
    link.download = `${cleanFile}.png`;
    link.href = mainCanvasRef.current.toDataURL('image/png');
    link.click();
    onNotice(
      `Berhasil mengunduh ${cleanFile}.png (${canvasDims.width}×${canvasDims.height}px PNG Transparan)`
    );
  };

  const handleAddCurrentToBatch = () => {
    const trimmed = wordText.trim();
    if (!trimmed) return;
    const cleanFile =
      trimmed.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') + '.png';
    const nextItem: BatchWordItem = {
      id: `bw-${Date.now()}`,
      text: trimmed.toUpperCase(),
      langFolder: activeLangFolder || 'en',
      presetId: recipe.id,
      filename: cleanFile,
    };
    onChangeBatchWords([...batchWords, nextItem]);
    onNotice(
      `Kata "${trimmed.toUpperCase()}" ditambahkan ke antrean Batch (${nextItem.langFolder}/${cleanFile}).`
    );
  };

  const handleAddCustomBatchRow = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBatchText.trim();
    if (!trimmed) return;
    const fname =
      newBatchFilename.trim() ||
      `${trimmed.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.png`;

    const nextItem: BatchWordItem = {
      id: `bw-${Date.now()}`,
      text: trimmed.toUpperCase(),
      langFolder: newBatchLang.trim() || 'en',
      presetId: newBatchPresetId,
      filename: fname.endsWith('.png') ? fname : `${fname}.png`,
    };
    onChangeBatchWords([...batchWords, nextItem]);
    setNewBatchText('');
    setNewBatchFilename('');
    onNotice(`Baris batch "${nextItem.text}" berhasil ditambahkan.`);
  };

  const handleDownloadSingleBatchRow = (item: BatchWordItem) => {
    const rowPreset =
      allPresets.find((p) => p.id === item.presetId) || recipe;
    const effectiveRecipe: StyleRecipe = {
      ...rowPreset,
      fontFamily: recipe.fontFamily,
      fixedHeightPx: recipe.fixedHeightPx,
    };
    const tempCanvas = document.createElement('canvas');
    renderUniversalTextToCanvas(item.text, tempCanvas, effectiveRecipe);
    const link = document.createElement('a');
    link.download = item.filename;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
    onNotice(`Mengunduh ${item.langFolder}/${item.filename}...`);
  };

  const handleDownloadAllBatchZip = () => {
    if (batchWords.length === 0) return;
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
    link.download = `GameUI_Words_Batch_${recipe.fixedHeightPx}px.zip`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    onNotice(
      `Berhasil mengunduh ${batchWords.length} kata PNG transparan dalam struktur folder words/<lang>/*.png!`
    );
  };

  const bgClass = getPreviewBgClass(bgMode);
  const safeFilePreview =
    wordText
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-') || 'settings';

  return (
    <div className="space-y-6">
      {/* Top Card: Live Word / Button PNG Generator */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-mono text-amber-400">
              Generator Aset Kata & Tombol Menu UI Game
            </p>
            <h2 className="text-xl font-bold text-slate-100 mt-0.5">
              Generator PNG Kata Langsung (Standar In-Game HD {recipe.fixedHeightPx}px)
            </h2>
          </div>

          {/* Background Preview Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            {(
              [
                { id: 'checker-dark', label: t('workspace.bgTransparent') },
                { id: 'solid-dark', label: t('workspace.bgDark') },
                { id: 'game-wood', label: t('workspace.bgWood') },
                { id: 'checker-light', label: t('workspace.bgLight') },
              ] as const
            ).map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => onBgModeChange(bg.id)}
                className={`py-1 px-2.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  bgMode === bg.id
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {bg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Word Input & Quick Chips */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8 space-y-1">
              <label
                htmlFor="word-text-input"
                className="block text-xs font-semibold text-slate-300"
              >
                {t('workspace.wordLabel')}
              </label>
              <input
                id="word-text-input"
                type="text"
                value={wordText}
                onChange={(e) => setWordText(e.target.value)}
                placeholder={t('workspace.wordPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-3.5 py-2.5 text-base font-bold text-slate-100 focus:outline-none"
              />
            </div>

            <div className="md:col-span-4 space-y-1">
              <label
                htmlFor="word-lang-select"
                className="block text-xs font-semibold text-slate-300"
              >
                {t('workspace.langFolderLabel')}
              </label>
              <select
                id="word-lang-select"
                value={activeLangFolder}
                onChange={(e) => setActiveLangFolder(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2.5 text-sm font-mono font-semibold text-amber-300 focus:outline-none cursor-pointer"
              >
                <option value="en">en (English — words/en/)</option>
                <option value="id">id (Indonesia — words/id/)</option>
                <option value="ui">ui (Umum — words/ui/)</option>
              </select>
            </div>
          </div>

          {/* Quick Word Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">
              {t('workspace.quickWords')}
            </span>
            {QUICK_WORD_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() =>
                  handleSelectQuickWord(chip.word, chip.presetId, chip.lang)
                }
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  wordText.toUpperCase() === chip.word &&
                  recipe.id === chip.presetId
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Canvas Preview Stage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
            <span>
              {t('workspace.previewPrefix')}{' '}
              <strong className="text-slate-200">{recipe.fontFamily}</strong> ·
              {t('workspace.presetPrefix')} <strong className="text-amber-300">{recipe.name}</strong>)
            </span>
            <span className="text-emerald-400 font-semibold">
              {t('workspace.dimensions')} {canvasDims.width} × {canvasDims.height} px (RGBA Transparan)
            </span>
          </div>

          <div
            className={`w-full min-h-[164px] rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center p-6 overflow-x-auto ${bgClass}`}
          >
            <canvas
              ref={mainCanvasRef}
              data-testid="universal-word-canvas"
              className="block max-w-full h-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        {/* Actions & In-Game Path Spec */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadMainPng}
              className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>
                {t('workspace.downloadPng')} ({safeFilePreview}.png · {canvasDims.width}×{canvasDims.height}px)
              </span>
            </button>

            <button
              type="button"
              onClick={handleAddCurrentToBatch}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-4 h-4 text-amber-400" />
              <span>{t('workspace.saveToBatch')}</span>
            </button>

            <button
              type="button"
              onClick={() => setRenderTick((t) => t + 1)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700/80 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('workspace.rerender')}</span>
            </button>
          </div>
        </div>

        {/* In-Game Placement Spec Box */}
        <div className="rounded-xl bg-slate-950/80 border border-slate-800/90 p-3.5 text-xs text-slate-300 space-y-1 font-mono">
          <div className="text-slate-400 font-sans font-semibold">
            {t('workspace.specTitle')}
          </div>
          <div>
            • {t('workspace.specTargetPath')}{' '}
            <code className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
              web/public/hd/menu/words/{activeLangFolder}/{safeFilePreview}.png
            </code>
          </div>
          <div className="text-slate-400 font-sans">
            • {t('workspace.specHeightNote', { height: recipe.fixedHeightPx })}
          </div>
        </div>
      </section>

      {/* Bottom Card: Multi-Language Batch Word Table (EN / ID / Custom) */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-mono text-amber-400">
              {t('workspace.batchHeader')}
            </p>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {t('workspace.batchListTitle', { count: batchWords.length })}
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={handleDownloadAllBatchZip}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Archive className="w-4 h-4" />
            <span>{t('workspace.downloadAllBatch')}</span>
          </button>
        </div>

        {/* Add New Word to Batch Form */}
        <form
          onSubmit={handleAddCustomBatchRow}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800"
        >
          <input
            type="text"
            value={newBatchText}
            onChange={(e) => setNewBatchText(e.target.value)}
            placeholder={t('workspace.batchWordPlaceholder')}
            aria-label={t('workspace.batchWordAria')}
            className="sm:col-span-4 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold uppercase text-slate-100 focus:border-amber-400 focus:outline-none"
          />
          <input
            type="text"
            value={newBatchLang}
            onChange={(e) => setNewBatchLang(e.target.value)}
            placeholder={t('workspace.batchFolderPlaceholder')}
            aria-label={t('workspace.batchFolderAria')}
            className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:border-amber-400 focus:outline-none"
          />
          <select
            value={newBatchPresetId}
            onChange={(e) => setNewBatchPresetId(e.target.value)}
            aria-label={t('workspace.batchPresetAria')}
            className="sm:col-span-3 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
          >
            {allPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="sm:col-span-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('workspace.addRow')}</span>
          </button>
        </form>

        {/* Batch Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">{t('workspace.batchColWord')}</th>
                <th className="py-2.5 px-3">{t('workspace.batchColPreset')}</th>
                <th className="py-2.5 px-3">{t('workspace.batchColPath')}</th>
                <th className="py-2.5 px-3 text-right">{t('workspace.batchColActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
              {batchWords.map((item) => {
                const presetObj =
                  allPresets.find((p) => p.id === item.presetId) || recipe;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectQuickWord(
                            item.text,
                            item.presetId,
                            item.langFolder
                          )
                        }
                        className="hover:text-amber-400 cursor-pointer text-left"
                      >
                        {item.text}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      {presetObj.name}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300/90">
                      words/{item.langFolder}/{item.filename}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleBatchRow(item)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-medium cursor-pointer"
                        >
                          Unduh PNG
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onChangeBatchWords(
                              batchWords.filter((w) => w.id !== item.id)
                            )
                          }
                          aria-label={t('workspace.batchDeleteAria', { text: item.text })}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
