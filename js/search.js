import {
  initI18n,
  t,
  applyI18n,
  langSwitcherHtml,
  bindLangSwitcher,
} from "./i18n.js";

let catalog = [];
let compatibilityEntries = [];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function typeLabel(type) {
  const map = {
    climate: "search.typeClimate",
    fan: "search.typeFan",
    light: "search.typeLight",
    media_player: "search.typeMediaPlayer",
  };
  return t(map[type] ?? type);
}

function modelDetailUrl(entry) {
  const params = new URLSearchParams();
  params.set("type", entry.type);
  params.set("id", entry.id ?? entry.smartirId);
  const lang = new URLSearchParams(window.location.search).get("lang");
  if (lang) params.set("lang", lang);
  return `model.html?${params.toString()}`;
}

function normalizeQuery(query) {
  return query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function normalizeModelText(value) {
  return String(value ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z0-9]/g, "");
}

function matchesEntry(entry, query, typeFilter) {
  if (typeFilter && entry.type !== typeFilter) return false;
  if (!query) return true;
  const tokens = query.split(/\s+/).filter(Boolean);
  const haystack = entry.searchText ?? "";
  return tokens.every((token) => haystack.includes(token));
}

function compatibleModels(entry) {
  return Array.isArray(entry.compatibleModels) ? entry.compatibleModels : [];
}

function compatibilitySearchText(entry) {
  const models = compatibleModels(entry)
    .map((model) => [model.model, model.normalizedModel, model.reason].filter(Boolean).join(" "))
    .join(" ");

  return normalizeQuery(
    [
      entry.manufacturer,
      entry.type,
      entry.smartirId,
      entry.smartirPath,
      ...(entry.smartirSupportedModels ?? []),
      ...(entry.compatiblePatterns ?? []),
      models,
      entry.notes,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function matchCompatibilityEntry(entry, rawQuery, query, typeFilter) {
  if (!query || rawQuery.trim().length < 2) return false;
  if (typeFilter && entry.type !== typeFilter) return false;

  const tokens = query.split(/\s+/).filter(Boolean);
  const haystack = compatibilitySearchText(entry);
  const tokenMatch = tokens.every((token) => haystack.includes(token));

  const normalizedNeedle = normalizeModelText(rawQuery);
  const modelMatch =
    normalizedNeedle.length >= 4 &&
    [
      ...(entry.smartirSupportedModels ?? []),
      ...(entry.compatiblePatterns ?? []),
      ...compatibleModels(entry).flatMap((model) => [model.model, model.normalizedModel]),
    ]
      .filter(Boolean)
      .some((value) => normalizeModelText(value).includes(normalizedNeedle));

  return tokenMatch || modelMatch;
}

function confidenceFor(entry) {
  return (
    entry.confidence ??
    compatibleModels(entry).find((model) => model.confidence)?.confidence ??
    "try_only"
  );
}

function scopeFor(entry) {
  return (
    entry.scope ??
    compatibleModels(entry).find((model) => model.scope)?.scope ??
    "listed_commands"
  );
}

function confidenceLabel(confidence) {
  const map = {
    confirmed_catalog: "compat.confidence.confirmed_catalog",
    probable_family: "compat.confidence.probable_family",
    try_only: "compat.confidence.try_only",
  };
  return t(map[confidence] ?? confidence);
}

function scopeLabel(scope) {
  const map = {
    listed_commands: "compat.scope.listed_commands",
    power_only: "compat.scope.power_only",
    remote_model: "compat.scope.remote_model",
  };
  return t(map[scope] ?? scope);
}

function confidenceRank(entry) {
  const order = {
    confirmed_catalog: 0,
    probable_family: 1,
    try_only: 2,
  };
  return order[confidenceFor(entry)] ?? 3;
}

function renderResults(entries) {
  const tbody = document.getElementById("results-body");
  const countEl = document.getElementById("results-count");
  const emptyEl = document.getElementById("results-empty");

  countEl.textContent = t("search.results", { count: entries.length });

  if (entries.length === 0) {
    tbody.innerHTML = "";
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  tbody.innerHTML = entries
    .map(
      (m) => `
    <tr>
      <td>${escapeHtml(m.manufacturer)}</td>
      <td>${escapeHtml((m.supportedModels ?? []).join(", "))}</td>
      <td><span class="badge badge--${m.type}">${escapeHtml(typeLabel(m.type))}</span></td>
      <td class="mono">${escapeHtml(m.id)}</td>
      <td><a class="btn btn-secondary btn-sm" href="${modelDetailUrl(m)}">${escapeHtml(t("table.view"))}</a></td>
    </tr>`,
    )
    .join("");
}

function renderCompatibilityResults(entries) {
  const container = document.getElementById("compatibility-results");

  if (entries.length === 0) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  container.hidden = false;
  container.innerHTML = `
    <div class="compatibility-header">
      <h3>${escapeHtml(t("compat.title"))}</h3>
      <p>${escapeHtml(t("compat.intro"))}</p>
    </div>
    <div class="compatibility-grid">
      ${entries.map(renderCompatibilityCard).join("")}
    </div>`;
}

function renderCompatibilityCard(entry) {
  const confidence = confidenceFor(entry);
  const scope = scopeFor(entry);
  const smartirModels = entry.smartirSupportedModels ?? [];
  const candidates = compatibleModels(entry);
  const candidateModels = candidates.map((model) => model.model).filter(Boolean);
  const patterns = entry.compatiblePatterns ?? [];
  const candidateText = candidateModels.length
    ? candidateModels.join(", ")
    : patterns.join(", ");
  const warning = confidence === "try_only" ? `<p class="compatibility-warning">${escapeHtml(t("compat.warning"))}</p>` : "";
  const reason = candidates.find((model) => model.reason)?.reason ?? entry.notes ?? "";

  return `
    <article class="compatibility-card compatibility-card--${escapeHtml(confidence)}">
      <div class="compatibility-card__topline">
        <strong>${escapeHtml(entry.manufacturer)}</strong>
        <span class="badge badge--${escapeHtml(entry.type)}">${escapeHtml(typeLabel(entry.type))}</span>
      </div>
      <p class="compatibility-source">
        <span>${escapeHtml(t("compat.sourceModel"))}</span>
        <strong>${escapeHtml(smartirModels.join(", "))}</strong>
      </p>
      <p class="compatibility-models">
        <span>${escapeHtml(t("compat.candidates"))}</span>
        <strong>${escapeHtml(candidateText || "—")}</strong>
      </p>
      <div class="compatibility-badges">
        <span class="badge badge--compat-${escapeHtml(confidence)}">${escapeHtml(confidenceLabel(confidence))}</span>
        <span class="badge badge--compat-scope">${escapeHtml(scopeLabel(scope))}</span>
      </div>
      ${reason ? `<p class="compatibility-reason">${escapeHtml(reason)}</p>` : ""}
      ${warning}
      <a class="btn btn-secondary btn-sm" href="${modelDetailUrl(entry)}">${escapeHtml(t("compat.tryCodes"))}</a>
    </article>`;
}

function relatedCompatibilityResults(rawQuery, query, typeFilter) {
  return compatibilityEntries
    .filter((entry) => matchCompatibilityEntry(entry, rawQuery, query, typeFilter))
    .sort((a, b) => confidenceRank(a) - confidenceRank(b))
    .slice(0, 12);
}

function refresh() {
  const input = document.getElementById("search-input");
  const rawQuery = input.value;
  const query = normalizeQuery(rawQuery);
  const typeFilter = document.getElementById("type-filter").value;
  const filtered = catalog.filter((e) => matchesEntry(e, query, typeFilter));
  const related = relatedCompatibilityResults(rawQuery, query, typeFilter);

  renderResults(filtered);
  renderCompatibilityResults(related);
}

async function loadCatalog() {
  const status = document.getElementById("search-status");
  status.textContent = t("search.loading");
  status.className = "status";

  try {
    const catalogRes = await fetch("data/index.json");
    if (!catalogRes.ok) throw new Error("index");
    catalog = await catalogRes.json();

    try {
      const compatibilityRes = await fetch("data/compatibility-index.json");
      compatibilityEntries = compatibilityRes.ok
        ? (await compatibilityRes.json()).entries ?? []
        : [];
    } catch {
      compatibilityEntries = [];
    }

    status.textContent = "";
    refresh();
  } catch {
    status.textContent = t("search.error");
    status.className = "status status--error";
  }
}

async function main() {
  await initI18n();

  document.getElementById("lang-slot").innerHTML = langSwitcherHtml();
  bindLangSwitcher();
  applyI18n();

  document.getElementById("search-input").addEventListener("input", refresh);
  document.getElementById("type-filter").addEventListener("change", refresh);

  await loadCatalog();
}

main();
