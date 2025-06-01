import { Config, Token, Plugin, PluginContext, PluginError } from './types'
import { identifierPatterns } from './lib/identifierPatterns'

export class Ngurai {
  private config: Required<Config>
  private pluginErrors: PluginError[] = []
  private pluginStats: Map<string, { calls: number; errors: number; totalTime: number }> = new Map()

  constructor(config: Config = {}) {
    this.config = {
      keywords: config.keywords || [],
      punctuations: config.punctuations || [],
      stringDelimiters: config.stringDelimiters || ['"', "'", '`'],
      numberRegex: config.numberRegex || /^\d+(\.\d+)?([eE][+-]?\d+)?/,
      identifierRegex: config.identifierRegex || identifierPatterns.standard,
      whitespaceRegex: config.whitespaceRegex || /^[ \t]+/,
      commentPrefixes: config.commentPrefixes || ['//', '/*'],
      commentSuffixes: config.commentSuffixes || ['', '*/'],
      custom: config.custom || {},
      plugins: config.plugins || [],
      noUnknownToken: config.noUnknownToken || false,
      noSpace: config.noSpace || false,
      customOnly: config.customOnly || false,
      pluginErrorHandling: config.pluginErrorHandling || 'warn',
      enablePluginTracing: config.enablePluginTracing || false
    }

    this.config.plugins.sort((a, b) => (b.priority || 0) - (a.priority || 0))

    this.initializePlugins()
  }

  /**
   * Plugin Handler
   */

  private initializePlugins() {
    for (const plugin of this.config.plugins) {
      try {
        if (plugin.onInit) {
          plugin.onInit(this.config)
        }

        this.pluginStats.set(plugin.name, { calls: 0, errors: 0, totalTime: 0 })
      } catch (error) {
        this.handlePluginError(plugin.name, error as Error, {
          pluginName: plugin.name,
          input: '',
          position: 0,
          lineNumber: 0,
          columnNumber: 0
        })
      }
    }
  }

  private handlePluginError(pluginName: string, error: Error, context: PluginContext) {
    const pluginError: PluginError = {
      pluginName,
      error,
      context,
      timestamp: new Date()
    }

    this.pluginErrors.push(pluginError)

    const stats = this.pluginStats.get(pluginName)
    if (stats) {
      stats.errors++
    }

    const plugin = this.config.plugins.find((p) => p.name === pluginName)
    if (plugin?.onError) {
      try {
        plugin.onError(error, context)
      } catch (handlerError) {
        console.error(`Plugin ${pluginName} error handler failed:`, handlerError)
      }
    }

    switch (this.config.pluginErrorHandling) {
      case 'throw':
        throw new Error(`Plugin "${pluginName}" failed: ${error.message}`)
      case 'warn':
        console.warn(
          `Plugin "${pluginName}" failed at position ${context.position}:`,
          error.message
        )
        break
      case 'ignore':
        break
    }
  }

  public processWithPlugin(
    plugin: Plugin,
    input: string,
    position: number,
    lineNumber: number,
    columnNumber: number
  ): Token | null {
    const startTime = performance.now()
    const stats = this.pluginStats.get(plugin.name)!
    stats.calls++

    try {
      const result = plugin.process(input, position)

      if (result && this.config.enablePluginTracing) {
        result.source = plugin.name
      }

      const endTime = performance.now()
      stats.totalTime += endTime - startTime

      return result
    } catch (error) {
      const context: PluginContext = {
        pluginName: plugin.name,
        input,
        position,
        lineNumber,
        columnNumber
      }

      this.handlePluginError(plugin.name, error as Error, context)
      return null
    }
  }

  public registerPlugin(plugin: Plugin): this {
    if (this.config.plugins.some((p) => p.name === plugin.name)) {
      throw new Error(`Plugin with name "${plugin.name}" is already registered`)
    }

    this.config.plugins.push(plugin)
    this.config.plugins.sort((a, b) => (b.priority || 0) - (a.priority || 0))

    try {
      if (plugin.onInit) {
        plugin.onInit(this.config)
      }
      this.pluginStats.set(plugin.name, { calls: 0, errors: 0, totalTime: 0 })
    } catch (error) {
      this.handlePluginError(plugin.name, error as Error, {
        pluginName: plugin.name,
        input: '',
        position: 0,
        lineNumber: 0,
        columnNumber: 0
      })
    }

    return this
  }

  public unregisterPlugin(pluginName: string): this {
    const pluginIndex = this.config.plugins.findIndex((p) => p.name === pluginName)
    if (pluginIndex === -1) {
      throw new Error(`Plugin "${pluginName}" not found`)
    }

    const plugin = this.config.plugins[pluginIndex]

    try {
      if (plugin.onDestroy) {
        plugin.onDestroy()
      }
    } catch (error) {
      console.warn(`Plugin "${pluginName}" cleanup failed:`, error)
    }

    this.config.plugins.splice(pluginIndex, 1)
    this.pluginStats.delete(pluginName)

    return this
  }

  public getPluginStats(): Map<
    string,
    { calls: number; errors: number; totalTime: number; avgTime: number }
  > {
    const result = new Map()
    for (const [name, stats] of this.pluginStats.entries()) {
      result.set(name, {
        ...stats,
        avgTime: stats.calls > 0 ? stats.totalTime / stats.calls : 0
      })
    }
    return result
  }

  public getPluginErrors(): PluginError[] {
    return [...this.pluginErrors]
  }

  public clearPluginErrors(): void {
    this.pluginErrors = []
  }

  /**
   * Main parser
   */

  private parseFromList(
    input: string,
    position: number,
    list: string[],
    tokenType: string
  ): Token | null {
    const sortedList = [...list].sort((a, b) => b.length - a.length)
    for (const item of sortedList) {
      if (input.startsWith(item, position)) {
        return { type: tokenType, value: item, position }
      }
    }
    return null
  }

  private parseIdentifierOrKeyword(input: string, position: number): Token | null {
    const match = input.slice(position).match(this.config.identifierRegex)
    if (!match) return null

    const value = match[0]
    const type = this.config.keywords.includes(value) ? 'keyword' : 'identifier'
    return { type, value, position }
  }

  private parseNumber(input: string, position: number): Token | null {
    const match = input.slice(position).match(this.config.numberRegex)
    if (!match) return null
    return { type: 'number', value: match[0], position }
  }

  private parseString(input: string, position: number): Token | null {
    const char = input[position]
    if (!this.config.stringDelimiters.includes(char)) return null

    let value = char
    let i = position + 1
    let escaped = false

    while (i < input.length) {
      const currentChar = input[i]
      value += currentChar
      i++

      if (escaped) {
        escaped = false
      } else if (currentChar === '\\') {
        escaped = true
      } else if (currentChar === char) {
        return { type: 'string', value, position }
      }
    }

    return { type: 'unterminated-string', value, position }
  }

  private parseComment(input: string, position: number): Token | null {
    for (let i = 0; i < this.config.commentPrefixes.length; i++) {
      const prefix = this.config.commentPrefixes[i]
      const suffix = this.config.commentSuffixes[i]

      if (input.startsWith(prefix, position)) {
        if (suffix === '') {
          return {
            type: 'comment',
            value: input.substring(position),
            position
          }
        } else {
          const endPos = input.indexOf(suffix, position + prefix.length)
          if (endPos >= 0) {
            return {
              type: 'comment',
              value: input.substring(position, endPos + suffix.length),
              position
            }
          } else {
            return {
              type: 'comment',
              value: input.substring(position),
              position
            }
          }
        }
      }
    }
    return null
  }

  private parseCustom(input: string, position: number): Token | null {
    for (const [type, patterns] of Object.entries(this.config.custom)) {
      const stringPatterns = patterns.filter((p) => typeof p === 'string') as string[]
      const token = this.parseFromList(input, position, stringPatterns, type)
      if (token) return token

      const regexPatterns = patterns.filter((p) => p instanceof RegExp) as RegExp[]
      for (const pattern of regexPatterns) {
        const remaining = input.slice(position)
        const match = remaining.match(pattern)
        if (match && match.index === 0) {
          return {
            type,
            value: match[0],
            position
          }
        }
      }
    }
    return null
  }

  public process(input: string): Token[][] {
    const lines: Token[][] = []
    let globalPosition = 0
    let lineNumber = 0

    for (const line of input.split('\n')) {
      lineNumber++
      let localPosition = 0
      let currentLine: Token[] = []

      while (localPosition < line.length) {
        const char = line[localPosition]
        let token: Token | null = null

        for (const plugin of this.config.plugins) {
          token = this.processWithPlugin(plugin, line, localPosition, lineNumber, localPosition + 1)
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            break
          }
        }
        if (token) continue

        if (!this.config.customOnly) {
          token = this.parseComment(line, localPosition)
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            continue
          }
        }

        token = this.parseCustom(line, localPosition)
        if (token) {
          currentLine.push(token)
          localPosition += token.value.length
          globalPosition += token.value.length
          continue
        }

        if (!this.config.noSpace) {
          const spaceMatch = line.slice(localPosition).match(this.config.whitespaceRegex)
          if (spaceMatch) {
            const spaces = spaceMatch[0]
            for (let i = 0; i < spaces.length; i++) {
              currentLine.push({
                type: 'space',
                value: spaces[i],
                position: localPosition + i
              })
            }
            localPosition += spaces.length
            globalPosition += spaces.length
            continue
          }
        }

        if (!this.config.customOnly) {
          token = this.parseFromList(line, localPosition, this.config.punctuations, 'punctuation')
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            continue
          }

          token = this.parseIdentifierOrKeyword(line, localPosition)
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            continue
          }

          token = this.parseNumber(line, localPosition)
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            continue
          }

          token = this.parseString(line, localPosition)
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            continue
          }
        }

        if (!this.config.noUnknownToken) {
          currentLine.push({ type: 'unknown', value: char, position: localPosition })
        }
        localPosition++
        globalPosition++
      }

      if (currentLine.length) lines.push(currentLine)
      globalPosition++
    }

    return lines
  }

  public destroy(): void {
    for (const plugin of this.config.plugins) {
      try {
        if (plugin.onDestroy) {
          plugin.onDestroy()
        }
      } catch (error) {
        console.warn(`Plugin "${plugin.name}" cleanup failed:`, error)
      }
    }

    this.config.plugins = []
    this.pluginStats.clear()
    this.pluginErrors = []
  }
}

export * from './types'
export { identifierPatterns } from './lib/identifierPatterns'
export default Ngurai
