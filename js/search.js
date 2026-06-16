import {
  initI18n,
  t,
  applyI18n,
  langSwitcherHtml,
  bindLangSwitcher,
  withLang,
} from "./i18n.js";

let catalog = [];

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
  params.set("id", entry.id);
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

function matchesEntry(entry, query, typeFilter) {
  if (typeFilter && entry.type !== typeFilter) return false;
  if (!query) return true;
  const tokens = query.split(/\s+/).filter(Boolean);
  const haystack = entry.searchText ?? "";
  return tokens.every((token) => haystack.includes(token));
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

function refresh() {
  const query = normalizeQuery(document.getElementById("search-input").value);
  const typeFilter = document.getElementById("type-filter").value;
  const filtered = catalog.filter((e) => matchesEntry(e, query, typeFilter));
  renderResults(filtered);
}

async function loadCatalog() {
  const status = document.getElementById("search-status");
  status.textContent = t("search.loading");
  status.className = "status";

  try {
    const res = await fetch("data/index.json");
    if (!res.ok) throw new Error("index");
    catalog = await res.json();
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
