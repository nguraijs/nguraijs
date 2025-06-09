import { TrieNode } from './lib/TrieNode'
import { Config, Token, CompiledPattern } from './types'

export class Ngurai {
  private config: Required<Config>
  private keywordSet: Set<string> = new Set()
  private keywordTrie: TrieNode = new TrieNode()
  private compiledCustomPatterns: Map<string, CompiledPattern> = new Map()
  private commentTrie: TrieNode = new TrieNode()

  private identifierStartLookup: boolean[] = new Array(128).fill(false)
  private identifierPartLookup: boolean[] = new Array(128).fill(false)
  private whitespaceLookup: boolean[] = new Array(128).fill(false)
  private digitLookup: boolean[] = new Array(128).fill(false)
  private stringDelimiterLookup: boolean[] = new Array(128).fill(false)

  private tokenPool: Token[] = []
  private poolIndex = 0
  private readonly POOL_SIZE = 1000

  constructor(config: Config = {}) {
    this.config = {
      keywords: config.keywords || [],
      stringDelimiters: config.stringDelimiters || ['"', "'", '`'],
      identifierPattern: config.identifierPattern || 'standard',
      identifierParts: config.identifierParts || '0123456789_',
      whitespacePattern: config.whitespacePattern || ' \t',
      comments: config.comments || [{ prefix: '//' }, { prefix: '/*', suffix: '*/' }],
      tokens: config.tokens || {},
      noUnknownTokens: config.noUnknownTokens || false,
      noSpace: config.noSpace || false,
      noEmptyLines: config.noEmptyLines || false,
      tokensOnly: config.tokensOnly || false
    }

    this.initializeLookups()
    this.initializeTokenPool()
  }

  private initializeTokenPool(): void {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.tokenPool.push({ type: '', value: '', position: 0 })
    }
  }

  private getToken(): Token {
    if (this.poolIndex >= this.POOL_SIZE) {
      this.poolIndex = 0
    }
    return this.tokenPool[this.poolIndex++]
  }

  private initializeLookups(): void {
    this.buildCharacterLookups()
    this.buildKeywordStructures()
    this.buildCommentTrie()
    this.compileCustomPatterns()
  }

  private buildCharacterLookups(): void {
    for (let i = 48; i <= 57; i++) {
      this.digitLookup[i] = true
    }

    this.buildWhitespaceLookup()
    this.buildIdentifierLookups()
    this.buildStringDelimiterLookup()
  }

  private buildWhitespaceLookup(): void {
    const pattern = this.config.whitespacePattern

    if (typeof pattern === 'function') {
      const whitespaceChars = new Set<string>()
      pattern(whitespaceChars)
      for (const char of whitespaceChars) {
        const code = char.charCodeAt(0)
        if (code < 128) this.whitespaceLookup[code] = true
      }
      return
    }

    for (const char of pattern) {
      const code = char.charCodeAt(0)
      if (code < 128) this.whitespaceLookup[code] = true
    }
  }

  private buildStringDelimiterLookup(): void {
    for (const delimiter of this.config.stringDelimiters) {
      const code = delimiter.charCodeAt(0)
      if (code < 128) this.stringDelimiterLookup[code] = true
    }
  }

  private buildIdentifierLookups(): void {
    const pattern = this.config.identifierPattern
    const alphabetical = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

    const setStandardLookups = (): void => {
      const chars = alphabetical + this.config.identifierParts
      for (const char of chars) {
        const code = char.charCodeAt(0)
        if (code < 128) {
          this.identifierStartLookup[code] = true
          this.identifierPartLookup[code] = true
        }
      }
    }

    if (typeof pattern === 'object' && 'starts' in pattern && 'parts' in pattern) {
      if (!pattern.starts || !pattern.parts) {
        console.warn('Empty identifier pattern detected, using standard pattern')
        setStandardLookups()
        return
      }

      for (const char of pattern.starts) {
        const code = char.charCodeAt(0)
        if (code < 128) this.identifierStartLookup[code] = true
      }

      for (const char of pattern.parts) {
        const code = char.charCodeAt(0)
        if (code < 128) this.identifierPartLookup[code] = true
      }
      return
    }

    if (typeof pattern === 'function') {
      const startChars = new Set<string>()
      const partChars = new Set<string>()
      pattern(startChars, partChars)

      if (startChars.size === 0 || partChars.size === 0) {
        console.warn('Function returned empty character sets, using standard pattern')
        setStandardLookups()
        return
      }

      for (const char of startChars) {
        const code = char.charCodeAt(0)
        if (code < 128) this.identifierStartLookup[code] = true
      }

      for (const char of partChars) {
        const code = char.charCodeAt(0)
        if (code < 128) this.identifierPartLookup[code] = true
      }
      return
    }

    if (pattern === 'permissive') {
      for (let i = 33; i <= 126; i++) {
        const char = String.fromCharCode(i)
        if (!'()[]{},.;:"\'`<>=+*/\\|&!? \t'.includes(char)) {
          this.identifierStartLookup[i] = true
          this.identifierPartLookup[i] = true
        }
      }
      return
    }

    setStandardLookups()
  }

  private buildKeywordStructures(): void {
    this.keywordSet = new Set(this.config.keywords)
    

    for (const keyword of this.config.keywords) {
      this.keywordTrie.insert(keyword, { word: keyword, type: 'keyword' })
    }
  }

  private buildCommentTrie(): void {
    this.config.comments.forEach((comment, index) => {
      this.commentTrie.insert(comment.prefix, {
        suffix: comment.suffix || '',
        index
      })
    })
  }

  private compileCustomPatterns(): void {
    for (const [type, patterns] of Object.entries(this.config.tokens)) {
      const strings = patterns.filter((p) => typeof p === 'string') as string[]
      const regexes = patterns.filter((p) => p instanceof RegExp) as RegExp[]

      const trie = new TrieNode()
      strings.forEach((str) => {
        trie.insert(str, { word: str, type })
      })

      this.compiledCustomPatterns.set(type, {
        trie,
        regexes,
        sortedStrings: strings.sort((a, b) => b.length - a.length)
      })
    }
  }

  private parseNumber(input: string, position: number): Token | null {
    const charCode = input.charCodeAt(position)
    if (position >= input.length || charCode >= 128 || !this.digitLookup[charCode]) {
      return null
    }

    let i = position + 1

    while (i < input.length) {
      const code = input.charCodeAt(i)
      if (code >= 128 || !this.digitLookup[code]) break
      i++
    }

    if (i < input.length && input.charCodeAt(i) === 46) {
      i++
      while (i < input.length) {
        const code = input.charCodeAt(i)
        if (code >= 128 || !this.digitLookup[code]) break
        i++
      }
    }

    if (i < input.length) {
      const expChar = input.charCodeAt(i)
      if (expChar === 101 || expChar === 69) {
        const expStart = i++
        if (i < input.length) {
          const signChar = input.charCodeAt(i)
          if (signChar === 43 || signChar === 45) {
            i++
          }
        }
        const expDigitStart = i
        while (i < input.length) {
          const code = input.charCodeAt(i)
          if (code >= 128 || !this.digitLookup[code]) break
          i++
        }

        if (i === expDigitStart) {
          i = expStart
        }
      }
    }

    const token = this.getToken()
    token.type = 'number'
    token.value = input.substring(position, i)
    token.position = position
    return token
  }

  private parseIdentifier(input: string, position: number): Token | null {
    const charCode = input.charCodeAt(position)
    if (position >= input.length || charCode >= 128 || !this.identifierStartLookup[charCode]) {
      return null
    }

    let i = position + 1
    while (i < input.length) {
      const code = input.charCodeAt(i)
      if (code >= 128 || !this.identifierPartLookup[code]) break
      i++
    }

    const value = input.substring(position, i)
    const token = this.getToken()
    token.type = this.keywordSet.has(value) ? 'keyword' : 'identifier'
    token.value = value
    token.position = position
    return token
  }

  private parseString(input: string, position: number): Token | null {
    if (position >= input.length) return null

    const delimiterCode = input.charCodeAt(position)
    if (delimiterCode >= 128 || !this.stringDelimiterLookup[delimiterCode]) return null

    const delimiter = input[position]
    const closingPos = input.indexOf(delimiter, position + 1)

    const token = this.getToken()

    if (closingPos === -1) {
      token.type = 'unterminated-string'
      token.value = input.substring(position)
      token.position = position
      return token
    }

    token.type = 'string'
    token.value = input.substring(position, closingPos + 1)
    token.position = position
    return token
  }

  private parseComment(input: string, position: number): Token | null {
    const match = this.commentTrie.findLongestMatch(input, position)
    if (!match) return null

    const { suffix } = match.value
    const prefixEnd = position + match.length
    const token = this.getToken()
    token.position = position

    if (!suffix) {
      token.type = 'comment'
      token.value = input.substring(position)
      return token
    }

    const suffixPos = input.indexOf(suffix, prefixEnd)
    const endPos = suffixPos >= 0 ? suffixPos + suffix.length : input.length

    token.type = 'comment'
    token.value = input.substring(position, endPos)
    return token
  }

  private parseCustom(input: string, position: number): Token | null {
    for (const [type, pattern] of this.compiledCustomPatterns.entries()) {
      const match = pattern.trie.findLongestMatch(input, position)
      if (match) {
        const token = this.getToken()
        token.type = type
        token.value = match.value.word as string
        token.position = position
        return token
      }
    }

    for (const [type, pattern] of this.compiledCustomPatterns.entries()) {
      for (const regex of pattern.regexes) {
        const remaining = input.slice(position)
        const match = remaining.match(regex)
        if (match?.index === 0) {
          const token = this.getToken()
          token.type = type
          token.value = match[0]
          token.position = position
          return token
        }
      }
    }

    return null
  }

  private processLine(line: string): Token[] {
    const tokens: Token[] = []
    let position = 0

    while (position < line.length) {
      const charCode = line.charCodeAt(position)
      let token: Token | null = null

      if (!this.config.tokensOnly) {
        token = this.parseComment(line, position)
        if (token) {
          tokens.push(token)
          position += token.value.length
          continue
        }
      }

      token = this.parseCustom(line, position)
      if (token) {
        tokens.push(token)
        position += token.value.length
        continue
      }

      if (!this.config.tokensOnly) {
        if (charCode < 128) {
          if (this.stringDelimiterLookup[charCode]) {
            token = this.parseString(line, position)
          } else if (this.digitLookup[charCode]) {
            token = this.parseNumber(line, position)
          } else if (this.identifierStartLookup[charCode]) {
            token = this.parseIdentifier(line, position)
          }
        }

        if (token) {
          tokens.push(token)
          position += token.value.length
          continue
        }
      }

      if (!this.config.noSpace && charCode < 128 && this.whitespaceLookup[charCode]) {
        const token = this.getToken()
        token.type = 'space'
        token.value = line[position]
        token.position = position
        tokens.push(token)
        position++
        continue
      }

      if (!this.config.noUnknownTokens) {
        const token = this.getToken()
        token.type = 'unknown'
        token.value = line[position]
        token.position = position
        tokens.push(token)
      }
      position++
    }

    return tokens
  }

  public process(input: string): Token[][] {
    this.poolIndex = 0

    const lines = input.split('\n')
    const result: Token[][] = []

    for (const line of lines) {
      if (line.length === 0) {
        if (!this.config.noEmptyLines) {
          const token = this.getToken()
          token.type = 'empty-line'
          token.value = ''
          token.position = 0
          result.push([token])
        }
      } else {
        result.push(this.processLine(line))
      }
    }

    return result
  }
}

export * from './types'
export { TrieNode } from './lib/TrieNode'
export default Ngurai
