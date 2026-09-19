# Menu data contract (draft)

- `data/menu.json` — single source of truth
- Item: `id`, `nameZh`, `nameEn`, `image` (path under `images/drinks/*.jpg`)
- Per region: `rank` (1–10) + `priceL`; omit/null = not shown
- `isTop`: ranks 1–5 for left carousel
- Regions: central, central-smart, mrt-tamsui, north, north-smart, south, ximen
