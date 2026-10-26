import React, { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import {
  GlyphDefinition,
  StoneStyleConfig,
  getGlyphByChar,
} from '../utils/glyphCatalog';
import { renderStoneWordToCanvas } from '../utils/stoneRenderer';
import { PreviewBgMode, getPreviewBgClass } from './GlyphCard';

interface ReferenceComparisonPanelProps {
  styleConfig: StoneStyleConfig;
  bgMode: PreviewBgMode;
  glyphUrls: Record<string, string>;
  onDownloadGlyph: (glyph: GlyphDefinition) => void;
  onInspectGlyph: (glyph: GlyphDefinition) => void;
}

const REFERENCE_PALETTE = [
  {
    name: 'Highlight Puncak Bevel',
    hex: '#FCF5E8',
    desc: 'Pantulan cahaya utama kiri-atas',
  },
  {
    name: 'Permukaan Batu Utama',
    hex: '#DCCBB2',
    desc: 'Warna dasar batu kapur / tulang hangat',
  },
  {
    name: 'Bayangan Bevel Bawah',
    hex: '#8C785E',
    desc: 'Gradasi lengkung kanan-bawah 3D',
  },
  {
    name: 'Rongga Kawah / Pori',
    hex: '#685640',
    desc: 'Cekungan pori batu dengan rim terang',
  },
  {
    name: 'Outline Casing Hitam',
    hex: '#08050A',
    desc: 'Garis tepi tebal dengan ekstrusi bawah',
  },
  {
    name: 'Rim Luar Ungu Gelap',
    hex: '#3A0947',
    desc: 'Halo halus 1.5px di tepi terluar outline',
  },
];

export const ReferenceComparisonPanel: React.FC<
  ReferenceComparisonPanelProps
> = ({
  styleConfig,
  bgMode,
  glyphUrls,
  onDownloadGlyph,
  onInspectGlyph,
}) => {
  const aboutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgClass = getPreviewBgClass(bgMode);

  useEffect(() => {
    if (!aboutCanvasRef.current) return;
    renderStoneWordToCanvas('ABOUT', aboutCanvasRef.current, styleConfig, 210);
  }, [styleConfig]);

  const handleDownloadGeneratedAbout = () => {
    if (!aboutCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'ABOUT_generated_transparent.png';
    link.href = aboutCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const refChars = ['A', 'B', 'O', 'U', 'T']
    .map((c) => getGlyphByChar(c))
    .filter((g): g is GlyphDefinition => Boolean(g));

  return (
    <section
      id="reference"
      className="border border-slate-800 bg-[#151F32] rounded-2xl p-6 space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <p className="text-xs font-mono text-amber-400">
            02. Kalibrasi Visual Terhadap Aset Referensi
          </p>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Perbandingan Langsung dengan Referensi &ldquo;ABOUT&rdquo;
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Setiap huruf A–Z dan angka 1–9, 0 dirender menggunakan transformasi jarak Euclidean 2D, pemetaan normal ketinggian (heightmap normal shading), pori kawah cekung, retakan pahat berbentuk V, serta outline hitam pekat dengan tepi ungu gelap transparan yang disampel langsung dari gambar referensi Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadGeneratedAbout}
          className="flex items-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Unduh Kata &ldquo;ABOUT&rdquo; (.PNG)</span>
        </button>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Original Uploaded Asset */}
        <div className="flex flex-col justify-between border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Aset Referensi Asli Anda (ABOUT)
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              /assets/reference/about_6ec0e8d9.png
            </span>
          </div>
          <div
            className={`flex-1 min-h-[160px] flex items-center justify-center p-6 ${bgClass}`}
          >
            <img
              src="/assets/reference/about_6ec0e8d9.png"
              alt="Referensi asli tulisan ABOUT bergaya batu pahat"
              referrerPolicy="no-referrer"
              className="max-h-28 w-auto object-contain select-none"
            />
          </div>
        </div>

        {/* Live Procedural Output for ABOUT */}
        <div className="flex flex-col justify-between border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Hasil Render Engine Procedural (A-B-O-U-T)
            </span>
            <span className="text-xs font-mono tabular-nums text-emerald-400">
              RGBA Transparan · 100% Vektor/Shader
            </span>
          </div>
          <div
            className={`flex-1 min-h-[160px] flex items-center justify-center p-6 ${bgClass}`}
          >
            <canvas
              ref={aboutCanvasRef}
              data-testid="reference-about-canvas"
              className="max-h-32 w-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* 5 Individual Extracted Reference Letters (A, B, O, U, T) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300">
            5 Huruf Pembentuk &ldquo;ABOUT&rdquo; Terpisah Satu Persatu (Siap Pakai):
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            Klik kartu untuk unduh PNG transparan masing-masing
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {refChars.map((g) => (
            <div
              key={g.id}
              className="border border-slate-800 rounded-xl bg-slate-900/60 p-3 flex flex-col items-center gap-2"
            >
              <button
                type="button"
                onClick={() => onInspectGlyph(g)}
                aria-label={`Inspeksi huruf referensi ${g.char}`}
                className={`w-full aspect-square rounded-lg border border-slate-800/80 flex items-center justify-center p-2 ${bgClass} cursor-pointer hover:border-slate-700 transition-colors`}
              >
                {glyphUrls[g.char] ? (
                  <img
                    src={glyphUrls[g.char]}
                    alt={`Huruf referensi ${g.char} PNG transparan`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="font-mono text-lg font-bold text-slate-400">
                    {g.char}
                  </span>
                )}
              </button>
              <div className="w-full flex items-center justify-between text-xs font-mono tabular-nums px-0.5">
                <span className="text-slate-200 font-semibold">{g.filename}</span>
                <button
                  type="button"
                  onClick={() => onDownloadGlyph(g)}
                  className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                >
                  Unduh
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sampled Stone Color Anatomy */}
      <div className="pt-2 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-300 mb-3">
          Anatomi Palet Warna & Lapisan Material yang Disampel dari Referensi:
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {REFERENCE_PALETTE.map((swatch) => (
            <div
              key={swatch.hex}
              className="border border-slate-800/90 rounded-lg p-2.5 bg-slate-900/40 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded border border-white/20 shrink-0"
                  style={{ backgroundColor: swatch.hex }}
                />
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-200">
                  {swatch.hex}
                </span>
              </div>
              <div className="text-xs font-medium text-slate-300">
                {swatch.name}
              </div>
              <div className="text-[11px] text-slate-400 leading-snug">
                {swatch.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
