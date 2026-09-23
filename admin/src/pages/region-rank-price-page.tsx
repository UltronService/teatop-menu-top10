import { Alert, Button, Card, InputNumber, Space, Table, Typography, message, type TableColumnsType } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthLoadingScreen } from "../components/auth-loading";
import { RegionPreviewLinks } from "../components/region-preview-links";
import { getAssetRoot } from "../lib/asset-root";
import {
  appendPublishMeta,
  loadMenuDraft,
  loadPublishMeta,
  loadPublishedMenu,
  saveMenuDraft,
  savePublishedMenu,
} from "../lib/brand-repository";
import { useAuth } from "../lib/auth-context";
import {
  REGION_LABELS,
  baseRegionData,
  buildMenuByZh,
  countOverrideKeys,
  dedupeCatalog,
  effectiveData,
  isModified,
  itemKeyForRow,
  mergeMenuFromBaseline,
  parsePriceInput,
  parseRankInput,
  storageKey,
  validateAllRegions,
} from "../lib/menu-matrix";
import { validateMenuDocument } from "../lib/menu-schema-validate";
import type { CatalogEntry, MenuDocument, MenuItem, RegionCell, RegionId } from "../types/menu";

interface RegionEditCellProps {
  regionId: RegionId;
  menuItem: MenuItem | null;
  itemKey: string;
  overrides: Record<string, RegionCell>;
  allErrors: Record<string, string>;
  revision: number;
  onOverride: (itemKey: string, regionId: RegionId, cell: RegionCell | null) => void;
}

function RegionEditCell({
  regionId,
  menuItem,
  itemKey,
  overrides,
  allErrors,
  revision,
  onOverride,
}: RegionEditCellProps) {
  const data = effectiveData(itemKey, regionId, menuItem, overrides);
  const [rankVal, setRankVal] = useState<number | null>(data.rank);
  const [priceVal, setPriceVal] = useState<number | null>(data.priceL);
  const [localErr, setLocalErr] = useState("");

  useEffect(() => {
    const fresh = effectiveData(itemKey, regionId, menuItem, overrides);
    setRankVal(fresh.rank);
    setPriceVal(fresh.priceL);
  }, [revision, itemKey, regionId, menuItem, overrides]);

  const modified = isModified(itemKey, regionId, menuItem, overrides);
  const errKey = storageKey(itemKey, regionId);
  const displayErr = localErr || allErrors[errKey] || "";

  const commit = useCallback(() => {
    const rankParsed = parseRankInput(rankVal == null ? "" : rankVal);
    if (!rankParsed.ok) {
      setLocalErr(rankParsed.message);
      return;
    }
    const priceParsed = parsePriceInput(priceVal == null ? "" : priceVal, rankParsed.value != null);
    if (!priceParsed.ok) {
      setLocalErr(priceParsed.message);
      return;
    }
    if (rankParsed.value == null && priceParsed.value != null) {
      setLocalErr("無排名時不可填價格");
      return;
    }
    const base = baseRegionData(menuItem, regionId);
    if (rankParsed.value === base.rank && priceParsed.value === base.priceL) {
      onOverride(itemKey, regionId, null);
    } else {
      onOverride(itemKey, regionId, { rank: rankParsed.value, priceL: priceParsed.value });
    }
    setLocalErr("");
  }, [rankVal, priceVal, menuItem, regionId, itemKey, onOverride]);

  const inputClass = modified ? "teatop-input-modified" : "";

  return (
    <div className="teatop-cell-edit">
      <div className="teatop-cell-field">
        <span>排名</span>
        <InputNumber
          className={inputClass}
          min={1}
          max={10}
          step={1}
          controls={false}
          size="small"
          status={displayErr ? "error" : undefined}
          value={rankVal}
          placeholder="—"
          onChange={(val) => setRankVal(val == null ? null : Number(val))}
          onBlur={commit}
          onPressEnter={commit}
        />
      </div>
      <div className="teatop-cell-field">
        <span>$L</span>
        <InputNumber
          className={inputClass}
          min={0}
          step={1}
          precision={0}
          controls={false}
          size="small"
          status={displayErr ? "error" : undefined}
          value={priceVal}
          placeholder="—"
          onChange={(val) => setPriceVal(val == null ? null : Number(val))}
          onBlur={commit}
          onPressEnter={commit}
        />
      </div>
      <span className="teatop-cell-err" role="alert">{displayErr}</span>
    </div>
  );
}

export function RegionRankPricePage() {
  const { user } = useAuth();
  const [baseline, setBaseline] = useState<MenuDocument | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogEntry[]>([]);
  const [overrides, setOverrides] = useState<Record<string, RegionCell>>({});
  const [publishedMenu, setPublishedMenu] = useState<MenuDocument | null>(null);
  const [publishMeta, setPublishMeta] = useState<{ lastPublishedAt?: string }>({});
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const root = getAssetRoot();
    void (async () => {
      try {
        const [menuRes, catalogRes, draft, published, meta] = await Promise.all([
          fetch(`${root}data/menu.json`, { cache: "no-cache" }),
          fetch(`${root}data/client-drink-catalog.json`, { cache: "no-cache" }),
          loadMenuDraft(),
          loadPublishedMenu(),
          loadPublishMeta(),
        ]);
        if (!menuRes.ok) {
          throw new Error(`menu.json HTTP ${menuRes.status}`);
        }
        if (!catalogRes.ok) {
          throw new Error(`client-drink-catalog.json HTTP ${catalogRes.status}`);
        }
        const menu = (await menuRes.json()) as MenuDocument;
        const catalog = (await catalogRes.json()) as { items: CatalogEntry[] };
        setBaseline(menu);
        setCatalogItems(dedupeCatalog(catalog.items));
        setOverrides(draft.overrides ?? {});
        setPublishedMenu(published);
        setPublishMeta(meta);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const menuByZh = useMemo(() => (baseline ? buildMenuByZh(baseline) : {}), [baseline]);
  const regionIds = (baseline?.regions ?? []) as RegionId[];

  const allErrors = useMemo(() => {
    if (!baseline) {
      return {};
    }
    return validateAllRegions(catalogItems, menuByZh, regionIds, overrides);
  }, [baseline, catalogItems, menuByZh, regionIds, overrides, revision]);

  const modCount = countOverrideKeys(overrides);
  const errorKeys = Object.keys(allErrors);
  const hasUnpublishedDraft = modCount > 0;

  const handleOverride = useCallback(
    (itemKey: string, regionId: RegionId, cell: RegionCell | null) => {
      setOverrides((prev) => {
        const key = storageKey(itemKey, regionId);
        const next = { ...prev };
        if (cell === null) {
          delete next[key];
        } else {
          next[key] = cell;
        }
        return next;
      });
      setRevision((n) => n + 1);
    },
    []
  );

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await saveMenuDraft({ overrides });
      message.success("草稿已儲存");
    } catch {
      message.error("儲存草稿失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setOverrides({});
    setRevision((n) => n + 1);
    message.info("已還原為系統預設（請儲存草稿後才會寫入）");
  };

  const handlePublish = async () => {
    if (!baseline) {
      return;
    }
    if (errorKeys.length > 0) {
      message.error("請先修正驗證錯誤再發佈");
      return;
    }
    setPublishing(true);
    try {
      const merged = mergeMenuFromBaseline(baseline, overrides);
      const nextVersion = (publishedMenu?.version ?? baseline.version) + (modCount > 0 ? 1 : 0);
      const payload: MenuDocument = { ...merged, version: nextVersion };
      const validation = validateMenuDocument(payload);
      if (!validation.ok) {
        message.error(`選單資料格式有誤：${validation.message}`);
        return;
      }
      await savePublishedMenu(payload);
      await appendPublishMeta({
        lastPublishedAt: new Date().toISOString(),
        lastPublishedMenuVersion: nextVersion,
        lastPublishedBy: user?.email,
      });
      setPublishedMenu(payload);
      setPublishMeta({ lastPublishedAt: new Date().toISOString() });
      message.success("選單已發佈");
    } catch {
      message.error("發佈失敗");
    } finally {
      setPublishing(false);
    }
  };

  type RowType = { key: string; entry: CatalogEntry };

  const columns = useMemo((): TableColumnsType<RowType> => {
    const cols: TableColumnsType<RowType> = [
      {
        title: "飲料",
        key: "drink",
        fixed: "left" as const,
        width: 160,
        render: (_: unknown, record: RowType) => {
          const menuItem = menuByZh[record.entry.nameZh] ?? null;
          return (
            <div>
              <div className="teatop-drink-name-zh">{record.entry.nameZh}</div>
              <div className="teatop-drink-name-en">
                {record.entry.nameEn || menuItem?.nameEn || ""}
              </div>
            </div>
          );
        },
      },
    ];
    for (const rid of regionIds) {
      const colHasErr = catalogItems.some((entry) => {
        const itemKey = itemKeyForRow(entry, menuByZh);
        return Boolean(allErrors[storageKey(itemKey, rid)]);
      });
      cols.push({
        title: (
          <span className={colHasErr ? "teatop-region-col-title has-col-error" : "teatop-region-col-title"}>
            {REGION_LABELS[rid] ?? rid}
          </span>
        ),
        key: `region-${rid}`,
        align: "center" as const,
        width: 110,
        render: (_: unknown, record: RowType) => {
          const itemKey = itemKeyForRow(record.entry, menuByZh);
          const menuItem = menuByZh[record.entry.nameZh] ?? null;
          return (
            <RegionEditCell
              regionId={rid}
              menuItem={menuItem}
              itemKey={itemKey}
              overrides={overrides}
              allErrors={allErrors}
              revision={revision}
              onOverride={handleOverride}
            />
          );
        },
      });
    }
    return cols;
  }, [regionIds, catalogItems, menuByZh, allErrors, overrides, revision, handleOverride]);

  if (loadError) {
    return <Alert type="error" showIcon message={`無法載入資料：${loadError}`} />;
  }
  if (!baseline) {
    return <AuthLoadingScreen />;
  }

  const lastPub = publishMeta.lastPublishedAt
    ? new Date(publishMeta.lastPublishedAt).toLocaleString("zh-TW")
    : "尚無發佈紀錄";

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        區域排行與價格 · 跨區對照
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        編輯各區 TOP10 排名與大杯價格。請先儲存草稿，確認無誤後再發佈至門市播放器。
      </Typography.Paragraph>
      {hasUnpublishedDraft ? (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="有未發佈的草稿變更，請儲存草稿後再發佈。" />
      ) : null}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`最後發佈：${lastPub}${publishedMenu ? ` · 版本 ${publishedMenu.version}` : ""}`}
      />
      {errorKeys.length ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={`檢查未通過（${errorKeys.length} 格）：同一區域排名不可重複、最多 10 品；有排名須填價格。`}
        />
      ) : (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            modCount > 0
              ? `目前有效；已修改 ${modCount} 格（請儲存草稿）。`
              : "目前有效；與系統預設一致。"
          }
        />
      )}
      <Card>
        <Space style={{ width: "100%", marginBottom: 16, justifyContent: "space-between" }} wrap>
          <Typography.Text type="secondary">列：客戶 20 品 · 空白排名＝該區不列入 TOP10</Typography.Text>
          <Space wrap>
            <Button onClick={handleReset}>還原為系統預設</Button>
            <Button onClick={() => void handleSaveDraft()} loading={saving}>
              儲存草稿
            </Button>
            <Button type="primary" onClick={() => void handlePublish()} loading={publishing} disabled={errorKeys.length > 0}>
              發佈選單
            </Button>
          </Space>
        </Space>
        <Table
          columns={columns}
          dataSource={catalogItems.map((entry) => ({ key: itemKeyForRow(entry, menuByZh), entry }))}
          pagination={false}
          bordered
          size="small"
          scroll={{ x: "max-content" }}
        />
      </Card>
      <div style={{ marginTop: 16 }}>
        <RegionPreviewLinks regionIds={regionIds} />
      </div>
    </>
  );
}
