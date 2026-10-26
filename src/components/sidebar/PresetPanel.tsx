import React, { useRef, useState } from 'react';
import {
  Download,
  FolderDown,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  BUILTIN_PRESETS,
  StyleRecipe,
} from '../../utils/styleRecipe';
import { useLocale } from '../../i18n';

interface PresetPanelProps {
  recipe: StyleRecipe;
  onChangeRecipe: (next: StyleRecipe) => void;
  customPresets: StyleRecipe[];
  onSaveCustomPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
  onNotice: (msg: string) => void;
}

export const PresetPanel: React.FC<PresetPanelProps> = ({
  recipe,
  onChangeRecipe,
  customPresets,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  onNotice,
}) => {
  const { t } = useLocale();
  const presetFileInputRef = useRef<HTMLInputElement | null>(null);

  const [newPresetName, setNewPresetName] = useState('');
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
    onNotice(t('sidebar.presetExported', { name: recipe.name }));
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
        throw new Error(t('sidebar.presetJsonInvalid'));
      }
      onChangeRecipe({
        ...recipe,
        ...parsed,
        id: parsed.id || `imported-${Date.now()}`,
        name: parsed.name || file.name.replace(/\.json$/i, ''),
      });
      onNotice(t('sidebar.presetImported', { name: parsed.name || file.name }));
    } catch (err) {
      onNotice(
        err instanceof Error ? err.message : t('sidebar.presetJsonReadFailed')
      );
    } finally {
      e.target.value = '';
    }
  };

  const allPresets = [...BUILTIN_PRESETS, ...customPresets];
  return (
    <>
      {/* 2. Material Presets Library */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-bold text-slate-100">
              {t('sidebar.presetSection')}
            </h2>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-slate-400">
            {allPresets.length} {t('sidebar.presetCount')}
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
                    aria-label={t('sidebar.presetDeleteAria', { name: preset.name })}
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
              placeholder={t('sidebar.presetNewPlaceholder')}
              aria-label={t('sidebar.presetNewAria')}
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
              <span>{t('sidebar.presetSave')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportRecipeJson}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('sidebar.presetExportJson')}</span>
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
              <span>{t('common.importJson')}</span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
};
