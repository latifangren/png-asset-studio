import React, { useEffect, useState } from 'react';
import { useLocale } from '../i18n';
import {
  Bot,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Radio,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';

interface McpConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotice: (msg: string) => void;
}

interface McpInfoResponse {
  name: string;
  version: string;
  description: string;
  status: string;
  endpoints: {
    sse: string;
    messages: string;
    stdioCommand: string;
  };
  tools: Array<{
    name: string;
    description: string;
  }>;
  configSnippets: {
    cursor: object;
    claudeDesktopSse: object;
    claudeDesktopStdio: object;
    windsurf: object;
  };
}

export const McpConnectionModal: React.FC<McpConnectionModalProps> = ({
  isOpen,
  onClose,
  onNotice,
}) => {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<
    'cursor' | 'claude' | 'windsurf' | 'stdio' | 'tools'
  >('cursor');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mcpInfo, setMcpInfo] = useState<McpInfoResponse | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchInfo = async () => {
      try {
        const res = await fetch('/api/mcp/info');
        if (res.ok) {
          const data = await res.json();
          setMcpInfo(data);
        }
      } catch {
        // Fallback info if running static
      }
    };
    fetchInfo();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const sseUrl = `${currentHost}/sse`;
  const httpUrl = `${currentHost}/mcp`;

  const cursorSnippet = JSON.stringify(
    {
      mcpServers: {
        'png-asset-studio': {
          url: sseUrl,
        },
      },
    },
    null,
    2
  );

  const claudeDesktopSnippet = JSON.stringify(
    {
      mcpServers: {
        'png-asset-studio': {
          url: sseUrl,
        },
      },
    },
    null,
    2
  );

  const windsurfSnippet = JSON.stringify(
    {
      mcpServers: {
        'png-asset-studio': {
          serverUrl: sseUrl,
        },
      },
    },
    null,
    2
  );

  const stdioSnippet = `npx tsx mcp-stdio.ts`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onNotice(t('mcp.configCopied'));
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mcp-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#151F32] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="mcp-modal-title"
                  className="text-base font-bold text-slate-100"
                >
                  Integrasi MCP (Model Context Protocol)
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>SSE Online</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('mcp.connectText')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog MCP"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active Endpoint Info Card */}
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                MCP Server Endpoint:
              </span>
              <a
                href="/api/mcp/info"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>{t('mcp.viewManifest')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400">
              <span className="truncate">{sseUrl}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(sseUrl, 'endpoint')}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedKey === 'endpoint' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('mcp.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('mcp.copyUrl')}</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400">
              <span className="truncate">{httpUrl} (Streamable HTTP)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(httpUrl, 'endpoint-http')}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedKey === 'endpoint-http' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('mcp.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('mcp.copyUrl')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Client Selection Tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto">
              {(
                [
                  { id: 'cursor', label: 'Cursor IDE' },
                  { id: 'claude', label: 'Claude Desktop' },
                  { id: 'windsurf', label: 'Windsurf' },
                  { id: 'stdio', label: 'Terminal / Stdio' },
                  { id: 'tools', label: 'Daftar Tools MCP (7)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white bg-slate-900/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Cursor */}
            {activeTab === 'cursor' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Buka pengaturan <strong>Cursor &gt; Features &gt; MCP Servers</strong> (atau tambahkan ke file <code className="text-amber-300">.cursor/mcp.json</code> di proyek Anda):
                </p>
                <div className="relative">
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-amber-200 overflow-x-auto">
                    {cursorSnippet}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cursorSnippet, 'cursor')}
                    className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    {copiedKey === 'cursor' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('mcp.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('mcp.copyJson')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Claude Desktop */}
            {activeTab === 'claude' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Buka file <code className="text-amber-300">claude_desktop_config.json</code> di komputer Anda dan tambahkan konfigurasi MCP server berikut:
                </p>
                <div className="relative">
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-amber-200 overflow-x-auto">
                    {claudeDesktopSnippet}
                  </pre>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(claudeDesktopSnippet, 'claude')
                    }
                    className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    {copiedKey === 'claude' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('mcp.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('mcp.copyJson')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Windsurf */}
            {activeTab === 'windsurf' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tambahkan ke <code className="text-amber-300">~/.codeium/windsurf/mcp_config.json</code>:
                </p>
                <div className="relative">
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-amber-200 overflow-x-auto">
                    {windsurfSnippet}
                  </pre>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(windsurfSnippet, 'windsurf')
                    }
                    className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    {copiedKey === 'windsurf' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('mcp.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('mcp.copyJson')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 4: Stdio CLI */}
            {activeTab === 'stdio' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Untuk agent lokal yang menggunakan standard input/output (stdio transport), jalankan perintah:
                </p>
                <div className="relative">
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                    {stdioSnippet}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(stdioSnippet, 'stdio')}
                    className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    {copiedKey === 'stdio' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('mcp.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('mcp.copyCommand')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 5: Available Tools List */}
            {activeTab === 'tools' && (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-300">
                  Tool yang diekspos server MCP untuk dipanggil oleh coding agent Anda:
                </p>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  {(
                    mcpInfo?.tools || [
                      {
                        name: 'list_presets',
                        description:
                          'Daftar preset material (Stone, Gold, ABOUT 3D, Wood, Ice, Metal)',
                      },
                      {
                        name: 'get_preset_recipe',
                        description:
                          'Ambil detail parameter shader & palet warna preset',
                      },
                      {
                        name: 'calculate_word_dimensions',
                        description:
                          'Hitung lebar x tinggi kanvas piksel (standar 96px HD)',
                      },
                      {
                        name: 'generate_game_word_specs',
                        description:
                          'Generate metadata tombol dan path file target in-game',
                      },
                      {
                        name: 'list_available_fonts',
                        description:
                          'Daftar font game bawaan, Google Fonts, dan format upload',
                      },
                      {
                        name: 'generate_bmfont_fnt_manifest',
                        description:
                          'Generate file .fnt AngelCode BMFont untuk Unity/Godot',
                      },
                      {
                        name: 'generate_batch_queue_config',
                        description:
                          'Generate antrean batch kata multi-bahasa (EN & ID)',
                      },
                    ]
                  ).map((tool) => (
                    <div key={tool.name} className="p-3 flex items-start gap-3">
                      <Wrench className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-mono text-xs font-bold text-slate-100">
                          {tool.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prompt Examples for Agents */}
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Code2 className="w-4 h-4" />
              <span>{t('mcp.promptLabel')}</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                &ldquo;Tolong konek ke MCP {t('mcp.promptStudio')}, lalu buatkan daftar tombol game untuk menu utama: <code>PLAY</code>, <code>SETTINGS</code>, <code>INVENTORY</code>, dan <code>QUIT</code> menggunakan preset <strong>Grey Stone (EN)</strong>.&rdquo;
              </li>
              <li>
                &ldquo;Generate pasangan tombol multi-bahasa EN/ID (misalnya <code>SETTINGS</code> / <code>PENGATURAN</code>) pada resolusi terkunci <strong>96px HD</strong> dan berikan path penyimpanan file yang benar.&rdquo;
              </li>
              <li>
                &ldquo;Buatkan file deskriptor BMFont <code>.fnt</code> untuk karakter <code>A-Z</code> dan <code>0-9</code> menggunakan font <strong>Titan One</strong>.&rdquo;
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>{t('mcp.serverReady')}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
