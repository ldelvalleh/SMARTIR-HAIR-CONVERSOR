/**
 * Lightweight i18n for static pages.
 */

const STORAGE_KEY = "ha-ir-browser-lang";
const SUPPORTED = ["en", "es"];

let strings = {};
let currentLang = "en";

export function getLang() {
  return currentLang;
}

export function t(key, vars = {}) {
  let text = strings[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{${k}}`, String(v));
  }
  return text;
}

export async function initI18n() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("lang");
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  const browser = navigator.language?.startsWith("es") ? "es" : "en";

  currentLang = SUPPORTED.includes(fromUrl)
    ? fromUrl
    : SUPPORTED.includes(fromStorage)
      ? fromStorage
      : browser;

  localStorage.setItem(STORAGE_KEY, currentLang);
  document.documentElement.lang = currentLang;

  const res = await fetch(`i18n/${currentLang}.json`);
  if (!res.ok) {
    throw new Error(`i18n load failed: ${res.status}`);
  }
  strings = await res.json();
  return currentLang;
}

export function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  localStorage.setItem(STORAGE_KEY, lang);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  window.location.href = url.toString();
}

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.placeholder = t(key);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.title = t(key);
  });
}

export function langSwitcherHtml() {
  return `
    <div class="lang-switcher">
      <span data-i18n="lang.label"></span>
      <button type="button" class="lang-btn ${currentLang === "en" ? "lang-btn--active" : ""}" data-set-lang="en">EN</button>
      <button type="button" class="lang-btn ${currentLang === "es" ? "lang-btn--active" : ""}" data-set-lang="es">ES</button>
    </div>`;
}

export function bindLangSwitcher(root = document) {
  root.querySelectorAll("[data-set-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.getAttribute("data-set-lang")));
  });
}

export function withLang(href) {
  const url = new URL(href, window.location.href);
  url.searchParams.set("lang", currentLang);
  return url.pathname + url.search;
}
