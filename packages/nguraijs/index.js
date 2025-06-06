const { Ngurai } = require('./dist/index.cjs')

const urx = new Ngurai({
  keywords: ['const'],
  punctuations: ['(', ')', '='],
  custom: {
    functionName: [/^(ngurai|process)\b/]
  }
})

console.log(urx.process('const data = ngurai()'))
