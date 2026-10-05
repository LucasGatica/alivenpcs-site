// Shared by every page: language switch (pt / en), config links and cookieless analytics.
(function () {
  const cfg = window.ALIVE_SITE || {};
  const root = document.documentElement;
  const KEY = "alivenpcs-lang";

  function readStored() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  function store(value) {
    try { localStorage.setItem(KEY, value); } catch { /* private mode: the choice just isn't remembered */ }
  }
  function normalize(value) {
    if (!value) return null;
    value = value.toLowerCase();
    if (value === "pt" || value === "pt-br") return "pt";
    if (value === "en") return "en";
    return null;
  }

  let lang = normalize(new URLSearchParams(location.search).get("lang"))
    || normalize(readStored())
    || ((navigator.language || "").toLowerCase().startsWith("pt") ? "pt" : "en");

  function apply(next) {
    lang = next;
    root.dataset.lang = next;
    root.lang = next === "pt" ? "pt-BR" : "en";
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.set === next)));
    document.querySelectorAll("[data-alt-pt]").forEach((el) => { el.alt = el.dataset["alt" + (next === "pt" ? "Pt" : "En")]; });
    const title = document.querySelector('meta[name="title-' + next + '"]');
    if (title) document.title = title.content;
    document.dispatchEvent(new CustomEvent("alive:lang", { detail: next }));
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".lang button");
    if (!button || button.dataset.set === lang) return;
    store(button.dataset.set);
    apply(button.dataset.set);
  });

  // Links kept in config.js, so a changed URL is edited once.
  document.querySelectorAll("[data-href]").forEach((a) => {
    if (cfg[a.dataset.href]) a.href = cfg[a.dataset.href];
  });

  // Analytics: GoatCounter counts visits without cookies; its dashboard shows pages, referrers and countries.
  const pending = [];
  let ready = false;
  if (cfg.goatcounter) {
    window.goatcounter = { no_onload: true };
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.dataset.goatcounter = "https://" + cfg.goatcounter + ".goatcounter.com/count";
    script.onload = () => {
      ready = true;
      pending.splice(0).forEach((hit) => window.goatcounter.count(hit));
    };
    document.head.appendChild(script);
    document.querySelectorAll("[data-analytics-note]").forEach((el) => { el.hidden = false; });
  }

  function count(path, title) {
    if (!cfg.goatcounter) return;
    const hit = { path, title: title || document.title };
    if (ready && window.goatcounter && window.goatcounter.count) window.goatcounter.count(hit);
    else pending.push(hit);
  }

  window.AliveSite = {
    get lang() { return lang; },
    fileLang() { return lang === "pt" ? "pt-BR" : "en"; },
    count
  };

  apply(lang);
})();
