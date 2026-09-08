import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['src/background.ts', 'src/content.ts', 'src/popup.ts'],
  bundle: true,
  outdir: 'dist',
  target: 'firefox142',
  format: 'iife',
  loader: { '.css': 'text' },
  legalComments: 'none',
});
await cp('public', 'dist', { recursive: true });
