# teatop-menu-top10

**Product version: v1.0** · see [`VERSION`](VERSION) and [`docs/RELEASE-v1.0.md`](docs/RELEASE-v1.0.md)

TEATOP TOP10 electronic menu — **exact** Ximen visual shell (`index.html` DOM/classes + `style.css` + `script.js` timeline), seven region URLs, data-driven content only.

## Clone
https://github.com/UltronService/teatop-menu-top10

## GitHub Pages (playable)
Base: https://ultronservice.github.io/teatop-menu-top10/

| Region | URL |
|--------|-----|
| central | https://ultronservice.github.io/teatop-menu-top10/regions/central/ |
| central-smart | https://ultronservice.github.io/teatop-menu-top10/regions/central-smart/ |
| mrt-tamsui | https://ultronservice.github.io/teatop-menu-top10/regions/mrt-tamsui/ |
| north | https://ultronservice.github.io/teatop-menu-top10/regions/north/ |
| north-smart | https://ultronservice.github.io/teatop-menu-top10/regions/north-smart/ |
| south | https://ultronservice.github.io/teatop-menu-top10/regions/south/ |
| ximen | https://ultronservice.github.io/teatop-menu-top10/regions/ximen/ |

**Admin（客戶自助後台）：** https://ultronservice.github.io/teatop-menu-top10/admin/（Hash 路由，例 `#/region-rank-price`）。建置與 Pages 部署見 [`admin/README.md`](admin/README.md)。

## Local smoke test
From the repo root (needs a static server so `fetch` of `data/menu.json` works):

```bash
npx --yes serve -l 4173
# or: python -m http.server 4173
```

Then open e.g. http://127.0.0.1:4173/regions/ximen/

**Client asset review (西門 TOP10 杯圖／左右葉對照):** http://127.0.0.1:4173/drink-asset-review.html

## Architecture
- **Data:** `data/menu.json` (filter by region id) — images, zh/en names, ranks, L prices
- **Visual shell (verbatim from [teatop_Ximen](https://github.com/yixuantang623/teatop_Ximen)):**
  - `regions/<id>/index.html` — exact Ximen DOM/classes (`.animation`, `.L`, `.R`, `.L0N`, `.Rrow0N`, leaf/cup nodes)
  - `css/style.css` — exact Ximen `style.css`
  - `js/script.js` — exact Ximen timeline loop (`animationend` → restart)
  - `js/inject.js` — injects menu JSON into that DOM (default `data/menu.json`; optional published URL via `data/player-config.json` or `?menuUrl=` / `?publishedMenu=` query, with fallback to `menu.json`)
- **Images:** drink cups from `images/drinks/*.png`; logo at `images/logo.png` (from Ximen); decorative leaves remain original CDN assets
- **Unknown region:** Chinese-friendly error overlay + root `404.html` for GitHub Pages

## Notes
- Stakeholder baseline: exact Ximen shell — not a rewritten `#player-root` player
- Contract: `docs/menu.schema.md` + `data/menu.schema.json`
