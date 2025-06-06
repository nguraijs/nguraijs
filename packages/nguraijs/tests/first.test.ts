import { Ngurai, identifierPatterns } from '../src/index.ts'
import { describe, expect, it, test } from 'vitest'

describe('NguraiJS', () => {
  let urx = new Ngurai()

  const keywordTest = (urx) => {
    expect(urx.process('hello')[0][0].type).toBe('keyword')
    expect(urx.process('hello')[0][0].value).toBe('hello')
    expect(urx.process('my-custom')[0][0].type).toBe('keyword')
    expect(urx.process('my-custom')[0][0].value).toBe('my-custom')
    expect(urx.process('my-custom')[0][0].position).toBe(0)
  }

  it('should parse keywords', () => {
    keywordTest(
      new Ngurai({
        keywords: ['my-custom', 'hello'],
        identifierParts: '-'
      })
    )
  })
  it('should parse keywords with hooks identifier pattern', () => {
    keywordTest(
      new Ngurai({
        keywords: ['my-custom', 'hello'],
        identifierPattern: (s, p) => {
          'hm'.split('').forEach((c) => s.add(c))
          'hmeloycust-'.split('').forEach((c) => p.add(c))
        }
      })
    )
  })
  it('should parse keywords with object identifier pattern', () => {
    keywordTest(
      new Ngurai({
        keywords: ['my-custom', 'hello'],
        identifierPattern: {
          starts: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-',
          parts: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789_-'
        }
      })
    )
  })
  it('should parse numbers', () => {
    expect(urx.process('56')[0][0].type).toBe('number')
    expect(urx.process('87.5')[0][0].type).toBe('number')
  })
  it('should parse customs', () => {
    keywordTest(
      new Ngurai({
        custom: {
          keyword: ['my-custom', 'hello']
        }
      })
    )
  })
  it('should parse customs as regexp', () => {
    keywordTest(
      new Ngurai({
        custom: {
          keyword: [/^(hello|my-custom)\b/]
        }
      })
    )
  })
  it('should parse spaces', () => {
    expect(urx.process('hello ')[0][1].type).toBe('space')
    expect(urx.process(' my-custom')[0][0].type).toBe('space')
  })
  it('should parse spaces with functional hooks', () => {
    const urx = new Ngurai({
      whitespacePattern: (x) => {
        x.add(' ')
      }
    })
    expect(urx.process('hello ')[0][1].type).toBe('space')
    expect(urx.process(' my-custom')[0][0].type).toBe('space')
  })
  it('should process with plugin', () => {
    const urx = new Ngurai({
      plugins: [
        {
          name: 'keyword-parser',
          process: (input, position) => {
            const match = input
              .slice(position)
              .match(new RegExp(`^(${['my-custom', 'hello'].join('|')})\\b`))
            if (!match) return null
            return { type: 'keyword', value: match[0], position }
          }
        }
      ]
    })
    keywordTest(urx)
  })
  it('should process without spaces', () => {
    const urx = new Ngurai({
      noSpace: true
    })
    expect(urx.process('hello ')[0][1].type).toBe('unknown')
    expect(urx.process(' my-custom')[0][0].type).toBe('unknown')
  })
  it('should process without spaces & unknown tokens', () => {
    const urx2 = new Ngurai({
      noSpace: true,
      noUnknownTokens: true
    })
    expect(urx.process('     hello ')[0].length).toBe(7)
    expect(urx2.process('     hello ')[0].length).toBe(1)
    expect(urx.process(' mycustom')[0].length).toBe(2)
  })
  it('should parse punctuations', () => {
    urx = new Ngurai({
      keywords: ['const'],
      punctuations: ['(', ')', '=', ';']
    })
    const tokens = urx.process('const data = hello()')[0]
    expect(tokens[0].type).toBe('keyword')
    expect(tokens[4].type).toBe('punctuation')
    expect(tokens[4].value).toBe('=')
    expect(tokens[7].type).toBe('punctuation')
    expect(tokens[7].value).toBe('(')
    expect(tokens[8].value).toBe(')')
  })
})
