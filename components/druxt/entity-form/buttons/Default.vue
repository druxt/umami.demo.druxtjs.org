<template>
  <b-button-toolbar>
    <b-button variant="primary" @click="$parent.$emit('submit')">
      Submit
    </b-button>
    <b-button class="ml-2" @click="$parent.$emit('reset')">Reset</b-button>
  </b-button-toolbar>
</template>

<script>
import { BButtonToolbar } from 'bootstrap-vue'

export default {
  components: { BButtonToolbar },
}
</script>
