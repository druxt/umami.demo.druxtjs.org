export const state = () => ({
  items: []
})

export const mutations = {
  add(state, { type, uuid }) {
    if (state.items.includes(`${type}:${uuid}`)) return
    state.items.push(`${type}:${uuid}`)
  },

  remove(state, { type, uuid }) {
    if (!state.items.includes(`${type}:${uuid}`)) return
    state.items = state.items.filter((i) => i !== `${type}:${uuid}`)
  },

  set(state, items) {
    state.items = items
  }
}
