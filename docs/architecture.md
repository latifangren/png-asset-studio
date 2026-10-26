# Architecture

## Prinsip

1. Data di `src/data/`, logika di `src/core/` + `src/utils/`, tampilan
   di `src/components/`. File yang berisi preset + angka warna + string UI
   sekaligus adalah campur aduk — pecah.
2. `src/core/` tidak boleh berisi logika khusus satu game/produk.
   ID preset (`grey-stone`, `about-stone`, …) boleh muncul di
   `src/core/recipe.ts` karena itu daftar data, bukan perilaku —
   perilaku render tidak boleh bercabang berdasarkan ID preset.
3. Satu file ≤ 1000 baris (hardlimit), target ≤ 600. Dijaga oleh
   `scripts/check-lines.mjs` di CI, bukan oleh niat baik.
4. Satu mesin render adalah tujuan akhir. Hari ini masih ada dua
   (klasik + universal) — lihat README § "Yang sengaja BELUM diubah".
   Efek baru = fungsi di pipeline universal + field opsional di
   `StyleRecipe`, bukan renderer baru.

## Pipeline render (universal, tidak diubah di scaffold ini)

```
Font & metrics → drop shadow → 3D extrusion stack → outer rim &
contour stroke → fill gradient & 3D bevel shading →
procedural surface overlay (pores, cracks, top highlight)
```

Semua parameter pipeline adalah satu objek `StyleRecipe` (lihat
`src/core/types.ts`). Preset adalah `StyleRecipe` yang disimpan sebagai
JSON, bukan sebagai kode.

## Preset: base + override

`src/data/presets/base.json` hari ini hanya berisi 6 field yang benar-benar
identik di semua preset asli:

```json
{
  "shadingMode": "hybrid-3d-bevel",
  "uppercaseOnly": true,
  "fixedHeightPx": 96,
  "autoTrimWidth": true,
  "paddingXFactor": 3,
  "baselineRatio": 0.74
}
```

Sisanya (font, gradien, stroke, extrusion, pori, retak, highlight) beda
per preset dan tinggal di file `<id>.json` masing-masing. Ini hasil
perhitungan, bukan tebakan: field masuk base hanya kalau nilainya sama
di 6/6 preset. Kalau preset baru nanti punya `fixedHeightPx` berbeda,
field itu pindah dari base ke override — dan itu benar, bukan regresi.

## i18n

- `src/i18n/en.ts` adalah sumber bentuk kamus (`Dictionary`).
- `src/i18n/id.ts: Dictionary` — key hilang = error `tsc`.
- `LocaleProvider` di `src/i18n/index.tsx`: deteksi dari localStorage
  dulu, lalu `navigator.language` (`id*` → id, sisanya en).
- Status migrasi: header/hero/tab/tombol utama sudah lewat `t()`.
  Backlog: sidebar, workspace, modal, pesan error `fontLoader`,
  deskripsi tool MCP. Kamus `sidebar.*`/`workspace.*` sudah ada di
  `en.ts`/`id.ts` untuk migrasi itu.

## Perbaikan tipe (bukan perubahan render)

Di toolchain saat ini (TypeScript 7.0.2) `tsc --noEmit` asli gagal di
8 tempat: 7× `new Blob([zipBytes])` (tipe `Uint8Array` baru lebih ketat)
dan 1× `PORT` (`string | 3000`). Diperbaiki dengan cast tipe saja
(`zipBytes as BlobPart`, `Number(process.env.PORT)`) — runtime tidak
berubah, dan `npm install` asli juga gagal tanpa `--legacy-peer-deps`
(konflik peer esbuild Vite 8 vs esbuild 0.25 di package.json asli;
lihat README). Kedua hal ini dicatat di sini supaya tidak dikira
regresi scaffold.

## Hash file render (verbatim dari zip asli, 2026-10-27)

```
81a46c37f969bba9cc9f358948a0787a9f99752d7aab872081b4d3a61ddf6daa  src/utils/stoneRenderer.ts
e7c80b28fc0cb4296a25303d3c6ac037d5e1310be2405327d8886e9bf7336c85  src/utils/universalRenderer.ts
3abc9812fdaf1a5b81e4fe554a30c33764ce43261eb0495d9bf5300431e964b8  src/utils/stoneMath.ts
cdb6cfd9c34b917bd1138ff76d342ae201e75df7ef7f5b3a8b872c754ccad4b5  src/utils/glyphCatalog.ts
d6c0b57272ef40e522ae25c44cd10e73b8f5de91e974a188018b8ae71cae2229  src/utils/fontLoader.ts  (catatan: file ini BERUBAH di scaffold — hanya INITIAL_FONT_OPTIONS yang pindah ke JSON, fungsi-fungsinya verbatim)
438a381b684e3359c6235942e0e8d6257cd2ac6eae2192451cd625d9a4f20c21  src/utils/zipBuilder.ts
```

Catatan jujur: hash `fontLoader.ts` di atas adalah hash asli sebelum
scaffold. Setelah scaffold, hash-nya berubah karena literal font pindah
ke `src/data/fonts.json` — isinya diverifikasi sama (7 font), fungsinya
tidak disentuh. File render lainnya hash-nya tetap sama; verifikasi
ulang ada di langkah verifikasi scaffold.

## Langkah berikut (berurutan, bukan sekaligus)

1. Migrasi i18n sidebar/workspace/modal (kamus sudah siap).
2. Pecah `StyleAndFontSidebar.tsx` (811) jadi FontPanel + PresetPanel +
   ShaderPanel; pecah `App.tsx` (727) dengan context per domain.
3. Satukan mesin render (ABOUT → preset + efek) + golden test PNG.
4. Pecah `server.ts` → `server/mcp.ts` + `server/web.ts`.
5. Keputusan brand / Gemini / komponen yatim (lihat README).
