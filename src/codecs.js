/**
 * codecs.js
 * ----------
 * Encode/decode functions shared by the generator (Node) and the
 * browser element. Pure ESM, uses only Web-standard APIs (btoa/atob,
 * TextEncoder/TextDecoder) available in both modern browsers and
 * Node 18+, so this file works unmodified in either environment.
 */

function rot13Char(c) {
  const code = c.charCodeAt(0);
  const base = code >= 97 ? 97 : 65; // lowercase vs uppercase
  return String.fromCharCode(((code - base + 13) % 26) + base);
}

export const CODECS = {
  reverse: {
    encode: (str) => Array.from(str).reverse().join(''),
    decode: (str) => Array.from(str).reverse().join('')
  },

  rot13: {
    encode: (str) => str.replace(/[a-zA-Z]/g, rot13Char),
    decode: (str) => str.replace(/[a-zA-Z]/g, rot13Char) // rot13 is self-inverse
  },

  base64: {
    encode: (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str))),
    decode: (str) => new TextDecoder().decode(Uint8Array.from(atob(str), (c) => c.charCodeAt(0)))
  },

  hex: {
    encode: (str) =>
      Array.from(new TextEncoder().encode(str))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    decode: (str) =>
      new TextDecoder().decode(new Uint8Array(str.match(/.{1,2}/g).map((b) => parseInt(b, 16))))
  }
};
