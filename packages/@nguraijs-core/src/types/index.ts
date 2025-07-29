import { TrieNode } from '../lib/TrieNode'

export interface Config {
  stringDelimiters?: string[]
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
  tokens?: Record<string, (string | RegExp)[]>
  noUnknownTokens?: boolean
  noSpace?: boolean
  noEmptyLines?: boolean
  tokensOnly?: boolean
}

export interface Token {
  type: string
  value: string
  position: number
  source?: string
  metadata?: Record<string, any>
}

export interface CompiledPattern {
  trie: TrieNode
  regexes: RegExp[]
  sortedStrings: string[]
}
