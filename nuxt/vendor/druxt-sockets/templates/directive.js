import Vue from 'vue'
import { directive } from '<%= options.directive %>'

// Everywhere: a server render warns of a directive it cannot resolve.
Vue.directive('druxt-sockets', directive)
