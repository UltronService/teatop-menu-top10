/**
 * Data-only injector for the exact Ximen shell DOM.
 * Does NOT rebuild markup or strip animation classes — only fills
 * images, zh/en names, ranks, and L prices from data/menu.json.
 */
(function () {
  "use strict";

  var KNOWN = [
    "central",
    "central-smart",
    "mrt-tamsui",
    "north",
    "north-smart",
    "south",
    "ximen",
  ];

  var LABELS = {
    central: "中部",
    "central-smart": "中部智慧店",
    "mrt-tamsui": "捷運淡水",
    north: "北部",
    "north-smart": "北部智慧店",
    south: "南部",
    ximen: "西門",
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function assetRoot() {
    var el = document.querySelector("[data-asset-root]");
    if (el && el.getAttribute("data-asset-root")) {
      return el.getAttribute("data-asset-root").replace(/\/?$/, "/");
    }
    return "../../";
  }

  function resolveRegion() {
    var el = document.querySelector("[data-region]");
    if (el && el.getAttribute("data-region")) {
      return el.getAttribute("data-region").trim();
    }
    var parts = location.pathname.split("/").filter(Boolean);
    var idx = parts.indexOf("regions");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return "";
  }

  function imageUrl(rel) {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel) || rel.charAt(0) === "/") return rel;
    return assetRoot() + rel.replace(/^\.\//, "");
  }

  function absolutizeMenuUrl(url) {
    if (!url || !String(url).trim()) return "";
    var u = String(url).trim();
    if (/^https?:\/\//i.test(u) || u.charAt(0) === "/") return u;
    return assetRoot() + u.replace(/^\.\//, "");
  }

  function menuUrlFromQuery() {
    try {
      var params = new URLSearchParams(location.search);
      return (
        absolutizeMenuUrl(params.get("menuUrl") || "") ||
        absolutizeMenuUrl(params.get("publishedMenu") || "")
      );
    } catch (err) {
      return "";
    }
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function loadPlayerConfig() {
    return fetchJson(assetRoot() + "data/player-config.json").catch(function () {
      return {};
    });
  }

  function publishedUrlFromConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return "";
    var raw = cfg.publishedMenuUrl || cfg.menuUrl || "";
    return absolutizeMenuUrl(raw);
  }

  function fetchMenuWithFallback(publishedUrl) {
    var fallback = assetRoot() + "data/menu.json";
    if (!publishedUrl) {
      return fetchJson(fallback);
    }
    return fetchJson(publishedUrl).catch(function () {
      return fetchJson(fallback);
    });
  }

  function formatEn(nameEn) {
    var s = nameEn || "";
    if (s.indexOf("\n") >= 0) return s.split("\n").join("<br/>");
    return s;
  }

  function itemsForRegion(menu, regionId) {
    var list = [];
    (menu.items || []).forEach(function (item) {
      var r = item.regions && item.regions[regionId];
      if (!r || r.rank == null) return;
      list.push({
        nameZh: item.nameZh || "",
        nameEn: item.nameEn || "",
        image: item.image || "",
        rank: Number(r.rank),
        priceL: r.priceL,
      });
    });
    list.sort(function (a, b) {
      return a.rank - b.rank;
    });
    return list;
  }

  function q(sel) {
    return document.querySelector(sel);
  }

  function setText(sel, text) {
    var el = q(sel);
    if (el) el.textContent = text;
  }

  function setHtml(sel, html) {
    var el = q(sel);
    if (el) el.innerHTML = html;
  }

  function setSrc(sel, src, alt) {
    var el = q(sel);
    if (!el) return;
    if (src) el.setAttribute("src", src);
    if (alt != null) el.setAttribute("alt", alt);
  }

  function showError(title, detail) {
    var root = assetRoot();
    var box = document.createElement("div");
    box.setAttribute(
      "style",
      "position:fixed;inset:0;z-index:9999;background:#fff8f0;color:#2a1a0f;" +
        "font-family:'Noto Sans TC',sans-serif;padding:2.5rem 1.25rem;text-align:center"
    );
    var links = KNOWN.map(function (r) {
      return (
        "<li><a href=\"" +
        root +
        "regions/" +
        r +
        '/" style="color:#d45f00;font-weight:700">' +
        (LABELS[r] || r) +
        "（" +
        r +
        "）</a></li>"
      );
    }).join("");
    box.innerHTML =
      "<h1 style=\"color:#ec6f09\">" +
      title +
      "</h1><p>" +
      detail +
      '</p><p><a href="' +
      root +
      '" style="color:#d45f00;font-weight:700">返回區域列表</a></p><ul style="display:inline-block;text-align:left;line-height:1.9">' +
      links +
      "</ul>";
    document.body.appendChild(box);
  }

  function inject(ranked) {
    var byRank = {};
    ranked.forEach(function (it) {
      byRank[it.rank] = it;
    });

    // Local logo (decorative leaves stay on original CDN URLs)
    setSrc(".logo", assetRoot() + "images/logo.png", "TEATOP");

    var i, nn, item, price;
    for (i = 1; i <= 5; i++) {
      nn = pad2(i);
      item = byRank[i] || { nameZh: "", nameEn: "", image: "" };
      setText(".Ltop" + nn, "TOP" + i);
      setSrc(".Ltea" + nn, imageUrl(item.image), item.nameZh);
      setText(".L" + nn + "Cname", item.nameZh);
      setHtml(".L" + nn + "Ename", formatEn(item.nameEn));
    }

    for (i = 1; i <= 10; i++) {
      nn = pad2(i);
      item = byRank[i] || { nameZh: "", nameEn: "", priceL: null };
      // Keep Ximen number markup: "01<span/> /" — only update leading digits via text nodes carefully.
      // Safer: rewrite Rno innerHTML matching original shape.
      var rno = q(".R" + nn + "no");
      if (rno) rno.innerHTML = nn + "<span/> /";
      setText(".R" + nn + "Cname", item.nameZh);
      setHtml(".R" + nn + "Ename", formatEn(item.nameEn));
      price =
        item.priceL != null && item.priceL !== "" ? String(item.priceL) : "—";
      setText(".R" + nn + "price", price);
    }

    var anim = q(".animation");
    if (anim) {
      anim.style.visibility = "visible";
      anim.setAttribute("data-ready", "1");
    }
  }

  function boot() {
    var region = resolveRegion();
    var anim = q(".animation");
    if (anim) anim.style.visibility = "hidden";

    if (!region || KNOWN.indexOf(region) === -1) {
      showError(
        "找不到此區域",
        "區域「" + (region || "（空白）") + "」不在選單資料中。"
      );
      return;
    }

    loadPlayerConfig()
      .then(function (cfg) {
        var published = menuUrlFromQuery() || publishedUrlFromConfig(cfg);
        return fetchMenuWithFallback(published);
      })
      .then(function (menu) {
        var ranked = itemsForRegion(menu, region);
        if (!ranked.length) {
          showError("此區域尚無品項", "區域「" + region + "」在選單資料中沒有排行資料。");
          return;
        }
        inject(ranked);
        document.title = "TEATOP TOP10 · " + region;
      })
      .catch(function (err) {
        showError("無法載入選單", String(err && err.message ? err.message : err));
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
