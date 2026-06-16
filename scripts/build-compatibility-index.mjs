#!/usr/bin/env node
/**
 * Builds data/compatibility-index.json from data/index.json.
 *
 * This script generates confirmed compatibility entries for every SmartIR catalog
 * item that already lists more than one known supported model. It preserves
 * manually researched entries in data/compatibility-index.json and only adds
 * auto-generated entries when there is no manual entry for the same SmartIR path.
 *
 * Run locally after refreshing data/index.json:
 *   node scripts/build-index.mjs
 *   node scripts/build-compatibility-index.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const INDEX_PATH = join(ROOT_DIR, "data", "index.json");
const COMPATIBILITY_PATH = join(ROOT_DIR, "data", "compatibility-index.json");

const UNKNOWN_MODELS = new Set(["", "UNKNOWN", "UNKNOW", "N/A", "NA", "NONE", "NULL"]);

const DEFAULT_CONFIDENCE_LEVELS = {
  confirmed_catalog:
    "Models appear together in the same SmartIR supportedModels list, so SmartIR already treats them as sharing the same command set for that JSON file.",
  probable_family:
    "Models are in the same manufacturer/family/protocol group, but direct compatibility was not independently proven for every command.",
  try_only:
    "Useful candidate to test, but not safe to present as confirmed compatibility. Show a warning in the UI.",
};

const DEFAULT_COMPATIBILITY_SCOPES = {
  listed_commands: "Compatibility applies only to the commands present in the SmartIR JSON file.",
  power_only: "Only on/off or power commands are present or considered likely.",
  remote_model: "The compatible item is a remote-control model rather than a TV/device model.",
};

function normalizeModel(model) {
  return String(model ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function isKnownModel(model) {
  return !UNKNOWN_MODELS.has(normalizeModel(model));
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

function knownSupportedModels(entry) {
  return Array.isArray(entry.supportedModels)
    ? entry.supportedModels.filter(isKnownModel)
    : [];
}

function shouldGenerate(entry) {
  const models = knownSupportedModels(entry);
  return models.length > 1 && entry.type && entry.manufacturer && entry.path;
}

function makeGeneratedEntry(entry) {
  const models = knownSupportedModels(entry);
  const firstModel = models[0] ?? "models";

  return {
    id: `catalog-${slug(entry.type)}-${slug(entry.manufacturer)}-${slug(entry.id)}-${slug(firstModel)}`,
    generatedFrom: "data/index.json",
    type: entry.type,
    manufacturer: entry.manufacturer,
    smartirPath: entry.path,
    smartirId: entry.id,
    smartirSupportedModels: models,
    compatibleModels: models.map((model) => ({
      model,
      confidence: "confirmed_catalog",
      scope: "listed_commands",
    })),
    notes:
      "Auto-generated because these models appear together in the same SmartIR supportedModels list.",
    sources: [entry.path],
  };
}

function sortEntries(a, b) {
  const byType = String(a.type ?? "").localeCompare(String(b.type ?? ""));
  if (byType !== 0) return byType;

  const byManufacturer = String(a.manufacturer ?? "").localeCompare(String(b.manufacturer ?? ""));
  if (byManufacturer !== 0) return byManufacturer;

  const aModel = a.smartirSupportedModels?.[0] ?? "";
  const bModel = b.smartirSupportedModels?.[0] ?? "";
  const byModel = String(aModel).localeCompare(String(bModel));
  if (byModel !== 0) return byModel;

  return String(a.id ?? "").localeCompare(String(b.id ?? ""));
}

async function main() {
  const catalog = await readJson(INDEX_PATH, []);
  const existing = await readJson(COMPATIBILITY_PATH, {
    schemaVersion: 1,
    entries: [],
  });

  const manualEntries = (existing.entries ?? []).filter((entry) => !entry.generatedFrom);
  const manualPaths = new Set(manualEntries.map((entry) => entry.smartirPath).filter(Boolean));
  const manualIds = new Set(manualEntries.map((entry) => entry.id).filter(Boolean));

  const generatedEntries = catalog
    .filter(shouldGenerate)
    .map(makeGeneratedEntry)
    .filter((entry) => !manualPaths.has(entry.smartirPath) && !manualIds.has(entry.id));

  const output = {
    schemaVersion: existing.schemaVersion ?? 1,
    generatedAt: new Date().toISOString().slice(0, 10),
    scope:
      "Compatibility index for all SmartIR device types. Auto-generated entries are based on SmartIR supportedModels groups; manual entries may include researched candidates.",
    confidenceLevels: existing.confidenceLevels ?? DEFAULT_CONFIDENCE_LEVELS,
    compatibilityScopes: existing.compatibilityScopes ?? DEFAULT_COMPATIBILITY_SCOPES,
    entries: [...manualEntries, ...generatedEntries].sort(sortEntries),
  };

  await writeFile(COMPATIBILITY_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${output.entries.length} compatibility entries to data/compatibility-index.json ` +
      `(${manualEntries.length} manual, ${generatedEntries.length} generated).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
