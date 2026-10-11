/**
 * The page shown while the site starts, and the status it polls.
 *
 * The page draws three steps and asks `/__status` which one is running. Once
 * the app takes over the port, `/__status` is gone, and the page reloads into
 * the real site.
 */
const fs = require('fs')
const path = require('path')

const PAGE = fs.readFileSync(path.join(__dirname, 'starting.html'))

// The steps the page draws, in order. `failed` is not one of them.
const STEPS = ['waiting', 'building', 'starting']

/**
 * Serve the starting page, and the phase it polls for.
 *
 * @param {object} state - `{ phase, since }`, updated as the start proceeds.
 * @returns {Function} A request listener.
 */
const createStartingHandler = (state) => (req, res) => {
  const pathname = String(req.url || '/').split('?')[0]

  if (pathname === '/__status') {
    const body = JSON.stringify({
      phase: state.phase,
      step: STEPS.indexOf(state.phase) + 1,
      steps: STEPS.length,
      since: state.since,
    })
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    return res.end(req.method === 'HEAD' ? undefined : body)
  }

  res.writeHead(503, {
    'Content-Type': 'text/html; charset=utf-8',
    'Retry-After': '15',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
  })
  res.end(req.method === 'HEAD' ? undefined : PAGE)
}

module.exports = { PAGE, STEPS, createStartingHandler }
