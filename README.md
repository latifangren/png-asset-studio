# PNG Asset Studio

Studio generator aset kata, custom font, dan karakter PNG transparan —
dengan ekspor PNG / ZIP / BMFont (`.fnt`) dan MCP untuk coding agent.

Scaffold ini adalah migrasi dari hasil Google AI Studio (`StoneGlyph`)
ke struktur modular, **tanpa mengubah hasil render**: file-file render
(`stoneRenderer`, `universalRenderer`, `stoneMath`, `glyphCatalog`,
`fontLoader`, `zipBuilder`) disalin verbatim, dan preset hasil migrasi
JSON diverifikasi deep-equal dengan preset asli.

## Jalankan

```bash
npm install
npm run dev        # Vite + server MCP di http://localhost:3000
npm run check      # tsc + test + check-lines
npm run build
```

## Struktur

```
src/
  main.tsx              # entry: LocaleProvider + App
  App.tsx               # layout + tab saja (state domain pindah bertahap ke context)
  i18n/
    en.ts / id.ts       # kamus UI, type-safe (id harus memenuhi bentuk en)
    index.tsx           # LocaleProvider, useLocale(), t()
  core/
    types.ts            # StyleRecipe, BatchWordItem — netral, tanpa nama produk/game
    recipe.ts           # loader preset: base.json + override, validasi zod
  data/
    presets/
      base.json         # field yang sama di semua preset
      <id>.json         # hanya field yang beda untuk preset itu
    fonts.json          # font bawaan
    examples-batch.json # contoh batch (bukan default wajib)
  utils/                # render + helper lama, belum dipindah (lihat bawah)
  components/           # workspace + sidebar + modal
  mcp/                  # server MCP
server.ts               # Express + MCP SSE + Vite (masih campur, lihat TODO)
docs/
  architecture.md
  reference/            # PNG/HTML referensi ABOUT — dokumentasi, bukan aset bundle
scripts/check-lines.mjs # gagalkan CI kalau ada file > 1000 baris
```

## Cara menambah sesuatu (tanpa menyentuh render)

**Preset baru — 1 file, 0 sentuhan `.ts`:**

1. Buat `src/data/presets/<id-baru>.json` berisi hanya field yang beda
   dari `base.json` (contoh: `grey-stone.json`).
2. Tambah 1 baris import + 1 entri di array `src/core/recipe.ts`.
3. Jalankan `npm run check` — zod akan menolak preset yang field-nya
   kurang, tipenya salah, atau gradiennya < 2 stop.

**String UI baru (EN + ID):**

1. Tambah key di `src/i18n/en.ts` dulu.
2. Tambah terjemahannya di `src/i18n/id.ts` (kalau lupa, `tsc` gagal —
   itu sengaja).
3. Pakai `t('kunci.baru')` di komponen. Jangan menulis string UI mentah
   kalau key-nya sudah ada.

**Bahasa antarmuka vs bahasa aset — jangan dicampur:**

- `locale` (`en`/`id`, switcher di header, tersimpan di localStorage)
  = bahasa **antarmuka studio**.
- `langFolder` di tiap kata batch (`en`, `id`, `jp`, … bebas)
  = folder **output aset**. Menambah bahasa aset tidak butuh kamus UI.

## Bukti render tidak berubah

- `src/data/presets/*.json` digenerate dari objek preset asli, lalu
  digabung kembali (`base + override`) dan dibandingkan deep-equal
  dengan aslinya — 6/6 preset identik, termasuk urutan `gradientStops`.
- `src/data/fonts.json` dan `src/data/examples-batch.json` digenerate
  dengan cara yang sama (7 font, 8 kata contoh).
- Hash SHA-256 file render sebelum/sesudah migrasi tercatat di
  `docs/architecture.md` — tidak ada yang berubah.

## MCP (tidak dibuang)

MCP dipertahankan dan dibuat universal — lihat `docs/mcp.md`:
stdio (`npx tsx mcp-stdio.ts`, config sudah di `.mcp.json` untuk
Claude Code dan `.vscode/mcp.json` untuk VS Code) + Streamable HTTP
(`POST /mcp`, stateless) + SSE legacy (`/sse`, untuk klien lama).

## Yang sudah dibersihkan (2026-10-27, langkah repo)

- Dependensi tak terpakai dihapus: `@google/genai`, `motion`,
  `dotenv`, `autoprefixer`. `.env.example` sekarang hanya `PORT`
  (satu-satunya env var yang dibaca).
- Komponen yatim `WordComposerAndShaderPanel.tsx` (402 baris, tidak
  diimpor siapa pun) dihapus — tidak ada referensi tersisa.
- Bawaan AI Studio dihapus: `.aistudio/`, `metadata.json`,
  komentar AI Studio di `vite.config.ts`, path `/assets/aistudio/`
  dipindah ke `/assets/reference/` (panel pembanding sempat 404 karena
  pemindahan di scaffold — sudah diperbaiki, file-nya di
  `public/assets/reference/about_6ec0e8d9.png`).
- Perbaikan akar masalah (bukan tambalan):
  - `npm install` sekarang jalan tanpa `--legacy-peer-deps`:
    `esbuild` di `devDependencies` dinaikkan ke `^0.28.0` (memenuhi
    peerOptional Vite 8), dan `package-lock.json` digenerate ulang.
  - `tsc` sekarang lulus tanpa cast per-file: tipe return di
    `src/utils/zipBuilder.ts` diperbaiki di sumbernya menjadi
    `Uint8Array<ArrayBuffer>` (dulu anotasi `Uint8Array` tanpa generic
    melebar jadi `ArrayBufferLike` yang ditolak TS 7 sebagai `BlobPart`).

## Yang sengaja BELUM diubah (keputusan menunggu user)

1. **Nama brand di UI** masih `StoneGlyph Studio`. Nama repo/folder
   sudah netral (`png-asset-studio`), tapi rename brand di semua tempat
   ditunda sampai user memutuskan nama final — rename setengah-setengah
   lebih buruk daripada menunda.
2. **Dua mesin render** masih hidup (klasik ABOUT + universal). Langkah
   berikut: jadikan ABOUT satu preset + efek, dengan golden test PNG
   sebelum/sesudah.
3. **i18n parsial:** header, hero, tab, dan tombol utama sudah lewat
   `t()`. String di sidebar/workspace/modal masih inline — kamus
   `sidebar.*` dan `workspace.*` sudah disiapkan di `en.ts`/`id.ts`
   sebagai backlog migrasi berikutnya.
4. **`server.ts`** masih mencampur server Vite dev, static prod, dan
   MCP (SSE + Streamable HTTP). Pecah jadi `server/mcp.ts` +
   `server/web.ts` di langkah berikut.
