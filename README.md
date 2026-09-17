# teatop-menu-top10

TEATOP TOP10 electronic menu — one shared player shell, seven region URLs.

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

Then open:

- http://127.0.0.1:4173/regions/central/
- http://127.0.0.1:4173/regions/central-smart/
- http://127.0.0.1:4173/regions/mrt-tamsui/
- http://127.0.0.1:4173/regions/north/
- http://127.0.0.1:4173/regions/north-smart/
- http://127.0.0.1:4173/regions/south/
- http://127.0.0.1:4173/regions/ximen/

## Architecture
- **Data:** `data/menu.json` (filter by region id)
- **Shell:** `css/player.css` + `js/player.js`
- **Regions:** `regions/<id>/index.html` sets `data-region` and loads the shared shell
- **Images:** `images/drinks/*.jpg` (Chinese filenames; `轟蜜茶.jpg` and `轟蜜茶108.jpg` are separate)
- **Carousel:** JS `setInterval` + watchdog (not CSS `animationend`-only restart)
- **No CDN / jQuery / Bootstrap / Imgur**
- **Image `onerror`:** cup placeholder; name + price still shown
- **Unknown region:** Chinese-friendly error in-player + root `404.html` for GitHub Pages

## Notes
- Reference only: `yixuantang623/teatop_north`
- Contract: `docs/menu.schema.md` + `data/menu.schema.json`
