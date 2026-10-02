/**
 * Drupal's filtered HTML as Markdown, for `/llms-full.txt`: a recipe's
 * method keeps its numbered steps, an article its headings, lists and links.
 *
 * Hand-rolled because the input is narrow and known:
 * CKEditor output of `p`, `h2`-`h6`, `ul`/`ol`/`li`, `blockquote`, `a`,
 * `strong`, `em` and `code`. Anything else degrades to its text, the right
 * failure for a plain-text file. Pure, so it can be tested without a build.
 */

/** Elements that never take a closing tag. */
const VOID_TAGS = new Set(['br', 'hr', 'img'])

/** Elements rendered as their own block rather than run into a paragraph. */
const BLOCK_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'blockquote',
  'hr',
])

/** The named entities that occur in the content, plus the XML five. */
const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/**
 * A root-relative URL made absolute: read away from the site, `/en/...`
 * resolves against nothing. Absolute and protocol-relative URLs pass.
 *
 * @param {string} url - A URL as it appears in the content.
 * @param {string} origin - Absolute origin, without a trailing slash.
 * @returns {string} The URL, absolute if it was root-relative.
 */
const absoluteUrl = (url, origin) =>
  url.startsWith('/') && !url.startsWith('//') ? `${origin}${url}` : url

/**
 * A URL safe as a Markdown link destination: a space or a parenthesis would
 * end the `(...)` early, and percent-encoding them keeps the meaning.
 *
 * @param {string} url - An absolute URL.
 * @returns {string} The URL with spaces and parentheses encoded.
 */
const linkDestination = (url) =>
  url.replace(
    /[ ()]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )

/** Character references decoded; an unknown named one is left as written. */
const decodeEntities = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name.startsWith('#')) {
      const hex = name[1] === 'x' || name[1] === 'X'
      return String.fromCodePoint(
        Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10)
      )
    }
    return NAMED_ENTITIES[name.toLowerCase()] || entity
  })

/**
 * An HTML fragment as a tree. Tolerant: a stray closing tag is ignored, and
 * an unclosed element closes with its parent or the end of the input.
 *
 * @param {string} html - The fragment.
 * @returns {Array<object|string>} Its top-level nodes.
 */
function parse(html) {
  const root = { tag: '#root', children: [] }
  const stack = [root]
  for (const match of html.matchAll(
    /<(\/?)([a-z][a-z0-9]*)([^>]*)>|([^<]+)/gi
  )) {
    const [, closing, rawTag, attrs, text] = match
    const current = stack[stack.length - 1]
    if (text !== undefined) {
      current.children.push(decodeEntities(text))
      continue
    }
    const tag = rawTag.toLowerCase()
    if (closing) {
      // The innermost open element of this name; Node 16 has no findLastIndex.
      let index = stack.length - 1
      while (index > 0 && stack[index].tag !== tag) index--
      if (index > 0) stack.length = index
      continue
    }
    const href = (/\bhref="([^"]*)"/i.exec(attrs) || [])[1]
    const node = { tag, children: [] }
    if (href !== undefined) node.href = decodeEntities(href)
    current.children.push(node)
    if (!VOID_TAGS.has(tag)) stack.push(node)
  }
  return root.children
}

/** Nodes as inline Markdown, whitespace collapsed as a browser would. */
function renderInline(nodes, options) {
  return nodes
    .map((node) => {
      if (typeof node === 'string') return node.replace(/\s+/g, ' ')
      const inner = renderInline(node.children, options)
      switch (node.tag) {
        case 'strong':
        case 'b':
          return `**${inner.trim()}**`
        case 'em':
        case 'i':
          return `*${inner.trim()}*`
        case 'code': {
          // A code span's fence outruns any backtick run inside it.
          const longest = Math.max(
            0,
            ...(inner.match(/`+/g) || []).map((run) => run.length)
          )
          const fence = '`'.repeat(longest + 1)
          return longest
            ? `${fence} ${inner} ${fence}`
            : `${fence}${inner}${fence}`
        }
        case 'a':
          return node.href
            ? `[${inner.trim()}](${linkDestination(
                absoluteUrl(node.href, options.origin)
              )})`
            : inner
        case 'br':
          return '\n'
        default:
          return inner
      }
    })
    .join('')
}

/** One block element as Markdown, trimmed. */
function renderBlock(node, options) {
  const heading = /^h([1-6])$/.exec(node.tag)
  if (heading) {
    const level = Math.min(Number(heading[1]) + options.headingOffset, 6)
    return `${'#'.repeat(level)} ${renderInline(node.children, options).trim()}`
  }
  switch (node.tag) {
    case 'ul':
    case 'ol': {
      const items = node.children.filter(
        (child) => typeof child !== 'string' && child.tag === 'li'
      )
      return items
        .map((item, index) => {
          const marker = node.tag === 'ol' ? `${index + 1}.` : '-'
          // As blocks, so a nested list keeps its markers, indented under
          // this item.
          const indent = ' '.repeat(marker.length + 1)
          const lines = renderBlocks(item.children, options).split('\n')
          return [
            `${marker} ${lines[0]}`,
            ...lines.slice(1).map((line) => (line ? `${indent}${line}` : '')),
          ].join('\n')
        })
        .join('\n')
    }
    case 'blockquote':
      return renderBlocks(node.children, options)
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n')
    case 'hr':
      return '***'
    default:
      return renderInline(node.children, options).trim()
  }
}

/** Nodes as blocks with blank lines between; loose inline runs are paragraphs. */
function renderBlocks(nodes, options) {
  const blocks = []
  let run = []
  const flush = () => {
    blocks.push(renderInline(run, options).trim())
    run = []
  }
  for (const node of nodes) {
    if (typeof node !== 'string' && BLOCK_TAGS.has(node.tag)) {
      flush()
      blocks.push(renderBlock(node, options))
    } else {
      run.push(node)
    }
  }
  flush()
  return blocks.filter(Boolean).join('\n\n')
}

/**
 * An HTML fragment as Markdown.
 *
 * @param {string} html - The fragment, as Drupal stores it.
 * @param {object} options - { origin, headingOffset }: links resolve against
 *   the origin, and headings drop by the offset to sit under the caller's.
 * @returns {string} Markdown, blocks separated by blank lines, trimmed.
 */
const htmlToMarkdown = (html, { origin = '', headingOffset = 0 } = {}) =>
  renderBlocks(
    // A comment is not content: the mocktails article carries one.
    parse(String(html || '').replace(/<!--[\s\S]*?-->/g, '')),
    { origin, headingOffset }
  )

module.exports = { htmlToMarkdown, absoluteUrl, linkDestination }
