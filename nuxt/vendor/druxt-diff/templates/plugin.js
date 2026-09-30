/**
 * Registers `v-diff`, rendered by Nuxt with the module's options.
 *
 * Imports the package by its own name, not by a relative path: the built
 * components sit in `dist/components` and a relative import from there would
 * climb out of the package. The same reason the other Druxt contrib modules
 * do it this way.
 */
import Vue from 'vue'
import { diffDirective } from '@druxt-contrib/diff'

// `v-diff="{ left, right }"` marks a field's change inline in already-rendered
// markup. A null value is a no-op, so one binding covers "not comparing" and
// "this field did not change".
Vue.directive('diff', diffDirective)
