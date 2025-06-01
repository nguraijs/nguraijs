import { Ngurai, identifierPatterns } from '../src/index.ts'
import { describe, expect, it, test } from 'vitest'

describe('NguraiJS Unit Test', () => {
  let urx = new Ngurai()
  it('should parse keywords', () => {
    urx = new Ngurai({
      keywords: ['my-custom', 'hello'],
      identifierRegex: identifierPatterns.withHyphens
    })

    expect(urx.process('hello')[0][0].type).toBe('keyword')
    expect(urx.process('my-custom')[0][0].type).toBe('keyword')
  })
  it('should parse numbers', () => {
    expect(urx.process('56')[0][0].type).toBe('number')
    expect(urx.process('87.5')[0][0].type).toBe('number')
  })
})
