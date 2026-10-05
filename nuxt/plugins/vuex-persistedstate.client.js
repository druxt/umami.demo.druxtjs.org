import createPersistedState from 'vuex-persistedstate'

export default ({ store }) => {
  createPersistedState({
    key: 'druxtCache',
    paths: [
      'druxtRouter.routes',
      'druxt/views.results',
      'druxtMenu.entities',
      'druxtSchema.schemas',
      'druxt.collections',
      'druxt.resources',
      // The dev overlay stays as the visitor left it across reloads.
      'ui.devOverlay',
    ],
  })(store)
}
