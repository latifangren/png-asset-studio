export interface ZipEntryInput {
  filename: string;
  data: Uint8Array<ArrayBuffer>;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Builds a valid standard PKZIP archive (Store method 0) from an array of binary files.
 * Since PNG files are already Deflate-compressed internally, Store method produces
 * compact, instant, zero-dependency ZIP archives.
 */
export function buildZipArchive(entries: ZipEntryInput[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const prepared = entries.map((entry) => {
    const nameBytes = encoder.encode(entry.filename);
    const crc = computeCrc32(entry.data);
    return {
      nameBytes,
      data: entry.data,
      crc,
      size: entry.data.byteLength,
    };
  });

  let localSize = 0;
  let centralSize = 0;
  for (const item of prepared) {
    localSize += 30 + item.nameBytes.byteLength + item.size;
    centralSize += 46 + item.nameBytes.byteLength;
  }

  const totalSize = localSize + centralSize + 22;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  let localOffset = 0;
  const offsets: number[] = [];

  for (const item of prepared) {
    offsets.push(localOffset);
    // Local file header signature (0x04034b50)
    view.setUint32(localOffset, 0x04034b50, true);
    view.setUint16(localOffset + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(localOffset + 6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(localOffset + 8, 0, true); // Compression method: 0 (Store)
    view.setUint16(localOffset + 10, 0, true); // Mod time
    view.setUint16(localOffset + 12, 0, true); // Mod date
    view.setUint32(localOffset + 14, item.crc, true);
    view.setUint32(localOffset + 18, item.size, true);
    view.setUint32(localOffset + 22, item.size, true);
    view.setUint16(localOffset + 26, item.nameBytes.byteLength, true);
    view.setUint16(localOffset + 28, 0, true); // Extra field length

    out.set(item.nameBytes, localOffset + 30);
    out.set(item.data, localOffset + 30 + item.nameBytes.byteLength);

    localOffset += 30 + item.nameBytes.byteLength + item.size;
  }

  const centralDirStart = localOffset;
  let centralOffset = centralDirStart;

  for (let i = 0; i < prepared.length; i++) {
    const item = prepared[i];
    // Central directory file header signature (0x02014b50)
    view.setUint32(centralOffset, 0x02014b50, true);
    view.setUint16(centralOffset + 4, 20, true); // Version made by
    view.setUint16(centralOffset + 6, 20, true); // Version needed
    view.setUint16(centralOffset + 8, 0x0800, true); // UTF-8 flag
    view.setUint16(centralOffset + 10, 0, true); // Compression method: Store
    view.setUint16(centralOffset + 12, 0, true); // Mod time
    view.setUint16(centralOffset + 14, 0, true); // Mod date
    view.setUint32(centralOffset + 16, item.crc, true);
    view.setUint32(centralOffset + 20, item.size, true);
    view.setUint32(centralOffset + 24, item.size, true);
    view.setUint16(centralOffset + 28, item.nameBytes.byteLength, true);
    view.setUint16(centralOffset + 30, 0, true); // Extra length
    view.setUint16(centralOffset + 32, 0, true); // Comment length
    view.setUint16(centralOffset + 34, 0, true); // Disk number
    view.setUint16(centralOffset + 36, 0, true); // Internal attrs
    view.setUint32(centralOffset + 38, 0, true); // External attrs
    view.setUint32(centralOffset + 42, offsets[i], true); // Local header offset

    out.set(item.nameBytes, centralOffset + 46);
    centralOffset += 46 + item.nameBytes.byteLength;
  }

  const centralDirSize = centralOffset - centralDirStart;

  // End of central directory record (0x06054b50)
  view.setUint32(centralOffset, 0x06054b50, true);
  view.setUint16(centralOffset + 4, 0, true); // Disk number
  view.setUint16(centralOffset + 6, 0, true); // Central dir start disk
  view.setUint16(centralOffset + 8, prepared.length, true);
  view.setUint16(centralOffset + 10, prepared.length, true);
  view.setUint32(centralOffset + 12, centralDirSize, true);
  view.setUint32(centralOffset + 16, centralDirStart, true);
  view.setUint16(centralOffset + 20, 0, true); // Comment length

  return out;
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array<ArrayBuffer> {
  const base64Index = dataUrl.indexOf(';base64,');
  if (base64Index === -1) {
    throw new Error('Invalid base64 data URL');
  }
  const base64 = dataUrl.slice(base64Index + 8);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
