<template>
  <AppFormField
    :description="description"
    :feedback="[...feedback, ...(uploadError ? [uploadError] : [])]"
    :label="label"
    :required="required"
  >
    <!-- The current picture with its file, replace and remove. -->
    <div v-if="media" class="edit-media">
      <div class="edit-media__thumb">
        <img v-if="src" :src="src" :alt="alt" />
      </div>
      <div class="edit-media__body">
        <span class="edit-media__name">{{ filename }}</span>
        <span class="edit-field__description">
          <template v-if="width">{{ width }} × {{ height }} · </template>Media
          image
        </span>
        <span class="edit-media__actions">
          <button type="button" @click="choose">Replace</button>
          <button class="is-remove" type="button" @click="remove">
            Remove
          </button>
        </span>
      </div>
    </div>

    <!-- Nothing yet: a drop zone. -->
    <div
      v-else
      class="edit-dropzone"
      :class="{ 'is-over': over }"
      @dragover.prevent="over = true"
      @dragleave="over = false"
      @drop.prevent="drop"
    >
      <span class="edit-dropzone__icon" aria-hidden="true">⤓</span>
      <span>
        Drop a photograph here or
        <button class="edit-dropzone__choose" type="button" @click="choose">
          choose one
        </button>
      </span>
      <span class="edit-field__description">JPG or PNG, 4:3 works best</span>
    </div>
    <p v-if="uploading" class="edit-field__description">Uploading…</p>

    <input
      ref="file"
      accept="image/jpeg,image/png,image/webp"
      hidden
      type="file"
      @change="upload($event.target.files[0])"
    />

    <label
      v-if="media"
      class="edit-field__label edit-media__alt-label"
      :for="`${id}-alt`"
    >
      Alt text<span class="edit-field__required">*</span>
    </label>
    <input
      v-if="media"
      :id="`${id}-alt`"
      class="edit-control edit-control--small"
      type="text"
      :value="alt"
      @change="setAlt($event.target.value)"
    />
    <p v-if="altError" class="edit-field__error">{{ altError }}</p>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { referenceItems, relationship } from '~/utils/form-widgets'

/**
 * Media is two hops from the recipe: the node references a media item, the
 * media item references the file. Replacing a picture uploads the bytes to
 * the media type's file field, creates the media item, then points the
 * recipe at it, so no temporary file is left behind.
 */
export default {
  mixins: [formField],

  data: () => ({
    media: null,
    file: null,
    over: false,
    uploading: false,
    uploadError: '',
    altError: '',
  }),

  computed: {
    ref: ({ value }) => referenceItems(value)[0] || null,
    fileRef: ({ media }) =>
      (((media || {}).relationships || {}).field_media_image || {}).data ||
      null,
    alt: ({ fileRef }) => ((fileRef || {}).meta || {}).alt || '',
    width: ({ fileRef }) => ((fileRef || {}).meta || {}).width,
    height: ({ fileRef }) => ((fileRef || {}).meta || {}).height,
    filename: ({ file, media }) =>
      ((file || {}).attributes || {}).filename ||
      ((media || {}).attributes || {}).name,
    src: ({ file }) => {
      const uri = ((file || {}).attributes || {}).uri || {}
      return uri.url ? `${uri.url}` : ''
    },
  },

  watch: {
    ref: {
      immediate: true,
      handler(now, before) {
        if ((now || {}).id !== (before || {}).id) this.load()
      },
    },
  },

  methods: {
    async load() {
      this.media = null
      this.file = null
      if (!this.ref) return
      const r = await this.$store
        .dispatch('druxt/getResource', {
          type: this.ref.type,
          id: this.ref.id,
          query: {
            include: 'field_media_image',
            [`fields[${this.ref.type}]`]: 'name,field_media_image',
            'fields[file--file]': 'filename,uri',
          },
        })
        .catch(() => null)
      this.media = (r || {}).data || null
      this.file =
        ((r || {}).included || []).find((o) => o.type === 'file--file') || null
    },

    choose() {
      this.$refs.file.click()
    },

    drop(event) {
      this.over = false
      const [file] = event.dataTransfer.files || []
      if (file) this.upload(file)
    },

    /** Bytes to the file field's route, then a media item, then the reference. */
    async upload(file) {
      if (!file) return
      this.uploading = true
      this.uploadError = ''
      try {
        const type = this.ref ? this.ref.type : 'media--image'
        const [entity, bundle] = type.split('--')
        const uploaded = await this.$druxt.axios.post(
          `/en/jsonapi/${entity}/${bundle}/field_media_image`,
          file,
          {
            headers: {
              Accept: 'application/vnd.api+json',
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `file; filename="${encodeURIComponent(
                file.name
              )}"`,
            },
          }
        )
        const fileResource = uploaded.data.data
        const created = await this.$druxt.createResource({
          type,
          attributes: { name: file.name },
          relationships: {
            field_media_image: {
              data: {
                type: 'file--file',
                id: fileResource.id,
                meta: { alt: this.alt || file.name.replace(/\.\w+$/, '') },
              },
            },
          },
        })
        const media = (created || {}).data || created
        this.$emit('input', relationship([{ type, id: media.id }], false))
        this.$nextTick(this.load)
      } catch (e) {
        this.uploadError = `The photograph could not be uploaded. ${
          (((e.response || {}).data || {}).errors || [{}])[0].detail ||
          'Sign in to add a picture.'
        }`
      }
      this.uploading = false
      this.$refs.file.value = ''
    },

    remove() {
      this.$emit('input', relationship([], false))
      this.media = null
      this.file = null
    },

    /** Alt text lives on the media item, so it is written there straight away. */
    async setAlt(alt) {
      this.altError = ''
      if (!this.media) return
      try {
        await this.$druxt.updateResource({
          type: this.media.type,
          id: this.media.id,
          relationships: {
            field_media_image: {
              data: {
                ...this.fileRef,
                meta: { ...(this.fileRef.meta || {}), alt },
              },
            },
          },
        })
        this.media = {
          ...this.media,
          relationships: {
            ...this.media.relationships,
            field_media_image: {
              data: {
                ...this.fileRef,
                meta: { ...(this.fileRef.meta || {}), alt },
              },
            },
          },
        }
      } catch (e) {
        this.altError =
          'The alt text could not be saved. Sign in with an account that may edit media.'
      }
    },
  },
}
</script>
