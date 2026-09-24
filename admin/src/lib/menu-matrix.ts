import type { CatalogEntry, MenuDocument, MenuItem, RegionCell, RegionId } from "../types/menu";

export const REGION_LABELS: Record<RegionId, string> = {
  central: "中部",
  "central-smart": "中部智慧店",
  "mrt-tamsui": "捷運淡水",
  north: "北部",
  "north-smart": "北部智慧店",
  south: "南部",
  ximen: "西門",
};

export function storageKey(itemKey: string, regionId: RegionId): string {
  return `${itemKey}|${regionId}`;
}

export function itemKeyForRow(entry: CatalogEntry, menuByZh: Record<string, MenuItem>): string {
  const menuItem = menuByZh[entry.nameZh];
  if (menuItem?.id) {
    return menuItem.id;
  }
  return `zh:${entry.nameZh}`;
}

export function baseRegionData(menuItem: MenuItem | null, regionId: RegionId): RegionCell {
  if (!menuItem?.regions) {
    return { rank: null, priceL: null };
  }
  const r = menuItem.regions[regionId];
  if (!r || r.rank == null) {
    return { rank: null, priceL: null };
  }
  return {
    rank: Number(r.rank),
    priceL: r.priceL != null ? Number(r.priceL) : null,
  };
}

export function effectiveData(
  itemKey: string,
  regionId: RegionId,
  menuItem: MenuItem | null,
  overrides: Record<string, RegionCell>
): RegionCell {
  const key = storageKey(itemKey, regionId);
  if (Object.prototype.hasOwnProperty.call(overrides, key)) {
    return overrides[key];
  }
  return baseRegionData(menuItem, regionId);
}

export function isModified(
  itemKey: string,
  regionId: RegionId,
  menuItem: MenuItem | null,
  overrides: Record<string, RegionCell>
): boolean {
  const key = storageKey(itemKey, regionId);
  if (!Object.prototype.hasOwnProperty.call(overrides, key)) {
    return false;
  }
  const base = baseRegionData(menuItem, regionId);
  const cur = overrides[key];
  return cur.rank !== base.rank || cur.priceL !== base.priceL;
}

export function buildMenuByZh(menu: MenuDocument): Record<string, MenuItem> {
  const map: Record<string, MenuItem> = {};
  for (const item of menu.items) {
    if (item.nameZh && !map[item.nameZh]) {
      map[item.nameZh] = item;
    }
  }
  return map;
}

export function dedupeCatalog(items: CatalogEntry[]): CatalogEntry[] {
  const seen: Record<string, boolean> = {};
  const out: CatalogEntry[] = [];
  for (const entry of items) {
    const zh = entry.nameZh || "";
    if (!zh || seen[zh]) {
      continue;
    }
    seen[zh] = true;
    out.push({ nameZh: zh, nameEn: entry.nameEn || "" });
  }
  return out;
}

export const TOP10_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const REGION_TOP10_GAP_ERROR_PREFIX = "__region_top10__|";

export function getRankHoldersByRegion(
  catalogItems: CatalogEntry[],
  menuByZh: Record<string, MenuItem>,
  regionIds: RegionId[],
  overrides: Record<string, RegionCell>
): Record<RegionId, Partial<Record<number, string>>> {
  const holders: Record<RegionId, Partial<Record<number, string>>> = {} as Record<
    RegionId,
    Partial<Record<number, string>>
  >;
  for (const regionId of regionIds) {
    holders[regionId] = {};
    for (const entry of catalogItems) {
      const itemKey = itemKeyForRow(entry, menuByZh);
      const menuItem = menuByZh[entry.nameZh] ?? null;
      const data = effectiveData(itemKey, regionId, menuItem, overrides);
      if (data.rank != null) {
        holders[regionId][data.rank] = itemKey;
      }
    }
  }
  return holders;
}

export function disabledRanksForCell(
  itemKey: string,
  regionId: RegionId,
  rankHolders: Record<RegionId, Partial<Record<number, string>>>
): number[] {
  const byRank = rankHolders[regionId] ?? {};
  const disabled: number[] = [];
  for (const rank of TOP10_RANKS) {
    const holder = byRank[rank];
    if (holder != null && holder !== itemKey) {
      disabled.push(rank);
    }
  }
  return disabled;
}

export function getRegionTop10Gaps(
  catalogItems: CatalogEntry[],
  menuByZh: Record<string, MenuItem>,
  regionIds: RegionId[],
  overrides: Record<string, RegionCell>
): Array<{ regionId: RegionId; missingRanks: number[] }> {
  const gaps: Array<{ regionId: RegionId; missingRanks: number[] }> = [];
  for (const regionId of regionIds) {
    const rankHolders = getRankHoldersByRegion(catalogItems, menuByZh, [regionId], overrides);
    const assigned = new Set(
      Object.keys(rankHolders[regionId] ?? {})
        .map(Number)
        .filter((n) => Number.isInteger(n))
    );
    const missingRanks = TOP10_RANKS.filter((r) => !assigned.has(r));
    if (missingRanks.length > 0) {
      gaps.push({ regionId, missingRanks: [...missingRanks] });
    }
  }
  return gaps;
}

export function formatRegionTop10GapMessage(regionId: RegionId, missingRanks: number[]): string {
  const label = REGION_LABELS[regionId] ?? regionId;
  return `${label}：缺少排名 ${missingRanks.join("、")}`;
}

export function isRegionTop10GapErrorKey(key: string): boolean {
  return key.startsWith(REGION_TOP10_GAP_ERROR_PREFIX);
}

export function parseRankInput(raw: unknown): { ok: true; value: number | null } | { ok: false; message: string } {
  const s = String(raw == null ? "" : raw).trim();
  if (s === "") {
    return { ok: true, value: null };
  }
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    return { ok: false, message: "排名須為 1–10 或空白" };
  }
  return { ok: true, value: n };
}

export function parsePriceInput(
  raw: unknown,
  hasRank: boolean
): { ok: true; value: number | null } | { ok: false; message: string } {
  const s = String(raw == null ? "" : raw).trim();
  if (s === "") {
    if (hasRank) {
      return { ok: false, message: "有排名時須填價格" };
    }
    return { ok: true, value: null };
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
    return { ok: false, message: "價格須為 0 以上整數" };
  }
  return { ok: true, value: n };
}

export function validateAllRegions(
  catalogItems: CatalogEntry[],
  menuByZh: Record<string, MenuItem>,
  regionIds: RegionId[],
  overrides: Record<string, RegionCell>
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const regionId of regionIds) {
    const regErr = validateRegion(catalogItems, menuByZh, regionId, overrides);
    Object.assign(merged, regErr);
  }
  return merged;
}

function validateRegion(
  catalogItems: CatalogEntry[],
  menuByZh: Record<string, MenuItem>,
  regionId: RegionId,
  overrides: Record<string, RegionCell>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const ranked: { itemKey: string; rank: number }[] = [];
  for (const entry of catalogItems) {
    const itemKey = itemKeyForRow(entry, menuByZh);
    const menuItem = menuByZh[entry.nameZh] ?? null;
    const data = effectiveData(itemKey, regionId, menuItem, overrides);
    if (data.rank != null) {
      ranked.push({ itemKey, rank: data.rank });
    }
  }
  const rankCount: Record<number, string[]> = {};
  for (const row of ranked) {
    if (!rankCount[row.rank]) {
      rankCount[row.rank] = [];
    }
    rankCount[row.rank].push(row.itemKey);
  }
  for (const rank of Object.keys(rankCount).map(Number)) {
    if (rankCount[rank].length > 1) {
      for (const itemKey of rankCount[rank]) {
        errors[storageKey(itemKey, regionId)] = `排名 ${rank} 重複`;
      }
    }
  }
  for (const entry of catalogItems) {
    const itemKey = itemKeyForRow(entry, menuByZh);
    const menuItem = menuByZh[entry.nameZh] ?? null;
    const data = effectiveData(itemKey, regionId, menuItem, overrides);
    const cellKey = storageKey(itemKey, regionId);
    if (data.rank != null && (data.priceL == null || !Number.isFinite(data.priceL))) {
      if (!errors[cellKey]) {
        errors[cellKey] = "有排名時須填價格";
      }
    }
  }
  const assignedRanks = new Set(ranked.map((row) => row.rank));
  const missingRanks = TOP10_RANKS.filter((r) => !assignedRanks.has(r));
  if (missingRanks.length > 0) {
    errors[`${REGION_TOP10_GAP_ERROR_PREFIX}${regionId}`] = formatRegionTop10GapMessage(
      regionId,
      missingRanks
    );
  }
  if (ranked.length > 10) {
    for (const entry of catalogItems) {
      const itemKey = itemKeyForRow(entry, menuByZh);
      const menuItem = menuByZh[entry.nameZh] ?? null;
      const data = effectiveData(itemKey, regionId, menuItem, overrides);
      if (data.rank != null) {
        errors[storageKey(itemKey, regionId)] = "該區最多 10 品";
      }
    }
  }
  return errors;
}

export function mergeMenuFromBaseline(
  baseline: MenuDocument,
  overrides: Record<string, RegionCell>
): MenuDocument {
  const items = baseline.items.map((item) => {
    const regions: MenuItem["regions"] = { ...item.regions };
    for (const regionId of baseline.regions) {
      const key = storageKey(item.id, regionId);
      if (!Object.prototype.hasOwnProperty.call(overrides, key)) {
        continue;
      }
      const cell = overrides[key];
      if (cell.rank == null) {
        delete regions[regionId];
        continue;
      }
      regions[regionId] = { rank: cell.rank, priceL: cell.priceL };
    }
    return { ...item, regions };
  });
  return { ...baseline, items };
}

export function countOverrideKeys(overrides: Record<string, RegionCell>): number {
  return Object.keys(overrides).length;
}
