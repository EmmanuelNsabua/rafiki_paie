import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'main/index': 'src/main/index.ts',
    'preload/index': 'src/preload/index.ts',
  },
  format: ['cjs'],
  target: 'node20',
  external: ['electron', 'better-sqlite3'],
  noExternal: ['@rafiki/contrat'],
  clean: true,
  sourcemap: true,
});
