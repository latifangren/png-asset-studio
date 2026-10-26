import React from 'react';
import { Grid, Layers, Search } from 'lucide-react';
import { GlyphDefinition, StoneStyleConfig } from '../utils/glyphCatalog';
import { GlyphCard, PreviewBgMode } from './GlyphCard';
import { ReferenceComparisonPanel } from './ReferenceComparisonPanel';

interface ClassicCatalogProps {
  categoryFilter: 'all' | 'letter' | 'number' | 'reference';
  onCategoryFilter: (id: 'all' | 'letter' | 'number' | 'reference') => void;
  searchQuery: string;
  onSearchQuery: (q: string) => void;
  classicStyleConfig: StoneStyleConfig;
  onClassicStyleConfig: (cfg: StoneStyleConfig) => void;
  filteredLetters: GlyphDefinition[];
  filteredNumbers: GlyphDefinition[];
  glyphUrls: Record<string, string>;
  bgMode: PreviewBgMode;
  onDownloadClassicGlyph: (glyph: GlyphDefinition, customSize?: number) => void;
  onInspectGlyph: (glyph: GlyphDefinition) => void;
  onDownloadClassicSpriteSheet: () => void;
}

export const ClassicCatalog: React.FC<ClassicCatalogProps> = ({
  categoryFilter,
  onCategoryFilter,
  searchQuery,
  onSearchQuery,
  classicStyleConfig,
  onClassicStyleConfig,
  filteredLetters,
  filteredNumbers,
  glyphUrls,
  bgMode,
  onDownloadClassicGlyph,
  onInspectGlyph,
  onDownloadClassicSpriteSheet,
}) => {
  return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 p-3.5 rounded-xl bg-[#151F32] border border-slate-800 items-center">
              <div className="xl:col-span-5 flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800/80 overflow-x-auto">
                {(
                  [
                    { id: 'all', label: 'Semua (36)' },
                    { id: 'letter', label: 'Huruf A–Z (26)' },
                    { id: 'number', label: 'Angka 1–9 & 0 (10)' },
                    { id: 'reference', label: 'Referensi ABOUT (5)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onCategoryFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      categoryFilter === tab.id
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="xl:col-span-3 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Cari karakter huruf atau angka"
                  value={searchQuery}
                  onChange={(e) => onSearchQuery(e.target.value)}
                  placeholder="Cari karakter (mis. A, Q, 9, 0)..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 focus:outline-none rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="xl:col-span-2 flex items-center justify-between gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <label
                  htmlFor="select-classic-size"
                  className="text-xs text-slate-400 whitespace-nowrap"
                >
                  Ukuran PNG:
                </label>
                <select
                  id="select-classic-size"
                  value={classicStyleConfig.size}
                  onChange={(e) =>
                    onClassicStyleConfig({
                      ...classicStyleConfig,
                      size: Number(e.target.value),
                    })
                  }
                  className="bg-transparent text-xs font-mono font-semibold text-amber-300 focus:outline-none cursor-pointer"
                >
                  <option value={256} className="bg-slate-900 text-slate-100">
                    256×256 px
                  </option>
                  <option value={512} className="bg-slate-900 text-slate-100">
                    512×512 px
                  </option>
                  <option value={1024} className="bg-slate-900 text-slate-100">
                    1024×1024 px
                  </option>
                </select>
              </div>

              <div className="xl:col-span-2 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onDownloadClassicSpriteSheet}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer whitespace-nowrap"
                >
                  <Grid className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sprite Sheet</span>
                </button>
              </div>
            </div>

            {filteredLetters.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h2 className="text-base font-bold text-slate-100">
                      Huruf Alfabet A – Z ({filteredLetters.length} File PNG Transparan)
                    </h2>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    A.png s/d Z.png · {classicStyleConfig.size}×{classicStyleConfig.size}px
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {filteredLetters.map((glyph) => (
                    <GlyphCard
                      key={glyph.id}
                      glyph={glyph}
                      dataUrl={glyphUrls[glyph.char]}
                      exportSize={classicStyleConfig.size}
                      bgMode={bgMode}
                      onDownloadGlyph={onDownloadClassicGlyph}
                      onInspectGlyph={onInspectGlyph}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredNumbers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h2 className="text-base font-bold text-slate-100">
                      Angka Numerik 1 – 9 dan 0 ({filteredNumbers.length} File PNG Transparan)
                    </h2>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    1.png s/d 9.png & 0.png · {classicStyleConfig.size}×{classicStyleConfig.size}px
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                  {filteredNumbers.map((glyph) => (
                    <GlyphCard
                      key={glyph.id}
                      glyph={glyph}
                      dataUrl={glyphUrls[glyph.char]}
                      exportSize={classicStyleConfig.size}
                      bgMode={bgMode}
                      onDownloadGlyph={onDownloadClassicGlyph}
                      onInspectGlyph={onInspectGlyph}
                    />
                  ))}
                </div>
              </div>
            )}

            <ReferenceComparisonPanel
              styleConfig={classicStyleConfig}
              bgMode={bgMode}
              glyphUrls={glyphUrls}
              onDownloadGlyph={onDownloadClassicGlyph}
              onInspectGlyph={onInspectGlyph}
            />
          </div>
  );
};
