/**
 * Keeps every error the browser reports, from the first script on, so the
 * debug panel (open any page with `#debug`) can show what stopped the app on
 * a device that has no console to hand.
 */
export default () => {
  const log = (window.__umamiErrors = window.__umamiErrors || [])
  const push = (kind, detail) => {
    log.push({ kind, detail: String(detail).slice(0, 300), at: Date.now() })
  }
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target
      if (target && target !== window && target.tagName) {
        push('resource', `${target.tagName} ${target.src || target.href || ''}`)
        return
      }
      push('error', `${event.message} (${event.filename}:${event.lineno})`)
    },
    true
  )
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || {}
    push('rejection', reason.stack || reason.message || reason)
  })
}
