// UI state for the demo layer. Persisted by plugins/vuex-persistedstate.client.js
// so the dev overlay survives navigation and reloads.

export const state = () => ({
  devOverlay: false,
  requestLog: [],
})

export const mutations = {
  toggleDevOverlay(state) {
    state.devOverlay = !state.devOverlay
  },

  setDevOverlay(state, value) {
    state.devOverlay = !!value
  },

  logRequest(state, entry) {
    state.requestLog = [...state.requestLog.slice(-49), entry]
  },

  clearRequestLog(state) {
    state.requestLog = []
  },
}

export const getters = {
  requestCount: (state) => state.requestLog.length,
  totalMs: (state) =>
    state.requestLog.reduce((total, entry) => total + (entry.ms || 0), 0),
}
