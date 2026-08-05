# secure-contact

A reusable `<secure-contact>` custom element and CLI for displaying email,
phone, WhatsApp, and Instagram contact links on static sites without
exposing them to scrapers.

- No contact data ever lives in your HTML.
- Email/phone/WhatsApp are split into fragments, each encoded a different
  way, and only decoded in the browser when a user clicks.
- Instagram (not obfuscated by design) renders immediately as a plain link.

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
# edit contact-source.json with your real email/phone/whatsapp/instagram
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

## 2. Use the element on your site

Pick whichever matches your setup.

### A. Sites with a bundler (Vite, Webpack, Next static export, Astro, etc.)

```js
// e.g. in your main entry file — registers <secure-contact> as a side effect
import 'secure-contact';
```

```html
<secure-contact key="email">✉️ Show email</secure-contact>
<secure-contact key="phone">📞 Show phone number</secure-contact>
<secure-contact key="whatsapp">💬 Message on WhatsApp</secure-contact>
<secure-contact key="instagram">📷 Instagram</secure-contact>
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

echo "Copying secure-contact element..."
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

Reference the copied element and generated data from your HTML — both now
live under `dist/`, ready to deploy as-is:

```html
<script type="module" src="/vendor/secure-contact/secure-contact.js"></script>
```

```html
<secure-contact key="email" src="/contact-data.json">✉️ Show email</secure-contact>
```

`contact-source.json` stays in your project root (gitignored, never copied
into `dist/`), so the plaintext values never ship to the deployed site —
only the already-obfuscated `contact-data.json` does.

**Option 2 — load straight from GitHub via a CDN, no install at all.**
jsDelivr mirrors any public GitHub repo:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/saqimtiaz/secure-contact@v1.0.0/src/secure-contact.js"
></script>
```

Pin to a tag (`@v1.0.0`) rather than `@main` so the file can't change under
you unexpectedly. You still need to generate `contact-data.json` locally
(step 1) and deploy it alongside your HTML — the CDN only serves the
element's code, not your contact data.

Either static option works because `secure-contact.js` uses relative
`import` statements (`./obfuscate.js`, `./codecs.js`), which browsers
resolve natively via `<script type="module">` — no bundler required.

## 3. Style it

No shadow-piercing needed — theme via CSS custom properties from your own
stylesheet:

```css
secure-contact {
  --secure-contact-bg: #f4f4f5;
  --secure-contact-bg-hover: #ececee;
  --secure-contact-border: #ddd;
  --secure-contact-radius: 8px;
  --secure-contact-reveal-height: 1.6em;
}

secure-contact::part(button),
secure-contact::part(link) {
  font-weight: 600;
}
```

## Attributes

| Attribute | Required | Default | Description |
|---|---|---|---|
| `key` | yes | — | Which entry to read from the JSON data file |
| `src` | no | `./contact-data.json` | Path to the JSON data file |

The element's text content becomes the button label (falls back to a
generic default per type if omitted).

## Package contents

```
secure-contact/
├── package.json
├── README.md
├── LICENSE
├── contact-source.example.json   ← copy this, fill in real values
├── src/
│   ├── codecs.js                 ← encode/decode primitives
│   ├── obfuscate.js              ← split/obfuscate/decode logic
│   ├── generate.js               ← Node-only: builds contact-data.json
│   └── secure-contact.js         ← the <secure-contact> element (browser)
└── bin/
    └── generate-contact-data.js  ← CLI entry (`secure-contact-generate`)
```

## Security note

This raises the cost of scraping enough to filter out the vast majority of
low-effort bots — it is not cryptography. `secure-contact.js` (and its
decode logic) is necessarily public, since it runs in the browser. A bot
author who specifically targets your site and reverse-engineers the codec
can reconstruct the data.
