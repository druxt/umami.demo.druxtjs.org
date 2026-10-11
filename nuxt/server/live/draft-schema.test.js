const test = require('node:test')
const assert = require('node:assert')
const { draftSchemas } = require('./draft-schema')

/** A DruxtSchema stand-in: one indexed bundle, and the display it was handed. */
function FakeSchema() {
  FakeSchema.made++
  this.druxt = {
    getIndex: () =>
      Promise.resolve({ 'node--recipe': { resourceType: 'node--recipe' } }),
  }
  this.getSchema = (config, { data }) =>
    Promise.resolve({
      schema: {
        id: [
          config.entityType,
          config.bundle,
          config.mode,
          config.schemaType,
        ].join('--'),
        config,
        data,
      },
    })
}
FakeSchema.made = 0

test('a draft builds through druxt-schema with the unsaved display handed in', async () => {
  const build = draftSchemas({ drupalUrl: 'http://drupal', Schema: FakeSchema })
  const content = { field_a: { type: 'string', label: 'above', weight: 1 } }
  const schema = await build('node--recipe--default--view', content)
  assert.strictEqual(schema.id, 'node--recipe--default--view')
  assert.strictEqual(schema.config.resourceType, 'node--recipe')
  assert.deepStrictEqual(schema.data, {
    type: 'entity_view_display--entity_view_display',
    attributes: { status: true, content },
  })
  assert.strictEqual(await build('node--nope--default--view', content), null)
})

test('the generator, and its field config cache, is renewed after the TTL', async () => {
  FakeSchema.made = 0
  const build = draftSchemas({
    drupalUrl: 'http://drupal',
    Schema: FakeSchema,
    ttl: 20,
  })
  await build('node--recipe--default--view', {})
  await build('node--recipe--default--view', {})
  assert.strictEqual(FakeSchema.made, 1)
  await new Promise((resolve) => setTimeout(resolve, 40))
  await build('node--recipe--default--view', {})
  assert.strictEqual(FakeSchema.made, 2)
})
