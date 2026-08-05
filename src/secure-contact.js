/**
 * secure-contact.js
 * ------------------
 * Progressively enhances plain, semantic HTML — it does not define a
 * custom element and does not own any markup. You write ordinary
 * `<address>` / `<dl>` / `<button>` markup on the page; this script finds
 * it and wires up the reveal behavior.
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
 * Markup contract (see README for the full example):
 *
 *   <address data-secure-contact-src="./contact-data.json">
 *     <dl>
 *       <div>
 *         <dt>Email</dt>
 *         <dd><button type="button" data-secure-contact="email">Show email</button></dd>
 *       </div>
 *       <div>
 *         <dt>Phone</dt>
 *         <dd><button type="button" data-secure-contact="phone">Show phone number</button></dd>
 *       </div>
 *       <div>
 *         <dt>WhatsApp</dt>
 *         <dd><button type="button" data-secure-contact="whatsapp">Message on WhatsApp</button></dd>
 *       </div>
 *     </dl>
 *   </address>
 *
 * Attributes the script reads:
 *   data-secure-contact       (required, on a <button>) - the key to read
 *                              from the JSON data file.
 *   data-secure-contact-src   (optional, on the button or any ancestor) -
 *                              path to the JSON data file. Default
 *                              "./contact-data.json".
 *   data-secure-contact-animate (optional, on the button or any ancestor) -
 *                              presence enables the vertical-expand reveal
 *                              animation (see secure-contact.css). Without
 *                              it, the value simply appears.
 *
 * Instagram (or any other un-obfuscated link) doesn't need this script at
 * all — write it as a normal `<a href="https://instagram.com/...">` in
 * your markup and skip the button/data-file/reveal pattern entirely.
 *
 * Reveal behavior:
 *   - email / tel: the button stays visible and keeps its label. Clicking
 *     decodes the value and inserts a link after the button, inside the
 *     same <dd>. The button gets aria-expanded/aria-controls pointing at
 *     the inserted element.
 *   - whatsapp: the button stays visible; clicking opens wa.me in a new
 *     tab. Nothing is inserted, so no aria-expanded/aria-controls is
 *     added.
 *
 * Styling: see secure-contact.css for optional base styles, the reveal
 * animation, and the CSS custom properties it exposes.
 */

import { decodeParts } from './obfuscate.js';

const DEFAULT_SRC = './contact-data.json';
const INLINE_DISPLAY_TYPES = new Set(['email', 'tel']);

// Shared across every enhanced button on the page: fetching the same src
// twice (e.g. one button per contact method, same data file) only hits
// the network once.
const dataCache = new Map();

let uid = 0;

function loadData(src) {
  if (!dataCache.has(src)) {
    dataCache.set(
      src,
      fetch(src).then((res) => {
        if (!res.ok) throw new Error('Failed to load ' + src + ' (' + res.status + ')');
        return res.json();
      })
    );
  }
  return dataCache.get(src);
}

function getSrc(button) {
  const host = button.closest('[data-secure-contact-src]');
  return (host && host.getAttribute('data-secure-contact-src')) || DEFAULT_SRC;
}

function animationEnabled(button) {
  return button.closest('[data-secure-contact-animate]') !== null;
}

/**
 * Wires up a single trigger button. Idempotent - safe to call again on a
 * button that's already enhanced (e.g. if you re-run initSecureContact
 * after injecting more markup).
 */
function enhance(button) {
  if (button.dataset.secureContactReady) return;
  button.dataset.secureContactReady = 'true';

  const key = button.getAttribute('data-secure-contact');
  const dd = button.closest('dd') || button.parentElement;
  const originalLabel = button.textContent;
  let revealed = false;

  button.addEventListener('click', () => {
    if (revealed || button.disabled) return;

    const src = getSrc(button);
    button.disabled = true;
    //button.textContent = 'Loading…';

    loadData(src)
      .then((data) => {
        const entry = data[key];
        if (!entry) throw new Error('No contact entry for key "' + key + '"');
        applyEntry(button, dd, entry, originalLabel, animationEnabled(button));
        revealed = entry.type !== 'whatsapp'; // whatsapp re-opens on every click
      })
      .catch((err) => {
        console.error(err);
        button.textContent = 'Unable to load — try again';
        button.disabled = false;
      });
  });
}

function applyEntry(button, dd, entry, originalLabel, animate) {
  const value = decodeParts(entry.parts);

  if (INLINE_DISPLAY_TYPES.has(entry.type)) {
    const href = (entry.type === 'email' ? 'mailto:' : 'tel:') + value;
    insertReveal(button, dd, href, value, animate);
    //button.textContent = originalLabel;
    button.disabled = false;
  } else if (entry.type === 'whatsapp') {
    window.open('https://wa.me/' + value, '_blank', 'noopener');
    //button.textContent = originalLabel;
    button.disabled = false;
  } else {
    throw new Error('Unknown contact type: ' + entry.type);
  }
}

function insertReveal(button, dd, href, value, animate) {
  const id = 'secure-contact-reveal-' + ++uid;

  const reveal = document.createElement('div');
  reveal.className = animate ? 'secure-contact-reveal secure-contact-reveal--animate' : 'secure-contact-reveal';
  reveal.id = id;
  reveal.setAttribute('aria-live', 'polite');

  const inner = document.createElement('div');
  inner.className = 'secure-contact-reveal-inner';

  const link = document.createElement('a');
  link.href = href;
  link.textContent = value; // textContent, never innerHTML - safe from injection
  inner.appendChild(link);
  reveal.appendChild(inner);
  dd.appendChild(reveal);

  button.setAttribute('aria-controls', id);
  button.setAttribute('aria-expanded', 'true');

  if (animate) {
    // Inserted in the collapsed (0fr) state by CSS; add .is-open a couple
    // of frames later so the browser has committed the collapsed state
    // first and the transition to 1fr actually animates.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => reveal.classList.add('is-open'));
    });
  }
}

/**
 * Enhances every not-yet-enhanced trigger button under `root` (defaults
 * to the whole document). Call this again after injecting new
 * secure-contact markup into the page (e.g. from a client-side router).
 */
export function initSecureContact(root = document) {
  root.querySelectorAll('[data-secure-contact]').forEach(enhance);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSecureContact());
  } else {
    initSecureContact();
  }
}