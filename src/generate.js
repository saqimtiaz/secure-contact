/**
 * generate.js
 * ------------
 * Node-only. Reads a plaintext contact-source.json, obfuscates it, and
 * writes contact-data.json. Exported as a function so it can be called
 * from the CLI (bin/generate-contact-data.js) or directly from a
 * consumer site's own build script:
 *
 *   import { generateContactData } from 'secure-contact/generate';
 *   await generateContactData('contact-source.json', 'public/contact-data.json');
 */

import fs from 'node:fs';
import path from 'node:path';
import { obfuscateValue, decodeParts } from './obfuscate.js';

export async function generateContactData(sourcePath, outPath) {
  const resolvedSource = path.resolve(sourcePath);
  const resolvedOut = path.resolve(outPath);

  if (!fs.existsSync(resolvedSource)) {
    throw new Error(
      'Source file not found: ' +
        resolvedSource +
        '\nCopy contact-source.example.json to that path and fill in your real values.'
    );
  }

  let source;
  try {
    source = JSON.parse(fs.readFileSync(resolvedSource, 'utf8'));
  } catch (err) {
    throw new Error('Failed to parse ' + resolvedSource + ': ' + err.message);
  }

  const output = {};
  const warnings = [];

  for (const [key, cfg] of Object.entries(source)) {
    if (!cfg || !cfg.type) {
      warnings.push('Entry "' + key + '" is missing a "type" field - skipped.');
      continue;
    }

    if (typeof cfg.value !== 'string' || !cfg.value) {
      warnings.push('Entry "' + key + '" is missing a "value" to obfuscate - skipped.');
      continue;
    }

    output[key] = {
      type: cfg.type,
      parts: obfuscateValue(cfg.value, cfg.parts || 3)
    };
  }

  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(resolvedOut, JSON.stringify(output, null, 2));

  // Round-trip verification.
  const verified = [];
  for (const [key, cfg] of Object.entries(source)) {
    if (!output[key]) continue;
    const decoded = decodeParts(output[key].parts);
    verified.push({ key, ok: decoded === cfg.value, decoded });
  }

  return { sourcePath: resolvedSource, outPath: resolvedOut, warnings, verified };
}