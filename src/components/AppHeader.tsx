import React from 'react';
import { Bot } from 'lucide-react';
import { useLocale } from '../i18n';

export type WorkspaceId = 'word-batch' | 'custom-charset' | 'classic-about';

interface AppHeaderProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (id: WorkspaceId) => void;
  onOpenMcp: () => void;
  onDownloadBundle: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  onOpenMcp,
  onDownloadBundle,
}) => {
  const { locale, setLocale, t } = useLocale();
  return (
    <>
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0F172A]/95 backdrop-blur-xs border-b border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectWorkspace('word-batch');
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
              onSelectWorkspace('word-batch');
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
              onSelectWorkspace('custom-charset');
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
              onSelectWorkspace('classic-about');
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
            onClick={onOpenMcp}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-300 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
            title={t('actions.mcpTitle')}
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('actions.mcpAgent')}</span>
          </button>
          <button
            type="button"
            onClick={onDownloadBundle}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {activeWorkspace === 'classic-about'
              ? t('actions.downloadClassic')
              : t('actions.downloadBatch')}
          </button>
        </div>
      </header>
    </>
  );
};
