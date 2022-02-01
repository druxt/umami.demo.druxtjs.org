const { startDevServer } = require('@cypress/webpack-dev-server')
const { getWebpackConfig } = require('nuxt')
const cucumber = require('cypress-cucumber-preprocessor').default

module.exports = (on, config) => {
  on('dev-server:start', async (options) => {
    const webpackConfig = await getWebpackConfig()
    return startDevServer({
      options,
      webpackConfig,
    })
  })

  on('file:preprocessor', cucumber())

  return config
}
