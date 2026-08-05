#!/usr/bin/env node
/**
 * secure-contact-generate CLI
 * -----------------------------
 *   npx secure-contact-generate [sourcePath] [outPath]
 *
 * Defaults: sourcePath = ./contact-source.json, outPath = ./contact-data.json
 * Run this LOCALLY, never on your public server.
 */

import { generateContactData } from '../src/generate.js';

const sourcePath = process.argv[2] || 'contact-source.json';
const outPath = process.argv[3] || 'contact-data.json';

try {
  const result = await generateContactData(sourcePath, outPath);

  console.log('Read source from ' + result.sourcePath);
  console.log('Wrote ' + result.outPath);

  for (const w of result.warnings) console.warn('Warning: ' + w);

  if (result.verified.length) {
    console.log('\nVerifying round-trip...');
    for (const v of result.verified) {
      console.log('  ' + v.key + ': ' + (v.ok ? 'OK' : 'MISMATCH - ' + v.decoded));
    }
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
