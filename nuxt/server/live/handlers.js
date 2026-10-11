/**
 * Umami's own channels on the live socket: Umami Go tables, and `display:`
 * previews of an unsaved Manage display form.
 * `@druxt-contrib/sockets` loads this under `nuxt dev`; start.js in production.
 */
const { displayHandler } = require('./display')
const { draftSchemas } = require('./draft-schema')
const { gameHandler } = require('./game-room')

module.exports = ({ drupalUrl, log = () => {} }) => ({
  display: displayHandler({ buildSchema: draftSchemas({ drupalUrl }), log }),
  game: gameHandler({ drupalUrl, log }),
})
