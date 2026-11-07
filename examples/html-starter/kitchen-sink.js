// Controls and data-driven sections for the kitchen sink. Not part of the design system.
(() => {
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* file:// may block this */ } },
  };
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  // ---------- Controls ----------
  function setTheme(value) {
    if (value === "light") root.removeAttribute("data-theme");
    else root.dataset.theme = value;
    store.set("ks-theme", value);
    renderColorTable();
  }
  function setDirection(value) {
    root.dir = value;
    store.set("ks-dir", value);
  }
  $("control-theme").addEventListener("change", (e) => setTheme(e.target.value));
  $("control-direction").addEventListener("change", (e) => setDirection(e.target.value));

  // ---------- Button matrices ----------
  const STATES = [
    ["Default", {}],
    ["Hover", { force: "hover" }],
    ["Focus", { force: "focus" }],
    ["Active", { force: "active" }],
    ["Disabled", { disabled: true }],
    ["Loading", { loading: true }],
  ];
  function buttonMarkup(variant, label, { force, disabled, loading }) {
    const attrs = [
      `class="ks-button ks-button--${variant}"`, 'type="button"',
      force ? `data-force-state="${force}"` : "", disabled ? "disabled" : "", loading ? 'aria-busy="true"' : "",
    ].join(" ");
    const spinner = loading ? '<span class="ks-spinner ks-spinner--sm" aria-hidden="true"></span>' : "";
    return `<button ${attrs}>${spinner}${label}</button>`;
  }
  const LABELS = { primary: "Save note", secondary: "Add photo", ghost: "Cancel", danger: "Delete" };
  $("button-matrix").innerHTML = `<table class="sink-matrix"><thead><tr><th>Variant</th>${STATES.map(([s]) => `<th>${s}</th>`).join("")}</tr></thead><tbody>${
    Object.entries(LABELS).map(([variant, label]) =>
      `<tr><th>${variant}</th>${STATES.map(([, o]) => `<td>${buttonMarkup(variant, label, o)}</td>`).join("")}</tr>`).join("")
  }</tbody></table>`;

  const SEARCH = '<svg class="ks-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
  const ICON_STATES = STATES.filter(([s]) => s !== "Loading");
  $("icon-button-matrix").innerHTML = `<table class="sink-matrix"><thead><tr><th>Variant</th>${ICON_STATES.map(([s]) => `<th>${s}</th>`).join("")}</tr></thead><tbody>${
    ["primary", "secondary", "ghost"].map((variant) =>
      `<tr><th>${variant}</th>${ICON_STATES.map(([s, o]) =>
        `<td><button class="ks-icon-button ks-icon-button--${variant}" type="button" aria-label="Search, ${variant}, ${s.toLowerCase()}" ${o.force ? `data-force-state="${o.force}"` : ""} ${o.disabled ? "disabled" : ""}>${SEARCH}</button></td>`).join("")}</tr>`).join("")
  }</tbody></table>`;

  // ---------- Colour ----------
  const RAMPS = ["brand", "neutral", "success", "warning", "danger", "info"];
  const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  $("color-ramps").innerHTML = RAMPS.map((name) => `
    <div class="sink-ramp__label">${name}</div>
    <div class="sink-ramp">${STEPS.map((s) => `<div class="sink-ramp__step" title="${name} ${s}" style="background:var(--color-palette-${name}-${s})"></div>`).join("")}</div>`).join("");

  function luminance(color) {
    const m = color.match(/#([0-9a-f]{6})/i);
    if (!m) return null;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function ratio(a, b) {
    const [la, lb] = [luminance(a), luminance(b)];
    if (la === null || lb === null) return null;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  // Each row: token, the background it's measured on, the minimum ratio.
  const COLOR_ROWS = [
    ["color-bg-canvas"], ["color-bg-surface"], ["color-bg-raised"], ["color-bg-sunken"], ["color-bg-inverse"],
    ["color-text-default", "color-bg-canvas", 4.5], ["color-text-muted", "color-bg-canvas", 4.5],
    ["color-text-disabled"], ["color-text-inverse", "color-bg-inverse", 4.5], ["color-text-link", "color-bg-canvas", 4.5],
    ["color-border-default"], ["color-border-strong", "color-bg-canvas", 3], ["color-border-focus", "color-bg-canvas", 3],
    ["color-action-primary-fg", "color-action-primary-bg", 4.5], ["color-action-primary-fg", "color-action-primary-bg-hover", 4.5],
    ["color-action-secondary-fg", "color-action-secondary-bg", 4.5], ["color-action-danger-fg", "color-action-danger-bg", 4.5],
    ["color-feedback-success-fg", "color-feedback-success-bg", 4.5], ["color-feedback-warning-fg", "color-feedback-warning-bg", 4.5],
    ["color-feedback-danger-fg", "color-feedback-danger-bg", 4.5], ["color-feedback-info-fg", "color-feedback-info-bg", 4.5],
  ];
  function renderColorTable() {
    const rows = COLOR_ROWS.map(([token, bg, min]) => {
      const value = cssVar(`--${token}`);
      const r = bg ? ratio(value, cssVar(`--${bg}`)) : null;
      const pair = bg
        ? `<span class="sink-pair" style="color:var(--${token});background:var(--${bg})">Aa</span> ${r ? r.toFixed(2) : "?"}:1 on <code>${bg}</code> (min ${min})`
        : "";
      return `<tr><td><span class="sink-swatch" style="background:var(--${token})"></span></td><td><code>${token}</code></td><td><code>${value}</code></td><td>${pair}</td></tr>`;
    }).join("");
    $("color-table").innerHTML = `<thead><tr><th>Swatch</th><th>Token</th><th>Value</th><th>Contrast</th></tr></thead><tbody>${rows}</tbody>`;
  }

  // ---------- Typography, spacing, radius ----------
  const TYPE = [
    ["display", "Field notes for curious people"], ["h1", "Field notes for curious people"], ["h2", "Spring bird survey"],
    ["h3", "North ridge, morning count"], ["h4", "Two pairs nesting"],
    ["body-lg", "Heavy rain after noon cut the count short, so we returned the next morning."],
    ["body", "Heavy rain after noon cut the count short, so we returned the next morning."],
    ["body-sm", "Heavy rain after noon cut the count short, so we returned the next morning."],
    ["label", "Notebook name"], ["caption", "Updated 2 minutes ago"], ["code", "const survey = await notebook.open(20418);"],
  ];
  $("type-samples").innerHTML = TYPE.map(([name, text]) => {
    const v = (p) => cssVar(`--typography-${name}-${p}`);
    return `<div class="sink-type-sample"><div style="font-family:var(--typography-${name}-font-family);font-size:var(--typography-${name}-font-size);font-weight:var(--typography-${name}-font-weight);line-height:var(--typography-${name}-line-height);overflow-wrap:anywhere">${text}</div><div>${name} · ${v("font-size")} · ${v("font-weight")} · ${v("line-height")}</div></div>`;
  }).join("");

  $("space-table").innerHTML = `<thead><tr><th>Token</th><th>Value</th><th>Size</th></tr></thead><tbody>${
    [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((n) =>
      `<tr><td><code>space-${n}</code></td><td><code>${cssVar(`--space-${n}`)}</code></td><td><div class="sink-bar" style="inline-size:var(--space-${n})"></div></td></tr>`).join("")
  }</tbody>`;

  $("radius-samples").innerHTML = ["none", "sm", "md", "lg", "xl", "full", "control"].map((n) =>
    `<div class="sink-box" style="border-radius:var(--radius-${n})">${n} ${cssVar(`--radius-${n}`)}</div>`).join("");

  // ---------- Motion ----------
  const MOTION = [
    ["duration fast", "--motion-duration-fast", "--motion-easing-standard"],
    ["duration base", "--motion-duration-base", "--motion-easing-standard"],
    ["duration slow", "--motion-duration-slow", "--motion-easing-standard"],
    ["easing enter", "--motion-duration-slow", "--motion-easing-enter"],
    ["easing exit", "--motion-duration-slow", "--motion-easing-exit"],
  ];
  $("motion-samples").innerHTML = MOTION.map(([label, d, e], i) => `
    <figure class="sink-sample sink-sample--fill"><figcaption>${label}: ${cssVar(d)}, ${cssVar(e)}</figcaption>
      <div class="sink-motion-track"><div class="sink-motion-dot" id="dot-${i}" style="transition:inset-inline-start var(${d}) var(${e})"></div></div>
      <button class="ks-button ks-button--secondary ks-button--sm" type="button" style="align-self:flex-start" data-dot="dot-${i}">Replay ${label}</button>
    </figure>`).join("");
  document.addEventListener("click", (e) => {
    const dot = e.target.closest("[data-dot]");
    if (dot) $(dot.dataset.dot).classList.toggle("is-end");
    const open = e.target.closest("[data-open]");
    if (open) $(open.dataset.open).showModal();
    const dismiss = e.target.closest("[data-dismiss]");
    if (dismiss) dismiss.closest(".ks-alert").remove();
  });

  // ---------- Remaining interactive samples ----------
  document.querySelectorAll("[data-indeterminate]").forEach((el) => { el.indeterminate = true; });
  $("many-options").innerHTML = Array.from({ length: 40 }, (_, i) => `<option>Notebook ${i + 1}</option>`).join("");
  $("d3-body").textContent = Array(40).fill("Your subscription renews automatically on 14 March unless you cancel it first.").join(" ");

  document.querySelectorAll("[data-tabs]").forEach((group) => {
    const tabs = [...group.querySelectorAll('[role="tab"]:not(:disabled)')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
      });
      group.querySelectorAll('[role="tabpanel"]').forEach((p) => {
        p.hidden = p.id !== tab.getAttribute("aria-controls");
      });
    };
    group.addEventListener("click", (e) => {
      const tab = e.target.closest('[role="tab"]');
      if (tab && !tab.disabled) select(tab);
    });
    group.addEventListener("keydown", (e) => {
      const forward = root.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
      const back = root.dir === "rtl" ? "ArrowRight" : "ArrowLeft";
      if (e.key !== forward && e.key !== back) return;
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const next = tabs[(i + (e.key === forward ? 1 : -1) + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });

  // ---------- Restore saved choices ----------
  const theme = store.get("ks-theme") || "light";
  const dir = store.get("ks-dir") || "ltr";
  $("control-theme").value = theme;
  $("control-direction").value = dir;
  setDirection(dir);
  setTheme(theme);
})();
