import createPersistedState from 'vuex-persistedstate'

/**
 * The one thing that survives a reload: the dev overlay switch.
 *
 * This used to persist the Druxt store too, every route, schema and resource
 * the visitor had seen. Restored over a newer build's page it replayed
 * stale routes and shapes, and on a phone it outgrew localStorage, where a
 * full store makes every commit throw. The old key is removed so a browser
 * that still holds one stops reading it.
 */
const STALE_KEY = 'druxtCache'

export default ({ store }) => {
  try {
    window.localStorage.removeItem(STALE_KEY)
  } catch (e) {
    // Storage may be unavailable; there is nothing to clear then.
  }
  createPersistedState({
    key: 'umamiUi',
    paths: ['ui.devOverlay'],
  })(store)
}
