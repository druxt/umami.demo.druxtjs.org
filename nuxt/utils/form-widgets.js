/**
 * What a form widget shows, worked out from a field's schema. Pure, so the
 * widgets stay thin. The file and its names follow druxtjs.org's copy so a
 * shared package can replace both by name.
 */

/** The one value a field holds, whatever its cardinality. */
export const single = (value) => (Array.isArray(value) ? value[0] : value)

/** A list field's allowed values as options, from a map of value to label. */
export function allowedOptions(schema) {
  const s = (schema || {}).settings || {}
  const allowed =
    (s.storage || {}).allowed_values || (s.config || {}).allowed_values || []
  return Array.isArray(allowed)
    ? allowed
    : Object.entries(allowed).map(([value, label]) => ({ value, label }))
}

/** The resource types a reference field can point at. */
export function referenceTypes(schema) {
  const s = (schema || {}).settings || {}
  const type = (s.storage || {}).target_type
  const bundles = Object.keys(
    ((s.config || {}).handler_settings || {}).target_bundles || {}
  )
  return type ? bundles.map((bundle) => `${type}--${bundle}`) : []
}

/** Entities as options: their label, and the type a reference needs back. */
export const entityOptions = (entities) =>
  entities.map((o) => ({
    value: o.id,
    label:
      (o.attributes || {}).name ||
      (o.attributes || {}).display_name ||
      (o.attributes || {}).title ||
      o.id,
    type: o.type,
  }))

/** Every reference a value holds, as { type, id }. */
export function referenceItems(value) {
  const data =
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'data' in value
      ? value.data
      : value
  return [].concat(data || []).filter((o) => o && typeof o === 'object' && o.id)
}

/** The relationship object JSON:API wants back for these references. */
export const relationship = (items, multiple) => ({
  data: multiple ? items : items[0] || null,
})

/** How a reference widget searches: the field's own match settings. */
export function matchSettings(schema) {
  const display = ((schema || {}).settings || {}).display || {}
  return {
    operator: display.match_operator || 'CONTAINS',
    limit: display.match_limit || 10,
  }
}

/** The unit a number field carries, without the padding Drupal stores. */
export function numberUnit(schema) {
  const config = ((schema || {}).settings || {}).config || {}
  const suffix = (config.suffix || '').trim()
  return {
    prefix: (config.prefix || '').trim(),
    suffix: suffix === 'minutes' ? 'min' : suffix,
  }
}

/** Drupal's ISO date to the value a datetime-local input takes, and back. */
export const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}
export const fromLocalInput = (local) => {
  if (!local) return null
  const d = new Date(local)
  const pad = (n) => String(n).padStart(2, '0')
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00${sign}${pad(
    Math.floor(Math.abs(offset) / 60)
  )}:${pad(Math.abs(offset) % 60)}`
}
