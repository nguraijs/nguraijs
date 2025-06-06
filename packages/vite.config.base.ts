import { Config } from 'vite'

export function createConfig({
  name = 'nguraijs',
  entry = './src/index.ts',
  outDir = 'dist',
  formats = ['es', 'iife', 'cjs', 'umd'],
  fileName = 'index',
  target = 'es2017',
  sourcemap = true,
  minify = true,
  viteOptions = {},
  rollupOptions = {}
} = {}): Config {
  return {
    build: {
      minify,
      sourcemap,
      target,
      outDir,
      lib: {
        name,
        entry,
        formats,
        fileName: (format, name) => `${fileName !== 'index' ? fileName : name}.${format}.js`,
        ...viteOptions
      },
      rollupOptions: {
        output: { exports: 'named' },
        ...rollupOptions
      }
    }
  }
}
