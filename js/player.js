/**
 * TEATOP TOP10 shared player
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
    var el = document.getElementById("player-root");
    if (el && el.getAttribute("data-asset-root")) {
      return el.getAttribute("data-asset-root").replace(/\/?$/, "/");
    }
    return "../../";
  }

  function resolveRegion() {
    var params = new URLSearchParams(location.search);
    var fromQuery = params.get("region");
    if (fromQuery && fromQuery.trim()) {
      return fromQuery.trim();
    }
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showError(title, detail, showLinks) {
    var screen = document.getElementById("state-screen");
    if (!screen) return;
    screen.classList.remove("hidden");
    var links = "";
    if (showLinks) {
      links =
        '<p><a href="' +
        assetRoot() +
        '">返回區域列表</a></p><ul>' +
        KNOWN_REGIONS.map(function (r) {
          return (
            '<li><a href="' +
            assetRoot() +
            "regions/" +
            r +
            '/">' +
            escapeHtml(REGION_LABELS[r] || r) +
            "（" +
            r +
            "）</a></li>"
          );
        }).join("") +
        "</ul>";
    }
    screen.innerHTML =
      "<h1>" +
      escapeHtml(title) +
      "</h1><p>" +
      escapeHtml(detail) +
      "</p>" +
      links;
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

  function rowTone(rank) {
    if (rank === 1 || rank === 3 || rank === 5) return "tone-orange";
    if (rank === 2 || rank === 4) return "tone-orange-mid";
    if (rank === 6 || rank === 8 || rank === 10) return "tone-navy";
    return "tone-navy-mid";
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
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
      '<div class="brand"><img src="' +
      assetRoot() +
      'images/logo.png" alt="TEATOP"></div>' +
      '<div class="decor-circle main" aria-hidden="true"></div>' +
      '<div class="decor-circle left" aria-hidden="true"></div>' +
      '<div class="decor-circle right" aria-hidden="true"></div>' +
      '<div class="carousel" id="carousel"></div>' +
      '<div class="slide-dots" id="slide-dots" role="tablist" aria-label="TOP1–5"></div>' +
      "</section>" +
      '<section class="panel-right">' +
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
      if (item.image) {
        img.src = imageUrl(item.image);
        bindImageFallback(img);
      } else {
        img.src = "";
        bindImageFallback(img);
        img.dispatchEvent(new Event("error"));
      }

      var nameEl = document.createElement("h3");
      nameEl.className = "slide-name";
      nameEl.textContent = item.nameZh;

      var enEl = document.createElement("p");
      enEl.className = "slide-en";
      enEl.textContent = item.nameEn || "";

      slide.appendChild(rankEl);
      slide.appendChild(img);
      slide.appendChild(nameEl);
      slide.appendChild(enEl);
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
      li.className = "price-row " + rowTone(item.rank);
      li.setAttribute("data-rank", String(item.rank));
      if (top5.length && item.rank === top5[0].rank) {
        li.classList.add("is-highlight");
      }

      var rankSpan = document.createElement("span");
      rankSpan.className = "rank";
      rankSpan.innerHTML = pad2(item.rank) + "<span> /</span>";

      var names = document.createElement("span");
      names.className = "names";
      var nameSpan = document.createElement("span");
      nameSpan.className = "name";
      nameSpan.textContent = item.nameZh;
      var enSpan = document.createElement("span");
      enSpan.className = "en";
      enSpan.textContent = item.nameEn || "";
      names.appendChild(nameSpan);
      names.appendChild(enSpan);

      var priceSpan = document.createElement("span");
      priceSpan.className = "price";
      var meta = document.createElement("span");
      meta.className = "meta";
      var cur = document.createElement("span");
      cur.className = "currency";
      cur.textContent = "$";
      var unit = document.createElement("span");
      unit.className = "unit";
      unit.textContent = "L";
      meta.appendChild(cur);
      meta.appendChild(unit);
      priceSpan.appendChild(meta);
      priceSpan.appendChild(
        document.createTextNode(
          item.priceL != null && item.priceL !== "" ? String(item.priceL) : "—"
        )
      );

      li.appendChild(rankSpan);
      li.appendChild(names);
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
      highlightRank(Number(slides[index].getAttribute("data-rank")));
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

    setInterval(function () {
      if (!slides.length) return;
      if (Date.now() - lastAdvance > WATCHDOG_MS) {
        advance();
        restartTimer();
      }
    }, 1000);

    if (top5.length) {
      restartTimer();
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
        "區域「" +
          (regionId || "（空白）") +
          "」不在選單資料中。請改選下列正確區域，或回到首頁。",
        true
      );
      return;
    }

    fetch(assetRoot() + "data/menu.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (menu) {
        if (menu.regions && menu.regions.indexOf(regionId) === -1) {
          showError(
            "找不到此區域",
            "區域「" + regionId + "」不在選單資料中。",
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
        document.title =
          "TEATOP TOP10 · " + (REGION_LABELS[regionId] || regionId);
        buildUI(regionId, ranked);
      })
      .catch(function (err) {
        showError(
          "無法載入選單",
          "讀取選單資料失敗（" +
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
