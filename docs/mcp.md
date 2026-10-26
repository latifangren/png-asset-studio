# MCP — konek ke coding agent (Claude Code, VS Code, Cursor, dll)

MCP di proyek ini **tidak dibuang** — ini jalur resmi coding agent untuk
memakai preset, font, dan generator aset tanpa membuka UI. Ada 3 transport,
pilih yang cocok dengan klienmu. Semuanya memakai tool yang sama
(7 tool, lihat `src/mcp/createMcpServer.ts`).

## 1. Stdio (paling gampang, tanpa server) — direkomendasikan

Cocok untuk: **Claude Code, VS Code, Cursor, Claude Desktop, Windsurf**
yang berjalan di mesin yang sama dengan repo ini.

Syarat: `npm install` dulu di folder repo ini.

```bash
npx tsx mcp-stdio.ts
```

Konfigurasi sudah ikut ter-commit di repo ini, jadi biasanya tinggal buka
folder repo di klienmu:

- **Claude Code:** file `.mcp.json` di root repo (stdio). Jalankan
  `claude` dari folder repo, lalu `/mcp` untuk cek server
  `png-asset-studio` terdaftar.
- **VS Code:** file `.vscode/mcp.json` di repo (server `png-asset-studio`
  stdio + `png-asset-studio-http` sebagai alternatif). Buka Command
  Palette → `MCP: List Servers` → Start.
- **Claude Desktop:** tambahkan ke `claude_desktop_config.json`:
  ```json
  { "mcpServers": { "png-asset-studio": {
    "command": "npx", "args": ["tsx", "mcp-stdio.ts"]
  } } }
  ```
  Jalankan dari folder repo (field `cwd` bisa ditambahkan ke path repo).

## 2. Streamable HTTP (server jalan) — untuk klien jarak jauh / modern

Cocok untuk: **VS Code, Cursor** versi baru, dan agent lain yang hanya
mendukung HTTP.

```bash
npm run dev   # server di http://localhost:3000
```

Endpoint: `POST http://localhost:3000/mcp` (JSON-RPC Streamable HTTP,
stateless — tidak perlu session ID manual).

Contoh VS Code (`.vscode/mcp.json` sudah berisi ini sebagai server kedua):

```json
{ "servers": { "png-asset-studio-http": {
  "type": "http", "url": "http://localhost:3000/mcp"
} } }
```

## 3. SSE legacy (klien lama saja)

Endpoint lama `GET /sse` + `POST /messages` masih dipertahankan untuk
klien yang belum mendukung Streamable HTTP. Untuk klien baru, pakai
stdio atau `/mcp` di atas. Modal MCP di UI masih menampilkan endpoint
SSE — itu sengaja belum diubah supaya klien lama tidak rusak; dokumentasi
di sini adalah sumber kebenaran untuk transport baru.

## Info & cek cepat

- `GET /api/mcp/info` — daftar endpoint, 7 tool, dan snippet config
  untuk Claude Code, VS Code, Cursor, Claude Desktop, dan Windsurf.
- Tes stdio manual:
  ```bash
  printf '%s\n' \
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
    '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
    '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
    | npx tsx mcp-stdio.ts
  ```
  Harus mengembalikan 7 tool (`list_presets`, `get_preset_recipe`,
  `calculate_word_dimensions`, `generate_game_word_specs`,
  `list_available_fonts`, `generate_bmfont_fnt_manifest`,
  `generate_batch_queue_config`).

## Troubleshooting

- `npx tsx mcp-stdio.ts` gagal / `tsx: not found` → jalankan
  `npm install` dulu di folder repo.
- HTTP `/mcp` 405 → kamu mengirim GET. Endpoint ini hanya POST JSON-RPC.
- HTTP `/mcp` tidak bisa dijangkau → pastikan `npm run dev` jalan dan
  port-nya 3000 (atau `PORT` yang kamu set di environment).
- Tool mengembalikan preset lama → preset dibaca dari
  `src/data/presets/*.json` lewat `src/core/recipe.ts`; ubah JSON-nya,
  restart server/agent, bukan mengedit `src/mcp/`.
