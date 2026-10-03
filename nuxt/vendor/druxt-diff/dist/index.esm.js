import { join, resolve } from 'path';

const label = (refStatus, contentChanged) => {
  if (refStatus === "added" || refStatus === "removed")
    return refStatus;
  if (refStatus === "moved")
    return "moved";
  return contentChanged ? "changed" : "same";
};
const index = (document) => {
  const map = new Map();
  const add = (r) => r && r.id && map.set(r.id, r);
  add(document.data);
  for (const r of document.included || [])
    add(r);
  return map;
};
const fieldMap = (resource) => {
  const fields = (resource.attributes || {}).fields || {};
  if (Array.isArray(fields)) {
    const out = {};
    for (const f of fields)
      if (f && f.name)
        out[f.name] = f;
    return out;
  }
  return fields;
};
const changedFields = (resource) => Object.entries(fieldMap(resource)).filter(([, f]) => f && f.status && f.status !== "same").map(([name, f]) => ({
  name,
  label: f.label || name,
  status: f.status,
  left: f.left || "",
  right: f.right || "",
  ops: f.ops || []
}));
const sideOf = (id) => {
  const [, left, right] = String(id || "").split(":");
  if (left && !right)
    return "removed";
  if (right && !left)
    return "added";
  return "paired";
};
const tokenise = (s) => String(s).split(/\s+/).filter(Boolean);
const lcsLength = (a, b) => {
  const dp = new Array(b.length + 1).fill(0);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    let prev = 0;
    for (let j = b.length - 1; j >= 0; j -= 1) {
      const tmp = dp[j];
      dp[j] = a[i] === b[j] ? prev + 1 : Math.max(dp[j], dp[j + 1]);
      prev = tmp;
    }
  }
  return dp[0];
};
const similarity = (a, b) => {
  const at = tokenise(a);
  const bt = tokenise(b);
  if (!at.length && !bt.length)
    return 1;
  if (!at.length || !bt.length)
    return 0;
  return 2 * lcsLength(at, bt) / (at.length + bt.length);
};
const sideText = (resource, key) => Object.values(fieldMap(resource)).map((f) => f && f[key] || "").join(" ");
const PAIR_THRESHOLD = 0.4;
const MOVE_THRESHOLD = 0.8;
const inOrder = (pairs) => {
  const order = pairs.map((pair, index2) => ({ ...pair, index: index2 })).sort((a, b) => a.to - b.to);
  const runs = order.map(() => 1);
  const prior = order.map(() => -1);
  let end = 0;
  for (let i = 0; i < order.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (order[j].from < order[i].from && runs[j] + 1 > runs[i]) {
        runs[i] = runs[j] + 1;
        prior[i] = j;
      }
    }
    if (runs[i] > runs[end])
      end = i;
  }
  const kept = new Set();
  for (let at = order.length ? end : -1; at >= 0; at = prior[at]) {
    kept.add(order[at].index);
  }
  return kept;
};
const mergePair = (removed, added) => {
  const rf = fieldMap(removed);
  const af = fieldMap(added);
  const names = new Set([...Object.keys(rf), ...Object.keys(af)]);
  const out = [];
  for (const name of names) {
    const left = rf[name] && rf[name].left || "";
    const right = af[name] && af[name].right || "";
    const status = left && right ? left === right ? "same" : "changed" : right ? "added" : left ? "removed" : "same";
    out.push({
      name,
      label: (af[name] || rf[name] || {}).label || name,
      status,
      left,
      right,
      ops: (af[name] || rf[name] || {}).ops || []
    });
  }
  return out;
};
const normaliseDiff = (document) => {
  const empty = {
    blocks: [],
    summary: { added: 0, removed: 0, changed: 0, moved: 0, same: 0 },
    rootFields: [],
    meta: {},
    rebuilt: false
  };
  if (!document || !document.data)
    return empty;
  const byId = index(document);
  const blocks = [];
  const uuidOf = (resource) => String(resource.id || "").split(":")[0];
  const sideUuids = (resource) => {
    const rel = resource.relationships || {};
    const idOf = (key) => ((rel[key] || {}).data || {}).id || null;
    const side = sideOf(resource.id);
    const fallback = uuidOf(resource);
    return {
      left: idOf("left") || (side === "added" ? null : fallback),
      right: idOf("right") || (side === "removed" ? null : fallback)
    };
  };
  const push = (resource, refMeta, depth, fields, status, uuids) => {
    blocks.push({
      uuid: uuidOf(resource),
      uuids: uuids || sideUuids(resource),
      depth,
      refStatus: refMeta.status || "same",
      status,
      field: refMeta.field || null,
      fromDelta: refMeta.left_delta,
      toDelta: refMeta.right_delta,
      fields
    });
  };
  const children = (resource, depth) => {
    const items = (((resource.relationships || {}).children || {}).data || []).map((c) => ({
      meta: c.meta || {},
      res: byId.get(c.id),
      side: sideOf(c.id)
    })).filter((it) => it.res);
    const removed = items.filter((it) => it.side === "removed");
    const taken = new Set();
    const pairFor = new Map();
    const moved = new Set();
    const claim = (it, match, isMove) => {
      taken.add(match);
      pairFor.set(it, match);
      if (isMove)
        moved.add(it);
    };
    for (const it of items) {
      if (it.side !== "added")
        continue;
      const match = removed.find((r) => !taken.has(r) && (r.meta.field || null) === (it.meta.field || null) && r.meta.left_delta === it.meta.right_delta && similarity(sideText(r.res, "left"), sideText(it.res, "right")) >= PAIR_THRESHOLD);
      if (match)
        claim(it, match, false);
    }
    for (const it of items) {
      if (it.side !== "added" || pairFor.has(it))
        continue;
      const match = removed.find((r) => !taken.has(r) && (r.meta.field || null) === (it.meta.field || null) && similarity(sideText(r.res, "left"), sideText(it.res, "right")) >= MOVE_THRESHOLD);
      if (match)
        claim(it, match, false);
    }
    const paired = [...pairFor.entries()];
    const held = inOrder(paired.map(([add, rem]) => ({
      from: rem.meta.left_delta,
      to: add.meta.right_delta
    })));
    paired.forEach(([add], index2) => {
      if (!held.has(index2))
        moved.add(add);
    });
    for (const it of items) {
      if (it.side === "removed" && taken.has(it))
        continue;
      if (it.side === "added" && pairFor.has(it)) {
        const rem = pairFor.get(it);
        const merged = mergePair(rem.res, it.res);
        const changed = merged.filter((f) => f.status !== "same");
        const isMove = moved.has(it);
        const refMeta = {
          status: isMove ? "moved" : "same",
          field: it.meta.field,
          left_delta: rem.meta.left_delta,
          right_delta: it.meta.right_delta
        };
        const status = isMove ? "moved" : changed.length ? "changed" : "same";
        push(it.res, refMeta, depth, changed, status, {
          left: sideUuids(rem.res).left,
          right: sideUuids(it.res).right
        });
        children(it.res, depth + 1);
        continue;
      }
      const fields = changedFields(it.res);
      push(it.res, it.meta, depth, fields, label(it.meta.status, fields.length > 0));
      children(it.res, depth + 1);
    }
  };
  children(document.data, 1);
  const summary = blocks.reduce((a, b) => (a[b.status] = (a[b.status] || 0) + 1, a), { added: 0, removed: 0, changed: 0, moved: 0, same: 0 });
  const rebuilt = blocks.length > 0 && blocks.every((b) => b.status === "added" || b.status === "removed") && summary.added === summary.removed && summary.added > 0;
  const survivors = blocks.filter((b) => b.status !== "removed" && typeof b.fromDelta === "number");
  for (const gone of blocks) {
    if (gone.status !== "removed" || typeof gone.fromDelta !== "number")
      continue;
    let pred = null;
    let succ = null;
    for (const b of survivors) {
      if (b.field !== gone.field || b.depth !== gone.depth)
        continue;
      if (b.fromDelta < gone.fromDelta && (!pred || b.fromDelta > pred.fromDelta))
        pred = b;
      if (b.fromDelta > gone.fromDelta && (!succ || b.fromDelta < succ.fromDelta))
        succ = b;
    }
    if (pred) {
      gone.placeAfter = pred.uuid;
      gone.placeUuids = pred.uuids;
    } else if (succ) {
      gone.placeBefore = succ.uuid;
      gone.placeUuids = succ.uuids;
    }
  }
  return {
    blocks,
    summary,
    rebuilt,
    rootFields: changedFields(document.data),
    meta: {
      left: (((document.data.relationships || {}).left || {}).data || {}).meta || {},
      right: (((document.data.relationships || {}).right || {}).data || {}).meta || {}
    }
  };
};
const wordDiff = (left, right) => {
  const split = (s) => String(s).match(/\S+\s*/g) || [];
  const a = split(left);
  const b = split(right);
  const same = (x, y) => x === y || x.trim() === y.trim();
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i2 = n - 1; i2 >= 0; i2 -= 1) {
    for (let j2 = m - 1; j2 >= 0; j2 -= 1) {
      dp[i2][j2] = same(a[i2], b[j2]) ? dp[i2 + 1][j2 + 1] + 1 : Math.max(dp[i2 + 1][j2], dp[i2][j2 + 1]);
    }
  }
  const runs = [];
  const push = (type, text) => {
    const last = runs[runs.length - 1];
    if (last && last.type === type)
      last.text += text;
    else
      runs.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (same(a[i], b[j])) {
      push("=", b[j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("-", a[i]);
      i += 1;
    } else {
      push("+", b[j]);
      j += 1;
    }
  }
  while (i < n) {
    push("-", a[i]);
    i += 1;
  }
  while (j < m) {
    push("+", b[j]);
    j += 1;
  }
  const isChange = (r) => r && (r.type === "+" || r.type === "-");
  for (let k = 1; k < runs.length - 1; k += 1) {
    const run = runs[k];
    const text = run.text.trim();
    if (run.type === "=" && text.length <= 8 && !/[.!?]$/.test(text) && isChange(runs[k - 1]) && isChange(runs[k + 1])) {
      run.type = "+";
    }
  }
  const merged = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && last.type === run.type)
      last.text += run.text;
    else
      merged.push({ type: run.type, text: run.text });
  }
  return merged;
};
const groupRuns = (runs) => {
  const out = [];
  let i = 0;
  while (i < runs.length) {
    if (runs[i].type === "=") {
      out.push(runs[i]);
      i += 1;
      continue;
    }
    let removed = "";
    let added = "";
    while (i < runs.length && runs[i].type !== "=") {
      if (runs[i].type === "-")
        removed += runs[i].text;
      else
        added += runs[i].text;
      i += 1;
    }
    if (removed)
      out.push({ type: "-", text: removed });
    if (added)
      out.push({ type: "+", text: added });
  }
  return out;
};
const headContext = (text, n) => {
  if (text.length <= n)
    return text;
  const cut = text.slice(0, n);
  const space = cut.lastIndexOf(" ");
  return `${space > 0 ? cut.slice(0, space) : cut} \u2026`;
};
const tailContext = (text, n) => {
  if (text.length <= n)
    return text;
  const cut = text.slice(text.length - n);
  const space = cut.indexOf(" ");
  return `\u2026 ${space >= 0 ? cut.slice(space + 1) : cut}`;
};
const condenseRuns = (runs, context = 60) => runs.map((run, idx) => {
  if (run.type !== "=")
    return run;
  const first = idx === 0;
  const last = idx === runs.length - 1;
  if (first && last)
    return run;
  if (first)
    return { type: "=", text: tailContext(run.text, context) };
  if (last)
    return { type: "=", text: headContext(run.text, context) };
  if (run.text.length <= context * 2)
    return run;
  return {
    type: "=",
    text: `${headContext(run.text, context).replace(/ …$/, "")} \u2026 ${tailContext(run.text, context).replace(/^… /, "")}`
  };
});
const looksLikeMarkup = (value) => /^\s*<[a-z]/i.test(String(value));
const readableWord = (word) => {
  let text = String(word || "");
  text = text.replace(/\]\([^)\s]*\)/g, "");
  text = text.replace(/^[[`*_~>#]+/, "").replace(/[`*_~]+$/, "");
  text = text.replace(/^[|-]+$/, "");
  return text;
};
const readableWords = (words) => (words || []).map(readableWord).filter((word) => /[\p{L}\p{N}]/u.test(word));
const trailingRemovals = (tokens, from) => {
  const rest = tokens.slice(from);
  if (!rest.every((token) => token.type === "-" || !token.word))
    return [];
  return rest.filter((token) => token.type === "-" && token.word && !token.block).map((token) => token.text);
};
const anchorUuid = (block, side = "right") => {
  if (!block)
    return null;
  const uuids = block.placeUuids || block.uuids;
  if (uuids)
    return uuids[side] || null;
  return block.uuid || null;
};

const pin = (value) => Math.min(100, Math.max(0, value || 0));
const MIN_HEIGHT = 0.6;
const placeMarks = (boxes, total, minHeight = MIN_HEIGHT) => {
  if (!total)
    return [];
  return (boxes || []).map((box) => ({
    top: pin((box.top || 0) / total * 100),
    height: Math.min(Math.max(pin((box.height || 0) / total * 100), minHeight), 100)
  }));
};
const placeViewport = (at, shown, total) => {
  if (!total)
    return { top: 0, height: 0 };
  return { top: pin(at / total * 100), height: pin(shown / total * 100) };
};

const diffTokens = (diff) => {
  const out = [];
  for (const run of wordDiff(diff.left, diff.right)) {
    const block = run.type === "-" && /\n/.test(run.text);
    for (const piece of run.text.match(/\S+|\s+/g) || []) {
      if (/^\s+$/.test(piece))
        continue;
      out.push({
        type: run.type,
        text: piece,
        block,
        word: piece.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()
      });
    }
  }
  return out;
};
const renderedWords = (root) => {
  const words = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.parentNode && node.parentNode.nodeName !== "INS" && node.parentNode.nodeName !== "DEL") {
      const re = /[\p{L}\p{N}][\p{L}\p{N}'\u2019-]*/gu;
      let m;
      while (m = re.exec(node.nodeValue))
        words.push({
          node,
          index: m.index,
          text: m[0],
          word: m[0].toLowerCase()
        });
    }
    node = walker.nextNode();
  }
  return words;
};
const LOOKAHEAD = 60;
const mark = (root, diff) => {
  if (typeof document === "undefined" || !diff || diff.right == null)
    return;
  const tokens = diffTokens(diff);
  if (!tokens.length)
    return;
  const words = renderedWords(root);
  const edits = new Map();
  const matches = (token, rw) => token.type !== "-" && token.word === rw.word;
  const blocks = new Set();
  let p = 0;
  for (const rw of words) {
    let scan = p;
    let skipped = 0;
    const removed = [];
    while (scan < tokens.length && skipped < LOOKAHEAD && !matches(tokens[scan], rw)) {
      if (tokens[scan].type === "-") {
        if (tokens[scan].word) {
          if (tokens[scan].block)
            blocks.add(scan);
          else
            removed.push(tokens[scan].text);
        }
      } else
        skipped += 1;
      scan += 1;
    }
    if (scan >= tokens.length || skipped >= LOOKAHEAD || !matches(tokens[scan], rw))
      continue;
    const token = tokens[scan];
    if (token.type === "+" || removed.length) {
      const list = edits.get(rw.node) || [];
      list.push({
        index: rw.index,
        length: rw.text.length,
        ins: token.type === "+",
        removedBefore: removed
      });
      edits.set(rw.node, list);
    }
    p = scan + 1;
  }
  const removedBlocks = [...blocks].sort((a, b) => a - b).map((index) => tokens[index].text);
  const trailing = [...removedBlocks, ...trailingRemovals(tokens, p)];
  const bridgeable = (s) => !/[\p{L}\p{N}]/u.test(s);
  const del = (words2) => {
    const el = document.createElement("del");
    el.className = "v-diff-del";
    el.textContent = `${readableWords(words2).join(" ")} `;
    return el;
  };
  for (const [node, list] of edits) {
    const value = node.nodeValue;
    const sorted = list.sort((a, b) => a.index - b.index);
    const frag = document.createDocumentFragment();
    let cursor = 0;
    let i = 0;
    while (i < sorted.length) {
      const edit = sorted[i];
      if (edit.ins) {
        let end = edit.index + edit.length;
        let start = edit.index;
        const removed = [...edit.removedBefore];
        let j = i + 1;
        while (j < sorted.length && sorted[j].ins && bridgeable(value.slice(end, sorted[j].index))) {
          removed.push(...sorted[j].removedBefore);
          end = sorted[j].index + sorted[j].length;
          j += 1;
        }
        if (!removed.length && /^\s*$/.test(value.slice(cursor, start)))
          start = cursor;
        if (/^\s*$/.test(value.slice(end)))
          end = value.length;
        frag.appendChild(document.createTextNode(value.slice(cursor, start)));
        if (removed.length)
          frag.appendChild(del(removed));
        const ins = document.createElement("ins");
        ins.className = "v-diff-ins";
        ins.textContent = value.slice(start, end);
        frag.appendChild(ins);
        cursor = end;
        i = j;
      } else {
        frag.appendChild(document.createTextNode(value.slice(cursor, edit.index)));
        if (edit.removedBefore.length)
          frag.appendChild(del(edit.removedBefore));
        frag.appendChild(document.createTextNode(value.slice(edit.index, edit.index + edit.length)));
        cursor = edit.index + edit.length;
        i += 1;
      }
    }
    frag.appendChild(document.createTextNode(value.slice(cursor)));
    node.parentNode.replaceChild(frag, node);
  }
  if (trailing.length) {
    const el = del(trailing);
    el.className = "v-diff-del v-diff-del--trailing";
    root.appendChild(el);
  }
};
const apply = (el, diff) => {
  el.__vdiffOriginal = el.innerHTML;
  mark(el, diff);
};
const restore = (el) => {
  if (el.__vdiffOriginal != null) {
    el.innerHTML = el.__vdiffOriginal;
    el.__vdiffOriginal = null;
  }
};
var directive = {
  bind(el, binding) {
    if (binding.value)
      apply(el, binding.value);
  },
  update(el, binding) {
    if (binding.value === binding.oldValue)
      return;
    restore(el);
    if (binding.value)
      apply(el, binding.value);
  },
  unbind(el) {
    restore(el);
  }
};

const DEFAULTS = {
  directive: true
};
function resolveOptions(moduleOptions = {}, nuxtOptions = {}) {
  return {
    ...DEFAULTS,
    ...(nuxtOptions.druxt || {}).diff || {},
    ...moduleOptions
  };
}
const NuxtModule = function(moduleOptions = {}) {
  const options = resolveOptions(moduleOptions, this.options);
  this.nuxt.hook("components:dirs", (dirs) => {
    dirs.push({ path: join(__dirname, "components") });
  });
  if (options.directive) {
    this.addPlugin({
      src: resolve(__dirname, "../templates/plugin.js"),
      fileName: "druxt-diff.js",
      options
    });
  }
};

export { DEFAULTS, anchorUuid, changedFields, condenseRuns, NuxtModule as default, directive as diffDirective, groupRuns, label, looksLikeMarkup, normaliseDiff, placeMarks, placeViewport, readableWord, readableWords, resolveOptions, trailingRemovals, wordDiff };
