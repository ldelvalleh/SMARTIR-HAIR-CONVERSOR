#!/usr/bin/env node
/**
 * Builds data/index.json from smartHomeHub/SmartIR.
 * Run locally when refreshing the catalog: node scripts/build-index.mjs
 */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SMARTIR_REPO = "smartHomeHub/SmartIR";
const BRANCH = "master";
const TYPES = ["climate", "fan", "light", "media_player"];

function normalizeSearchText(parts) {
  return parts
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

async function fetchAllJsonFiles() {
  const url = `https://api.github.com/repos/${SMARTIR_REPO}/git/trees/${BRANCH}?recursive=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "ha-ir-browser-build" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} fetching SmartIR tree`);
  const data = await res.json();
  return data.tree.filter(
    (n) => n.type === "blob" && n.path.startsWith("codes/") && n.path.endsWith(".json"),
  );
}

async function fetchMetadata(type, id) {
  const url = `https://raw.githubusercontent.com/${SMARTIR_REPO}/${BRANCH}/codes/${type}/${id}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();

  let manufacturer = "";
  let supportedModels = [];
  let supportedController = "";
  let commandsEncoding = "";

  try {
    const json = JSON.parse(text);
    manufacturer = (json.manufacturer ?? "").trim();
    supportedModels = Array.isArray(json.supportedModels) ? json.supportedModels : [];
    supportedController = json.supportedController ?? "";
    commandsEncoding = json.commandsEncoding ?? "";
  } catch {
    const m = text.match(/"manufacturer"\s*:\s*"((?:\\.|[^"\\])*)"/);
    manufacturer = m ? JSON.parse(`"${m[1]}"`).trim() : "";
    const modelsMatch = text.match(/"supportedModels"\s*:\s*\[([\s\S]*?)\]/);
    if (modelsMatch) {
      supportedModels = [...modelsMatch[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((x) =>
        JSON.parse(`"${x[1]}"`),
      );
    }
  }

  return {
    id,
    type,
    manufacturer,
    supportedModels,
    supportedController,
    commandsEncoding,
    path: `codes/${type}/${id}.json`,
    searchText: normalizeSearchText([manufacturer, ...supportedModels, type]),
  };
}

async function main() {
  console.log("Fetching SmartIR catalog…");
  const allFiles = await fetchAllJsonFiles();
  const entries = [];

  for (const type of TYPES) {
    const files = allFiles.filter((f) => f.path.startsWith(`codes/${type}/`));
    console.log(`  ${type}: ${files.length} files`);
    const batchSize = 40;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((f) => {
          const id = f.path.replace(/^codes\/[^/]+\//, "").replace(/\.json$/, "");
          return fetchMetadata(type, id);
        }),
      );
      for (const meta of results) {
        if (meta) entries.push(meta);
      }
    }
  }

  entries.sort((a, b) => {
    const m = a.manufacturer.localeCompare(b.manufacturer);
    if (m !== 0) return m;
    return (a.supportedModels?.[0] ?? "").localeCompare(b.supportedModels?.[0] ?? "");
  });

  const outPath = join(__dirname, "..", "data", "index.json");
  await writeFile(outPath, JSON.stringify(entries, null, 2), "utf8");
  console.log(`Wrote ${entries.length} entries to data/index.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
