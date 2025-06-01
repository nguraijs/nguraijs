import { Ngurai, identifierPatterns } from '../src/index.ts'
import { describe, expect, it, test } from 'vitest'

describe('NguraiJS Unit Test', () => {
  let urx = new Ngurai()
  it('should parse keywords', () => {
    urx = new Ngurai({
      plugins: [
        {
          name: 'custom-number',
          process: (input, position) => {
            const match = input.slice(position).match(/^\d+(\.\d+)?([eE][+-]?\d+)?/)
            if (!match) return null
            return {
              type: 'not-number-but-custom-number',
              value: match[0],
              position
            }
          }
        }
      ],
      custom: {
        unit: ['px']
      }
    })

    expect(urx.process('456')[0][0].type).toBe('not-number-but-custom-number')
    expect(urx.process('67px')[0][0].type).toBe('not-number-but-custom-number')
    expect(urx.process('67px')[0][1].type).toBe('unit')
  })
})
