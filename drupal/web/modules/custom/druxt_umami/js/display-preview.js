/**
 * @file
 * Manage display, previewed live on the Druxt site before it is saved.
 *
 * The form joins `display:<key>` on the site's WebSocket and sends the order
 * of the fields it shows each time the table changes. A site page opened from
 * the link here, with the same key, renders the display that way. The key is
 * random and stays in this tab, so only its own preview follows it.
 */
((Drupal, drupalSettings, once) => {
  const STORAGE = 'druxtDisplayPreviewKey';

  /** A key for this tab: the same one after a reload, so the preview keeps following. */
  const keyFor = () => {
    let key = window.sessionStorage.getItem(STORAGE);
    if (!key) {
      const bytes = new Uint8Array(18);
      window.crypto.getRandomValues(bytes);
      key = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      window.sessionStorage.setItem(STORAGE, key);
    }
    return key;
  };

  /**
   * The fields the table shows, in its order: every row not in Disabled, by
   * weight. Dragging renumbers the weights, and "Show row weights" edits
   * them, so the weights are the order either way.
   */
  const shownFields = (table) =>
    Array.from(table.querySelectorAll('tbody tr'))
      .map((row, index) => {
        const region = row.querySelector('select[name$="[region]"]');
        const weight = row.querySelector('[name$="[weight]"]');
        const match = region && region.name.match(/^fields\[([^\]]+)\]/);
        return match && region.value !== 'hidden'
          ? { name: match[1], weight: Number(weight && weight.value) || 0, index }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.weight - b.weight || a.index - b.index)
      .map((field) => field.name);

  Drupal.behaviors.druxtDisplayPreview = {
    attach(context) {
      const settings = drupalSettings.druxtDisplayPreview;
      once('druxt-display-preview', '.druxt-display-preview', context).forEach(
        (panel) => {
          const table = document.getElementById('field-display-overview');
          if (!settings || !table) return;
          const origin = settings.frontend || window.location.origin;
          const key = keyFor();
          const channel = `display:${key}`;

          panel.innerHTML = `
            <p>
              <strong>${Drupal.t('Live preview on the Druxt site')}</strong>
              <a class="button button--small" target="druxt-preview"></a>
              <span class="druxt-display-preview__status"></span>
            </p>
            <p class="description">${Drupal.t(
              'Open the preview beside this form. Drag a field or move it to Disabled, and the site shows the change before you save.',
            )}</p>`;
          const link = panel.querySelector('a');
          link.textContent = Drupal.t('Open live preview');
          link.href = `${origin}${settings.path}?druxt-preview=${encodeURIComponent(key)}`;
          const status = panel.querySelector('.druxt-display-preview__status');

          let socket = null;
          let last = '';
          const send = () => {
            if (!socket || socket.readyState !== 1) return;
            const draft = { schemaId: settings.schemaId, fields: shownFields(table) };
            const message = JSON.stringify({ type: 'draft', channel, payload: draft });
            if (message === last) return;
            last = message;
            socket.send(message);
          };

          const connect = (delay = 1000) => {
            const url = `${origin.replace(/^http/, 'ws')}/_live`;
            socket = new WebSocket(url);
            socket.addEventListener('open', () => {
              status.textContent = Drupal.t('Connected');
              socket.send(JSON.stringify({ type: 'join', channel, payload: {} }));
              last = '';
              send();
            });
            socket.addEventListener('close', () => {
              status.textContent = Drupal.t('Reconnecting…');
              setTimeout(() => connect(Math.min(delay * 2, 30000)), delay);
            });
          };
          connect();

          // Dragging reorders the rows and renumbers the weights; "Show row
          // weights" edits them, and a region select moves a field in or out
          // of Disabled. Any of these changes the table.
          let pending = null;
          const changed = () => {
            clearTimeout(pending);
            pending = setTimeout(send, 50);
          };
          new MutationObserver(changed).observe(table.querySelector('tbody'), {
            childList: true,
            subtree: true,
          });
          table.addEventListener('change', changed);
          table.addEventListener('input', changed);
        },
      );
    },
  };
})(Drupal, drupalSettings, once);
