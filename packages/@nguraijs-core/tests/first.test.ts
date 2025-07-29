import { Ngurai, identifierPatterns } from '../src/index.ts'
import { describe, expect, it, test } from 'vitest'

describe('NguraiJS', () => {
  let urx = new Ngurai()

  const keywordTest = (urx, type = 'keyword') => {
    expect(urx.process('hello')[0][0].type).toBe(type)
    expect(urx.process('hello')[0][0].value).toBe('hello')
    expect(urx.process('my-custom')[0][0].type).toBe(type)
    expect(urx.process('my-custom')[0][0].value).toBe('my-custom')
    expect(urx.process('my-custom')[0][0].position).toBe(0)
  }
  it('should parse default', () => {
    expect(urx.process('my-custom hello')).toEqual([
      [
        { type: 'identifier', value: 'my', position: 0 },
        { type: 'unknown', value: '-', position: 2 },
        { type: 'identifier', value: 'custom', position: 3 },
        { type: 'space', value: ' ', position: 9 },
        { type: 'identifier', value: 'hello', position: 10 }
      ]
    ])
  })
  it('should parse keywords', () => {
    keywordTest(
      new Ngurai({
        identifierParts: '-'
      }),
      'identifier'
    )
  })
  it('should parse keywords with hooks identifier pattern', () => {
    keywordTest(
      new Ngurai({
        identifierPattern: (s, p) => {
          'hm'.split('').forEach((c) => s.add(c))
          'hmeloycust-'.split('').forEach((c) => p.add(c))
        }
      }),
      'identifier'
    )
  })
  it('should parse keywords with object identifier pattern', () => {
    keywordTest(
      new Ngurai({
        identifierPattern: {
          starts: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-',
          parts: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789_-'
        }
      }),
      'identifier'
    )
  })
  it('should parse customs', () => {
    keywordTest(
      new Ngurai({
        tokens: {
          keyword: ['my-custom', 'hello']
        }
      })
    )
  })
  it('should parse customs as regexp', () => {
    keywordTest(
      new Ngurai({
        tokens: {
          keyword: [/^(hello|my-custom)\b/]
        }
      })
    )
  })
  it('should parse numbers', () => {
    expect(urx.process('56')[0][0].type).toBe('number')
    expect(urx.process('87.5')[0][0].type).toBe('number')
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
      tokens: {
        keyword: ['const'],
        punctuation: ['(', ')', '=', ';']
      }
    })
    const tokens = urx.process('const data = hello()')[0]

    expect(tokens[0].type).toBe('keyword')
    expect(tokens[4].type).toBe('punctuation')
    expect(tokens[4].value).toBe('=')
    expect(tokens[7].type).toBe('punctuation')
    expect(tokens[7].value).toBe('(')
    expect(tokens[8].value).toBe(')')
  })
  it('should parse comments', () => {
    urx = new Ngurai({
      comments: [{ prefix: '//' }, { prefix: '/*', suffix: '*/' }]
    })
    const tokens = urx.process(
      '// this is comments\n const data = /* this is also comment */ "hello world!"'
    )

    expect(tokens).toEqual([
      [{ type: 'comment', value: '// this is comments', position: 0 }],
      [
        { type: 'space', value: ' ', position: 0 },
        { type: 'identifier', value: 'const', position: 1 },
        { type: 'space', value: ' ', position: 6 },
        { type: 'identifier', value: 'data', position: 7 },
        { type: 'space', value: ' ', position: 11 },
        { type: 'unknown', value: '=', position: 12 },
        { type: 'space', value: ' ', position: 13 },
        {
          type: 'comment',
          value: '/* this is also comment */',
          position: 14
        },
        { type: 'space', value: ' ', position: 40 },
        { type: 'string', value: '"hello world!"', position: 41 }
      ]
    ])
  })
})
