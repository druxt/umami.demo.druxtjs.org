export default {
  middleware: ['auth'],
  render(h) {
    return h('div', ['Loading...'])
  }
}
