import React, { useRef, useState } from 'react';
import {
  Download,
  FileUp,
  FolderDown,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react';
import {
  FontOption,
   loadGoogleFontByName,
  registerUploadedFontFile,
} from '../utils/fontLoader';
import {
  BUILTIN_PRESETS,
  GradientStop,
  StyleRecipe,
} from '../utils/styleRecipe';

interface StyleAndFontSidebarProps {
  recipe: StyleRecipe;
  onChangeRecipe: (next: StyleRecipe) => void;
  fontOptions: FontOption[];
  onAddFontOption: (opt: FontOption) => void;
  customPresets: StyleRecipe[];
  onSaveCustomPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
  onNotice: (msg: string) => void;
}

export const StyleAndFontSidebar: React.FC<StyleAndFontSidebarProps> = ({
  recipe,
  onChangeRecipe,
  fontOptions,
  onAddFontOption,
  customPresets,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  onNotice,
}) => {
  const fontFileInputRef = useRef<HTMLInputElement | null>(null);
  const presetFileInputRef = useRef<HTMLInputElement | null>(null);

  const [googleFontInput, setGoogleFontInput] = useState('');
  const [isLoadingFont, setIsLoadingFont] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState('');

  const handleUploadFontFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontError(null);
    setIsLoadingFont(true);
    try {
      const opt = await registerUploadedFontFile(file);
      onAddFontOption(opt);
      onChangeRecipe({
        ...recipe,
        fontFamily: opt.family,
      });
      onNotice(
        `Font kustom "${opt.family}" berhasil dimuat dari file ${file.name}!`
      );
    } catch (err) {
      setFontError(
        err instanceof Error ? err.message : 'Gagal memuat file font.'
      );
    } finally {
      setIsLoadingFont(false);
      e.target.value = '';
    }
  };

  const handleLoadGoogleFont = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleFontInput.trim()) {
      setFontError('Masukkan nama Google Font (contoh: Luckiest Guy).');
      return;
    }
    setFontError(null);
    setIsLoadingFont(true);
    try {
      const opt = await loadGoogleFontByName(googleFontInput);
      onAddFontOption(opt);
      onChangeRecipe({
        ...recipe,
        fontFamily: opt.family,
      });
      setGoogleFontInput('');
      onNotice(`Google Font "${opt.family}" berhasil dimuat dan diaktifkan!`);
    } catch (err) {
      setFontError(
        err instanceof Error ? err.message : 'Gagal memuat Google Font.'
      );
    } finally {
      setIsLoadingFont(false);
    }
  };

  const handleUpdateStopColor = (idx: number, color: string) => {
    const nextStops = recipe.gradientStops.map((s, i) =>
      i === idx ? { ...s, color } : s
    );
    onChangeRecipe({ ...recipe, gradientStops: nextStops });
  };

  const handleUpdateStopOffset = (idx: number, offsetPct: number) => {
    const nextStops = recipe.gradientStops.map((s, i) =>
      i === idx
        ? { ...s, offset: Math.max(0, Math.min(1, offsetPct / 100)) }
        : s
    );
    onChangeRecipe({ ...recipe, gradientStops: nextStops });
  };

  const handleAddStop = () => {
    if (recipe.gradientStops.length >= 7) return;
    const nextStops: GradientStop[] = [
      ...recipe.gradientStops,
      { offset: 0.5, color: '#d4c5ae' },
    ].sort((a, b) => a.offset - b.offset);
    onChangeRecipe({ ...recipe, gradientStops: nextStops });
  };

  const handleRemoveStop = (idx: number) => {
    if (recipe.gradientStops.length <= 2) return;
    const nextStops = recipe.gradientStops.filter((_, i) => i !== idx);
    onChangeRecipe({ ...recipe, gradientStops: nextStops });
  };

  const handleExportRecipeJson = () => {
    const jsonStr = JSON.stringify(recipe, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `${safeName || 'custom'}.style.json`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    onNotice(`Konfigurasi preset "${recipe.name}" diekspor ke JSON.`);
  };

  const handleImportRecipeJson = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<StyleRecipe>;
      if (!parsed.gradientStops || !Array.isArray(parsed.gradientStops)) {
        throw new Error('File JSON bukan format StyleRecipe yang valid.');
      }
      onChangeRecipe({
        ...recipe,
        ...parsed,
        id: parsed.id || `imported-${Date.now()}`,
        name: parsed.name || file.name.replace(/\.json$/i, ''),
      });
      onNotice(`Preset "${parsed.name || file.name}" berhasil diimpor!`);
    } catch (err) {
      setFontError(
        err instanceof Error ? err.message : 'Gagal membaca file JSON preset.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const allPresets = [...BUILTIN_PRESETS, ...customPresets];

  return (
    <aside className="space-y-5">
      {/* 1. Dynamic Font Engine (Built-in + Upload .TTF/.OTF/.WOFF + Google Fonts) */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-bold text-slate-100">
              01. Font & Upload Custom Font
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            .TTF / .OTF / .WOFF2
          </span>
        </div>

        {/* Active Font Selector */}
        <div className="space-y-1.5">
          <label
            htmlFor="font-family-select"
            className="block text-xs font-semibold text-slate-300"
          >
            Pilihan Font Aktif:
          </label>
          <select
            id="font-family-select"
            value={recipe.fontFamily}
            onChange={(e) =>
              onChangeRecipe({ ...recipe, fontFamily: e.target.value })
            }
            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer"
          >
            {fontOptions.map((opt) => (
              <option key={opt.family} value={opt.family}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Binary Font File (.ttf / .otf / .woff / .woff2) */}
        <div className="space-y-2">
          <input
            ref={fontFileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            onChange={handleUploadFontFile}
            className="hidden"
            aria-label="Upload file font kustom"
          />
          <button
            type="button"
            disabled={isLoadingFont}
            onClick={() => fontFileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-dashed border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileUp className="w-4 h-4 shrink-0" />
            <span>
              {isLoadingFont
                ? 'Memuat Font...'
                : 'Upload File Font (.TTF / .OTF / .WOFF2)'}
            </span>
          </button>
        </div>

        {/* On-Demand Google Font Loader */}
        <form onSubmit={handleLoadGoogleFont} className="space-y-1.5">
          <label
            htmlFor="google-font-input"
            className="block text-xs font-medium text-slate-400"
          >
            Atau Muat Nama Google Font Dinamis:
          </label>
          <div className="flex items-center gap-2">
            <input
              id="google-font-input"
              type="text"
              value={googleFontInput}
              onChange={(e) => setGoogleFontInput(e.target.value)}
              placeholder="Mis: Luckiest Guy, Cinzel..."
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoadingFont}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Muat Font
            </button>
          </div>
          {fontError && (
            <p role="alert" className="text-xs text-rose-400 pt-1">
              {fontError}
            </p>
          )}
        </form>
      </section>

      {/* 2. Material Presets Library */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-bold text-slate-100">
              02. Preset Material & Tema UI
            </h2>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-slate-400">
            {allPresets.length} Preset
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {allPresets.map((preset) => {
            const isActive = recipe.id === preset.id;
            const topColor = preset.gradientStops[0]?.color || '#ffffff';
            const midColor =
              preset.gradientStops[Math.floor(preset.gradientStops.length / 2)]
                ?.color || '#cccccc';
            const botColor =
              preset.gradientStops[preset.gradientStops.length - 1]?.color ||
              '#666666';

            return (
              <div
                key={preset.id}
                className={`relative group flex items-center justify-between rounded-xl border p-2.5 transition-all ${
                  isActive
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    onChangeRecipe({
                      ...preset,
                      // Preserve user's chosen custom font if they uploaded one
                      fontFamily: recipe.fontFamily,
                    })
                  }
                  className="flex-1 flex items-center gap-2.5 text-left cursor-pointer min-w-0"
                >
                  <span
                    className="w-6 h-6 rounded-md border border-white/20 shrink-0"
                    style={{
                      background: `linear-gradient(180deg, ${topColor} 0%, ${midColor} 50%, ${botColor} 100%)`,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {preset.badgeLabel}
                    </div>
                  </div>
                </button>

                {preset.id.startsWith('custom-') && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomPreset(preset.id)}
                    aria-label={`Hapus preset ${preset.name}`}
                    className="ml-1 p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Save / Export / Import Preset JSON */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Nama preset baru..."
              aria-label="Nama preset kustom baru"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const name = newPresetName.trim() || `Custom ${customPresets.length + 1}`;
                onSaveCustomPreset(name);
                setNewPresetName('');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportRecipeJson}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Ekspor JSON</span>
            </button>
            <input
              ref={presetFileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportRecipeJson}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => presetFileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer whitespace-nowrap"
            >
              <FolderDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Impor JSON</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Geometry, 3D Bevel, Pores & Extrusion Sliders */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-100">
            03. Parameter Dimensi, 3D & Pori
          </h2>
          <button
            type="button"
            onClick={() => {
              const found =
                BUILTIN_PRESETS.find((p) => p.id === recipe.id) ||
                BUILTIN_PRESETS[0];
              onChangeRecipe({ ...found, fontFamily: recipe.fontFamily });
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Shading Pipeline Selector */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-300">
            Mode Pipeline Perender:
          </span>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() =>
                onChangeRecipe({ ...recipe, shadingMode: 'hybrid-3d-bevel' })
              }
              className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                recipe.shadingMode === 'hybrid-3d-bevel'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Hybrid 3D Bevel + Layer
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeRecipe({ ...recipe, shadingMode: 'fast-2d-layer' })
              }
              className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                recipe.shadingMode === 'fast-2d-layer'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Fast 2D Layer (HTML)
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          {/* Canvas Height (Locked 96px HD or custom) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="sl-height" className="text-slate-300">
                Tinggi Kanvas Kata (In-Game HD)
              </label>
              <span className="font-mono tabular-nums text-amber-300 font-semibold">
                {recipe.fixedHeightPx}px {recipe.fixedHeightPx === 96 ? '(Standar HD)' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="sl-height"
                type="range"
                min={64}
                max={256}
                step={8}
                value={recipe.fixedHeightPx}
                onChange={(e) =>
                  onChangeRecipe({
                    ...recipe,
                    fixedHeightPx: Number(e.target.value),
                  })
                }
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() =>
                  onChangeRecipe({ ...recipe, fixedHeightPx: 96 })
                }
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 cursor-pointer whitespace-nowrap"
              >
                96px
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="sl-fontsize" className="text-slate-300">
                Ukuran Huruf (Font Size)
              </label>
              <span className="font-mono tabular-nums text-amber-300">
                {recipe.fontSizePx}px
              </span>
            </div>
            <input
              id="sl-fontsize"
              type="range"
              min={44}
              max={86}
              value={recipe.fontSizePx}
              onChange={(e) =>
                onChangeRecipe({
                  ...recipe,
                  fontSizePx: Number(e.target.value),
                })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Pore Density */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="sl-pores" className="text-slate-300">
                Kepadatan Pori / Kawah Batu
              </label>
              <span className="font-mono tabular-nums text-amber-300">
                {recipe.poreDensity}%
              </span>
            </div>
            <input
              id="sl-pores"
              type="range"
              min={0}
              max={60}
              value={recipe.poreDensity}
              onChange={(e) =>
                onChangeRecipe({
                  ...recipe,
                  poreDensity: Number(e.target.value),
                })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Crack Intensity */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="sl-cracks" className="text-slate-300">
                Intensitas Retakan Pahat (Cracks)
              </label>
              <span className="font-mono tabular-nums text-amber-300">
                {recipe.crackIntensity}%
              </span>
            </div>
            <input
              id="sl-cracks"
              type="range"
              min={0}
              max={100}
              step={5}
              value={recipe.crackIntensity}
              onChange={(e) =>
                onChangeRecipe({
                  ...recipe,
                  crackIntensity: Number(e.target.value),
                })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* 3D Extrusion Depth */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="sl-depth" className="text-slate-300">
                Kedalaman 3D (Extrusion)
              </label>
              <span className="font-mono tabular-nums text-amber-300">
                {recipe.extrusionDepthPx}px
              </span>
            </div>
            <input
              id="sl-depth"
              type="range"
              min={0}
              max={14}
              value={recipe.extrusionDepthPx}
              onChange={(e) =>
                onChangeRecipe({
                  ...recipe,
                  extrusionDepthPx: Number(e.target.value),
                })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Contour Stroke Width */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="sl-stroke" className="text-slate-300">
                Ketebalan Garis Kontur (Stroke)
              </label>
              <span className="font-mono tabular-nums text-amber-300">
                {recipe.strokeWidthPx}px
              </span>
            </div>
            <input
              id="sl-stroke"
              type="range"
              min={0}
              max={18}
              value={recipe.strokeWidthPx}
              onChange={(e) =>
                onChangeRecipe({
                  ...recipe,
                  strokeWidthPx: Number(e.target.value),
                })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* 3D Bevel Strength (when Hybrid 3D is active) */}
          {recipe.shadingMode === 'hybrid-3d-bevel' && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="sl-bevel" className="text-slate-300">
                  Cembung 3D Bevel Normal
                </label>
                <span className="font-mono tabular-nums text-amber-300">
                  {Math.round(recipe.bevelStrength * 100)}%
                </span>
              </div>
              <input
                id="sl-bevel"
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={recipe.bevelStrength}
                onChange={(e) =>
                  onChangeRecipe({
                    ...recipe,
                    bevelStrength: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      </section>

      {/* 4. Multi-Stop Gradient & Color Customizer */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-100">
            04. Editor Gradien & Warna Material
          </h2>
          <button
            type="button"
            onClick={handleAddStop}
            disabled={recipe.gradientStops.length >= 7}
            className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Stop</span>
          </button>
        </div>

        {/* Gradient Color Stops */}
        <div className="space-y-2">
          {recipe.gradientStops.map((stop, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800"
            >
              <input
                type="color"
                aria-label={`Warna gradien stop ${idx + 1}`}
                value={stop.color}
                onChange={(e) => handleUpdateStopColor(idx, e.target.value)}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer shrink-0"
              />
              <span className="text-xs font-mono uppercase text-slate-200 w-16">
                {stop.color}
              </span>
              <input
                type="range"
                aria-label={`Posisi gradien stop ${idx + 1}`}
                min={0}
                max={100}
                value={Math.round(stop.offset * 100)}
                onChange={(e) =>
                  handleUpdateStopOffset(idx, Number(e.target.value))
                }
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <span className="text-[11px] font-mono tabular-nums text-slate-400 w-9 text-right">
                {Math.round(stop.offset * 100)}%
              </span>
              {recipe.gradientStops.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveStop(idx)}
                  aria-label={`Hapus gradien stop ${idx + 1}`}
                  className="text-slate-500 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Key Contour, Extrusion, Pore & Rim Colors */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
          <label className="flex items-center gap-2 bg-slate-900/70 p-2 rounded-lg border border-slate-800 cursor-pointer">
            <input
              type="color"
              value={recipe.strokeColor}
              onChange={(e) =>
                onChangeRecipe({ ...recipe, strokeColor: e.target.value })
              }
              className="w-5 h-5 rounded bg-transparent cursor-pointer shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-300 truncate">
                Garis Kontur
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                {recipe.strokeColor}
              </div>
            </div>
          </label>

          <label className="flex items-center gap-2 bg-slate-900/70 p-2 rounded-lg border border-slate-800 cursor-pointer">
            <input
              type="color"
              value={recipe.extrusionColor}
              onChange={(e) =>
                onChangeRecipe({ ...recipe, extrusionColor: e.target.value })
              }
              className="w-5 h-5 rounded bg-transparent cursor-pointer shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-300 truncate">
                3D Extrusion
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                {recipe.extrusionColor}
              </div>
            </div>
          </label>

          <label className="flex items-center gap-2 bg-slate-900/70 p-2 rounded-lg border border-slate-800 cursor-pointer">
            <input
              type="color"
              value={recipe.poreShadowColor}
              onChange={(e) =>
                onChangeRecipe({ ...recipe, poreShadowColor: e.target.value })
              }
              className="w-5 h-5 rounded bg-transparent cursor-pointer shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-300 truncate">
                Bayangan Pori
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                {recipe.poreShadowColor}
              </div>
            </div>
          </label>

          <label className="flex items-center gap-2 bg-slate-900/70 p-2 rounded-lg border border-slate-800 cursor-pointer">
            <input
              type="color"
              value={recipe.outerRimColor}
              onChange={(e) =>
                onChangeRecipe({
                  ...recipe,
                  outerRimColor: e.target.value,
                  outerRimWidthPx: Math.max(2, recipe.outerRimWidthPx),
                })
              }
              className="w-5 h-5 rounded bg-transparent cursor-pointer shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-300 truncate">
                Rim Halo Luar
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                {recipe.outerRimColor}
              </div>
            </div>
          </label>
        </div>
      </section>
    </aside>
  );
};
