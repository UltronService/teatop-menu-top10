# teatop-menu-top10

TEATOP TOP10 electronic menu — original Ximen/north visual shell, seven region URLs, data-driven content only.

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

## Local smoke test
From the repo root (needs a static server so `fetch` of `data/menu.json` works):

```bash
npx --yes serve -l 4173
# or: python -m http.server 4173
```

Then open e.g. http://127.0.0.1:4173/regions/ximen/

## Architecture
- **Data:** `data/menu.json` (filter by region id) — images, names, ranks, prices, `nameEn`
- **Visual shell:** ported from [teatop_north](https://github.com/yixuantang623/teatop_north) / [Ximen live](https://yixuantang623.github.io/teatop_Ximen/)
  - `css/player.css` ← `style.css` (logo, orange circles, leaf/cup rotate+float timelines, left TOP+cup+zh+en, right bilingual rows with `01 /` + `$` `L` prices)
  - `js/player.js` mounts that DOM, injects menu.json **without stripping animation classes**, then restarts dense timelines on `animationend` (north `script.js` loop)
- **Regions:** `regions/<id>/index.html` sets `data-region` + `data-asset-root` and loads the shared shell
- **Images:** drink cups from `images/drinks/*.jpg`; decorative logo/leaves remain the original assets used by the north shell
- **Unknown region:** Chinese-friendly error in-player + root `404.html` for GitHub Pages

## Notes
- Stakeholder baseline: dense Ximen/north animation — not the simplified carousel player
- Contract: `docs/menu.schema.md` + `data/menu.schema.json`
