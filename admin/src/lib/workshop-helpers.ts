import type { MenuDocument, MenuItem, RegionId } from "../types/menu";

export interface IconColumnDef {
  id: string;
  label: string;
}

export interface IconDef {
  type: "image" | "glyph" | "colorDot";
  url?: string;
  glyph?: string;
  title?: string;
  color?: string;
}

export interface ShellRankEntry {
  cupShell?: string;
  leftLeaf?: string;
  rightLeaf?: string;
}

export interface LeafCatalogItem {
  id: string;
  label: string;
  url: string;
}

export function menuByZh(menu: MenuDocument): Record<string, MenuItem> {
  const map: Record<string, MenuItem> = {};
  for (const item of menu.items) {
    if (item.nameZh && !map[item.nameZh]) {
      map[item.nameZh] = item;
    }
  }
  return map;
}

export function shellByNameZh(
  menu: MenuDocument,
  regionId: RegionId,
  shellByRank: Record<string, ShellRankEntry>
): Record<string, ShellRankEntry> {
  const map: Record<string, ShellRankEntry> = {};
  for (const item of menu.items) {
    const r = item.regions?.[regionId];
    if (!r || r.rank == null || r.rank > 5) {
      continue;
    }
    const shell = shellByRank[String(r.rank)];
    if (shell && item.nameZh) {
      map[item.nameZh] = shell;
    }
  }
  return map;
}

export function iconAssignmentsByNameZh(
  menu: MenuDocument,
  regionId: RegionId,
  assignmentsByXimenRank: Record<string, Record<string, IconDef>>
): Record<string, Record<string, IconDef>> {
  const map: Record<string, Record<string, IconDef>> = {};
  for (const item of menu.items) {
    const r = item.regions?.[regionId];
    if (!r || r.rank == null || !item.nameZh) {
      continue;
    }
    const rankKey = String(r.rank);
    if (!Object.prototype.hasOwnProperty.call(assignmentsByXimenRank, rankKey)) {
      continue;
    }
    map[item.nameZh] = assignmentsByXimenRank[rankKey] ?? {};
  }
  return map;
}

export function toggleStorageKey(nameZh: string, columnId: string): string {
  return `${nameZh}|${columnId}`;
}

export function leafStorageKey(nameZh: string, slot: "leftLeaf" | "rightLeaf"): string {
  return `${nameZh}|${slot}`;
}

export function leafIdForUrl(url: string, catalog: LeafCatalogItem[]): string {
  if (!url) {
    return "none";
  }
  for (const item of catalog) {
    if (item.url === url) {
      return item.id;
    }
  }
  return "none";
}

export function initialLeafId(
  nameZh: string,
  slot: "leftLeaf" | "rightLeaf",
  shell: ShellRankEntry | null,
  saved: Record<string, string>,
  catalog: LeafCatalogItem[]
): string {
  const key = leafStorageKey(nameZh, slot);
  if (Object.prototype.hasOwnProperty.call(saved, key)) {
    const v = saved[key];
    if (v === "none" || catalog.some((c) => c.id === v)) {
      return v;
    }
  }
  if (!shell) {
    return "none";
  }
  const url = slot === "leftLeaf" ? shell.leftLeaf : shell.rightLeaf;
  return leafIdForUrl(url ?? "", catalog);
}

export function initialToggleOn(
  nameZh: string,
  columnId: string,
  rowIcons: Record<string, IconDef> | undefined,
  saved: Record<string, boolean>
): boolean {
  const key = toggleStorageKey(nameZh, columnId);
  if (Object.prototype.hasOwnProperty.call(saved, key)) {
    return saved[key] === true;
  }
  return Boolean(rowIcons?.[columnId]);
}

export function iconDefForColumn(
  columnId: string,
  rowIcons: Record<string, IconDef> | undefined,
  defaults: Record<string, IconDef>
): IconDef | null {
  if (rowIcons?.[columnId]) {
    return rowIcons[columnId];
  }
  return defaults[columnId] ?? null;
}

export function buildWorkshopFromState(
  iconToggles: Record<string, boolean>,
  leafPicks: Record<string, string>,
  version: number
): { version: number; iconToggles: Record<string, boolean>; leafPicks: Record<string, string>; exportedAt: string } {
  return {
    version,
    iconToggles,
    leafPicks,
    exportedAt: new Date().toISOString(),
  };
}
