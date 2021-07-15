<template>
  <div v-if="!$attrs.editbar">
    <b-button v-b-toggle.sitebar>Open SiteBar</b-button>

    <DruxtSite v-model="model" v-bind="props">
      <template #default="site">
        <b-container fluid>
          <Draggable
            v-model="regions.header"
            group="region"
            @change="change"
            @input="input"
          >
            <DruxtBlockRegion
              v-for="region of regions.header"
              :key="region"
              v-bind="site.props[region]"
            />
            <div v-if="!regions.header.length" class="placeholder">Header</div>
          </Draggable>
          <!-- <DruxtBlockRegion
            v-if="regions.includes('header')"
            v-bind="props.header"
            :wrapper="{
              class: ['bg-white', 'p-3'],
              component: 'b-navbar',
              propsData: {
                sticky: true,
                toggleable: 'lg',
              },
            }"
          />-->

          <Draggable v-model="regions.banner_top" group="region">
            <DruxtBlockRegion
              v-for="region of regions.banner_top"
              :key="region"
              v-bind="site.props[region]"
            />
            <div v-if="!regions.banner_top.length" class="placeholder">
              Banner Top
            </div>
          </Draggable>

          <b-row class="bg-light">
            <b-container :class="containerClass">
              <!-- <b-row v-if="!isHomePath && regions.includes('breadcrumbs')"> -->
              <b-row v-if="!isHomePath">
                <b-col>
                  <Draggable v-model="regions.breadcrumbs" group="region">
                    <DruxtBlockRegion
                      v-for="region of regions.breadcrumbs"
                      :key="region"
                      v-bind="site.props[region]"
                    />
                    <div v-if="!regions.breadcrumbs.length" class="placeholder">
                      Breadcrumbs
                    </div>
                  </Draggable>
                </b-col>
              </b-row>

              <!-- <b-row v-if="!isHomePath && regions.includes('page_title')"> -->
              <b-row v-if="!isHomePath">
                <b-col class="mb-3 mb-md-5">
                  <Draggable v-model="regions.page_title" group="region">
                    <DruxtBlockRegion
                      v-for="region of regions.page_title"
                      :key="region"
                      v-bind="site.props[region]"
                    />
                    <div v-if="!regions.page_title.length" class="placeholder">
                      Page title
                    </div>
                  </Draggable>
                </b-col>
              </b-row>

              <Draggable v-model="regions.content" group="region">
                <DruxtBlockRegion
                  v-for="region of regions.content"
                  :key="region"
                  v-bind="site.props[region]"
                />
                <div v-if="!regions.content.length" class="placeholder">
                  Content
                </div>
              </Draggable>
            </b-container>
          </b-row>

          <!-- <b-row
            v-if="regions.includes('content_bottom')"
            class="bg-secondary text-white"
          > -->
          <b-row class="bg-secondary text-white">
            <b-container
              :class="containerClass.concat(['text-center', 'text-md-left'])"
            >
              <Draggable v-model="regions.content_bottom" group="region">
                <DruxtBlockRegion
                  v-for="region of regions.content_bottom"
                  :key="region"
                  v-bind="site.props[region]"
                />
                <div v-if="!regions.content_bottom.length" class="placeholder">
                  Content Bottom
                </div>
              </Draggable>
            </b-container>
          </b-row>

          <!-- <b-row v-if="regions.includes('footer')" class="bg-dark text-white"> -->
          <b-row class="bg-dark text-white">
            <b-container
              :class="containerClass.concat(['text-center', 'text-md-left'])"
            >
              <Draggable v-model="regions.footer" group="region">
                <DruxtBlockRegion
                  v-for="region of regions.footer"
                  :key="region"
                  v-bind="site.props[region]"
                />
                <div v-if="!regions.footer.length" class="placeholder">
                  Footer
                </div>
              </Draggable>
            </b-container>
          </b-row>

          <!-- <b-row v-if="regions.includes('bottom')"> -->
          <b-row>
            <b-container
              :class="containerClass.concat(['text-center', 'text-md-left'])"
            >
              <!-- <DruxtBlockRegion v-bind="props.bottom" /> -->
            </b-container>
          </b-row>

          <b-sidebar
            id="search"
            title="Search"
            backdrop
            shadow
            no-close-on-route-change
            right
          >
            <DruxtSearchbar />
          </b-sidebar>
        </b-container>
      </template>
    </DruxtSite>

    <!-- SiteBar -->
    <b-sidebar id="sitebar" right>
      <b-container>
        <DruxtSite v-model="model" v-bind="props">
          <template #default="sitebar">
            <Draggable
              v-model="sitebar.regions"
              :group="{ name: 'region', pull: 'clone' }"
            >
              <DruxtBlockRegion
                v-for="region of sitebar.regions"
                :key="`sitebar-${region}`"
                class="mb-2"
                v-bind="sitebar.props[region]"
                :editbar="true"
              >
                <template #default="blockRegion">
                  <b-card
                    class="overflow-hidden"
                    :style="{ maxHeight: '150px' }"
                    :title="blockRegion.name"
                  >
                    <DruxtBlockRegion
                      v-bind="sitebar.props[region]"
                      :style="{ transform: 'scale(0.5) transpose(-50%, -50%)' }"
                    />
                  </b-card>
                </template>
              </DruxtBlockRegion>
            </Draggable>
          </template>
        </DruxtSite>
      </b-container>
    </b-sidebar>
  </div>
</template>

<script>
import Draggable from 'vuedraggable'

export default {
  components: { Draggable },

  data: () => ({
    model: null,
    editbar: [],
    regions: {
      banner_top: [],
      content: [],
      content_bottom: [],
      content_top: [],
      header: [],
      footer: [],
      page_title: [],
    },
  }),

  computed: {
    containerClass: () => ['mb-3', 'mt-3', 'mb-md-5', 'mt-md-5'],

    isHomePath: ({ $store }) => !!$store.state.druxtRouter.route.isHomePath,

    props: () => ({
      theme: 'umami',
    }),
  },

  methods: {
    change(a, b) {
      console.log('change', a, b)
    },

    input(a, b) {
      console.log('input', a, b)
    },
  },
}
</script>

<style>
html {
  font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
}

.sticky-top {
  margin: 0 -15px;
}

.placeholder {
  border: 2px dashed lightgray;
  padding: 1em;
  margin: 0.5em 0;
}
</style>
