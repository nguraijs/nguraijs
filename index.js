import { Tokenizer } from './dist/index.es.js'

const css = new Tokenizer({
  keywords: ['body'],
  punctuation: ['{', '}', '(', ')', '[', ']', ';', ',', '.', ':'],
  custom: {
    'css-value': ['red', 'yellow', 'inline-flex', 'blue', /var\(--[a-zA-Z0-9-]+\)/],
    variable: [/--[a-zA-Z0-9-]+/]
  }
})

const tokens = css.tokenize(`
/* short comment */
main { display: var(--display); --padding: 10px; }
.main {
  display: inline-flex;
  background: blue;
}`)

function processTokens(tokens) {
  let output = ''

  tokens.forEach((line) => {
    output += '<p>'
    line.forEach((token) => {
      output += `<span class="token ${token.type}">${token.value.replace(/ /g, '&nbsp;')}</span>`
    })
    output += '</p>\n' // Wrap lines in <p> tags
  })

  return output.trim()
}

console.log(tokens)
console.log(processTokens(tokens))
