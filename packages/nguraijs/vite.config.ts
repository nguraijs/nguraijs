import { createConfig } from '../vite.config.base.ts'

export default createConfig({
  name: '__nguraijs__',
  entry: 'src/index.ts',
  formats: ['es', 'cjs', 'iife'],
  sourcemap: true
})
