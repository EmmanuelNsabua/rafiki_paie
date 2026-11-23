import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'main/index': 'src/main/index.ts',
    'preload/index': 'src/preload/index.ts',
    'main/seed': 'src/main/db/seed.ts',
  },
  format: ['cjs'],
  target: 'node20',
  external: ['electron', 'better-sqlite3'],
  noExternal: ['@rafiki/contrat'],
  clean: false,
  sourcemap: true,
});
