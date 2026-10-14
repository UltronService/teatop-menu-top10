/**
 * RCname suffix icon visibility: default and ?icon=off hide; ?icon=on shows.
 */
var teatopNameSuffixIconMode = (function () {
  "use strict";

  var OFF_CLASS = "rcname-suffix-icons-off";
  var ON_CLASS = "rcname-suffix-icons-on";

  function shouldShowRcnameSuffixIcons(search) {
    try {
      var params = new URLSearchParams(search || "");
      return params.get("icon") === "on";
    } catch (err) {
      return false;
    }
  }

  function applyRcnameSuffixIconMode(animationEl, search) {
    if (!animationEl) {
      return;
    }
    var show = shouldShowRcnameSuffixIcons(search);
    animationEl.classList.remove(OFF_CLASS, ON_CLASS);
    if (show) {
      animationEl.classList.add(ON_CLASS);
    } else {
      animationEl.classList.add(OFF_CLASS);
    }
  }

  return {
    OFF_CLASS: OFF_CLASS,
    ON_CLASS: ON_CLASS,
    shouldShowRcnameSuffixIcons: shouldShowRcnameSuffixIcons,
    applyRcnameSuffixIconMode: applyRcnameSuffixIconMode,
  };
})();

if (typeof window !== "undefined") {
  window.teatopNameSuffixIconMode = teatopNameSuffixIconMode;
}
