import {
  initI18n,
  t,
  applyI18n,
  langSwitcherHtml,
  bindLangSwitcher,
  withLang,
} from "./i18n.js";
import { broadlinkBase64ToProntoHex } from "./broadlink-pronto.js";

const SMARTIR_BASE = `https://raw.githubusercontent.com/smartHomeHub/SmartIR/master/codes`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { type: p.get("type"), id: p.get("id") };
}

function renderMetaList(label, items) {
  if (!items?.length || !items[0]) return "";
  return `
    <div class="meta-row">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(items.join(", "))}</dd>
    </div>`;
}

function bindCopyButtons(root) {
  root.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = document.getElementById(btn.getAttribute("data-copy"));
      if (!target?.textContent) return;
      try {
        await navigator.clipboard.writeText(target.textContent);
        const prev = btn.textContent;
        btn.textContent = t("model.copied");
        setTimeout(() => {
          btn.textContent = prev;
        }, 1500);
      } catch {
        /* ignore */
      }
    });
  });
}

function bindProntoButtons(root) {
  root.querySelectorAll("[data-show-pronto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-show-pronto");
      const pre = document.getElementById(`${id}-pronto`);
      const copyBtn = root.querySelector(`[data-copy="${id}-pronto"]`);
      if (!pre || pre.dataset.converted === "1") return;
      try {
        pre.textContent = broadlinkBase64ToProntoHex(pre.getAttribute("data-b64"));
        pre.classList.remove("code-block--placeholder");
        pre.dataset.converted = "1";
        if (copyBtn) copyBtn.hidden = false;
        btn.hidden = true;
      } catch (err) {
        pre.textContent =
          err instanceof Error && err.message.includes("RF codes")
            ? t("model.prontoRfError")
            : t("model.prontoError");
        pre.classList.add("status--error");
      }
    });
  });
}

function isBase64Code(value) {
  return typeof value === "string" && value.length > 8 && /^[A-Za-z0-9+/=]+$/.test(value);
}

function collectCommands(obj, path = []) {
  const leaves = [];
  if (isBase64Code(obj)) {
    leaves.push({ path: path.join(" → "), base64: obj });
    return leaves;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, val] of Object.entries(obj)) {
      leaves.push(...collectCommands(val, [...path, key]));
    }
  }
  return leaves;
}

function renderModel(data) {
  const commands = collectCommands(data.commands ?? {});
  const title = `${data.manufacturer} — ${(data.supportedModels ?? []).join(", ")}`;
  document.getElementById("model-title").textContent = title;
  document.title = `${title} | ${t("app.title")}`;

  document.getElementById("model-meta").innerHTML = `
    <dl class="meta-list">
      ${renderMetaList(t("model.manufacturer"), [data.manufacturer])}
      ${renderMetaList(t("model.supportedModels"), data.supportedModels)}
      ${renderMetaList(t("model.controller"), [data.supportedController])}
      ${renderMetaList(t("model.encoding"), [data.commandsEncoding])}
      ${renderMetaList(t("model.operationModes"), data.operationModes)}
      ${renderMetaList(t("model.fanModes"), data.fanModes)}
      ${renderMetaList(t("model.speed"), data.speed)}
    </dl>`;

  const commandsEl = document.getElementById("commands-list");
  commandsEl.innerHTML =
    commands.length === 0
      ? `<p class="status">${escapeHtml(t("search.noResults"))}</p>`
      : commands
          .map((leaf, i) => {
            const id = `cmd-${i}`;
            return `
        <details class="command-block">
          <summary class="command-summary"><span class="command-path">${escapeHtml(leaf.path)}</span></summary>
          <div class="command-body">
            <div class="code-section">
              <div class="code-header">
                <span>${escapeHtml(t("model.base64"))}</span>
                <button type="button" class="btn btn-secondary btn-sm" data-copy="${id}-b64">${escapeHtml(t("model.copy"))}</button>
              </div>
              <pre class="code-block" id="${id}-b64">${escapeHtml(leaf.base64)}</pre>
            </div>
            <div class="code-section">
              <div class="code-header">
                <span>${escapeHtml(t("model.pronto"))}</span>
                <button type="button" class="btn btn-secondary btn-sm" data-show-pronto="${id}" data-b64="${escapeHtml(leaf.base64)}">${escapeHtml(t("model.showPronto"))}</button>
                <button type="button" class="btn btn-secondary btn-sm" data-copy="${id}-pronto" hidden>${escapeHtml(t("model.copy"))}</button>
              </div>
              <pre class="code-block code-block--placeholder" id="${id}-pronto" data-b64="${escapeHtml(leaf.base64)}"></pre>
            </div>
          </div>
        </details>`;
          })
          .join("");

  bindCopyButtons(commandsEl);
  bindProntoButtons(commandsEl);
  document.getElementById("model-content").hidden = false;
  document.getElementById("model-status").textContent = "";
}

async function loadModel(type, id) {
  const status = document.getElementById("model-status");
  status.textContent = t("model.loading");
  status.className = "status";

  if (!type || !id) {
    status.textContent = t("model.errorInvalid");
    status.className = "status status--error";
    return;
  }

  try {
    const res = await fetch(`${SMARTIR_BASE}/${type}/${id}.json`);
    if (res.status === 404) {
      status.textContent = t("model.errorNotFound");
      status.className = "status status--error";
      return;
    }
    if (!res.ok) throw new Error();
    renderModel(await res.json());
  } catch {
    status.textContent = t("model.errorNetwork");
    status.className = "status status--error";
  }
}

async function main() {
  await initI18n();
  document.getElementById("lang-slot").innerHTML = langSwitcherHtml();
  bindLangSwitcher();
  applyI18n();
  document.getElementById("back-link").href = withLang("index.html");

  const { type, id } = getParams();
  await loadModel(type, id);
}

main();
