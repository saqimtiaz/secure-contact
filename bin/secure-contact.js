#!/usr/bin/env node

const path = require("path");

if(process.argv.includes("--assets")){
  process.stdout.write(path.join(__dirname, "..", "src") + "\n");
  process.exit(0);
}

console.error("Usage: secure-contact --assets");
process.exit(1);