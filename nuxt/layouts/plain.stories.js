import PlainLayout from './plain.vue'

export default {
  title: 'Site/Layouts/Plain',
  component: PlainLayout,
}

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PlainLayout },
  template: '<PlainLayout><DruxtRouter path="/" /></PlainLayout>',
})

export const Plain = Template.bind({})
