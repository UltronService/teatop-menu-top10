"use strict";

function shouldShowRcnameSuffixIcons(search) {
  try {
    const params = new URLSearchParams(search || "");
    return params.get("icon") === "on";
  } catch {
    return false;
  }
}

function applyRcnameSuffixIconMode(animationEl, search) {
  if (!animationEl) {
    return;
  }
  const OFF_CLASS = "rcname-suffix-icons-off";
  const ON_CLASS = "rcname-suffix-icons-on";
  const show = shouldShowRcnameSuffixIcons(search);
  animationEl.classList.remove(OFF_CLASS, ON_CLASS);
  if (show) {
    animationEl.classList.add(ON_CLASS);
  } else {
    animationEl.classList.add(OFF_CLASS);
  }
}

module.exports = {
  OFF_CLASS: "rcname-suffix-icons-off",
  ON_CLASS: "rcname-suffix-icons-on",
  shouldShowRcnameSuffixIcons,
  applyRcnameSuffixIconMode,
};
