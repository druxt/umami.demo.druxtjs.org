import { iceStoreModule } from '@druxt-contrib/inline-content-edit'

/**
 * The inline content edit cart, as a Nuxt store module: `druxtIce/*`.
 *
 * The package's Nuxt module is not used, only its store: the module holds
 * every request until a backend is chosen in the browser, and this site's
 * backend is fixed. The site keeps an editor's unsaved changes in `drafts`;
 * plugins/edit-drafts.client.js persists them and shows them on the page.
 */
export const state = iceStoreModule.state
export const getters = iceStoreModule.getters
export const mutations = iceStoreModule.mutations
export const actions = iceStoreModule.actions
