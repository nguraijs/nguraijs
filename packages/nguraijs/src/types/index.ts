import { TrieNode } from '../lib/TrieNode'

export interface Config {
  keywords?: string[]
  punctuations?: string[]
  stringDelimiters?: string[]
  numberPattern?: 'standard' | 'integer' | 'hexadecimal'
  identifierPattern?:
    | 'standard'
    | 'permissive'
    | { starts: string; parts: string }
    | ((x: Set<string>, y: Set<string>) => void)
  whitespacePattern?: string | ((x: Set<string>) => void)
  identifierParts?: string
  comments?: {
    prefix: string
    suffix?: string
  }[]
  custom?: Record<string, (string | RegExp)[]>
  plugins?: Plugin[]
  noUnknownTokens?: boolean
  noSpace?: boolean
  noEmptyLines?: boolean
  customOnly?: boolean
  pluginErrorHandling?: 'throw' | 'warn' | 'ignore'
  enablePluginTracing?: boolean
}

export interface Plugin {
  name: string
  version?: string
  priority?: number
  process: (input: string, position: number) => Token | null
  onError?: (error: Error, context: PluginContext) => void
  onInit?: (config: Config) => void
  onDestroy?: () => void
}

export interface Token {
  type: string
  value: string
  position: number
  source?: string
  metadata?: Record<string, any>
}

export interface PluginContext {
  pluginName: string
  input: string
  position: number
  lineNumber: number
  columnNumber: number
}

export interface PluginError {
  pluginName: string
  error: Error
  context: PluginContext
  timestamp: Date
}

export interface CompiledPattern {
  trie: TrieNode
  regexes: RegExp[]
  sortedStrings: string[]
}
