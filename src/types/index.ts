export interface Config {
  keywords?: string[]
  punctuations?: string[]
  stringDelimiters?: string[]
  numberRegex?: RegExp
  identifierRegex?: RegExp
  whitespaceRegex?: RegExp
  commentPrefixes?: string[]
  commentSuffixes?: string[]
  custom?: Record<string, (string | RegExp)[]>
  plugins?: Plugin[]
  noUnknownToken?: boolean
  noSpace?: boolean
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
