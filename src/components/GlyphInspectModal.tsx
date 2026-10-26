import React, { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n';
import { Check, Copy, Download, X } from 'lucide-react';
import { GlyphDefinition, StoneStyleConfig } from '../utils/glyphCatalog';
import { renderStoneGlyphToCanvas } from '../utils/stoneRenderer';
import { PreviewBgMode, getPreviewBgClass } from './GlyphCard';

interface GlyphInspectModalProps {
  glyph: GlyphDefinition | null;
  styleConfig: StoneStyleConfig;
  bgMode: PreviewBgMode;
  onBgModeChange: (mode: PreviewBgMode) => void;
  onClose: () => void;
  onDownloadGlyph: (glyph: GlyphDefinition, customSize?: number) => void;
}

export const GlyphInspectModal: React.FC<GlyphInspectModalProps> = ({
  glyph,
  styleConfig,
  bgMode,
  onBgModeChange,
  onClose,
  onDownloadGlyph,
}) => {
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!glyph || !canvasRef.current) return;
    renderStoneGlyphToCanvas(glyph, canvasRef.current, styleConfig, 512);
  }, [glyph, styleConfig]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (glyph) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [glyph, onClose]);

  if (!glyph) return null;

  const handleCopyPng = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current?.toBlob(resolve, 'image/png')
      );
      if (blob && navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: trigger download if clipboard write is blocked in iframe
      onDownloadGlyph(glyph, 512);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-glyph-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#151F32] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2
              id="modal-glyph-title"
              className="text-lg font-bold text-slate-100"
            >
              Inspeksi Aset: {glyph.name} ({glyph.filename})
            </h2>
            <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
              Format PNG RGBA Transparan · Pori Batu: {glyph.craters.length} titik · Retakan Pahat: {glyph.cracks.length} alur
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog inspeksi"
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
          {/* Left: High-res transparent PNG canvas */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div
              className={`aspect-square w-full rounded-xl border border-slate-800 flex items-center justify-center p-6 ${getPreviewBgClass(
                bgMode
              )}`}
            >
              <canvas
                ref={canvasRef}
                data-testid="inspect-glyph-canvas"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Background selector */}
            <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 px-2 whitespace-nowrap">
                Latar Uji:
              </span>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'checker-dark', label: 'Transparan Gelap' },
                    { id: 'checker-light', label: 'Transparan Terang' },
                    { id: 'solid-dark', label: 'Hitam UI' },
                    { id: 'game-wood', label: 'Papan Kayu' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onBgModeChange(item.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      bgMode === item.id
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Export Resolutions & Surface Specs */}
          <div className="md:col-span-5 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-300 mb-2">
                  Spesifikasi Tekstur & Geometri
                </h3>
                <dl className="divide-y divide-slate-800 border-y border-slate-800 text-xs font-mono tabular-nums">
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">{t('glyph.fileName')}</dt>
                    <dd className="text-amber-300 font-semibold">{glyph.filename}</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">{t('glyph.category')}</dt>
                    <dd className="text-slate-200">
                      {glyph.category === 'letter' ? 'Huruf (A–Z)' : 'Angka (1–9, 0)'}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">{t('glyph.alphaChannel')}</dt>
                    <dd className="text-emerald-400">{t('glyph.alphaValue')}</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">{t('glyph.bevelLight')}</dt>
                    <dd className="text-slate-200">Kiri-Atas (-0.53, -0.72)</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-slate-400">{t('glyph.outerOutline')}</dt>
                    <dd className="text-slate-200">#08050A + Rim #3A0947</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-300 mb-2">
                  Unduh Resolusi Spesifik (PNG Transparan)
                </h3>
                <div className="flex flex-col gap-2">
                  {[
                    { size: 256, desc: 'UI Standar / Icon Mobile' },
                    { size: 512, desc: 'UI HD / Header Dialog Game' },
                    { size: 1024, desc: 'Resolusi Ultra 4K / Banner Utama' },
                  ].map((opt) => (
                    <button
                      key={opt.size}
                      type="button"
                      onClick={() => onDownloadGlyph(glyph, opt.size)}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-700/80 bg-slate-900/70 hover:bg-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer text-left"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-100 font-mono tabular-nums">
                          {glyph.char}_{opt.size}px.png ({opt.size}×{opt.size})
                        </div>
                        <div className="text-[11px] text-slate-400">{opt.desc}</div>
                      </div>
                      <Download className="w-4 h-4 text-amber-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onDownloadGlyph(glyph, styleConfig.size)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{t('glyph.downloadFile', { file: glyph.filename })}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyPng}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('glyph.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('glyph.copyPng')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
