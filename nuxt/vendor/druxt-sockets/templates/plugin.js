import Vue from 'vue'
import { createSockets } from '<%= options.client %>'

const options = <%= JSON.stringify(options) %>

export default (context, inject) => {
  const sockets = createSockets(context, { ...options, Vue })
  inject('sockets', sockets)
  sockets.connect()
}
