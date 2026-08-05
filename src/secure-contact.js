/**
 * secure-contact.js
 * ------------------
 * Defines the <secure-contact> custom element. Importing this module
 * (side-effect only, no exports) registers the element.
 *
 * Works two ways:
 *   - With a bundler:  import 'secure-contact';
 *   - Directly in the browser, no build step:
 *       <script type="module" src=".../secure-contact.js"></script>
 *     The relative `import` below resolves fine either from node_modules
 *     or from a CDN mirror of the GitHub repo (e.g. jsDelivr), since both
 *     serve this file's sibling obfuscate.js/codecs.js at the same
 *     relative path.
 *
 * Usage:
 *   <secure-contact key="email">✉️ Show email</secure-contact>
 *   <secure-contact key="phone">📞 Show phone number</secure-contact>
 *   <secure-contact key="whatsapp">💬 Message on WhatsApp</secure-contact>
 *   <secure-contact key="instagram">📷 Instagram</secure-contact>
 *
 * Attributes:
 *   key   (required) - which entry to read from the JSON data file
 *   src   (optional) - path to the JSON data file, default "./contact-data.json"
 *
 * Styling (from the host page's CSS, no shadow-piercing needed):
 *   secure-contact {
 *     --secure-contact-bg: #f4f4f5;
 *     --secure-contact-bg-hover: #ececee;
 *     --secure-contact-border: #ddd;
 *     --secure-contact-color: inherit;
 *     --secure-contact-radius: 8px;
 *     --secure-contact-padding: 0.55em 1.1em;
 *   }
 *   secure-contact::part(button),
 *   secure-contact::part(link) { font-weight: 600; }
 */

import { decodeParts } from './obfuscate.js';

const DEFAULT_LABELS = {
  email: 'Show email',
  tel: 'Show phone number',
  whatsapp: 'Message on WhatsApp',
  instagram: 'Instagram'
};

const STYLE_TAG = `
<style>
  :host { display: inline-block; }

  button, a {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    background: var(--secure-contact-bg, #f4f4f5);
    border: 1px solid var(--secure-contact-border, #ddd);
    border-radius: var(--secure-contact-radius, 8px);
    padding: var(--secure-contact-padding, 0.55em 1.1em);
    font: inherit;
    color: var(--secure-contact-color, inherit);
  }

  button:hover, a:hover { background: var(--secure-contact-bg-hover, #ececee); }
  button:disabled { opacity: 0.6; cursor: default; }
</style>
`;

class SecureContact extends HTMLElement {
  // Shared across all instances on the page: fetching the same src twice
  // (e.g. one <secure-contact> per contact method) only hits the network once.
  static _dataCache = new Map();

  static _loadData(src) {
    if (!SecureContact._dataCache.has(src)) {
      SecureContact._dataCache.set(
        src,
        fetch(src).then((res) => {
          if (!res.ok) throw new Error('Failed to load ' + src + ' (' + res.status + ')');
          return res.json();
        })
      );
    }
    return SecureContact._dataCache.get(src);
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._key = this.getAttribute('key');
    this._src = this.getAttribute('src') || './contact-data.json';
    this._label = (this.textContent || '').trim() || DEFAULT_LABELS[this._key] || 'Contact';

    this._renderButton();

    // Instagram isn't obfuscated - load and render immediately, no click needed.
    if (this._key === 'instagram') {
      this._reveal();
    }
  }

  _renderButton() {
    this.shadowRoot.innerHTML = STYLE_TAG;
    const btn = document.createElement('button');
    btn.part = 'button';
    btn.type = 'button';
    btn.textContent = this._label;
    this.shadowRoot.appendChild(btn);

    if (this._key !== 'instagram') {
      btn.addEventListener('click', () => this._reveal());
    }
  }

  _reveal() {
    const btn = this.shadowRoot.querySelector('button');
    if (!btn || btn.disabled) return;

    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Loading…';

    SecureContact._loadData(this._src)
      .then((data) => {
        const entry = data[this._key];
        if (!entry) throw new Error('No contact entry for key "' + this._key + '"');
        this._applyEntry(entry, btn, originalLabel);
      })
      .catch((err) => {
        console.error(err);
        btn.textContent = 'Unable to load — try again';
        btn.disabled = false;
      });
  }

  _applyEntry(entry, btn, originalLabel) {
    if (entry.type === 'instagram') {
      this._renderLink(entry.url, this._label);
      return;
    }

    const value = decodeParts(entry.parts);

    if (entry.type === 'email') {
      this._renderLink('mailto:' + value, value);
    } else if (entry.type === 'tel') {
      this._renderLink('tel:' + value, value);
    } else if (entry.type === 'whatsapp') {
      window.open('https://wa.me/' + value, '_blank', 'noopener');
      btn.textContent = originalLabel;
      btn.disabled = false;
    } else {
      throw new Error('Unknown contact type: ' + entry.type);
    }
  }

  _renderLink(href, text) {
    this.shadowRoot.innerHTML = STYLE_TAG;
    const a = document.createElement('a');
    a.part = 'link';
    a.href = href;
    a.textContent = text; // textContent, never innerHTML - safe from injection
    if (/^https?:/.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    this.shadowRoot.appendChild(a);
  }
}

customElements.define('secure-contact', SecureContact);
