(function () {
  const THEMES = ["regular", "neon", "technology"];
  const LABELS = {
    regular: "Regular",
    neon: "Neon",
    technology: "Technology",
  };
  const STORAGE_KEY = "site-theme";
  const DEFAULT_THEME = "regular";

  const root = document.documentElement;
  const buttonMarkup = `<button type="button" class="theme-button" data-theme-button aria-label="Cycle theme">Theme</button>`;
  const FALLBACK_ID = "theme-fallback-control";

  const styleFallbackButton = (button) => {
    button.style.setProperty("display", "inline-flex", "important");
    button.style.setProperty("align-items", "center");
    button.style.setProperty("justify-content", "center");
    button.style.setProperty("min-height", "38px", "important");
    button.style.setProperty("padding", "8px 12px", "important");
    button.style.setProperty("font", "inherit", "important");
    button.style.setProperty("font-size", "13px", "important");
    button.style.setProperty("font-weight", "700", "important");
    button.style.setProperty("border-radius", "999px", "important");
    button.style.setProperty("cursor", "pointer", "important");
    button.style.setProperty("z-index", "999999", "important");
    button.style.setProperty("border", "1px solid var(--line, rgba(97,245,255,.55))", "important");
    button.style.setProperty("background", "var(--surface, rgba(2,5,18,.94))", "important");
    button.style.setProperty("color", "var(--text, #fff)", "important");
    button.style.setProperty("box-shadow", "0 0 18px rgba(97,245,255,.28)", "important");
  };

  const isVisible = (element) => {
    if (!element) return false;
    if (!element.getClientRects().length) return false;
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity || "1") > 0;
  };

  const getSavedTheme = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return THEMES.includes(saved) ? saved : null;
    } catch (error) {
      return null;
    }
  };

  const getTheme = () => {
    if (!root) return DEFAULT_THEME;
    const current = root.getAttribute("data-theme");
    if (THEMES.includes(current)) return current;
    return getSavedTheme() || DEFAULT_THEME;
  };

  const normalizeThemeText = (theme) => `Theme: ${LABELS[theme] || "Neon"}`;

  const syncControls = (theme) => {
    const labels = Array.from(document.querySelectorAll(".theme-control [data-theme-label]"));
    for (const label of labels) {
      label.textContent = normalizeThemeText(theme);
    }

    const buttons = Array.from(document.querySelectorAll("[data-theme-button]"));
    for (const button of buttons) {
      button.textContent = normalizeThemeText(theme);
      button.setAttribute("data-theme", theme);
      button.setAttribute("aria-label", `Current theme ${LABELS[theme] || "Neon"}. Click to switch.`);
    }
  };

  const setTheme = (theme) => {
    if (!THEMES.includes(theme)) return;
    root.setAttribute("data-theme", theme);
    syncControls(theme);

    const selects = Array.from(document.querySelectorAll("[data-theme-select]"));
    for (const select of selects) {
      select.value = theme;
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Local storage can fail in some privacy modes; persistence is best-effort.
    }
  };

  const nextTheme = (theme) => {
    const currentIndex = THEMES.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    return THEMES[nextIndex];
  };

  const ensureControl = () => {
    const header = document.querySelector(".site-header");
    const nav = header ? header.querySelector("nav") : null;
    if (!header || !nav) return;

    const alreadyHasButton = header.querySelector('[data-theme-button]');
    const alreadyHasSelect = header.querySelector("[data-theme-select]");
    if (alreadyHasButton || alreadyHasSelect) return;

    const controlHost = header.querySelector(".header-controls");
    const host = controlHost || document.createElement("div");
    if (!controlHost) {
      host.className = "header-controls";
      nav.parentNode.insertBefore(host, nav);
      host.appendChild(nav);
    }

    host.insertAdjacentHTML("afterbegin", `<span class="theme-control" aria-live="polite">${buttonMarkup}</span>`);
  };

  const ensureVisibleThemeButton = () => {
    const buttons = Array.from(document.querySelectorAll("[data-theme-button]"));

    if (buttons.length === 0 || !buttons.some(isVisible)) {
      const existingFallback = document.getElementById(FALLBACK_ID);
      const fallbackButton = document.createElement("button");
      fallbackButton.type = "button";
      fallbackButton.id = FALLBACK_ID;
      fallbackButton.setAttribute("data-theme-button", "");
      fallbackButton.setAttribute("aria-label", "Cycle theme");
      fallbackButton.textContent = "Theme";
      fallbackButton.style.setProperty("position", "fixed", "important");
      fallbackButton.style.setProperty("top", "12px", "important");
      fallbackButton.style.setProperty("right", "12px", "important");

      styleFallbackButton(fallbackButton);
      if (existingFallback) {
        existingFallback.replaceWith(fallbackButton);
      } else {
        document.body.appendChild(fallbackButton);
      }
      return;
    }
  };

  const wireButtons = () => {
    const buttons = Array.from(document.querySelectorAll("[data-theme-button]"));
    for (const button of buttons) {
      button.addEventListener("click", () => {
        const currentTheme = getTheme();
        setTheme(nextTheme(currentTheme));
      });
    }
  };

  const wireSelects = () => {
    const selects = Array.from(document.querySelectorAll("[data-theme-select]"));
    for (const select of selects) {
      select.addEventListener("change", (event) => {
        setTheme(event.currentTarget.value);
      });
    }
  };

  ensureControl();
  if (root) {
    setTheme(getTheme());
  }
  ensureVisibleThemeButton();
  if (root) {
    setTheme(getTheme());
  }
  wireButtons();
  wireSelects();
})(); 
