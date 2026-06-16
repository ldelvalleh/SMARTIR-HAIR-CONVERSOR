# AGENTS.md — HA IR Codes Browser

> Reglas y contexto del proyecto. Fuente única de verdad para todos los agentes.
> `CLAUDE.md` y `GEMINI.md` son alias (`@AGENTS.md`).

---

## 1. Qué es

Navegador web **estático** del catálogo de códigos IR del proyecto comunitario
[smartHomeHub/SmartIR](https://github.com/smartHomeHub/SmartIR) para Home Assistant.

- **Público:** comunidad HA / domótica.
- **Repo:** GitHub **público**.
- **Sin backend en runtime:** listado desde `data/index.json`; detalle vía `fetch` a
  `raw.githubusercontent.com`.
- **Conversión Pronto:** Broadlink Base64 → Pronto Hex en el navegador (solo códigos IR `0x26`).
- **Idiomas:** EN y ES (UI).

**Marca:** no usar el nombre "SmartIR" para promocionar este proyecto. Título público: **HA IR Codes Browser**.

---

## 2. Arquitectura

```
Build (local/CI)  →  data/index.json
Runtime:
  index.html  →  busca en índice
  model.html  →  fetch JSON remoto + conversión Pronto lazy
```

---

## 3. Stack

- HTML + CSS + JS vanilla (ES modules, sin bundler).
- Script Node `scripts/build-index.mjs` para regenerar el índice (solo en build, no en runtime).

---

## 4. Estructura

```
├── index.html, model.html
├── css/style.css
├── js/ (i18n, search, model, broadlink-pronto)
├── i18n/en.json, es.json
├── data/index.json
├── scripts/build-index.mjs
└── docs/
```

---

## 5. Reglas

- Cambios quirúrgicos.
- Regenerar índice tras cambios relevantes en SmartIR: `node scripts/build-index.mjs`
- No espejar JSON completos del catálogo (solo índice).
- Atribución visible a smartHomeHub/SmartIR.

---

## 6. Imports automáticos

@memory.md
@docs/design.md
