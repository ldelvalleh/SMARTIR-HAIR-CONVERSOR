# design.md — Arquitectura técnica

## 1. Visión de alto nivel

```
scripts/build-index.mjs  ──►  data/index.json
                                    │
index.html + search.js  ◄───────────┘
        │
        ▼
model.html + model.js  ──fetch──►  raw.githubusercontent.com/.../codes/{type}/{id}.json
        │
        ▼
broadlink-pronto.js  ──►  Pronto Hex (lazy, solo IR 0x26)
```

## 2. Índice (`data/index.json`)

Generado por `scripts/build-index.mjs`. Por cada modelo:

- `id`, `type`, `manufacturer`, `supportedModels[]`
- `supportedController`, `commandsEncoding`, `path`
- `searchText` — texto normalizado para filtrado

El script tolera JSON malformados en SmartIR (extracción por regex de metadatos).

## 3. Fetch en vivo

URL de detalle:

`https://raw.githubusercontent.com/smartHomeHub/SmartIR/master/codes/{type}/{id}.json`

CORS permitido desde el navegador.

## 4. Conversión Broadlink → Pronto

Basado en `python-broadlink` `data_to_pulses` (tick 32.84 µs).

Códigos RF (`0xb2`, `0xd7`) no se convierten — mensaje explícito en UI.

## 5. i18n

- `i18n/en.json`, `i18n/es.json` — solo strings de UI
- `?lang=en|es` + `localStorage` clave `ha-ir-browser-lang`

## 6. Rutas

- `index.html` — listado
- `model.html?type=climate&id=1000&lang=es` — detalle

Sin rewrites de servidor (compatible con GitHub Pages y cualquier hosting estático).
