# `@nguraijs/core`

A very lightweight tokenizer library.

## Installation

```bash
npm i @nguraijs/core
```

## Usage Example

```javascript
import { Ngurai } from '@nguraijs/core'

const urx = new Ngurai({
  comments: [{ prefix: '//' }, { prefix: '/*', suffix: '*/' }],
  tokens: {
    keyword: ['const', 'console'],
    punctuation: ['=', ';', '.', '(', ')'],
    global: ['log']
  }
})

urx.process(`const data = /*@__PURE__*/ 56;\nconsole.log(data); // this is comment`)
```

Output :

```javascript
;[
  [
    { type: 'keyword', value: 'const', position: 0 },
    { type: 'space', value: ' ', position: 5 },
    { type: 'identifier', value: 'data', position: 6 },
    { type: 'space', value: ' ', position: 10 },
    { type: 'punctuation', value: '=', position: 11 },
    { type: 'space', value: ' ', position: 12 },
    { type: 'comment', value: '/*@__PURE__*/', position: 13 },
    { type: 'space', value: ' ', position: 26 },
    { type: 'number', value: '56', position: 27 },
    { type: 'punctuation', value: ';', position: 29 }
  ],
  [
    { type: 'keyword', value: 'console', position: 0 },
    { type: 'punctuation', value: '.', position: 7 },
    { type: 'globals', value: 'log', position: 8 },
    { type: 'punctuation', value: '(', position: 11 },
    { type: 'identifier', value: 'data', position: 12 },
    { type: 'punctuation', value: ')', position: 16 },
    { type: 'punctuation', value: ';', position: 17 },
    { type: 'space', value: ' ', position: 18 },
    { type: 'comment', value: '// this is comment', position: 19 }
  ]
]
```

## LICENSE

MIT © 2025-present NguraiJS Team
