# TEATOP TOP10 v1.0

Release baseline for the current playable product (GitHub Pages + client asset review).

## Scope

- **Seven region players:** `regions/<id>/` — Ximen visual shell, `inject.js` + `data/menu.json`
- **Data:** 20 client catalog drinks (English names), per-region TOP10 ranks and L prices
- **Asset review page:** `drink-asset-review.html` — drink list, four toggles (♨ / ∅ / 固 / ●), cup images, leaf picker (10 leaves + none), localStorage for client workshops
- **Animation assets:** Ximen imgur shell (TOP1–5 cups/leaves), name suffix icons per `data/ximen-name-badge-assets.json`

## URLs

- Hub: https://ultronservice.github.io/teatop-menu-top10/
- Asset review: https://ultronservice.github.io/teatop-menu-top10/drink-asset-review.html
- Example region: https://ultronservice.github.io/teatop-menu-top10/regions/ximen/

## Not in v1.0

- No backend or auth; static hosting only
- `data/menu.json` field `"version": 1` remains the **data schema** revision (not product semver)
