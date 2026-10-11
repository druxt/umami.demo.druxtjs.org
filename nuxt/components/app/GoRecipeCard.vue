<template>
  <!-- A card dealt from a recipe, rendered by Druxt: DruxtEntity fetches the
       recipe through the Druxt store, and the card takes its title from the
       entity and its photograph from the recipe's own image field. The dealt
       copy sits underneath until Druxt has the recipe, at the same size, so a
       hand never jumps. A save in Drupal refreshes every card showing it. -->
  <div class="go-recipe-card">
    <AppGoCard v-bind="dealt" :state="state" :size="size" />
    <DruxtEntity
      v-if="card.uuid"
      class="go-recipe-card__druxt"
      type="node--recipe"
      :uuid="card.uuid"
      mode="card"
      :settings="settings"
      :wrapper="false"
    >
      <template #default="{ entity, fields }">
        <AppGoCard
          v-bind="dealt"
          :title="entity.attributes.title"
          :state="state"
          :size="size"
        >
          <template v-if="fields.field_media_image" #art>
            <DruxtField
              v-bind="fields.field_media_image"
              class="go-card__druxt-art"
            />
          </template>
        </AppGoCard>
      </template>
    </DruxtEntity>
  </div>
</template>

<script>
export default {
  props: {
    /** The card as the server dealt it: kind, recipe uuid, points or sides. */
    card: { type: Object, required: true },
    state: { type: String, default: 'hand' },
    size: { type: String, default: 'full' },
  },

  computed: {
    // The card display carries no title; the game card shows the recipe's.
    settings: () => ({ query: { fields: ['title'] } }),

    dealt() {
      const { kind, title, image, points, sides } = this.card
      return {
        kind,
        title: title || '',
        // Drupal's files come through this origin's proxy.
        img: image || '',
        points: points || 1,
        icons: sides || 1,
      }
    },
  },
}
</script>
