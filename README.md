# secure-contact

A progressive-enhancement script and CLI for displaying email, phone, and
WhatsApp contact links on static sites without exposing them to scrapers.

- No contact data ever lives in your HTML.
- Values are split into fragments, each encoded a different way, and only
  decoded in the browser when a user clicks.
- No custom elements or Shadow DOM — you write plain, semantic HTML
  (`address`/`dl`/`dt`/`dd`/`button`) and the script enhances it in place.
- Instagram (or any other link that doesn't need obfuscating) isn't part
  of this library at all — just write a normal `<a>` tag.

## Install (from GitHub, no npm registry needed)

```bash
npm install github:saqimtiaz/secure-contact
```

Pin to a specific tag/release for stability (recommended over tracking a
branch):

```bash
npm install github:saqimtiaz/secure-contact#v1.0.0
```

Or add directly to `package.json`:

```json
{
  "dependencies": {
    "secure-contact": "github:saqimtiaz/secure-contact#v1.0.0"
  }
}
```

Tag releases on the GitHub repo (`git tag v1.0.0 && git push --tags`) so
consumers can pin to a stable ref instead of `main`.

## 1. Generate your contact data (once, locally)

This step is the same regardless of how your site is built.

```bash
cp node_modules/secure-contact/contact-source.example.json contact-source.json
# edit contact-source.json with your real email/phone/whatsapp values
npx secure-contact-generate contact-source.json public/contact-data.json
```

Add `contact-source.json` to your site's `.gitignore` — it's the only file
with plaintext values. `contact-data.json` (the obfuscated output) is safe
to commit and deploy.

You can also call the generator from your own build script instead of the
CLI:

```js
import { generateContactData } from 'secure-contact/generate';
await generateContactData('contact-source.json', 'public/contact-data.json');
```

## 2. Write the markup

Plain, semantic HTML — no custom elements. A `dl` inside an `address` is a
natural fit for a list of contact methods; a `button` triggers the reveal
for each one that's obfuscated. Instagram (or anything else you don't need
to hide) is just a normal link, right alongside the rest:

```html
<address data-secure-contact-src="/contact-data.json">
  <dl>
    <div>
      <dt>Email</dt>
      <dd><button type="button" data-secure-contact="email">Show email</button></dd>
    </div>
    <div>
      <dt>Phone</dt>
      <dd><button type="button" data-secure-contact="phone">Show phone number</button></dd>
    </div>
    <div>
      <dt>WhatsApp</dt>
      <dd><button type="button" data-secure-contact="whatsapp">Message on WhatsApp</button></dd>
    </div>
    <div>
      <dt>Instagram</dt>
      <dd><a href="https://instagram.com/yourhandle">@yourhandle</a></dd>
    </div>
  </dl>
</address>
```

`data-secure-contact-src` (optional, default `./contact-data.json`) can go
on the `button` itself or any ancestor — it's read via `closest()`, so
setting it once on the `<address>` covers every button inside it.

## 3. Load the script

Pick whichever matches your setup.

### A. Sites with a bundler (Vite, Webpack, Next static export, Astro, etc.)

```js
// e.g. in your main entry file — enhances all matching markup on the page
import 'secure-contact';
```

The bundler resolves `secure-contact`'s internal imports and includes it in
your build output automatically — nothing else to configure.

### B. Plain static HTML, no build step

**Option 1 — copy the files in.** After `npm install`, copy the `src/`
folder's contents into your deployed static assets, and generate
`contact-data.json` in the same pass. A minimal `build.sh` for a static
site with no other build tooling:

```bash
#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="dist"
VENDOR_DIR="$OUT_DIR/vendor/secure-contact"

echo "Cleaning output directory..."
rm -rf "$OUT_DIR"
mkdir -p "$VENDOR_DIR"

echo "Copying static site files..."
cp -r public/. "$OUT_DIR/"

echo "Copying secure-contact script..."
cp -r node_modules/secure-contact/src/. "$VENDOR_DIR/"

echo "Generating contact-data.json..."
npx secure-contact-generate contact-source.json "$OUT_DIR/contact-data.json"

echo "Build complete: $OUT_DIR/"
```

Make it executable and run it as your build command:

```bash
chmod +x build.sh
./build.sh
```

Reference the copied script (and, optionally, the stylesheet) from your
HTML — both now live under `dist/`, ready to deploy as-is:

```html
<link rel="stylesheet" href="/vendor/secure-contact/secure-contact.css">
<script type="module" src="/vendor/secure-contact/secure-contact.js"></script>
```

`contact-source.json` stays in your project root (gitignored, never copied
into `dist/`), so the plaintext values never ship to the deployed site —
only the already-obfuscated `contact-data.json` does.

**Option 2 — load straight from GitHub via a CDN, no install at all.**
jsDelivr mirrors any public GitHub repo:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/saqimtiaz/secure-contact@v1.0.0/src/secure-contact.css"
>
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/saqimtiaz/secure-contact@v1.0.0/src/secure-contact.js"
></script>
```

Pin to a tag (`@v1.0.0`) rather than `@main` so the file can't change under
you unexpectedly. You still need to generate `contact-data.json` locally
(step 1) and deploy it alongside your HTML — the CDN only serves the
script, not your contact data.

Either static option works because `secure-contact.js` uses relative
`import` statements (`./obfuscate.js`, `./codecs.js`), which browsers
resolve natively via `<script type="module">` — no bundler required.

If your markup is injected dynamically after the page loads (e.g. by a
client-side router), call the exported `initSecureContact()` again on the
new content:

```js
import { initSecureContact } from 'secure-contact';
initSecureContact(newlyInsertedElement);
```

## 4. Reveal behavior

- **Email / phone** (`data-secure-contact="email"` / `="phone"`, matching
  the `type` in your data file): the button stays visible with its
  original label. Clicking decodes the value and inserts a link right
  after the button, inside the same `<dd>`.
- **WhatsApp**: the button stays visible; clicking opens `wa.me` in a new
  tab. Nothing is inserted into the page.
- **Instagram**, or anything else you don't need obfuscated: not handled
  by this library — write it as a normal link in your markup.

### Accessibility

- The reveal is a real `<button type="button">`, so it's keyboard-operable
  and has a proper accessible name from the start — no ARIA needed to make
  it usable.
- Once a value is revealed, the script adds `aria-expanded="true"` and
  `aria-controls` (pointing at the inserted element) to the button, and
  `aria-live="polite"` on the inserted element so assistive tech announces
  the new value.
- All of this lives in real DOM elements (`dl`/`dt`/`dd`, `button`, `a`) —
  no shadow tree, so browser extensions, translation tools, and assistive
  tech all see the same markup a sighted mouse user does.

### Optional reveal animation

Add `data-secure-contact-animate` to the button or any ancestor (e.g. the
`<address>`, to cover every contact method at once) to have the revealed
value expand vertically into place instead of appearing instantly:

```html
<address data-secure-contact-src="/contact-data.json" data-secure-contact-animate>
  ...
</address>
```

This requires `secure-contact.css` (or the `.secure-contact-reveal--animate`
rules copied into your own stylesheet) — without it the attribute is a
no-op and the value just appears immediately. The animation respects
`prefers-reduced-motion: reduce` automatically.

## 5. Style it

`secure-contact.css` is entirely optional — the script works with zero CSS,
since buttons are buttons and revealed values are links. If you do include
it, theme it via CSS custom properties from your own stylesheet:

```css
address {
  --secure-contact-bg: #f4f4f5;
  --secure-contact-bg-hover: #ececee;
  --secure-contact-border: #ddd;
  --secure-contact-radius: 8px;
  --secure-contact-reveal-duration: 0.25s; /* only used when animating */
}
```

## Attributes

| Attribute | Where | Required | Default | Description |
|---|---|---|---|---|
| `data-secure-contact` | `<button>` | yes | — | Which entry to read from the JSON data file |
| `data-secure-contact-src` | button or ancestor | no | `./contact-data.json` | Path to the JSON data file |
| `data-secure-contact-animate` | button or ancestor | no | off | Enables the vertical-expand reveal animation |

## Package contents

```
secure-contact/
├── package.json
├── README.md
├── LICENSE
├── contact-source.example.json   ← copy this, fill in real values
├── src/
│   ├── codecs.js                 ← encode/decode primitives
│   ├── obfuscate.js               ← split/obfuscate/decode logic
│   ├── generate.js                ← Node-only: builds contact-data.json
│   ├── secure-contact.js          ← progressive-enhancement script (browser)
│   └── secure-contact.css         ← optional base styles + reveal animation
└── bin/
    └── generate-contact-data.js  ← CLI entry (`secure-contact-generate`)
```

## Security note

This raises the cost of scraping enough to filter out the vast majority of
low-effort bots — it is not cryptography. `secure-contact.js` (and its
decode logic) is necessarily public, since it runs in the browser. A bot
author who specifically targets your site and reverse-engineers the codec
can reconstruct the data.