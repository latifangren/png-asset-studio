/**
 * English UI dictionary. This file is the type source: `id.ts` must satisfy
 * `typeof en`, so a missing Indonesian key is a TypeScript error, not a
 * runtime blank label. Add a key here first, then translate it in id.ts,
 * then use it via `t('...')`. Never put a raw UI string in a component
 * once its key exists here.
 *
 * NOTE: `assetLang` (export folder per word, e.g. en/id/jp) is NOT this
 * locale. This dictionary only controls the studio interface language.
 */
export const en = {
  app: {
    name: 'StoneGlyph Studio',
    wordmark: 'StoneGlyph Studio',
    heroEyebrow: 'Universal 2D/3D Game UI Text, Button & Bitmap Font Generator',
    heroTitle: 'Word Asset, Custom Font & Transparent PNG Character Studio',
    heroDescription:
      'Supports custom font upload (.TTF/.OTF/.WOFF2), dynamic Google Fonts, material presets, a free gradient editor, locked canvas height, and .PNG / .ZIP / BMFont (.fnt) export.',
    language: 'Language',
    languageEnglish: 'English',
    languageIndonesian: 'Indonesian',
  },
  nav: {
    main: 'Main navigation',
    wordBatch: 'Word & Batch Generator',
    charset: 'Custom Charset & BMFont',
    classic: 'Classic Catalog (36)',
  },
  tabs: {
    word: 'Word Generator (96px HD)',
    charset: 'Custom Charset & BMFont',
    classic: 'ABOUT Catalog (36)',
  },
  actions: {
    mcpAgent: 'MCP Agent',
    mcpTitle:
      'Model Context Protocol (MCP) for Cursor, Claude Desktop, Windsurf & coding agents',
    downloadBatch: 'Download Word Batch (.ZIP)',
    downloadClassic: 'Download 36 PNGs (.ZIP)',
    close: 'Close',
  },
  // Everything below is the migration backlog: keys already defined so the
  // next component migration only needs to swap the literal for t().
  // They are not yet all wired — see docs/architecture.md § i18n.
  sidebar: {
    fontSection: '01. Font & Custom Font Upload',
    fontActiveLabel: 'Active font:',
    fontUpload: 'Upload Font File (.TTF / .OTF / .WOFF2)',
    fontLoading: 'Loading font...',
    fontGoogleLabel: 'Or load a Google Font by name:',
    fontLoad: 'Load Font',
    presetSection: '02. Material Presets & UI Themes',
    presetCount: 'presets',
    presetSave: 'Save',
    presetExportJson: 'Export JSON',
    shaderSection: '03. Shader & Surface Editor',
  },
  workspace: {
    quickWords: 'Quick words:',
    canvasPreview: 'Canvas Result Preview',
    downloadPng: 'Download PNG',
    saveToBatch: 'Save to Batch Queue',
    rerender: 'Re-render',
    batchTitle: 'Bulk Multi-Language Export',
    batchList: 'Batch word list (assets ready to export)',
    downloadAllBatch: 'Download All Batch Words (.ZIP)',
    addRow: 'Add Row',
    newWordPlaceholder: 'New word (e.g. VICTORY)...',
  },
  notices: {
    presetSaved: 'Custom preset saved!',
    presetDeleted: 'Custom preset deleted.',
  },
};

export type Dictionary = typeof en;
