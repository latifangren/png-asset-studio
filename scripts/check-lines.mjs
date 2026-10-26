#!/usr/bin/env node
/**
 * Enforce the per-file line hard limit.
 * Usage: npm run check-lines
 * Fails (exit 1) if any tracked source file exceeds MAX_LINES.
 * Files over WARN_LINES are listed as a warning, not a failure.
 * JSON data files are exempt: data is supposed to grow by adding files,
 * not by growing one file (see src/data/presets/).
 */
import fs from 'node:fs';
import path from 'node:path';

const MAX_LINES = 1000;
const WARN_LINES = 600;
const ROOTS = ['src', 'server.ts', 'mcp-stdio.ts', 'scripts'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const files = ROOTS.flatMap((root) =>
  fs.existsSync(root) && fs.statSync(root).isDirectory()
    ? walk(root)
    : fs.existsSync(root)
      ? [root]
      : [],
);

let failed = false;
const rows = files
  .map((file) => ({ file, lines: fs.readFileSync(file, 'utf8').split('\n').length }))
  .sort((a, b) => b.lines - a.lines);

for (const { file, lines } of rows) {
  const status = lines > MAX_LINES ? 'FAIL' : lines > WARN_LINES ? 'WARN' : 'ok';
  if (status === 'FAIL') failed = true;
  console.log(`${status.padEnd(4)} ${String(lines).padStart(5)}  ${file}`);
}

if (failed) {
  console.error(`\ncheck-lines: FAILED — a file exceeds ${MAX_LINES} lines. Split it, do not raise the limit.`);
  process.exit(1);
}
console.log(`\ncheck-lines: OK — largest file is ${rows[0]?.lines ?? 0} lines (limit ${MAX_LINES}).`);
