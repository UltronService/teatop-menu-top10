/**
 * TEATOP TOP10 formal player
 * - Single data source: data/menu.json
 * - Region from data-region on #player-root, or URL /regions/<id>/
 * - Carousel driven by setInterval + watchdog (not animationend-only)
 */
(function () {
  "use strict";

  var KNOWN_REGIONS = [
    "central",
    "central-smart",
    "mrt-tamsui",
    "north",
    "north-smart",
    "south",
    "ximen",
  ];

  var REGION_LABELS = {
    central: "中部",
    "central-smart": "中部智慧店",
    "mrt-tamsui": "捷運淡水",
    north: "北部",
    "north-smart": "北部智慧店",
    south: "南部",
    ximen: "西門",
  };

  var SLIDE_MS = 5500;
  var WATCHDOG_MS = 7000;

  function assetRoot() {
    // Region pages live at regions/<id>/ → repo root is ../..
    var el = document.getElementById("player-root");
    if (el && el.getAttribute("data-asset-root")) {
      return el.getAttribute("data-asset-root").replace(/\/?$/, "/");
    }
    return "../../";
  }

  function resolveRegion() {
    var el = document.getElementById("player-root");
    if (el && el.getAttribute("data-region")) {
      return el.getAttribute("data-region").trim();
    }
    var parts = location.pathname.split("/").filter(Boolean);
    var idx = parts.indexOf("regions");
    if (idx >= 0 && parts[idx + 1]) {
      return parts[idx + 1];
    }
    return "";
  }

  function showError(title, detail, showLinks) {
    var screen = document.getElementById("state-screen");
    if (!screen) return;
    screen.classList.remove("hidden");
    screen.innerHTML =
      "<h1>" +
      escapeHtml(title) +
      "</h1><p>" +
      escapeHtml(detail) +
      "</p>" +
      (showLinks
        ? '<p><a href="' +
          assetRoot() +
          '">返回區域列表</a></p><ul style="text-align:left;margin:1em auto;max-width:16em;color:#7a5c45">' +
          KNOWN_REGIONS.map(function (r) {
            return (
              '<li><a href="' +
              assetRoot() +
              "regions/" +
              r +
              '/">' +
              (REGION_LABELS[r] || r) +
              "（" +
              r +
              "）</a></li>"
            );
          }).join("") +
          "</ul>"
        : "");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function imageUrl(rel) {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel) || rel.charAt(0) === "/") return rel;
    return assetRoot() + rel.replace(/^\.\//, "");
  }

  function itemsForRegion(menu, regionId) {
    var list = [];
    (menu.items || []).forEach(function (item) {
      var r = item.regions && item.regions[regionId];
      if (!r || r.rank == null) return;
      list.push({
        id: item.id,
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

  function bindImageFallback(img) {
    img.addEventListener("error", function onErr() {
      img.removeEventListener("error", onErr);
      img.style.display = "none";
      var ph = document.createElement("div");
      ph.className = "placeholder-cup";
      ph.textContent = "TEATOP";
      ph.setAttribute("aria-hidden", "true");
      if (img.parentNode) {
        img.parentNode.insertBefore(ph, img);
      }
    });
  }

  function buildUI(regionId, ranked) {
    var root = document.getElementById("player-root");
    var state = document.getElementById("state-screen");
    if (state) state.classList.add("hidden");

    var top5 = ranked.filter(function (x) {
      return x.rank >= 1 && x.rank <= 5;
    });

    root.innerHTML =
      '<div class="stage-wrap"><div class="stage" role="application" aria-label="TEATOP TOP10">' +
      '<section class="panel-left">' +
      '<div class="brand"><div class="brand-mark">TEATOP</div>' +
      '<div class="brand-sub">TOP 10 MENU</div></div>' +
      '<div class="decor-circle main" aria-hidden="true"></div>' +
      '<div class="decor-circle left" aria-hidden="true"></div>' +
      '<div class="decor-circle right" aria-hidden="true"></div>' +
      '<div class="carousel" id="carousel"></div>' +
      '<div class="slide-dots" id="slide-dots" role="tablist" aria-label="TOP1–5"></div>' +
      "</section>" +
      '<section class="panel-right">' +
      '<div class="list-header"><h2>TOP 10</h2>' +
      '<span class="region-label">' +
      escapeHtml(REGION_LABELS[regionId] || regionId) +
      "</span></div>" +
      '<ol class="price-list" id="price-list"></ol>' +
      "</section></div></div>";

    var carousel = document.getElementById("carousel");
    var dots = document.getElementById("slide-dots");
    var list = document.getElementById("price-list");

    top5.forEach(function (item, i) {
      var slide = document.createElement("div");
      slide.className = "slide" + (i === 0 ? " is-active" : "");
      slide.setAttribute("data-rank", String(item.rank));
      slide.setAttribute("role", "tabpanel");

      var rankEl = document.createElement("h1");
      rankEl.className = "slide-rank";
      rankEl.textContent = "TOP" + item.rank;

      var img = document.createElement("img");
      img.className = "slide-cup";
      img.alt = item.nameZh;
      img.decoding = "async";
      img.src = imageUrl(item.image);
      bindImageFallback(img);

      var nameEl = document.createElement("h3");
      nameEl.className = "slide-name";
      nameEl.textContent = item.nameZh;

      slide.appendChild(rankEl);
      slide.appendChild(img);
      slide.appendChild(nameEl);
      carousel.appendChild(slide);

      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "TOP" + item.rank);
      if (i === 0) dot.className = "is-active";
      dot.addEventListener("click", function () {
        goTo(i, true);
      });
      dots.appendChild(dot);
    });

    ranked.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "price-row";
      li.setAttribute("data-rank", String(item.rank));
      if (item.rank >= 1 && item.rank <= 5 && item.rank === top5[0].rank) {
        li.classList.add("is-highlight");
      }

      var rankSpan = document.createElement("span");
      rankSpan.className = "rank";
      rankSpan.textContent = String(item.rank).padStart(2, "0");

      var nameSpan = document.createElement("span");
      nameSpan.className = "name";
      nameSpan.textContent = item.nameZh;

      var priceSpan = document.createElement("span");
      priceSpan.className = "price";
      var cur = document.createElement("span");
      cur.className = "currency";
      cur.textContent = "$";
      priceSpan.appendChild(cur);
      priceSpan.appendChild(
        document.createTextNode(
          item.priceL != null ? String(item.priceL) : "—"
        )
      );
      var unit = document.createElement("span");
      unit.className = "unit";
      unit.textContent = "L";
      priceSpan.appendChild(unit);

      li.appendChild(rankSpan);
      li.appendChild(nameSpan);
      li.appendChild(priceSpan);
      list.appendChild(li);
    });

    var index = 0;
    var timer = null;
    var lastAdvance = Date.now();
    var slides = carousel.querySelectorAll(".slide");
    var dotBtns = dots.querySelectorAll("button");
    var rows = list.querySelectorAll(".price-row");

    function highlightRank(rank) {
      rows.forEach(function (row) {
        row.classList.toggle(
          "is-highlight",
          Number(row.getAttribute("data-rank")) === rank
        );
      });
    }

    function goTo(next, fromUser) {
      if (!slides.length) return;
      index = ((next % slides.length) + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        s.classList.toggle("is-active", i === index);
      });
      dotBtns.forEach(function (d, i) {
        d.classList.toggle("is-active", i === index);
      });
      var rank = Number(slides[index].getAttribute("data-rank"));
      highlightRank(rank);
      lastAdvance = Date.now();
      if (fromUser) restartTimer();
    }

    function advance() {
      goTo(index + 1, false);
    }

    function restartTimer() {
      if (timer) clearInterval(timer);
      timer = setInterval(advance, SLIDE_MS);
      lastAdvance = Date.now();
    }

    // Watchdog: if the interval somehow stalls, force an advance
    setInterval(function () {
      if (!slides.length) return;
      if (Date.now() - lastAdvance > WATCHDOG_MS) {
        advance();
        restartTimer();
      }
    }, 1000);

    if (top5.length) {
      restartTimer();
      // Visibility: pause when hidden, resume with watchdog reset
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          if (timer) clearInterval(timer);
          timer = null;
        } else {
          restartTimer();
        }
      });
    }
  }

  function boot() {
    var regionId = resolveRegion();
    if (!regionId || KNOWN_REGIONS.indexOf(regionId) === -1) {
      showError(
        "找不到此區域",
        "網址中的區域代碼無效或不存在。請選擇下列正確區域，或回到首頁。",
        true
      );
      return;
    }

    var url = assetRoot() + "data/menu.json";
    fetch(url, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (menu) {
        if (menu.regions && menu.regions.indexOf(regionId) === -1) {
          showError(
            "區域未在選單資料中",
            "區域「" + regionId + "」不在 data/menu.json 的 regions 清單。",
            true
          );
          return;
        }
        var ranked = itemsForRegion(menu, regionId);
        if (!ranked.length) {
          showError(
            "此區域尚無品項",
            "區域「" +
              (REGION_LABELS[regionId] || regionId) +
              "」在選單資料中沒有可顯示的 TOP 品項。",
            true
          );
          return;
        }
        document.title = "TEATOP TOP10 · " + (REGION_LABELS[regionId] || regionId);
        buildUI(regionId, ranked);
      })
      .catch(function (err) {
        showError(
          "無法載入選單",
          "讀取 data/menu.json 失敗（" +
            (err && err.message ? err.message : "網路錯誤") +
            "）。請確認本機伺服器路徑或稍後再試。",
          true
        );
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
