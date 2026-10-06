/**
 * An Umami Go table's address is rendered by the browser, so a link pasted
 * into a chat would preview as the site's front page. The fallback page goes
 * out with a head of its own instead: the table's code, the game's card, and
 * a request not to index a table that lasts an evening.
 */

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/** The fallback page's HTML with the table's title, description and card. */
function tablePage(html, { code, origin }) {
  const title = `Umami Go: join table ${code}`
  const description =
    "You're invited to a game of Umami Go: draft the magazine's recipes into the best meal at the table."
  const url = `${origin}/play/${code}`
  const image = `${origin}/og/umami-go.png`
  const tags = [
    ['name', 'robots', 'noindex'],
    ['property', 'og:type', 'website'],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', url],
    ['property', 'og:image', image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:site_name', 'Umami'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', image],
  ]
    .map(
      ([attr, key, value]) =>
        `<meta ${attr}="${key}" content="${escape(value)}">`
    )
    .join('')
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
    .replace(
      /(<meta[^>]*name="description"[^>]*content=")[^"]*(")/,
      `$1${escape(description)}$2`
    )
    .replace('</head>', `${tags}</head>`)
}

module.exports = { tablePage }
