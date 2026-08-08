#!/usr/bin/env node

import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if(process.argv.includes("--assets")){
  process.stdout.write(path.join(__dirname, "..", "src") + "\n");
  process.exit(0);
}

console.error("Usage: secure-contact --assets");
process.exit(1);