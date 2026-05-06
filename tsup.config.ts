import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/client/index.ts'],
  format: ['esm'],
  target: 'node20',
  sourcemap: true,
  clean: true,
  dts: false,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  platform: 'node',
  minify: false,
});
