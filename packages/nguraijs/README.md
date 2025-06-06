# NguraiJS

Ngurai _(ngooh-rai)_ (means **Breaking Down** or **Describing** in [Javanese](https://en.wikipedia.org/wiki/Javanese_language)) is a extensible, fast, and lightweight string tokenizer.

## Installation

```bash
npm i nguraijs
```

## Usage Example

```javascript
import { Ngurai } from 'nguraijs'

const urx = new Ngurai({
  keywords: ['const', 'console'],
  punctuations: ['=', ';', '.', '(', ')'],
  comments: [{ prefix: '//' }, { prefix: '/*', suffix: '*/' }],
  custom: {
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
