# Ngurai.JS

Ngurai _(ngooh-rai)_ (means **Breaking Down** or **Describing** in Javanese) is a small, highly customized library for **line-by-line** parsing and tokenize strings.

## Installation

```bash
npm i nguraijs
```

## Usage Example

```javascript
const { Ngurai } = require('nguraijs')

const urx = new Ngurai({
  commentPrefixes: [' *', '/*'],
  keywords: ['const', 'return', 'function'],
  punctuation: ['='],
  custom: {
    // custom keywords
    variable: ['tx'],
    comment: [' */'] // work with entire characters processing
  }
})

console.log(
  urx.process(
    `/* it should
 * parse nothing
 */
 
const tx = /* comments */ 'hello, world!'`
  )
)
```

Output :

```javascript
;[
  [{ type: 'comment', value: '/* it should', position: 0 }],
  [{ type: 'comment', value: ' * parse nothing', position: 0 }],
  [{ type: 'comment', value: ' */', position: 0 }],
  [{ type: 'space', value: ' ', position: 0 }],
  [
    { type: 'keyword', value: 'const', position: 0 },
    { type: 'space', value: ' ', position: 5 },
    { type: 'variable', value: 'tx', position: 6 },
    { type: 'space', value: ' ', position: 8 },
    { type: 'punctuation', value: '=', position: 9 },
    { type: 'space', value: ' ', position: 10 },
    { type: 'comment', value: '/* comments */', position: 11 },
    { type: 'space', value: ' ', position: 25 },
    { type: 'string', value: "'hello, world!'", position: 26 }
  ]
]
```

## APIs

### Exports

`nguraijs` only has `Ngurai` as export and default export :

```javascript
export class Ngurai {
  /* ... */
}
export default Ngurai // default export only available on esm
```

### `cjs`

```javascript
const { Ngurai } = require('nguraijs')
```

### `esm`

```javascript
import { Ngurai } from 'nguraijs'
```

### `iife`

```html
<script src="https://cdn.jsdelivr.net/npm/nguraijs@0.4/dist/index.iife.js"></script>
<script>
  const { Ngurai } = __nguraijs__
</script>
```

### Types

```typescript
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
```

### Constructor

```typescript
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
}
```

### Public Methods

#### `registerPlugin`

Register new plugin into NguraiJS.

```typescript
public registerPlugin(plugin: TokenizerPlugin) {}
```

#### `process`

Method to process or tokenize the input string and return the tokenized data.

```typescript
public process(input: string): Token[][] {}
```

## LICENSE

MIT © 2025 NOuSantx
