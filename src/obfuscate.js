/**
 * obfuscate.js
 * -------------
 * Splitting, encoding, and decoding logic shared between the generator
 * (which produces contact-data.json) and the browser element (which
 * consumes it). Keeping this in one place guarantees the two can never
 * drift out of sync with each other.
 */

import { CODECS } from './codecs.js';

const METHODS = ['reverse', 'base64', 'rot13', 'hex'];

function splitIntoChunks(str, n) {
  const chars = Array.from(str);
  const len = chars.length;
  const base = Math.floor(len / n);
  const remainder = len % n;
  const chunks = [];
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const size = base + (i < remainder ? 1 : 0);
    chunks.push(chars.slice(idx, idx + size).join(''));
    idx += size;
  }
  return chunks;
}

/** Node-side: split + encode a plaintext value into obfuscated parts. */
export function obfuscateValue(value, partCount = 3) {
  const chunks = splitIntoChunks(value, partCount);
  return chunks.map((chunk, i) => {
    const method = METHODS[i % METHODS.length];
    return { method, value: CODECS[method].encode(chunk) };
  });
}

/** Browser-side: decode parts back into the original plaintext value. */
export function decodeParts(parts) {
  return parts.map((p) => CODECS[p.method].decode(p.value)).join('');
}
