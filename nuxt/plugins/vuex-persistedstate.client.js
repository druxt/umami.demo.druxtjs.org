import createPersistedState from 'vuex-persistedstate'

export default ({store}) => {
  createPersistedState({
    key: 'druxtCache',
    paths: [
      'druxtRouter.routes',
      'druxt/views.results',
      'druxtMenu.entities',
      'druxtSchema.schemas',
      'druxt.collections',
      'druxt.resources'
    ]
  })(store)
}
