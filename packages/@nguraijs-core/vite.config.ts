import { createConfig } from '../vite.config.base.ts'

export default createConfig({
  name: '__nguraijs_core__',
  entry: 'src/index.ts',
  formats: ['es', 'cjs', 'iife']
})
