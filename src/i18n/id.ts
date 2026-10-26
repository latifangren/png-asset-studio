import type { Dictionary } from './en';

/**
 * Indonesian UI dictionary. Must satisfy `Dictionary` (the shape of en.ts):
 * a missing or mistyped key fails `tsc`, it never ships as a blank label.
 */
export const id: Dictionary = {
  app: {
    name: 'StoneGlyph Studio',
    wordmark: 'StoneGlyph Studio',
    heroEyebrow: 'Universal 2D/3D Game UI Text, Button & Bitmap Font Generator',
    heroTitle: 'Studio Generator Aset Kata, Custom Font & Karakter PNG Transparan',
    heroDescription:
      'Mendukung upload custom font (.TTF/.OTF/.WOFF2), Google Fonts dinamis, preset material, editor gradien bebas, tinggi kanvas terkunci, serta ekspor .PNG / .ZIP / BMFont (.fnt).',
    language: 'Bahasa',
    languageEnglish: 'Inggris',
    languageIndonesian: 'Indonesia',
  },
  nav: {
    main: 'Navigasi Utama',
    wordBatch: 'Generator Kata & Batch',
    charset: 'Custom Charset & BMFont',
    classic: 'Katalog Klasik (36)',
  },
  tabs: {
    word: 'Generator Kata (96px HD)',
    charset: 'Custom Charset & BMFont',
    classic: 'Katalog ABOUT (36)',
  },
  actions: {
    mcpAgent: 'MCP Agent',
    mcpTitle:
      'Model Context Protocol (MCP) untuk Cursor, Claude Desktop, Windsurf & Coding Agents',
    downloadBatch: 'Unduh Batch Kata (.ZIP)',
    downloadClassic: 'Unduh 36 PNG (.ZIP)',
    close: 'Tutup',
  },
  sidebar: {
    fontSection: '01. Font & Upload Custom Font',
    fontActiveLabel: 'Pilihan Font Aktif:',
    fontUpload: 'Upload File Font (.TTF / .OTF / .WOFF2)',
    fontLoading: 'Memuat Font...',
    fontGoogleLabel: 'Atau Muat Nama Google Font Dinamis:',
    fontLoad: 'Muat Font',
    presetSection: '02. Preset Material & Tema UI',
    presetCount: 'Preset',
    presetSave: 'Simpan',
    presetExportJson: 'Ekspor JSON',
    shaderSection: '03. Editor Shader & Permukaan',
  },
  workspace: {
    quickWords: 'Kata Cepat:',
    canvasPreview: 'Pratinjau Hasil Kanvas',
    downloadPng: 'Unduh PNG',
    saveToBatch: 'Simpan ke Antrean Batch',
    rerender: 'Render Ulang',
    batchTitle: 'Ekspor Massal Multi-Bahasa',
    batchList: 'Daftar Batch Kata (Aset Siap Ekspor)',
    downloadAllBatch: 'Unduh Semua Batch Kata (.ZIP)',
    addRow: 'Tambah Baris',
    newWordPlaceholder: 'Kata baru (mis. VICTORY)...',
  },
  notices: {
    presetSaved: 'Preset kustom berhasil disimpan!',
    presetDeleted: 'Preset kustom dihapus.',
  },
};
