<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    :label="label"
    :required="required"
    :target="id"
  >
    <!-- The unit is the field's own suffix, shown in the control. -->
    <div class="edit-control edit-control--unit">
      <span v-if="unit.prefix" class="edit-control__unit">{{
        unit.prefix
      }}</span>
      <input
        :id="id"
        inputmode="numeric"
        :max="bounds.max || undefined"
        :min="bounds.min === null ? undefined : bounds.min"
        :required="required"
        type="number"
        :value="current"
        @input="
          $emit(
            'input',
            $event.target.value === '' ? null : Number($event.target.value)
          )
        "
      />
      <span v-if="unit.suffix" class="edit-control__unit">{{
        unit.suffix
      }}</span>
    </div>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { numberUnit, single } from '~/utils/form-widgets'

export default {
  mixins: [formField],

  computed: {
    current: ({ value }) => {
      const v = single(value)
      return v === null || v === undefined ? '' : v
    },
    bounds: ({ schema }) => schema.settings.config || {},
    unit: ({ schema }) => numberUnit(schema),
  },
}
</script>
