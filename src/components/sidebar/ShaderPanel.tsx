import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  BUILTIN_PRESETS,
  StyleRecipe,
} from '../../utils/styleRecipe';
import { useLocale } from '../../i18n';

interface ShaderPanelProps {
  recipe: StyleRecipe;
  onChangeRecipe: (next: StyleRecipe) => void;
}

export const ShaderPanel: React.FC<ShaderPanelProps> = ({
  recipe,
  onChangeRecipe,
}) => {
  const { t } = useLocale();


  return (
    <>
      {/* 3. Geometry, 3D Bevel, Pores & Extrusion Sliders */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-100">
            {t('sidebar.shaderSection')}
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
            <span>{t('common.reset')}</span>
          </button>
        </div>

        {/* Shading Pipeline Selector */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-300">
            {t('sidebar.pipelineLabel')}
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
              {t('sidebar.pipelineHybrid')}
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
                {t('sidebar.fontSizeLabel')}
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
                {t('sidebar.poresLabel')}
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
                {t('sidebar.cracksLabel')}
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
                {t('sidebar.depthLabel')}
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
                {t('sidebar.strokeLabel')}
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
                  {t('sidebar.bevelLabel')}
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
    </>
  );
};
