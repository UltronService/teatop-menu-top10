/**
 * TEATOP TOP10 player — original Ximen/north visual shell
 * Ported from yixuantang623/teatop_north (index.html + script.js)
 * Content only: data/menu.json (images, names, ranks, prices)
 * Animation class names are preserved; we never strip them after mount.
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

  // Decorative leaf pairs from original teatop_north (not data-driven)
  var LEAF_PAIRS = [
    ["https://i.imgur.com/R7brK8S.png", "https://i.imgur.com/VQoiPLZ.png"],
    ["https://i.imgur.com/Y3DDstp.png", "https://i.imgur.com/20VAs4D.png"],
    ["https://i.imgur.com/qrYlB89.png", "https://i.imgur.com/WdBACx1.png"],
    ["https://i.imgur.com/piFJe3D.png", "https://i.imgur.com/DVVeo5S.png"],
    ["https://i.imgur.com/j4oDo4K.png", "https://i.imgur.com/4PcTEKD.png"],
  ];

  var LOGO_URL = "https://i.imgur.com/m7xnqEo.png";

  function assetRoot() {
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatEnHtml(nameEn) {
    var s = escapeHtml(nameEn || "");
    // Allow intentional line breaks from data ("a\nb") or soft-break long lines
    if (s.indexOf("\n") >= 0) {
      return s.replace(/\n/g, "<br/>");
    }
    if (s.length > 42) {
      var cut = s.lastIndexOf(" ", 36);
      if (cut > 12) {
        return s.slice(0, cut) + "<br/>" + s.slice(cut + 1);
      }
    }
    return s;
  }

  function imageUrl(rel) {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel) || rel.charAt(0) === "/") return rel;
    return assetRoot() + rel.replace(/^\.\//, "");
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
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
          '">返回區域列表</a></p><ul class="region-links">' +
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

  function buildShellHtml(ranked) {
    var byRank = {};
    ranked.forEach(function (it) {
      byRank[it.rank] = it;
    });

    var left = "";
    for (var i = 1; i <= 5; i++) {
      var item = byRank[i] || {
        nameZh: "",
        nameEn: "",
        image: "",
        rank: i,
      };
      var nn = pad2(i);
      var leaves = LEAF_PAIRS[i - 1];
      left +=
        '<div class="L' +
        nn +
        '">' +
        '<h1 class="Ltop Ltop' +
        nn +
        '">TOP' +
        i +
        "</h1>" +
        '<div class="Ltopimg Ltop' +
        nn +
        'img">' +
        '<img class="Lleaf' +
        nn +
        '" src="' +
        leaves[0] +
        '" alt=""/>' +
        '<img class="Ltea' +
        nn +
        '" src="' +
        escapeHtml(imageUrl(item.image)) +
        '" alt="' +
        escapeHtml(item.nameZh) +
        '"/>' +
        '<img class="Rleaf' +
        nn +
        '" src="' +
        leaves[1] +
        '" alt=""/>' +
        "</div>" +
        '<h3 class="LCname L' +
        nn +
        'Cname">' +
        escapeHtml(item.nameZh) +
        "</h3>" +
        '<p class="LEname L' +
        nn +
        'Ename">' +
        formatEnHtml(item.nameEn) +
        "</p>" +
        "</div>";
    }

    var right = "";
    for (var r = 1; r <= 10; r++) {
      var row = byRank[r] || {
        nameZh: "",
        nameEn: "",
        priceL: null,
        rank: r,
      };
      var rn = pad2(r);
      var price =
        row.priceL != null && row.priceL !== "" ? String(row.priceL) : "—";
      right +=
        '<div class="Rrow Rrow' +
        rn +
        '">' +
        '<div class="Number">' +
        '<h1 class="Rno R' +
        rn +
        'no">' +
        rn +
        "<span> /</span></h1>" +
        "</div>" +
        '<div class="Name">' +
        '<h4 class="RCname R' +
        rn +
        'Cname">' +
        escapeHtml(row.nameZh) +
        "</h4>" +
        '<p class="REname R' +
        rn +
        'Ename">' +
        formatEnHtml(row.nameEn) +
        "</p>" +
        "</div>" +
        '<div class="Price">' +
        '<div class="smalltext">' +
        '<p class="moneysign R' +
        rn +
        'moneysign">$</p>' +
        '<p class="large R' +
        rn +
        'large">L</p>' +
        "</div>" +
        '<h1 class="Rprice R' +
        rn +
        'price">' +
        escapeHtml(price) +
        "</h1>" +
        "</div>" +
        "</div>";
    }

    return (
      '<div class="animation">' +
      '<div class="L">' +
      '<img class="logo" src="' +
      LOGO_URL +
      '" alt="TEATOP"/>' +
      '<div class="Mcircle"></div>' +
      '<div class="Lcircle"></div>' +
      '<div class="Rcircle"></div>' +
      left +
      "</div>" +
      '<div class="R">' +
      right +
      "</div>" +
      "</div>"
    );
  }

  /** Restart dense timelines — ported from teatop_north/script.js */
  function bindAnimationLoop() {
    var endEl = document.querySelector(".L05Ename");
    if (!endEl) return;

    endEl.addEventListener("animationend", function (event) {
      if (event.animationName !== "fadeOut") return;

      setTimeout(function () {
        var animationElements = document.querySelectorAll(".animation *");
        animationElements.forEach(function (element) {
          element.style.animation = "none";
          void element.offsetWidth;
        });

        var q = function (sel) {
          return document.querySelector(sel);
        };
        var set = function (sel, value) {
          var el = q(sel);
          if (el) el.style.animation = value;
        };

        set(
          ".Ltop01",
          "slideIn 0.5s 1 linear 0s forwards , slideOut 0.5s 1 linear 5s forwards"
        );
        set(
          ".Ltea01",
          "rotate01 1s 1 ease-out 0s forwards , rotate02 1s 1 ease-out 5s forwards"
        );
        set(
          ".Lleaf01",
          "drop 0.5s 1 ease-in 1s forwards , float04 1s infinite linear 1.5s , fadeOut 0.1s 1 linear 4.9s forwards"
        );
        set(
          ".Rleaf01",
          "drop 0.5s 1 ease-in 1s forwards , float03 1s infinite linear 1.5s , fadeOut 0.1s 1 linear 4.9s forwards"
        );
        set(
          ".L01Cname",
          "fadeIn 0.3s 1 linear 1.7s forwards , fadeOut 0.3s 1 linear 4.7s forwards"
        );
        set(
          ".L01Ename",
          "fadeIn 0.3s 1 linear 2s forwards , fadeOut 0.3s 1 linear 5s forwards"
        );

        set(
          ".Ltop02",
          "slideIn 0.5s 1 linear 5.5s forwards , slideOut 0.5s 1 linear 10.5s forwards"
        );
        set(
          ".Ltea02",
          "rotate01 1s 1 ease-out 5.5s forwards , rotate02 1s 1 ease-out 10.5s forwards"
        );
        set(
          ".Lleaf02",
          "drop 0.5s 1 ease-in 6.5s forwards , float03 1s infinite linear 7s , fadeOut 0.1s 1 linear 10.4s forwards"
        );
        set(
          ".Rleaf02",
          "drop 0.5s 1 ease-in 6.5s forwards , float04 1s infinite linear 7s , fadeOut 0.1s 1 linear 10.4s forwards"
        );
        set(
          ".L02Cname",
          "fadeIn 0.3s 1 linear 7.2s forwards , fadeOut 0.3s 1 linear 10.2s forwards"
        );
        set(
          ".L02Ename",
          "fadeIn 0.3s 1 linear 7.5s forwards , fadeOut 0.3s 1 linear 10.5s forwards"
        );

        set(
          ".Ltop03",
          "slideIn 0.5s 1 linear 11s forwards , slideOut 0.5s 1 linear 16s forwards"
        );
        set(
          ".Ltea03",
          "rotate01 1s 1 ease-out 11s forwards , rotate02 1s 1 ease-out 16s forwards"
        );
        set(
          ".Lleaf03",
          "drop 0.5s 1 ease-in 12s forwards , float04 1s infinite linear 12.5s , fadeOut 0.1s 1 linear 15.9s forwards"
        );
        set(
          ".Rleaf03",
          "drop 0.5s 1 ease-in 12s forwards , float03 1s infinite linear 12.5s , fadeOut 0.1s 1 linear 15.9s forwards"
        );
        set(
          ".L03Cname",
          "fadeIn 0.3s 1 linear 12.7s forwards , fadeOut 0.3s 1 linear 15.7s forwards"
        );
        set(
          ".L03Ename",
          "fadeIn 0.3s 1 linear 13s forwards , fadeOut 0.3s 1 linear 16s forwards"
        );

        set(
          ".Ltop04",
          "slideIn 0.5s 1 linear 16.5s forwards , slideOut 0.5s 1 linear 21.5s forwards"
        );
        set(
          ".Ltea04",
          "rotate01 1s 1 ease-out 16.5s forwards , rotate02 1s 1 ease-out 21.5s forwards"
        );
        set(
          ".Lleaf04",
          "drop 0.5s 1 ease-in 17.5s forwards , float04 1s infinite linear 18s , fadeOut 0.1s 1 linear 21.4s forwards"
        );
        set(
          ".Rleaf04",
          "drop 0.5s 1 ease-in 17.5s forwards , float03 1s infinite linear 18s , fadeOut 0.1s 1 linear 21.4s forwards"
        );
        set(
          ".L04Cname",
          "fadeIn 0.3s 1 linear 18.2s forwards , fadeOut 0.3s 1 linear 21.2s forwards"
        );
        set(
          ".L04Ename",
          "fadeIn 0.3s 1 linear 18.5s forwards , fadeOut 0.3s 1 linear 21.5s forwards"
        );

        set(
          ".Ltop05",
          "slideIn 0.5s 1 linear 22s forwards , slideOut 0.5s 1 linear 27s forwards"
        );
        set(
          ".Ltea05",
          "rotate01 1s 1 ease-out 22s forwards , rotate02 1s 1 ease-out 27s forwards"
        );
        set(
          ".Lleaf05",
          "drop 0.5s 1 ease-in 23s forwards , float03 1s infinite linear 23.5s , fadeOut 0.1s 1 linear 26.9s forwards"
        );
        set(
          ".Rleaf05",
          "drop 0.5s 1 ease-in 23s forwards , float04 1s infinite linear 23.5s , fadeOut 0.1s 1 linear 26.9s forwards"
        );
        set(
          ".L05Cname",
          "fadeIn 0.3s 1 linear 23.7s forwards , fadeOut 0.3s 1 linear 26.7s forwards"
        );
        set(
          ".L05Ename",
          "fadeIn 0.3s 1 linear 24s forwards , fadeOut 0.3s 1 linear 27s forwards"
        );

        set(".Lcircle", "float01 1s infinite linear 0s");
        set(".Rcircle", "float02 1s infinite linear 0s");

        set(
          ".Rrow01",
          "bgcolorlof 0.1s linear 0.5s 1 forwards , bgcolorof 0.1s linear 5.3s 1 reverse forwards"
        );
        set(
          ".Rrow01 .large",
          "bgcolorbo 0.1s linear 0.5s 1 forwards , bgcolorbo 0.1s linear 5.3s 1 reverse forwards"
        );
        set(
          ".Rrow02",
          "bgcolorlof 0.1s linear 6s 1 forwards , bgcolorlof 0.1s linear 10.8s 1 reverse forwards"
        );
        set(
          ".Rrow02 .large",
          "bgcolorbo 0.1s linear 6s 1 forwards , bgcolorbo 0.1s linear 10.8s 1 reverse forwards"
        );
        set(
          ".Rrow03",
          "bgcolorof 0.1s linear 11.5s 1 forwards , bgcolorof 0.1s linear 16.3s 1 reverse forwards"
        );
        set(
          ".Rrow03 .large",
          "bgcolorbo 0.1s linear 11.5s 1 forwards , bgcolorbo 0.1s linear 16.3s 1 reverse forwards"
        );
        set(
          ".Rrow04",
          "bgcolorlof 0.1s linear 17s 1 forwards , bgcolorlof 0.1s linear 21.8s 1 reverse forwards"
        );
        set(
          ".Rrow04 .large",
          "bgcolorbo 0.1s linear 17s 1 forwards , bgcolorbo 0.1s linear 21.8s 1 reverse forwards"
        );
        set(
          ".Rrow05",
          "bgcolorof 0.1s linear 22.5s 1 forwards , bgcolorof 0.1s linear 27.3s 1 reverse forwards"
        );
        set(
          ".Rrow05 .large",
          "bgcolorbo 0.1s linear 22.5s 1 forwards , bgcolorbo 0.1s linear 27.3s 1 reverse forwards"
        );

        set(
          ".R01no",
          "colorfo 0.1s linear 0.5s 1 forwards , colorfo 0.1s linear 5.3s 1 reverse forwards"
        );
        set(
          ".R01price",
          "colorfo 0.1s linear 0.5s 1 forwards , colorfo 0.1s linear 5.3s 1 reverse forwards"
        );
        set(
          ".R01moneysign",
          "colorbo 0.1s linear 0.5s 1 forwards , colorbo 0.1s linear 5.3s 1 reverse forwards"
        );
        set(
          ".R01Cname",
          "filtero 0.1s linear 0.5s 1 forwards, filtero 0.1s linear 5.3s 1 reverse forwards"
        );
        set(
          ".R01Ename",
          "filtero 0.1s linear 0.5s 1 forwards, filtero 0.1s linear 5.3s 1 reverse forwards"
        );

        set(
          ".R02no",
          "colorfo 0.1s linear 6s 1 forwards , colorfo 0.1s linear 10.8s 1 reverse forwards"
        );
        set(
          ".R02price",
          "colorfo 0.1s linear 6s 1 forwards , colorfo 0.1s linear 10.8s 1 reverse forwards"
        );
        set(
          ".R02moneysign",
          "colorbo 0.1s linear 6s 1 forwards , colorbo 0.1s linear 10.8s 1 reverse forwards"
        );
        set(
          ".R02Cname",
          "filtero 0.1s linear 6s 1 forwards, filtero 0.1s linear 10.8s 1 reverse forwards"
        );
        set(
          ".R02Ename",
          "filtero 0.1s linear 6s 1 forwards, filtero 0.1s linear 10.8s 1 reverse forwards"
        );

        set(
          ".R03no",
          "colorfo 0.1s linear 11.5s 1 forwards , colorfo 0.1s linear 16.3s 1 reverse forwards"
        );
        set(
          ".R03price",
          "colorfo 0.1s linear 11.5s 1 forwards , colorfo 0.1s linear 16.3s 1 reverse forwards"
        );
        set(
          ".R03moneysign",
          "colorbo 0.1s linear 11.5s 1 forwards , colorbo 0.1s linear 16.3s 1 reverse forwards"
        );
        set(
          ".R03Cname",
          "filtero 0.1s linear 11.5s 1 forwards, filtero 0.1s linear 16.3s 1 reverse forwards"
        );
        set(
          ".R03Ename",
          "filtero 0.1s linear 11.5s 1 forwards, filtero 0.1s linear 16.3s 1 reverse forwards"
        );

        set(
          ".R04no",
          "colorfo 0.1s linear 17s 1 forwards , colorfo 0.1s linear 21.8s 1 reverse forwards"
        );
        set(
          ".R04price",
          "colorfo 0.1s linear 17s 1 forwards , colorfo 0.1s linear 21.8s 1 reverse forwards"
        );
        set(
          ".R04moneysign",
          "colorbo 0.1s linear 17s 1 forwards , colorbo 0.1s linear 21.8s 1 reverse forwards"
        );
        set(
          ".R04Cname",
          "filtero 0.1s linear 17s 1 forwards, filtero 0.1s linear 21.8s 1 reverse forwards"
        );
        set(
          ".R04Ename",
          "filtero 0.1s linear 17s 1 forwards, filtero 0.1s linear 21.8s 1 reverse forwards"
        );

        set(
          ".R05no",
          "colorfo 0.1s linear 22.5s 1 forwards , colorfo 0.1s linear 27.3s 1 reverse forwards"
        );
        set(
          ".R05price",
          "colorfo 0.1s linear 22.5s 1 forwards , colorfo 0.1s linear 27.3s 1 reverse forwards"
        );
        set(
          ".R05moneysign",
          "colorbo 0.1s linear 22.5s 1 forwards , colorbo 0.1s linear 27.3s 1 reverse forwards"
        );
        set(
          ".R05Cname",
          "filtero 0.1s linear 22.5s 1 forwards, filtero 0.1s linear 27.3s 1 reverse forwards"
        );
        set(
          ".R05Ename",
          "filtero 0.1s linear 22.5s 1 forwards, filtero 0.1s linear 27.3s 1 reverse forwards"
        );
      }, 500);
    });
  }

  function mount(regionId, ranked) {
    var root = document.getElementById("player-root");
    if (!root) return;
    // Replace loading state with shell; classes match north CSS timelines
    root.innerHTML = buildShellHtml(ranked);
    document.title =
      "TEATOP TOP10 · " + (REGION_LABELS[regionId] || regionId);
    bindAnimationLoop();
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
        mount(regionId, ranked);
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
