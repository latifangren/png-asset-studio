import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  GradientStop,
  StyleRecipe,
} from '../../utils/styleRecipe';
import { useLocale } from '../../i18n';

interface GradientPanelProps {
  recipe: StyleRecipe;
  onChangeRecipe: (next: StyleRecipe) => void;
}

export const GradientPanel: React.FC<GradientPanelProps> = ({
  recipe,
  onChangeRecipe,
}) => {
  const { t } = useLocale();

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
  return (
    <>
      {/* 4. Multi-Stop Gradient & Color Customizer */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-100">
            {t('sidebar.gradientSection')}
          </h2>
          <button
            type="button"
            onClick={handleAddStop}
            disabled={recipe.gradientStops.length >= 7}
            className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('common.addStop')}</span>
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
                aria-label={t('sidebar.gradientStopColorAria', { n: idx + 1 })}
                value={stop.color}
                onChange={(e) => handleUpdateStopColor(idx, e.target.value)}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer shrink-0"
              />
              <span className="text-xs font-mono uppercase text-slate-200 w-16">
                {stop.color}
              </span>
              <input
                type="range"
                aria-label={t('sidebar.gradientStopOffsetAria', { n: idx + 1 })}
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
                  aria-label={t('sidebar.gradientStopDeleteAria', { n: idx + 1 })}
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
    </>
  );
};
