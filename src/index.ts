interface TokenizerConfig {
  keywords?: string[]
  punctuation?: string[]
  operators?: string[]
  stringDelimiters?: string[]
  numberRegex?: RegExp
  identifierRegex?: RegExp
  whitespaceRegex?: RegExp
  commentPrefixes?: string[]
  commentSuffixes?: string[]
  custom?: Record<string, (string | RegExp)[]>
  plugins?: TokenizerPlugin[]
  noUnknownToken?: boolean
  noSpace?: boolean
  customOnly?: boolean
}

interface TokenizerPlugin {
  name: string
  process: (input: string, position: number) => Token | null
}

interface Token {
  type: string
  value: string
  position: number
}

export class Ngurai {
  private config: Required<TokenizerConfig>

  constructor(config: TokenizerConfig = {}) {
    this.config = {
      keywords: config.keywords || [],
      punctuation: config.punctuation || [],
      operators: config.operators || [],
      stringDelimiters: config.stringDelimiters || ['"', "'", '`'],
      numberRegex: config.numberRegex || /^\d+(\.\d+)?([eE][+-]?\d+)?/,
      identifierRegex: config.identifierRegex || /^[a-zA-Z_$][a-zA-Z0-9_$]*/,
      whitespaceRegex: config.whitespaceRegex || /^[ \t]+/,
      commentPrefixes: config.commentPrefixes || ['//', '/*'],
      commentSuffixes: config.commentSuffixes || ['', '*/'],
      custom: config.custom || {},
      plugins: config.plugins || [],
      noUnknownToken: config.noUnknownToken || false,
      noSpace: config.noSpace || false,
      customOnly: config.customOnly || false
    }
  }

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
        // For single-line comments (e.g., //)
        if (suffix === '') {
          return {
            type: 'comment',
            value: input.substring(position),
            position
          }
        }
        // For inline comments (e.g., /* */)
        else {
          const endPos = input.indexOf(suffix, position + prefix.length)
          if (endPos >= 0) {
            // Found closing suffix on same line
            return {
              type: 'comment',
              value: input.substring(position, endPos + suffix.length),
              position
            }
          } else {
            // Suffix not found on this line - treat as line comment until end
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
      // First try string literal matches
      const stringPatterns = patterns.filter((p) => typeof p === 'string') as string[]
      const token = this.parseFromList(input, position, stringPatterns, type)
      if (token) return token

      // Then try regex patterns
      const regexPatterns = patterns.filter((p) => p instanceof RegExp) as RegExp[]
      for (const pattern of regexPatterns) {
        const remaining = input.slice(position)
        const match = remaining.match(pattern)
        if (match && match.index === 0) {
          // Match must be at the start
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

  public registerPlugin(plugin: TokenizerPlugin): void {
    this.config.plugins.push(plugin)
    return this
  }

  public process(input: string): Token[][] {
    const lines: Token[][] = []
    let globalPosition = 0 // Track position across entire input

    for (const line of input.split('\n')) {
      let localPosition = 0 // Track position relative to the line
      let currentLine: Token[] = []

      while (localPosition < line.length) {
        const char = line[localPosition]
        let token: Token | null = null

        // Process plugins
        for (const plugin of this.config.plugins) {
          token = plugin.process(line, localPosition)
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            break
          }
        }
        if (token) continue

        if (!this.config.customOnly) {
          // Check for comments
          token = this.parseComment(line, localPosition)
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            continue
          }
        }

        // Check for custom identifiers
        token = this.parseCustom(line, localPosition)
        if (token) {
          currentLine.push(token)
          localPosition += token.value.length
          globalPosition += token.value.length
          continue
        }

        // Handle spaces - split into individual tokens
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
          // Check for punctuation
          token = this.parseFromList(line, localPosition, this.config.punctuation, 'punctuation')
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            continue
          }

          // Check for identifiers, keywords, and variables
          token = this.parseIdentifierOrKeyword(line, localPosition)
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            continue
          }

          // Check for numbers
          token = this.parseNumber(line, localPosition)
          if (token) {
            currentLine.push(token)
            localPosition += token.value.length
            globalPosition += token.value.length
            continue
          }

          // Check for strings
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
}

export default Ngurai
