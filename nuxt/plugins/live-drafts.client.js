/**
 * A live update leaves an entity with an unsaved draft in this browser alone:
 * refetching it would put Drupal's version over the editor's.
 */
export default ({ $sockets, store }) => {
  if (!$sockets) return
  $sockets.hold((type, uuid) =>
    Object.keys((store.state.drafts || {}).drafts || {}).some(
      (key) => key.split(':').slice(0, 2).join(':') === `${type}:${uuid}`
    )
  )
}
