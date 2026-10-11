/**
 * @file
 * Manage display, previewed live on the Druxt site before it is saved.
 *
 * The form joins `display:<key>` on the site's WebSocket and sends the display
 * as it stands each time the table changes: the fields it shows, by weight,
 * with their labels, formatters and formatter settings. The site's server
 * builds a Druxt schema from that, and a site page opened from the link here,
 * with the same key, renders the display that way. The key is random and
 * stays in this tab, so only its own preview follows it.
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

  /** Whether "Show row weights" is on, as tabledrag keeps it. */
  const showingWeights = () => {
    try {
      return JSON.parse(localStorage.getItem('Drupal.tableDrag.showWeight'));
    } catch (e) {
      return false;
    }
  };

  /**
   * The display the table shows: every field not in Disabled, with its
   * label and formatter from the table's own inputs. A dragged row moves at
   * once but takes its new weight only when dropped or, from the keyboard,
   * when the handle loses focus, so the rows give the order; with "Show row
   * weights" on, the rows stay put and the weights give it. A formatter's
   * settings come from Drupal's last rebuild of the form, which the table
   * carries, and stand only while the formatter is the one they were made
   * for.
   */
  const displayOf = (table) => {
    let built = {};
    try {
      built = JSON.parse(table.dataset.druxtDraft || '{}');
    } catch (e) {
      // No settings: the formatters' own defaults apply.
    }
    const value = (row, field) => {
      const input = row.querySelector(`[name$="[${field}]"]`);
      return input ? input.value : undefined;
    };
    const byWeight = showingWeights();
    const content = {};
    table.querySelectorAll('tbody tr').forEach((row, index) => {
      const region = row.querySelector('select[name$="[region]"]');
      const match = region && region.name.match(/^fields\[([^\]]+)\]/);
      if (!match || region.value === 'hidden') return;
      const name = match[1];
      const from = built[name] || {};
      const type = value(row, 'type') || from.type || null;
      const same = type === from.type;
      content[name] = {
        type,
        label: value(row, 'label') || from.label || 'hidden',
        weight: byWeight ? Number(value(row, 'weight')) || 0 : index,
        settings: same && from.settings ? from.settings : {},
        third_party_settings:
          same && from.third_party_settings ? from.third_party_settings : {},
      };
    });
    return content;
  };

  Drupal.behaviors.druxtDisplayPreview = {
    attach(context) {
      const settings = drupalSettings.druxtDisplayPreview;
      once('druxt-display-preview', '.druxt-display-preview', context).forEach(
        (panel) => {
          // Field UI's AJAX replaces the table, so it is found afresh each time.
          const table = () => document.getElementById('field-display-overview');
          if (!settings || !table()) return;
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
              'Open the preview beside this form. Reorder or hide a field, or change its label, format or format settings, and the site shows the change before you save.',
            )}</p>`;
          const link = panel.querySelector('a');
          link.textContent = Drupal.t('Open live preview');
          link.href = `${origin}${settings.path}?druxt-preview=${encodeURIComponent(key)}`;
          const status = panel.querySelector('.druxt-display-preview__status');

          let socket = null;
          let last = '';
          const send = () => {
            if (!socket || socket.readyState !== 1) return;
            const draft = { schemaId: settings.schemaId, content: displayOf(table()) };
            const message = JSON.stringify({ type: 'draft', channel, payload: draft });
            if (message === last) return;
            last = message;
            socket.send(message);
          };

          let delay = 1000;
          const connect = () => {
            const url = `${origin.replace(/^http/, 'ws')}/_live`;
            socket = new WebSocket(url);
            socket.addEventListener('open', () => {
              delay = 1000;
              status.textContent = Drupal.t('Connected');
              socket.send(JSON.stringify({ type: 'join', channel, payload: {} }));
              last = '';
              send();
            });
            // The site says when it could not build a preview from a change.
            socket.addEventListener('message', (event) => {
              let message = {};
              try {
                message = JSON.parse(event.data);
              } catch (e) {
                return;
              }
              if (message.channel !== channel) return;
              if (message.type === 'error' && message.payload) {
                status.textContent = message.payload.message;
              } else if (message.type === 'built' && message.payload) {
                // Built, and how many preview tabs it reached.
                const time = new Date().toLocaleTimeString();
                status.textContent = message.payload.watching
                  ? Drupal.formatPlural(
                      message.payload.watching,
                      'Preview updated at @time, 1 tab watching',
                      'Preview updated at @time, @count tabs watching',
                      { '@time': time },
                    )
                  : Drupal.t(
                      'Built at @time, but no preview tab is open: use the link.',
                      { '@time': time },
                    );
              }
            });
            socket.addEventListener('close', () => {
              status.textContent = Drupal.t('Reconnecting…');
              setTimeout(connect, delay);
              delay = Math.min(delay * 2, 30000);
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
          const form = table().closest('form');
          new MutationObserver(changed).observe(form, {
            childList: true,
            subtree: true,
          });
          form.addEventListener('change', changed);
          form.addEventListener('input', changed);
          // A drop sets the new weights without an event, once the pointer or
          // key that made it is released.
          ['pointerup', 'touchend', 'keyup'].forEach((type) =>
            document.addEventListener(type, changed),
          );
        },
      );
    },
  };
})(Drupal, drupalSettings, once);
