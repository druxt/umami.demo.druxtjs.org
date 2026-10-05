/** JSON from Drupal's JSON:API, server side, or null on any failure. */
const http = require('http')
const https = require('https')

function getJson(drupalUrl, path) {
  return new Promise((resolve) => {
    const url = new URL(path, drupalUrl)
    const client = url.protocol === 'https:' ? https : http
    const req = client.get(
      url,
      { headers: { Accept: 'application/vnd.api+json' }, timeout: 15000 },
      (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk
          if (body.length > 5 * 1024 * 1024) req.destroy()
        })
        res.on('end', () => {
          try {
            resolve(res.statusCode === 200 ? JSON.parse(body) : null)
          } catch (e) {
            resolve(null)
          }
        })
      }
    )
    req.on('timeout', () => req.destroy())
    req.on('error', () => resolve(null))
  })
}

/** Plain text from a little HTML: tags out, the common entities decoded. */
const text = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const LANG = /^(en|es)$/

module.exports = { getJson, text, LANG }
