const { Ngurai } = require('../dist/index.cjs')

function render(code) {
  const urx = new Ngurai({
    custom: {
      tag: ['div', 'p'],
      attribute: ['class', /data-[a-zA-Z0-9]+/],
      punctuation: ['<', '>', '</', '=']
    }
  })

  const data = urx.process(code)
  console.log(data)

  return data
    .map(
      (line) =>
        '<p>' +
        line
          .map(
            (token) =>
              `<span class="token ${token.type}">${token.value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/ /g, '&nbsp;')}</span>`
          )
          .join('') +
        '</p>'
    )
    .join('\n')
}

console.log(
  render(`
<main class="max-w-3xl flex gap-5">
  <div class="bg-red-500 w-10" data-item="4"></div>
  <div class="bg-blue-500 h-10 grid" data-whatever="2"></div>
</main>
`)
)
