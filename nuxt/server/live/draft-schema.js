/**
 * A Druxt schema built from an unsaved display: druxt-schema's own view
 * generation, handed the display Drupal's form holds instead of the saved
 * one. Field config still comes from Drupal, so labels and field settings
 * are Drupal's.
 */
const { DruxtSchema } = require('druxt-schema')

/** Field config is cached per generator, so one lives this long. */
const TTL = 30 * 1000

function draftSchemas({ drupalUrl, ttl = TTL, Schema = DruxtSchema }) {
  let generator = null
  let made = 0

  return async (schemaId, content) => {
    if (!generator || Date.now() - made > ttl) {
      generator = new Schema(drupalUrl)
      made = Date.now()
    }
    const [entityType, bundle, mode, schemaType] = schemaId.split('--')
    const index = await generator.druxt.getIndex()
    const resource = index[`${entityType}--${bundle}`]
    if (!resource) return null
    const display = {
      type: 'entity_view_display--entity_view_display',
      attributes: { status: true, content },
    }
    const schema = await generator.getSchema(
      { entityType, bundle, mode, schemaType, ...resource },
      { data: display }
    )
    return (schema && schema.schema) || null
  }
}

module.exports = { draftSchemas }
