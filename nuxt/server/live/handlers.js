/**
 * Umami's own channels on the live socket: Umami Go tables.
 * `@druxt-contrib/sockets` loads this under `nuxt dev`; start.js in production.
 */
const { gameHandler } = require('./game-room')

module.exports = ({ drupalUrl, log = () => {} }) => ({
  game: gameHandler({ drupalUrl, log }),
})
