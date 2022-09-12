<template>
  <b-navbar-nav><slot /></b-navbar-nav>
</template>

<script>
export default {
  props: {
    items: {
      type: Array,
      required: true,
    },
  },
}
</script>
