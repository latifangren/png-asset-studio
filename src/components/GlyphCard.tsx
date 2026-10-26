import React from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { GlyphDefinition } from '../utils/glyphCatalog';

export type PreviewBgMode = 'checker-dark' | 'solid-dark' | 'game-wood' | 'checker-light';

interface GlyphCardProps {
  glyph: GlyphDefinition;
  dataUrl: string | undefined;
  exportSize: number;
  bgMode: PreviewBgMode;
  onDownloadGlyph: (glyph: GlyphDefinition) => void;
  onInspectGlyph: (glyph: GlyphDefinition) => void;
}

export function getPreviewBgClass(bgMode: PreviewBgMode): string {
  switch (bgMode) {
    case 'checker-dark':
      return 'bg-checkerboard-dark';
    case 'solid-dark':
      return 'bg-[#090D16]';
    case 'game-wood':
      return 'bg-[#2C1E14]';
    case 'checker-light':
      return 'bg-checkerboard-light';
  }
}

export const GlyphCard: React.FC<GlyphCardProps> = ({
  glyph,
  dataUrl,
  exportSize,
  bgMode,
  onDownloadGlyph,
  onInspectGlyph,
}) => {
  const bgClass = getPreviewBgClass(bgMode);

  return (
    <article
      className="group flex flex-col border border-slate-800 bg-[#151F32] rounded-xl overflow-hidden transition-colors hover:border-slate-700"
      data-testid={`glyph-card-${glyph.char}`}
    >
      {/* Top Preview Canvas Slot */}
      <div
        className={`relative aspect-square w-full flex items-center justify-center p-3 ${bgClass} border-b border-slate-800/80`}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`Aset PNG transparan ${glyph.name} (${glyph.filename})`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain select-none transition-transform duration-150 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-slate-800/60 flex items-center justify-center font-mono text-xl font-bold text-slate-400">
            {glyph.char}
          </div>
        )}

        <button
          type="button"
          onClick={() => onInspectGlyph(glyph)}
          aria-label={`Perbesar dan periksa detail ${glyph.name}`}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-700/70 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Unboxed Metadata & Action Controls */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100 whitespace-nowrap">
            {glyph.name}
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap">
            #{String(glyph.index).padStart(2, '0')}
          </span>
        </div>

        {/* Zero-pill unboxed metadata with typographic separators */}
        <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap overflow-hidden">
          <span className="text-amber-300/90 font-medium">{glyph.filename}</span>
          <span aria-hidden="true">·</span>
          <span>
            {exportSize}×{exportSize}px
          </span>
          <span aria-hidden="true">·</span>
          <span>RGBA</span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onDownloadGlyph(glyph)}
            aria-label={`Unduh file PNG transparan ${glyph.filename}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Unduh {glyph.filename}</span>
          </button>
          <button
            type="button"
            onClick={() => onInspectGlyph(glyph)}
            className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Detail
          </button>
        </div>
      </div>
    </article>
  );
};
