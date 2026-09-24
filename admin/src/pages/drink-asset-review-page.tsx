import { Alert, Button, Empty, Modal, Space, Table, Typography, message, type TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { AuthLoadingScreen } from "../components/auth-loading";
import { RegionPreviewLinks } from "../components/region-preview-links";
import { resolveAssetUrl, getAssetRoot } from "../lib/asset-root";
import { useAuth } from "../lib/auth-context";
import {
  appendPublishMeta,
  loadPublishMeta,
  loadPublishedWorkshop,
  loadWorkshopDraft,
  savePublishedWorkshop,
  saveWorkshopDraft,
} from "../lib/brand-repository";
import {
  buildCatalogWorkshopBaseline,
  buildWorkshopFromState,
  iconDefForColumn,
  iconAssignmentsByNameZh,
  initialLeafId,
  initialToggleOn,
  leafStorageKey,
  menuByZh,
  mergeWorkshopWithBaseline,
  shellByNameZh,
  toggleStorageKey,
  type IconColumnDef,
  type IconDef,
  type LeafCatalogItem,
  type ShellRankEntry,
} from "../lib/workshop-helpers";
import { dedupeCatalog } from "../lib/menu-matrix";
import type { CatalogEntry, MenuDocument, RegionId } from "../types/menu";
import { EMPTY_WORKSHOP_SEED, type AssetWorkshopDocument } from "../types/workshop";

const REGION: RegionId = "ximen";

function IconToggleInner({ iconDef, isOn, drinkZh }: { iconDef: IconDef | null; isOn: boolean; drinkZh: string }) {
  if (!isOn) {
    return <span style={{ color: "rgba(0,0,0,0.45)" }}>—</span>;
  }
  if (!iconDef) {
    return <span style={{ color: "rgba(0,0,0,0.45)" }}>—</span>;
  }
  if (iconDef.type === "colorDot") {
    return (
      <span
        className="teatop-badge-dot"
        role="img"
        aria-label="●冰飲"
        title={iconDef.title ?? "●冰飲"}
        style={{ backgroundColor: iconDef.color ?? "rgb(138, 184, 186)" }}
      />
    );
  }
  if (iconDef.type === "glyph" && iconDef.glyph) {
    return (
      <span className="teatop-icon-glyph" title={iconDef.title ?? iconDef.glyph}>
        {iconDef.glyph}
      </span>
    );
  }
  if (iconDef.type === "image" && iconDef.url) {
    return (
      <img
        src={iconDef.url}
        alt={drinkZh}
        loading="lazy"
        title={iconDef.title ?? ""}
        style={{ maxWidth: 72, maxHeight: 32, objectFit: "contain" }}
      />
    );
  }
  return <span style={{ color: "rgba(0,0,0,0.45)" }}>—</span>;
}

export function DrinkAssetReviewPage() {
  const { user } = useAuth();
  const [catalogItems, setCatalogItems] = useState<CatalogEntry[]>([]);
  const [menu, setMenu] = useState<MenuDocument | null>(null);
  const [iconColumns, setIconColumns] = useState<IconColumnDef[]>([]);
  const [iconDefaults, setIconDefaults] = useState<Record<string, IconDef>>({});
  const [shellMap, setShellMap] = useState<Record<string, ShellRankEntry>>({});
  const [iconMap, setIconMap] = useState<Record<string, Record<string, IconDef>>>({});
  const [leafCatalog, setLeafCatalog] = useState<LeafCatalogItem[]>([]);
  const [iconToggles, setIconToggles] = useState<Record<string, boolean>>({});
  const [leafPicks, setLeafPicks] = useState<Record<string, string>>({});
  const [publishedWorkshop, setPublishedWorkshop] = useState<AssetWorkshopDocument | null>(null);
  const [publishMeta, setPublishMeta] = useState<{ lastPublishedAt?: string }>({});
  const [loadError, setLoadError] = useState("");
  const [leafModal, setLeafModal] = useState<{
    nameZh: string;
    slot: "leftLeaf" | "rightLeaf";
    slotLabel: string;
    currentId: string;
    title: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const baselineRef = useRef<{ iconToggles: Record<string, boolean>; leafPicks: Record<string, string> }>({
    iconToggles: {},
    leafPicks: {},
  });

  useEffect(() => {
    const root = getAssetRoot();
    void (async () => {
      try {
        const [menuRes, catalogRes, badgeRes, animRes, draft, published, meta] = await Promise.all([
          fetch(`${root}data/menu.json`, { cache: "no-cache" }),
          fetch(`${root}data/client-drink-catalog.json`, { cache: "no-cache" }),
          fetch(`${root}data/ximen-name-badge-assets.json`, { cache: "no-cache" }),
          fetch(`${root}data/ximen-animation-assets.json`, { cache: "no-cache" }),
          loadWorkshopDraft(),
          loadPublishedWorkshop(),
          loadPublishMeta(),
        ]);
        if (!menuRes.ok || !catalogRes.ok || !badgeRes.ok || !animRes.ok) {
          throw new Error("靜態參考檔載入失敗");
        }
        const menuDoc = (await menuRes.json()) as MenuDocument;
        const catalog = (await catalogRes.json()) as { items: CatalogEntry[] };
        const badge = (await badgeRes.json()) as {
          iconColumns: IconColumnDef[];
          assignmentsByXimenRank: Record<string, Record<string, IconDef>>;
          iconColumnDefaults?: Record<string, IconDef>;
        };
        const anim = (await animRes.json()) as {
          ranks?: Record<string, ShellRankEntry>;
          shellByRank?: Record<string, ShellRankEntry>;
          leafCatalog: LeafCatalogItem[];
        };
        const shellByRank = anim.ranks ?? anim.shellByRank ?? {};
        const items = dedupeCatalog(catalog.items);
        const columns = badge.iconColumns ?? [];
        const assignments = badge.assignmentsByXimenRank ?? {};
        const leaves = anim.leafCatalog ?? [];
        const baseline = buildCatalogWorkshopBaseline(
          items,
          columns,
          menuDoc,
          REGION,
          assignments,
          shellByRank,
          leaves
        );
        baselineRef.current = baseline;
        const merged = mergeWorkshopWithBaseline(draft, baseline);
        setMenu(menuDoc);
        setCatalogItems(items);
        setIconColumns(columns);
        setIconDefaults(badge.iconColumnDefaults ?? {});
        setShellMap(shellByNameZh(menuDoc, REGION, shellByRank));
        setIconMap(iconAssignmentsByNameZh(menuDoc, REGION, assignments));
        setLeafCatalog(leaves);
        setIconToggles(merged.iconToggles);
        setLeafPicks(merged.leafPicks);
        setPublishedWorkshop(published);
        setPublishMeta(meta);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const menuMap = useMemo(() => (menu ? menuByZh(menu) : {}), [menu]);
  const leafById = useMemo(() => {
    const map: Record<string, LeafCatalogItem> = {};
    for (const item of leafCatalog) {
      map[item.id] = item;
    }
    return map;
  }, [leafCatalog]);

  const dirty =
    JSON.stringify(iconToggles) !== JSON.stringify(publishedWorkshop?.iconToggles ?? {}) ||
    JSON.stringify(leafPicks) !== JSON.stringify(publishedWorkshop?.leafPicks ?? {});

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const doc = buildWorkshopFromState(iconToggles, leafPicks, EMPTY_WORKSHOP_SEED.version);
      await saveWorkshopDraft(doc);
      message.success("素材草稿已儲存");
    } catch {
      message.error("儲存草稿失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleResetBaseline = () => {
    setIconToggles({ ...baselineRef.current.iconToggles });
    setLeafPicks({ ...baselineRef.current.leafPicks });
    message.info("已還原為西門基準（請儲存草稿後才會寫入）");
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const doc = buildWorkshopFromState(
        iconToggles,
        leafPicks,
        (publishedWorkshop?.version ?? EMPTY_WORKSHOP_SEED.version) + 1
      );
      await savePublishedWorkshop(doc);
      await appendPublishMeta({
        lastPublishedAt: new Date().toISOString(),
        lastPublishedAssetWorkshopVersion: doc.version,
        lastPublishedBy: user?.email,
      });
      setPublishedWorkshop(doc);
      setPublishMeta({ lastPublishedAt: doc.exportedAt });
      message.success("素材設定已發佈");
    } catch {
      message.error("發佈失敗");
    } finally {
      setPublishing(false);
    }
  };

  const openLeafPicker = useCallback(
    (nameZh: string, slot: "leftLeaf" | "rightLeaf", slotLabel: string) => {
      const shell = shellMap[nameZh] ?? null;
      const currentId = initialLeafId(nameZh, slot, shell, leafPicks, leafCatalog);
      setLeafModal({
        nameZh,
        slot,
        slotLabel,
        currentId,
        title: `${nameZh} · ${slotLabel}（共 ${leafCatalog.length} 種可選）`,
      });
    },
    [shellMap, leafPicks, leafCatalog]
  );

  const applyLeaf = (leafId: string) => {
    if (!leafModal) {
      return;
    }
    const key = leafStorageKey(leafModal.nameZh, leafModal.slot);
    setLeafPicks((prev) => ({ ...prev, [key]: leafId }));
    setLeafModal(null);
  };

  type AssetRow = {
    key: string;
    nameZh: string;
    nameEn: string;
    cupSrc: string;
    rowIcons?: Record<string, IconDef>;
    leftLeafId: string;
    rightLeafId: string;
  };

  const columns = useMemo((): TableColumnsType<AssetRow> => {
    const cols: TableColumnsType<AssetRow> = [
      {
        title: "飲料",
        key: "drink",
        fixed: "left",
        width: 180,
        render: (_: unknown, record: AssetRow) => (
          <div>
            <div className="teatop-drink-name-zh">{record.nameZh}</div>
            {record.nameEn ? <div className="teatop-drink-name-en">{record.nameEn}</div> : null}
          </div>
        ),
      },
    ];
    for (const col of iconColumns) {
      cols.push({
        title: col.label || col.id,
        key: `icon-${col.id}`,
        align: "center",
        width: 72,
        render: (_: unknown, record: AssetRow) => {
          const iconDef = iconDefForColumn(col.id, record.rowIcons, iconDefaults);
          const key = toggleStorageKey(record.nameZh, col.id);
          const isOn = Object.prototype.hasOwnProperty.call(iconToggles, key)
            ? iconToggles[key] === true
            : initialToggleOn(record.nameZh, col.id, record.rowIcons, iconToggles);
          return (
            <Button
              type="default"
              className={`teatop-icon-toggle-btn${isOn ? " is-on" : ""}`}
              aria-pressed={isOn}
              title={`${isOn ? "關閉" : "開啟"}：${col.label}`}
              onClick={() => {
                const next = !isOn;
                setIconToggles((prev) => ({ ...prev, [key]: next }));
              }}
            >
              <IconToggleInner iconDef={iconDef} isOn={isOn} drinkZh={record.nameZh} />
            </Button>
          );
        },
      });
    }
    cols.push(
      {
        title: "杯圖",
        key: "cup",
        align: "center",
        width: 120,
        render: (_: unknown, record: AssetRow) =>
          record.cupSrc ? (
            <a href={record.cupSrc} target="_blank" rel="noopener noreferrer" title="開啟原圖">
              <span className="teatop-thumb-wrap">
                <img src={record.cupSrc} alt="" loading="lazy" />
              </span>
            </a>
          ) : (
            <span style={{ color: "rgba(0,0,0,0.45)" }}>—</span>
          ),
      },
      {
        title: "左葉",
        key: "leftLeaf",
        align: "center",
        width: 120,
        render: (_: unknown, record: AssetRow) => (
          <LeafPickerButton
            leafId={record.leftLeafId}
            leafById={leafById}
            onOpen={() => openLeafPicker(record.nameZh, "leftLeaf", "左葉")}
          />
        ),
      },
      {
        title: "右葉",
        key: "rightLeaf",
        align: "center",
        width: 120,
        render: (_: unknown, record: AssetRow) => (
          <LeafPickerButton
            leafId={record.rightLeafId}
            leafById={leafById}
            onOpen={() => openLeafPicker(record.nameZh, "rightLeaf", "右葉")}
          />
        ),
      }
    );
    return cols;
  }, [iconColumns, iconDefaults, iconToggles, leafById, openLeafPicker]);

  const tableData = catalogItems.map((entry) => {
    const menuItem = menuMap[entry.nameZh] ?? null;
    const shell = shellMap[entry.nameZh] ?? null;
    let cupSrc = menuItem?.image ? resolveAssetUrl(menuItem.image) : "";
    if (!cupSrc && shell?.cupShell) {
      cupSrc = shell.cupShell;
    }
    const rowIcons = iconMap[entry.nameZh];
    return {
      key: entry.nameZh,
      nameZh: entry.nameZh,
      nameEn: entry.nameEn || menuItem?.nameEn || "",
      cupSrc,
      rowIcons,
      leftLeafId: initialLeafId(entry.nameZh, "leftLeaf", shell, leafPicks, leafCatalog),
      rightLeafId: initialLeafId(entry.nameZh, "rightLeaf", shell, leafPicks, leafCatalog),
    };
  });

  if (loadError) {
    return <Alert type="error" showIcon message={`無法載入：${loadError}`} />;
  }
  if (!menu) {
    return <AuthLoadingScreen />;
  }

  const lastPub = publishMeta.lastPublishedAt
    ? new Date(publishMeta.lastPublishedAt).toLocaleString("zh-TW")
    : "尚無發佈紀錄";

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        飲料素材對照（全品項）
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        設定各品項的圖示與左右裝飾葉。首次載入會套用西門參考基準；請儲存草稿並發佈後供門市播放器使用。
      </Typography.Paragraph>
      {dirty ? (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="有未發佈的素材變更。" />
      ) : null}
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message={`最後發佈：${lastPub}`} />
      <Space style={{ marginBottom: 16 }} wrap>
        <Button onClick={handleResetBaseline}>還原為西門基準</Button>
        <Button onClick={() => void handleSaveDraft()} loading={saving}>
          儲存草稿
        </Button>
        <Button type="primary" onClick={() => void handlePublish()} loading={publishing}>
          發佈素材設定
        </Button>
      </Space>
      <Table columns={columns} dataSource={tableData} pagination={false} bordered size="small" scroll={{ x: "max-content" }} />
      <div style={{ marginTop: 16 }}>
        <RegionPreviewLinks regionIds={menu.regions as RegionId[]} />
      </div>
      <Modal
        open={leafModal != null}
        title={leafModal?.title}
        onCancel={() => setLeafModal(null)}
        footer={null}
        width={720}
      >
        {leafModal ? (
          <LeafPickerModal
            currentId={leafModal.currentId}
            catalog={leafCatalog}
            onPick={applyLeaf}
          />
        ) : null}
      </Modal>
    </>
  );
}

function LeafPickerButton({
  leafId,
  leafById,
  onOpen,
}: {
  leafId: string;
  leafById: Record<string, LeafCatalogItem>;
  onOpen: () => void;
}) {
  let inner: ReactNode;
  if (!leafId || leafId === "none") {
    inner = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="沒有裝飾葉素材" style={{ margin: 0, transform: "scale(0.85)" }} />;
  } else {
    const leaf = leafById[leafId];
    inner = leaf ? (
      <Space direction="vertical" size={4} align="center">
        <img src={leaf.url} alt={leaf.label} loading="lazy" />
        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.45)" }}>{leaf.label}</span>
      </Space>
    ) : (
      "—"
    );
  }
  return (
    <Button type="primary" ghost className="teatop-leaf-picker-btn" onClick={onOpen}>
      {inner}
    </Button>
  );
}

function LeafPickerModal({
  currentId,
  catalog,
  onPick,
}: {
  currentId: string;
  catalog: LeafCatalogItem[];
  onPick: (id: string) => void;
}) {
  return (
    <Space wrap size={[8, 8]}>
      <Button
        className={`teatop-leaf-option${currentId === "none" ? " is-selected" : ""}`}
        onClick={() => onPick("none")}
      >
        不使用葉
      </Button>
      {catalog.map((leaf) => (
        <Button
          key={leaf.id}
          className={`teatop-leaf-option${currentId === leaf.id ? " is-selected" : ""}`}
          onClick={() => onPick(leaf.id)}
        >
          <img src={leaf.url} alt={leaf.label} />
          <span>{leaf.label}</span>
        </Button>
      ))}
    </Space>
  );
}
