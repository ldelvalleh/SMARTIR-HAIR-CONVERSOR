# deploy.md — Despliegue

## Cualquier servidor web estático

Copia la carpeta del proyecto a tu servidor. No hace falta Node.js en producción.

| Dónde | Cómo |
|---|---|
| Apache / nginx / IIS | Sube los ficheros al directorio público |
| GitHub Pages | Repo público, branch `main`, folder `/ (root)` |

## Checklist

- [ ] Rutas relativas (`css/`, `js/`, `data/`, `i18n/`)
- [ ] `data/index.json` presente en el repo
- [ ] Probar búsqueda y al menos un modelo de cada tipo
- [ ] Probar conversión Pronto en un código IR (`Jg…`)
- [ ] Atribución a smartHomeHub/SmartIR visible en el footer

## Regeneración del índice (opcional)

```bash
node scripts/build-index.mjs
```

Workflow en `.github/workflows/refresh-index.yml` — semanal en CI.
