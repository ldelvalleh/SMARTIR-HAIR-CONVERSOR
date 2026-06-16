# HA IR Codes Browser

Browse IR remote codes from the [SmartIR](https://github.com/smartHomeHub/SmartIR) community catalog for Home Assistant.

- Search **435+ models** by manufacturer and model name
- View **Broadlink Base64** codes as stored in SmartIR
- Convert IR codes to **Pronto Hex** on demand (in your browser)
- Show related models to try when SmartIR already groups several `supportedModels`
- **English** and **Spanish** UI

> Data from [smartHomeHub/SmartIR](https://github.com/smartHomeHub/SmartIR). Not affiliated with the SmartIR project.

## Deploy

Copy the project folder to any web server (Apache, nginx, IIS, GitHub Pages, etc.). No Node.js or background process needed at runtime.

```
index.html
model.html
css/
js/
i18n/
data/index.json
data/compatibility-index.json
```

Open `index.html` through your server URL (e.g. `https://tu-dominio.com/ha-ir/`).

## Regenerating the index (optional)

Only needed when SmartIR adds new models — run once on your PC:

```bash
node scripts/build-index.mjs
```

Then upload the updated `data/index.json`.

The browser automatically generates `confirmed_catalog` compatibility relationships at runtime for every SmartIR entry that already contains more than one known `supportedModels` value.

Use `data/compatibility-index.json` for manually researched relationships, such as candidate models from the same brand/family/remote-control generation that SmartIR does not list directly.

If you want to materialize the generated relationships into `data/compatibility-index.json`, run:

```bash
node scripts/build-compatibility-index.mjs
```

This preserves manually researched entries and adds generated entries only when there is no manual entry for the same SmartIR path.

## How it works

| Piece | Role |
|---|---|
| `data/index.json` | Lightweight catalog for search (~435 entries) and runtime catalog-confirmed compatibility groups |
| `data/compatibility-index.json` | Optional manually researched related model candidates |
| `model.html` | Fetches full JSON live from `raw.githubusercontent.com` |
| `js/search.js` | Searches exact catalog entries, runtime catalog groups, and manual compatibility candidates |
| `js/broadlink-pronto.js` | IR Base64 → Pronto Hex (RF codes show a clear message) |

No server-side code, no database, no API keys.

## License

MIT for this browser code — see [LICENSE](LICENSE).

IR code data belongs to the SmartIR community repository and its contributors.

## Author

[Luis del Valle](https://programarfacil.com)
