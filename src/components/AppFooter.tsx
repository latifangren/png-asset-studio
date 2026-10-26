import React from 'react';
import { StyleRecipe } from '../utils/styleRecipe';
import { useLocale } from '../i18n';

interface AppFooterProps {
  recipe: StyleRecipe;
}

export const AppFooter: React.FC<AppFooterProps> = ({ recipe }) => {
  const { t } = useLocale();
  return (
    <>
      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 mt-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>
            {t('app.footerTagline')}
          </span>
          <div className="flex items-center gap-4 font-mono tabular-nums">
            <span>{t('app.activeFont')} {recipe.fontFamily}</span>
            <span aria-hidden="true">·</span>
            <span>{t('app.preset')} {recipe.name}</span>
            <span aria-hidden="true">·</span>
            <span>{t('app.canvasHeight')} {recipe.fixedHeightPx}px</span>
          </div>
        </div>
      </footer>
    </>
  );
};
