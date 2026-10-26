import React, { useRef, useState } from 'react';
import { FileUp, Type } from 'lucide-react';
import {
  FontOption,
  loadGoogleFontByName,
  registerUploadedFontFile,
} from '../../utils/fontLoader';
import { StyleRecipe } from '../../utils/styleRecipe';
import { useLocale } from '../../i18n';

interface FontPanelProps {
  recipe: StyleRecipe;
  onChangeRecipe: (next: StyleRecipe) => void;
  fontOptions: FontOption[];
  onAddFontOption: (opt: FontOption) => void;
  onNotice: (msg: string) => void;
}

export const FontPanel: React.FC<FontPanelProps> = ({
  recipe,
  onChangeRecipe,
  fontOptions,
  onAddFontOption,
  onNotice,
}) => {
  const { t } = useLocale();
  const fontFileInputRef = useRef<HTMLInputElement | null>(null);

  const [googleFontInput, setGoogleFontInput] = useState('');
  const [isLoadingFont, setIsLoadingFont] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
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
        t('sidebar.fontLoadedFromFile', { family: opt.family, file: file.name })
      );
    } catch (err) {
      setFontError(
        err instanceof Error ? err.message : t('sidebar.fontLoadFileFailed')
      );
    } finally {
      setIsLoadingFont(false);
      e.target.value = '';
    }
  };

  const handleLoadGoogleFont = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleFontInput.trim()) {
      setFontError(t('sidebar.fontNameEmpty'));
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
      onNotice(t('sidebar.fontLoadedGoogle', { family: opt.family }));
    } catch (err) {
      setFontError(
        err instanceof Error ? err.message : t('sidebar.fontLoadGoogleFailed')
      );
    } finally {
      setIsLoadingFont(false);
    }
  };
  return (
    <>
      {/* 1. Dynamic Font Engine (Built-in + Upload .TTF/.OTF/.WOFF + Google Fonts) */}
      <section className="border border-slate-800 bg-[#151F32] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm font-bold text-slate-100">
              {t('sidebar.fontSection')}
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
            {t('sidebar.fontActiveLabel')}
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
            aria-label={t('sidebar.fontUploadAria')}
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
                ? t('sidebar.fontLoading')
                : t('sidebar.fontUpload')}
            </span>
          </button>
        </div>

        {/* On-Demand Google Font Loader */}
        <form onSubmit={handleLoadGoogleFont} className="space-y-1.5">
          <label
            htmlFor="google-font-input"
            className="block text-xs font-medium text-slate-400"
          >
            {t('sidebar.fontGoogleLabel')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="google-font-input"
              type="text"
              value={googleFontInput}
              onChange={(e) => setGoogleFontInput(e.target.value)}
              placeholder={t('sidebar.fontGooglePlaceholder')}
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoadingFont}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {t('sidebar.fontLoad')}
            </button>
          </div>
          {fontError && (
            <p role="alert" className="text-xs text-rose-400 pt-1">
              {fontError}
            </p>
          )}
        </form>
      </section>
    </>
  );
};
