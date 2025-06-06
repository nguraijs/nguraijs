import { TrieNode } from './lib/TrieNode'
import { Config, Token, Plugin, PluginContext, PluginError, CompiledPattern } from './types'

export class Ngurai {
  private config: Required<Config>
  private pluginErrors: PluginError[] = []
  private pluginStats: Map<string, { calls: number; errors: number; totalTime: number }> = new Map()

  private sortedKeywords: string[] = []
  private sortedPunctuations: string[] = []
  private keywordSet: Set<string> = new Set()
  private stringDelimiterSet: Set<string> = new Set()
  private punctuationTrie: TrieNode = new TrieNode()
  private keywordTrie: TrieNode = new TrieNode()
  private compiledCustomPatterns: Map<string, CompiledPattern> = new Map()
  private commentTrie: TrieNode = new TrieNode()

  // Dynamic character lookups
  private identifierStartLookup: Set<string> = new Set()
  private identifierPartLookup: Set<string> = new Set()
  private whitespaceLookup: Set<string> = new Set()
  private digitLookup: Set<string> = new Set()

  constructor(config: Config = {}) {
    this.config = {
      keywords: config.keywords || [],
      punctuations: config.punctuations || [],
      stringDelimiters: config.stringDelimiters || ['"', "'", '`'],
      numberPattern: config.numberPattern || 'standard',
      identifierPattern: config.identifierPattern || 'standard',
      identifierParts: config.identifierParts || '0123456789_',
      whitespacePattern: config.whitespacePattern || ' \t',
      comments: config.comments || [{ prefix: '//' }, { prefix: '/*', suffix: '*/' }],
      custom: config.custom || {},
      plugins: config.plugins || [],
      noUnknownTokens: config.noUnknownTokens || false,
      noSpace: config.noSpace || false,
      noEmptyLines: config.noEmptyLines || false,
      customOnly: config.customOnly || false,
      pluginErrorHandling: config.pluginErrorHandling || 'warn',
      enablePluginTracing: config.enablePluginTracing || false
    }

    this.config.plugins.sort((a, b) => (b.priority || 0) - (a.priority || 0))
    this.precomputeOptimizations()
    this.initializePlugins()
  }

  /**
   * Pre-compute all optimization data structures
   */
  private precomputeOptimizations(): void {
    // Build character lookup tables based on configuration
    this.buildCharacterLookups()

    // Sort arrays by length (longest first for greedy matching)
    this.sortedKeywords = [...this.config.keywords].sort((a, b) => b.length - a.length)
    this.sortedPunctuations = [...this.config.punctuations].sort((a, b) => b.length - a.length)

    // Create sets for O(1) lookups
    this.keywordSet = new Set(this.sortedKeywords)
    this.stringDelimiterSet = new Set(this.config.stringDelimiters)

    // Build tries for efficient prefix matching
    this.buildTries()

    // Compile custom patterns
    this.compileCustomPatterns()
  }

  private buildCharacterLookups(): void {
    this.digitLookup = new Set('0123456789'.split(''))
    this.whitespaceLookup = this.buildWhitespaceLookup()
    const { startChars, partChars } = this.buildIdentifierLookups()
    this.identifierStartLookup = startChars
    this.identifierPartLookup = partChars
  }

  private buildWhitespaceLookup(): Set<string> {
    const pattern = this.config.whitespacePattern
    const whitespaceChars = new Set<string>()

    if (typeof pattern === 'function') {
      pattern(whitespaceChars)
    } else if (typeof pattern === 'string') {
      pattern.split('').forEach((c) => whitespaceChars.add(c))
    }

    return whitespaceChars
  }

  private buildIdentifierLookups(): { startChars: Set<string>; partChars: Set<string> } {
    const pattern = this.config.identifierPattern
    const startChars = new Set<string>()
    const partChars = new Set<string>()
    const alphabeticalChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

    const handleStandard = () => {
      startChars.clear()
      partChars.clear()
      ;`${alphabeticalChars}_`.split('').forEach((c) => startChars.add(c))
      ;`${alphabeticalChars}${this.config.identifierParts}`
        .split('')
        .forEach((c) => partChars.add(c))
    }

    if (typeof pattern === 'object' && 'starts' in pattern && 'parts' in pattern) {
      if (pattern.starts.length === 0 || pattern.parts.length === 0) {
        console.warn('The identifierPattern object have an empty start or part characters!')
        handleStandard()
      }

      pattern.starts.split('').forEach((c) => startChars.add(c))
      pattern.parts.split('').forEach((c) => partChars.add(c))
    } else if (typeof pattern === 'function') {
      pattern(startChars, partChars)
      if (startChars.size === 0 || partChars.size === 0) {
        console.warn(
          'Starts or Parts characters are empty! Please use correct identifierPattern hooks format! Using default handler!'
        )
        handleStandard()
      }
    } else if (['standard', 'permissive'].includes(pattern)) {
      if (pattern === 'standard') handleStandard()
      else {
        for (let i = 33; i <= 126; i++) {
          const char = String.fromCharCode(i)
          if (!'()[]{},.;:"\'`<>=+*/\\|&!? \t'.includes(char)) {
            startChars.add(char)
            partChars.add(char)
          }
        }
      }
    } else {
      console.warn('Unknown identifierPattern format. Using default handler!')
      handleStandard()
    }

    return { startChars, partChars }
  }

  private buildTries(): void {
    // Build punctuation trie
    for (const punct of this.sortedPunctuations) {
      this.punctuationTrie.insert(punct, {
        word: punct,
        type: 'punctuation'
      })
    }

    // Build keyword trie
    for (const keyword of this.sortedKeywords) {
      this.keywordTrie.insert(keyword, {
        word: keyword,
        type: 'keyword'
      })
    }

    // Build comment prefix trie
    for (let i = 0; i < this.config.comments.length; i++) {
      const comment = this.config.comments[i]
      this.commentTrie.insert(comment.prefix, {
        suffix: comment.suffix || '',
        index: i
      })
    }
  }

  private compileCustomPatterns(): void {
    for (const [type, patterns] of Object.entries(this.config.custom)) {
      const strings = patterns.filter((p) => typeof p === 'string') as string[]
      const regexes = patterns.filter((p) => p instanceof RegExp) as RegExp[]

      const trie = new TrieNode()
      for (const str of strings) {
        trie.insert(str, {
          word: str,
          type
        })
      }

      this.compiledCustomPatterns.set(type, {
        trie,
        regexes,
        sortedStrings: strings.sort((a, b) => b.length - a.length)
      })
    }
  }

  /**
   * Optimized parsing methods
   */
  private parseNumber(input: string, position: number): Token | null {
    const len = input.length
    if (position >= len) return null

    let i = position

    if (!this.digitLookup.has(input[i])) return null

    switch (this.config.numberPattern) {
      case 'standard':
        return this.parseStandardNumber(input, position)
      case 'integer':
        return this.parseIntegerNumber(input, position)
      case 'hexadecimal':
        return this.parseHexNumber(input, position)
      default:
        return this.parseStandardNumber(input, position)
    }
  }

  private parseStandardNumber(input: string, position: number): Token | null {
    const len = input.length
    let i = position

    // Parse integer part
    while (i < len && this.digitLookup.has(input[i])) {
      i++
    }

    // Parse decimal part
    if (i < len && input[i] === '.') {
      i++
      while (i < len && this.digitLookup.has(input[i])) {
        i++
      }
    }

    // Parse exponent part
    if (i < len && (input[i] === 'e' || input[i] === 'E')) {
      const expStart = i
      i++
      if (i < len && (input[i] === '+' || input[i] === '-')) {
        i++
      }
      const expDigitStart = i
      while (i < len && this.digitLookup.has(input[i])) {
        i++
      }
      // Must have digits after exponent
      if (i === expDigitStart) {
        i = expStart // backtrack
      }
    }

    if (i === position) return null

    return {
      type: 'number',
      value: input.substring(position, i),
      position
    }
  }

  private parseIntegerNumber(input: string, position: number): Token | null {
    const len = input.length
    let i = position

    while (i < len && this.digitLookup.has(input[i])) {
      i++
    }

    if (i === position) return null

    return {
      type: 'number',
      value: input.substring(position, i),
      position
    }
  }

  private parseHexNumber(input: string, position: number): Token | null {
    const len = input.length
    let i = position

    // Check for 0x prefix
    if (i + 1 < len && input[i] === '0' && (input[i + 1] === 'x' || input[i + 1] === 'X')) {
      i += 2
      const hexStart = i
      while (i < len && /[0-9a-fA-F]/.test(input[i])) {
        i++
      }
      if (i > hexStart) {
        return {
          type: 'number',
          value: input.substring(position, i),
          position
        }
      }
    }

    // Fall back to standard number parsing
    return this.parseStandardNumber(input, position)
  }

  private parseIdentifier(input: string, position: number): Token | null {
    const len = input.length
    if (position >= len) return null

    let i = position

    // First character must be valid identifier start
    if (!this.identifierStartLookup.has(input[i])) {
      return null
    }

    i++

    // Subsequent characters
    while (i < len && this.identifierPartLookup.has(input[i])) {
      i++
    }

    const value = input.substring(position, i)
    const type = this.keywordSet.has(value) ? 'keyword' : 'identifier'

    return { type, value, position }
  }

  private parseString(input: string, position: number): Token | null {
    const len = input.length
    if (position >= len) return null

    const delimiter = input[position]
    if (!this.stringDelimiterSet.has(delimiter)) return null

    let i = position + 1

    while (i < len) {
      if (input[i] === delimiter) {
        return {
          type: 'string',
          value: input.substring(position, i + 1),
          position
        }
      }
      i++
    }

    return {
      type: 'unterminated-string',
      value: input.substring(position),
      position
    }
  }

  private parseComment(input: string, position: number): Token | null {
    const match = this.commentTrie.findLongestMatch(input, position)
    if (!match) return null

    const { suffix } = match.value
    const prefixEnd = position + match.length

    if (suffix === '') {
      // Single-line comment - consume to end of line
      return {
        type: 'comment',
        value: input.substring(position),
        position
      }
    } else {
      // Comment with suffix - find end marker within the same line
      const suffixPos = input.indexOf(suffix, prefixEnd)
      const endPos = suffixPos >= 0 ? suffixPos + suffix.length : input.length
      return {
        type: 'comment',
        value: input.substring(position, endPos),
        position
      }
    }
  }

  private parseCustom(input: string, position: number): Token | null {
    // Try string patterns first using tries
    for (const [type, pattern] of this.compiledCustomPatterns.entries()) {
      const match = pattern.trie.findLongestMatch(input, position)
      if (match) {
        return {
          type,
          value: match.value.word as string,
          position
        }
      }
    }

    // Try regex patterns
    for (const [type, pattern] of this.compiledCustomPatterns.entries()) {
      for (const regex of pattern.regexes) {
        // Only create substring if we might match
        const remaining = input.slice(position)
        const match = remaining.match(regex)
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

  private parsePunctuation(input: string, position: number): Token | null {
    const match = this.punctuationTrie.findLongestMatch(input, position)
    if (!match) return null

    return {
      type: 'punctuation',
      value: match.value.word as string,
      position
    }
  }

  public process(input: string): Token[][] {
    const lines: Token[][] = []
    const inputLines = input.split('\n')

    for (let lineIndex = 0; lineIndex < inputLines.length; lineIndex++) {
      const line = inputLines[lineIndex]

      // Detecting if an empty line
      if (line.length === 0) {
        if (!this.config.noEmptyLines) lines.push([{ type: 'empty-line', value: '', position: 0 }])
        continue
      }

      const tokens = this.processLine(line, lineIndex + 1)

      lines.push(tokens)
    }

    return lines
  }

  private processLine(line: string, lineNumber: number): Token[] {
    const tokens: Token[] = []
    const len = line.length
    let position = 0

    while (position < len) {
      const char = line[position]
      let token: Token | null = null
      let consumed = 0

      // Plugin processing (if any)
      if (this.config.plugins.length > 0) {
        for (const plugin of this.config.plugins) {
          token = this.processWithPlugin(plugin, line, position, lineNumber, position + 1)
          if (token) {
            consumed = token.value.length
            break
          }
        }
        if (token) {
          tokens.push(token)
          position += consumed
          continue
        }
      }

      // Comment parsing (try first as comments can be long)
      if (!this.config.customOnly) {
        token = this.parseComment(line, position)
        if (token) {
          tokens.push(token)
          position += token.value.length
          continue
        }
      }

      // Custom pattern parsing
      token = this.parseCustom(line, position)
      if (token) {
        tokens.push(token)
        position += token.value.length
        continue
      }

      // Fast character-based routing for built-in types
      if (!this.config.customOnly) {
        // String parsing - check delimiter first
        if (this.stringDelimiterSet.has(char)) {
          token = this.parseString(line, position)
          if (token) {
            tokens.push(token)
            position += token.value.length
            continue
          }
        }

        // Number parsing - check digit first
        if (this.digitLookup.has(char)) {
          token = this.parseNumber(line, position)
          if (token) {
            tokens.push(token)
            position += token.value.length
            continue
          }
        }

        // Identifier parsing - check valid start character first
        if (this.identifierStartLookup.has(char)) {
          token = this.parseIdentifier(line, position)
          if (token) {
            tokens.push(token)
            position += token.value.length
            continue
          }
        }

        // Punctuation parsing
        token = this.parsePunctuation(line, position)
        if (token) {
          tokens.push(token)
          position += token.value.length
          continue
        }
      }

      // Whitespace handling
      if (!this.config.noSpace && this.whitespaceLookup.has(char)) {
        tokens.push({
          type: 'space',
          value: char,
          position
        })
        position++
        continue
      }

      // Unknown token
      if (!this.config.noUnknownTokens) {
        tokens.push({
          type: 'unknown',
          value: char,
          position
        })
      }
      position++
    }

    return tokens
  }

  /**
   * plugin processing
   */
  public processWithPlugin(
    plugin: Plugin,
    input: string,
    position: number,
    lineNumber: number,
    columnNumber: number
  ): Token | null {
    // Skip stats if not needed
    if (!this.config.enablePluginTracing) {
      try {
        const result = plugin.process(input, position)
        if (result) {
          const stats = this.pluginStats.get(plugin.name)
          if (stats) stats.calls++
        }
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

    return this.processPluginWithStats(plugin, input, position, lineNumber, columnNumber)
  }

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

  public processPluginWithStats(
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
export { TrieNode } from './lib/TrieNode'
export default Ngurai
