/**
 * Turns a jsonapi_diff document into something a change list can render.
 *
 * Two facts about the payload drive this, both found by testing it. Its
 * `summary` counts only the root entity's own fields, so this walks the whole
 * tree and counts as it goes. And a child carries two independent signals:
 * `meta.status` says whether the reference moved (added, removed, moved, same),
 * while the child's own field diffs say whether the content changed. A block
 * can be `same` by reference and still have a changed body, so the two are kept
 * as separate axes and combined into one honest label per block.
 *
 * CommonJS so the tests and the components can both require it.
 */

/** The change label for a block, from its reference signal and its field changes. */
const label = (refStatus, contentChanged) => {
  if (refStatus === 'added' || refStatus === 'removed') return refStatus
  if (refStatus === 'moved') return 'moved'
  return contentChanged ? 'changed' : 'same'
}

/** A map of every diff resource in the document by id (root and included alike). */
const index = (document) => {
  const map = new Map()
  const add = (r) => r && r.id && map.set(r.id, r)
  add(document.data)
  for (const r of document.included || []) add(r)
  return map
}

/** A diff resource's raw fields as a name->field map, tolerating the empty `[]`. */
const fieldMap = (resource) => {
  const fields = (resource.attributes || {}).fields || {}
  if (Array.isArray(fields)) {
    const out = {}
    for (const f of fields) if (f && f.name) out[f.name] = f
    return out
  }
  return fields
}

/** The changed fields of one diff resource, keeping left/right for a word diff. */
const changedFields = (resource) =>
  Object.entries(fieldMap(resource))
    .filter(([, f]) => f && f.status && f.status !== 'same')
    .map(([name, f]) => ({
      name,
      label: f.label || name,
      status: f.status,
      left: f.left || '',
      right: f.right || '',
      ops: f.ops || [],
    }))

/** Which side of the diff a child id (`uuid:leftVid:rightVid`) sits on. */
const sideOf = (id) => {
  const [, left, right] = String(id || '').split(':')
  if (left && !right) return 'removed'
  if (right && !left) return 'added'
  return 'paired'
}

const tokenise = (s) => String(s).split(/\s+/).filter(Boolean)

/** Length of the longest common subsequence of two token arrays. */
const lcsLength = (a, b) => {
  const dp = new Array(b.length + 1).fill(0)
  for (let i = a.length - 1; i >= 0; i -= 1) {
    let prev = 0
    for (let j = b.length - 1; j >= 0; j -= 1) {
      const tmp = dp[j]
      dp[j] = a[i] === b[j] ? prev + 1 : Math.max(dp[j], dp[j + 1])
      prev = tmp
    }
  }
  return dp[0]
}

/** Dice-style similarity of two strings over word tokens; empty vs empty is 1. */
const similarity = (a, b) => {
  const at = tokenise(a)
  const bt = tokenise(b)
  if (!at.length && !bt.length) return 1
  if (!at.length || !bt.length) return 0
  return (2 * lcsLength(at, bt)) / (at.length + bt.length)
}

/** The old (removed side) or new (added side) text of a diff resource's changed fields. */
const sideText = (resource, key) =>
  Object.values(fieldMap(resource))
    .map((f) => (f && f[key]) || '')
    .join(' ')

// A rebuilt paragraph shares little identity with its old self except position,
// so a pair is only trusted when its content still reads as the same block.
const PAIR_THRESHOLD = 0.4

// A block that changed position has no position to vouch for it, so a move is
// only read where the content is close to the same. Below this the two are a
// removal and an addition that happen to rhyme.
const MOVE_THRESHOLD = 0.8

/**
 * Which of a parent's pairs are still in reading order.
 *
 * Moving one block past three others changes the position of all four, and
 * calling all four moved tells a reader nothing. The longest run of pairs
 * whose old and new positions agree is taken as the order that held, and what
 * is left over is what moved.
 *
 * @param {Array<{from: number, to: number}>} pairs - Old and new positions.
 * @returns {Set<number>} The indices of the pairs that held their order.
 */
const inOrder = (pairs) => {
  const order = pairs
    .map((pair, index) => ({ ...pair, index }))
    .sort((a, b) => a.to - b.to)
  // The longest run whose old positions only ever go forwards.
  const runs = order.map(() => 1)
  const prior = order.map(() => -1)
  let end = 0
  for (let i = 0; i < order.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (order[j].from < order[i].from && runs[j] + 1 > runs[i]) {
        runs[i] = runs[j] + 1
        prior[i] = j
      }
    }
    if (runs[i] > runs[end]) end = i
  }
  const kept = new Set()
  for (let at = order.length ? end : -1; at >= 0; at = prior[at]) {
    kept.add(order[at].index)
  }
  return kept
}

/**
 * Merge a removed resource and the added resource that replaced it into one
 * field list a wrapper can diff: the old value from the removed side, the new
 * value from the added side, per public field name.
 */
const mergePair = (removed, added) => {
  const rf = fieldMap(removed)
  const af = fieldMap(added)
  const names = new Set([...Object.keys(rf), ...Object.keys(af)])
  const out = []
  for (const name of names) {
    const left = (rf[name] && rf[name].left) || ''
    const right = (af[name] && af[name].right) || ''
    const status =
      left && right
        ? left === right
          ? 'same'
          : 'changed'
        : right
          ? 'added'
          : left
            ? 'removed'
            : 'same'
    out.push({
      name,
      label: (af[name] || rf[name] || {}).label || name,
      status,
      left,
      right,
      ops: (af[name] || rf[name] || {}).ops || [],
    })
  }
  return out
}

/**
 * Walk the diff tree into an ordered list of blocks with honest counts.
 *
 * A draft authored by recreating paragraphs gives every block a new uuid, so
 * the diff reports the old ones wholly removed and the new ones wholly added,
 * with no pair to word-diff. Among one parent's children this re-pairs a
 * removed and added block that share a parent field and delta and still read as
 * the same block, into one `changed` block keyed on the added (rendered) uuid,
 * so the inline diff lights up where the edit happened rather than nowhere.
 *
 * @param {object} document - The jsonapi_diff document ({ data, included }).
 * @returns {object} { blocks, summary, rootFields, meta, rebuilt }.
 */
const normaliseDiff = (document) => {
  const empty = {
    blocks: [],
    summary: { added: 0, removed: 0, changed: 0, moved: 0, same: 0 },
    rootFields: [],
    meta: {},
    rebuilt: false,
  }
  if (!document || !document.data) return empty
  const byId = index(document)
  const blocks = []
  const uuidOf = (resource) => String(resource.id || '').split(':')[0]

  // A diff resource stands for one block on each side, and the two are not
  // always the same entity: a site that rebuilds its paragraphs on every
  // import gives each revision its own uuids, and the pair is matched by
  // position. The composite id carries one of them, so the pair is read from
  // the relationships, which name both.
  const sideUuids = (resource) => {
    const rel = resource.relationships || {}
    const idOf = (key) => ((rel[key] || {}).data || {}).id || null
    const side = sideOf(resource.id)
    const fallback = uuidOf(resource)
    return {
      left: idOf('left') || (side === 'added' ? null : fallback),
      right: idOf('right') || (side === 'removed' ? null : fallback),
    }
  }

  const push = (resource, refMeta, depth, fields, status, uuids) => {
    blocks.push({
      uuid: uuidOf(resource),
      uuids: uuids || sideUuids(resource),
      depth,
      refStatus: refMeta.status || 'same',
      status,
      field: refMeta.field || null,
      fromDelta: refMeta.left_delta,
      toDelta: refMeta.right_delta,
      fields,
    })
  }

  const children = (resource, depth) => {
    const items = (((resource.relationships || {}).children || {}).data || [])
      .map((c) => ({
        meta: c.meta || {},
        res: byId.get(c.id),
        side: sideOf(c.id),
      }))
      .filter((it) => it.res)

    // Decide re-pairings first, so a removed block already emitted is not also
    // matched: an added block claims the still-free removed sibling at the same
    // parent field and delta whose content it recognises.
    const removed = items.filter((it) => it.side === 'removed')
    const taken = new Set()
    const pairFor = new Map()
    const moved = new Set()
    const claim = (it, match, isMove) => {
      taken.add(match)
      pairFor.set(it, match)
      if (isMove) moved.add(it)
    }
    for (const it of items) {
      if (it.side !== 'added') continue
      const match = removed.find(
        (r) =>
          !taken.has(r) &&
          (r.meta.field || null) === (it.meta.field || null) &&
          r.meta.left_delta === it.meta.right_delta &&
          similarity(sideText(r.res, 'left'), sideText(it.res, 'right')) >=
            PAIR_THRESHOLD
      )
      if (match) claim(it, match, false)
    }
    // Then the same block at another position. An editor who moves a section
    // leaves a removal and an addition that the position test cannot pair, and
    // every word of it is struck and written again: the page says the whole
    // section changed when nothing in it did. Read second, so a block that
    // stayed where it was is never claimed by one that moved.
    for (const it of items) {
      if (it.side !== 'added' || pairFor.has(it)) continue
      const match = removed.find(
        (r) =>
          !taken.has(r) &&
          (r.meta.field || null) === (it.meta.field || null) &&
          similarity(sideText(r.res, 'left'), sideText(it.res, 'right')) >=
            MOVE_THRESHOLD
      )
      if (match) claim(it, match, false)
    }

    // What moved is what broke the order, rather than everything a move
    // pushed along in front of it.
    const paired = [...pairFor.entries()]
    const held = inOrder(
      paired.map(([add, rem]) => ({
        from: rem.meta.left_delta,
        to: add.meta.right_delta,
      }))
    )
    paired.forEach(([add], index) => {
      if (!held.has(index)) moved.add(add)
    })

    for (const it of items) {
      if (it.side === 'removed' && taken.has(it)) continue
      if (it.side === 'added' && pairFor.has(it)) {
        const rem = pairFor.get(it)
        const merged = mergePair(rem.res, it.res)
        const changed = merged.filter((f) => f.status !== 'same')
        const isMove = moved.has(it)
        const refMeta = {
          status: isMove ? 'moved' : 'same',
          field: it.meta.field,
          left_delta: rem.meta.left_delta,
          right_delta: it.meta.right_delta,
        }
        // A block that moved is marked moved either way. Its words are marked
        // only where they differ: striking and reinserting text that did not
        // change says everything changed, and dropping the marks on text that
        // did change hides the edit behind the move.
        const status = isMove ? 'moved' : changed.length ? 'changed' : 'same'
        // Two resources, one block: its left is the removed one's, its right
        // the added one's.
        push(it.res, refMeta, depth, changed, status, {
          left: sideUuids(rem.res).left,
          right: sideUuids(it.res).right,
        })
        children(it.res, depth + 1)
        continue
      }
      const fields = changedFields(it.res)
      push(
        it.res,
        it.meta,
        depth,
        fields,
        label(it.meta.status, fields.length > 0)
      )
      children(it.res, depth + 1)
    }
  }
  children(document.data, 1)

  const summary = blocks.reduce(
    (a, b) => ((a[b.status] = (a[b.status] || 0) + 1), a),
    { added: 0, removed: 0, changed: 0, moved: 0, same: 0 }
  )

  // Rebuilt only if the re-pairing left nothing matched: still all add/remove,
  // in equal number. Once any pair resolves, the diff renders as normal change.
  const rebuilt =
    blocks.length > 0 &&
    blocks.every((b) => b.status === 'added' || b.status === 'removed') &&
    summary.added === summary.removed &&
    summary.added > 0

  // A removed block has no element on the page, so a collapsed marker stands in
  // for it. Anchor each to a surviving sibling by its old position: the marker
  // sits after the block that preceded it, or before the one that followed.
  const survivors = blocks.filter(
    (b) => b.status !== 'removed' && typeof b.fromDelta === 'number'
  )
  for (const gone of blocks) {
    if (gone.status !== 'removed' || typeof gone.fromDelta !== 'number')
      continue
    let pred = null
    let succ = null
    for (const b of survivors) {
      if (b.field !== gone.field || b.depth !== gone.depth) continue
      if (
        b.fromDelta < gone.fromDelta &&
        (!pred || b.fromDelta > pred.fromDelta)
      )
        pred = b
      if (
        b.fromDelta > gone.fromDelta &&
        (!succ || b.fromDelta < succ.fromDelta)
      )
        succ = b
    }
    // The neighbour names a block, and the page renders one side of it, so
    // its pair of uuids rides along with the placement.
    if (pred) {
      gone.placeAfter = pred.uuid
      gone.placeUuids = pred.uuids
    } else if (succ) {
      gone.placeBefore = succ.uuid
      gone.placeUuids = succ.uuids
    }
  }

  return {
    blocks,
    summary,
    rebuilt,
    rootFields: changedFields(document.data),
    meta: {
      left:
        (((document.data.relationships || {}).left || {}).data || {}).meta ||
        {},
      right:
        (((document.data.relationships || {}).right || {}).data || {}).meta ||
        {},
    },
  }
}

/**
 * A word-level diff of two strings, for highlighting a changed field. The
 * backend gives line ops and deliberately no character ops, so the word level
 * is computed here. Returns runs of `{ type: '='|'+'|'-', text }`.
 *
 * @param {string} left - The old value.
 * @param {string} right - The new value.
 * @returns {object[]} The runs.
 */
const wordDiff = (left, right) => {
  // Each token is a word with its trailing whitespace, so spacing travels with
  // the word: grouping removals or additions keeps them spaced, and no bare
  // whitespace token drifts to the wrong side of a change.
  const split = (s) => String(s).match(/\S+\s*/g) || []
  const a = split(left)
  const b = split(right)
  // Two words are the same word however they are spaced. Comparing the
  // whitespace too makes the last word of a field differ from itself, because
  // one side has a space after it and the other has the end of the text, and
  // reflowing a paragraph would change every line it touches.
  const same = (x, y) => x === y || x.trim() === y.trim()
  // Longest common subsequence over tokens.
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = same(a[i], b[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const runs = []
  const push = (type, text) => {
    const last = runs[runs.length - 1]
    if (last && last.type === type) last.text += text
    else runs.push({ type, text })
  }
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (same(a[i], b[j])) {
      push('=', b[j])
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('-', a[i])
      i += 1
    } else {
      push('+', b[j])
      j += 1
    }
  }
  while (i < n) {
    push('-', a[i])
    i += 1
  }
  while (j < m) {
    push('+', b[j])
    j += 1
  }

  // Semantic cleanup: a short common word wedged between two changes (a stray
  // "and"/"the"/"is" the LCS happened to match) reads as part of the rewrite,
  // so fold it into the additions rather than let it split the run. Sentence
  // enders stay boundaries so two rewritten sentences do not merge into one.
  const isChange = (r) => r && (r.type === '+' || r.type === '-')
  for (let k = 1; k < runs.length - 1; k += 1) {
    const run = runs[k]
    const text = run.text.trim()
    if (
      run.type === '=' &&
      text.length <= 8 &&
      !/[.!?]$/.test(text) &&
      isChange(runs[k - 1]) &&
      isChange(runs[k + 1])
    ) {
      run.type = '+'
    }
  }
  const merged = []
  for (const run of runs) {
    const last = merged[merged.length - 1]
    if (last && last.type === run.type) last.text += run.text
    else merged.push({ type: run.type, text: run.text })
  }
  return merged
}

/**
 * Group a run list so each contiguous change region reads as all its removals
 * struck through, then all its additions, instead of the LCS's word-by-word
 * old/new/old/new order. Common runs are left in place as the boundaries.
 *
 * @param {object[]} runs - Runs from `wordDiff`.
 * @returns {object[]} The grouped runs.
 */
const groupRuns = (runs) => {
  const out = []
  let i = 0
  while (i < runs.length) {
    if (runs[i].type === '=') {
      out.push(runs[i])
      i += 1
      continue
    }
    let removed = ''
    let added = ''
    while (i < runs.length && runs[i].type !== '=') {
      if (runs[i].type === '-') removed += runs[i].text
      else added += runs[i].text
      i += 1
    }
    if (removed) out.push({ type: '-', text: removed })
    if (added) out.push({ type: '+', text: added })
  }
  return out
}

const headContext = (text, n) => {
  if (text.length <= n) return text
  const cut = text.slice(0, n)
  const space = cut.lastIndexOf(' ')
  return `${space > 0 ? cut.slice(0, space) : cut} …`
}
const tailContext = (text, n) => {
  if (text.length <= n) return text
  const cut = text.slice(text.length - n)
  const space = cut.indexOf(' ')
  return `… ${space >= 0 ? cut.slice(space + 1) : cut}`
}

/**
 * Trim the unchanged (`=`) runs to a little context on each side of a change,
 * so a long field shows the edits and a hint of their surroundings rather than
 * its whole body. Change runs are never trimmed.
 *
 * @param {object[]} runs - Runs (usually already grouped).
 * @param {number} [context] - Characters of context to keep each side.
 * @returns {object[]} The condensed runs.
 */
const condenseRuns = (runs, context = 60) =>
  runs.map((run, idx) => {
    if (run.type !== '=') return run
    const first = idx === 0
    const last = idx === runs.length - 1
    if (first && last) return run
    if (first) return { type: '=', text: tailContext(run.text, context) }
    if (last) return { type: '=', text: headContext(run.text, context) }
    if (run.text.length <= context * 2) return run
    return {
      type: '=',
      text: `${headContext(run.text, context).replace(/ …$/, '')} … ${tailContext(run.text, context).replace(/^… /, '')}`,
    }
  })

/**
 * Whether a field value is a formatter's markup (a date's `<time>` element)
 * rather than plain text. A formatter value starts with a tag; markdown text
 * starts with text, even when it mentions tags later, so a word diff of it is
 * still meaningful.
 */
const looksLikeMarkup = (value) => /^\s*<[a-z]/i.test(String(value))

/**
 * A removed word as a reader should see it.
 *
 * The text being compared is source, not the page: a removed link arrives as
 * `[Proxy the backend](/how-to/proxy)` and a removed heading keeps its
 * hashes. Struck through in the middle of a sentence, that reads as noise. So
 * the markup that only ever meant "make a link here" is taken off, and the
 * words a reader recognises are what is struck.
 *
 * @param {string} word - One token of the removed text.
 * @returns {string} What to show, or an empty string for pure markup.
 */
const readableWord = (word) => {
  let text = String(word || '')
  // The tail of a link: `Nuxt](/how-to/proxy):` keeps `Nuxt` and its comma.
  text = text.replace(/\]\([^)\s]*\)/g, '')
  // Emphasis, code and the brackets a link opened with.
  text = text.replace(/^[[`*_~>#]+/, '').replace(/[`*_~]+$/, '')
  // A table cell's pipes, and a list's bullet.
  text = text.replace(/^[|-]+$/, '')
  return text
}

/**
 * The removed words a reader should see, with pure markup left out.
 *
 * @param {string[]} words - The removed tokens, in order.
 * @returns {string[]} What to strike.
 */
const readableWords = (words) =>
  (words || []).map(readableWord).filter((word) => /[\p{L}\p{N}]/u.test(word))

/**
 * The words removed from the end of a field, which no rendered word follows.
 *
 * The alignment above marks a removal where the next kept word is, so a
 * removal with nothing after it has nowhere to go and is dropped: an edit at
 * the end of a block then reads as no edit at all. These are the tokens left
 * over once the rendered words are consumed, and they are only taken where
 * every one of them was removed. A kept or added token still waiting means the
 * alignment gave up rather than ran out, and striking the rest would invent
 * deletions.
 *
 * @param {Array<{type: string, text: string, word: string}>} tokens - The diff tokens.
 * @param {number} from - The first token the alignment did not consume.
 * @returns {string[]} The removed words, in order, or none.
 */
const trailingRemovals = (tokens, from) => {
  const rest = tokens.slice(from)
  if (!rest.every((token) => token.type === '-' || !token.word)) return []
  return (
    rest
      // A token already taken as a removed block is struck once, by whoever
      // took it, not again here.
      .filter((token) => token.type === '-' && token.word && !token.block)
      .map((token) => token.text)
  )
}

/**
 * The uuid to look for in the page, for the side the page is rendering.
 *
 * A diff has two sides and a page renders one of them. Where the two sides
 * are the same entity this is the block's uuid either way; where they are
 * not, only the rendered side's uuid is in the markup.
 *
 * @param {object} block - A block from normaliseDiff(), or its placement.
 * @param {'left'|'right'} [side] - The side the page renders.
 * @returns {string|null} The uuid to anchor on, or null where that side has none.
 */
const anchorUuid = (block, side = 'right') => {
  if (!block) return null
  // A removed block has nothing of its own in the page, so where it was
  // placed against a neighbour, that neighbour is what to look for. Reading
  // its own uuids first would find the `null` the missing side carries, fall
  // back to the block's own uuid, and query the page for an element the page
  // does not have: the rail would claim to show deletions and show none.
  const uuids = block.placeUuids || block.uuids
  // A side with no uuid is a side with nothing to anchor on, and saying so is
  // the point: the other side's uuid is not in this page.
  if (uuids) return uuids[side] || null
  return block.uuid || null
}

export {
  anchorUuid,
  readableWord,
  readableWords,
  trailingRemovals,
  normaliseDiff,
  changedFields,
  wordDiff,
  groupRuns,
  condenseRuns,
  looksLikeMarkup,
  label,
}
