/**
 * The browser half: one WebSocket for the whole app.
 *
 * `join(channel, role)` and `leave(channel)` keep the server's channels in
 * step with the page; `send(type, channel, payload)` and `on(type, handler)`
 * carry the rest. A dropped socket reconnects with exponential backoff and
 * resumes its identity with the token the server gave it, so a phone that
 * sleeps comes back as the same person.
 *
 * When Drupal purges, every open page hears `content:changed` with the purged
 * cache tags and refetches what it shows of them. `hold(fn)` registers a test
 * for an entity this page must not refetch, such as one with an unsaved draft.
 */
import Vue from 'vue'
import { affected, shows } from './refresh'

const MAX_DELAY = 30000

export const DEFAULTS = {
  path: '/_sockets',
  refresh: true,
  freshFor: 15000,
  resumeKey: 'druxtSocketsResume',
}

export function createSockets(context, options = {}) {
  const { path, refresh, freshFor, resumeKey } = { ...DEFAULTS, ...options }
  const { store } = context
  const win = options.window || window
  const Socket = options.WebSocket || win.WebSocket
  // Read when needed: auth-next's plugin runs after this one.
  const auth = () => context.$auth
  const state = Vue.observable({
    connected: false,
    id: null,
    name: null,
    signedIn: false,
    updatedAt: 0,
  })
  const handlers = new Map()
  const joined = new Map()
  const holds = []
  let socket = null
  let attempts = 0
  let timer = null

  const read = (key) => {
    try {
      return win.sessionStorage.getItem(key)
    } catch (e) {
      return null
    }
  }
  const write = (key, value) => {
    try {
      win.sessionStorage.setItem(key, value)
    } catch (e) {
      // No storage: a reconnect is a new identity.
    }
  }

  const emit = (message) =>
    (handlers.get(message.type) || []).forEach((fn) => fn(message))
  const raw = (message) => {
    if (socket && socket.readyState === 1) socket.send(JSON.stringify(message))
  }

  /** The signed-in editor's token, for the server to check with Drupal. */
  const authenticate = () => {
    const $auth = auth()
    const token =
      $auth &&
      $auth.loggedIn &&
      $auth.strategy.token &&
      $auth.strategy.token.get()
    raw({
      type: 'auth',
      payload: { token: token ? String(token).replace(/^Bearer\s+/i, '') : '' },
    })
  }

  const connect = () => {
    const resume = read(resumeKey)
    const { protocol, host } = win.location
    const url = `${protocol === 'https:' ? 'wss' : 'ws'}://${host}${path}${
      resume ? `?resume=${encodeURIComponent(resume)}` : ''
    }`
    try {
      socket = new Socket(url)
    } catch (e) {
      return retry()
    }
    socket.onopen = () => {
      attempts = 0
      state.connected = true
      if (auth() && auth().loggedIn) authenticate()
      // The server keeps channels across a resume; a new identity rejoins.
      for (const [channel, role] of joined)
        raw({ type: 'join', channel, payload: { role } })
    }
    socket.onmessage = (event) => {
      let message
      try {
        message = JSON.parse(event.data)
      } catch (e) {
        return
      }
      if (message.type === 'hello') {
        state.id = message.payload.id
        state.name = message.payload.name
        write(resumeKey, message.payload.resume)
      }
      if (message.type === 'identity') {
        state.name = message.payload.name
        state.signedIn = message.payload.signedIn
      }
      emit(message)
    }
    socket.onclose = () => {
      state.connected = false
      retry()
    }
    socket.onerror = () => {}
  }

  /** Back off: 1s, 2s, 4s… up to 30s, with jitter so tabs do not stampede. */
  const retry = () => {
    clearTimeout(timer)
    const delay =
      Math.min(MAX_DELAY, 1000 * 2 ** attempts) * (0.75 + Math.random() * 0.5)
    attempts++
    timer = setTimeout(connect, delay)
  }

  const sockets = {
    state,
    join(channel, role = 'reader') {
      joined.set(channel, role)
      raw({ type: 'join', channel, payload: { role } })
    },
    leave(channel) {
      joined.delete(channel)
      raw({ type: 'leave', channel })
    },
    send(type, channel, payload = {}) {
      raw({ type, channel, payload })
    },
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, [])
      handlers.get(type).push(fn)
      return () =>
        handlers.set(
          type,
          handlers.get(type).filter((f) => f !== fn)
        )
    },
    /** `fn(type, uuid)` returns true for an entity not to refetch. */
    hold(fn) {
      holds.push(fn)
    },
    connect,
  }

  if (refresh && store) watchContent(context, sockets, { freshFor, holds, win })

  // Signing in or out changes who this socket is.
  if (store && store.watch)
    store.watch(
      (s) => (s.auth || {}).loggedIn,
      () => authenticate()
    )

  return sockets
}

/** Refetch what the page shows of each change Drupal announces. */
function watchContent(context, sockets, { freshFor, holds, win }) {
  const { store } = context
  // Drupal's answers may be cached, in this browser too: for a moment after
  // a change, the Druxt client asks past that cache.
  let freshUntil = 0
  const druxtAxios = (context.$druxt || {}).axios
  if (druxtAxios && druxtAxios.interceptors) {
    druxtAxios.interceptors.request.use((config) => {
      if (Date.now() < freshUntil) {
        config.headers = config.headers || {}
        config.headers['Cache-Control'] = 'no-cache'
      }
      return config
    })
  }

  sockets.on('content:changed', ({ payload }) => {
    freshUntil = Date.now() + freshFor
    const resources = (store.state.druxt || {}).resources || {}
    const change = affected(payload.tags, resources)
    if (
      !change.everything &&
      !change.entities.length &&
      !change.types.length &&
      !change.lists
    ) {
      return
    }
    const held = (type, id) => holds.some((fn) => fn(type, id))
    const flush = (type, id) => {
      if (!held(type, id)) store.commit('druxt/flushResource', { type, id })
    }
    for (const { type, id } of change.entities) flush(type, id)
    for (const [type, byId] of Object.entries(resources)) {
      if (change.everything || change.types.includes(type.split('--')[0])) {
        for (const id of Object.keys(byId || {})) flush(type, id)
      }
    }
    if (change.lists || change.everything) {
      const collections = (store.state.druxt || {}).collections || {}
      for (const type of Object.keys(collections)) {
        store.commit('druxt/flushCollection', { type })
      }
      if ((store.state.druxt || {}).views !== undefined) {
        store.commit('druxt/views/flushResults', {})
      }
    }
    const refetched = []
    const visit = (vm) => {
      const drafting =
        vm.$options.name === 'DruxtEntity' && held(vm.type, vm.uuid)
      if (!drafting && shows(vm, change) && typeof vm.$fetch === 'function') {
        refetched.push(vm.$fetch())
      }
      vm.$children.forEach(visit)
    }
    if (win.$nuxt) visit(win.$nuxt)
    if (refetched.length) {
      Promise.all(refetched).finally(() => {
        sockets.state.updatedAt = Date.now()
      })
    }
  })
}
