/**
 * An editor's unsaved changes, one draft per translation of an entity,
 * keyed `type:id:langcode`. plugins/edit-drafts.client.js persists them
 * and lays them over the page; utils/edit-form.js writes them.
 */
export const state = () => ({ drafts: {} })

export const mutations = {
  setDraft(state, { key, draft }) {
    state.drafts = { ...state.drafts, [key]: draft }
  },
  clearDraft(state, key) {
    const drafts = { ...state.drafts }
    delete drafts[key]
    state.drafts = drafts
  },
  discardAll(state) {
    state.drafts = {}
  },
}
