const test = require('node:test')
const assert = require('node:assert')
const { tablePage } = require('./table-page')

const fallback =
  '<html><head><title>Umami</title><meta data-hid="description" name="description" content="A magazine."></head><body></body></html>'

test("a table's page previews as an invitation to that table", () => {
  const html = tablePage(fallback, {
    code: 'K7QF',
    origin: 'https://umami.example',
  })
  assert.match(html, /<title>Umami Go: join table K7QF<\/title>/)
  assert.match(html, /name="description" content="You're invited/)
  assert.match(
    html,
    /property="og:url" content="https:\/\/umami.example\/play\/K7QF"/
  )
  assert.match(
    html,
    /property="og:image" content="https:\/\/umami.example\/og\/umami-go.png"/
  )
  assert.match(html, /name="robots" content="noindex"/)
  assert.ok(!html.includes('A magazine.'))
  assert.ok(html.indexOf('og:title') < html.indexOf('</head>'))
})

test('values are escaped into the attributes', () => {
  const html = tablePage(fallback, { code: 'K7QF', origin: 'https://a"b' })
  assert.match(html, /content="https:\/\/a&quot;b\/play\/K7QF"/)
})
