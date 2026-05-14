#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { SourceMapConsumer } = require("source-map");

async function mapPosition(mapFile, line, column) {
  const raw = JSON.parse(fs.readFileSync(mapFile, "utf8"));

  // Support both modern (SourceMapConsumer.with) and legacy source-map versions.
  if (typeof SourceMapConsumer.with === "function") {
    return SourceMapConsumer.with(raw, null, (sm) =>
      sm.originalPositionFor({
        line: Number(line),
        column: Number(column),
      }),
    );
  }

  const sm = new SourceMapConsumer(raw);
  try {
    return sm.originalPositionFor({
      line: Number(line),
      column: Number(column),
    });
  } finally {
    if (typeof sm.destroy === "function") {
      sm.destroy();
    }
  }
}

async function main() {
  const [, , mapPath, line, column] = process.argv;
  if (!mapPath || !line || !column) {
    console.error(
      "Usage: node map_source.js <path/to/index.js.map> <line> <column>"
    );
    process.exit(2);
  }
  const orig = await mapPosition(mapPath, line, column);
  console.log("Mapped original position:");
  console.log(orig);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
