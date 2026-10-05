// Changelog page. changelog/versions.json lists one entry per version line (1.N.x), newest first:
//   { version: folder name, label: "1.3", name: text or {pt-BR, en, es}, patches: ["1.3.4", ...], date, status, summary }
// Each line has one HTML fragment per language in changelog/<version>/<pt-BR|en|es>.html, with one
// section per patch whose id is "v" + the patch number with dashes (v1-3-2).
// ?v= takes a line (1.3), an old folder name (1.6.0) or a patch (1.3.2, which also scrolls to it).
(async function () {
  const site = window.AliveSite;
  const entry = document.getElementById("entry");
  const list = document.getElementById("versions");
  const select = document.getElementById("version-select");

  const TEXT = {
    pt: {
      dev: "Em desenvolvimento",
      released: "Lançada",
      missing: "Esta versão ainda não tem changelog em português.",
      failed: "Não deu pra carregar a lista de versões. Recarregue a página."
    },
    en: {
      dev: "In development",
      released: "Released",
      missing: "This version doesn't have an English changelog yet.",
      failed: "The version list couldn't load. Reload the page."
    },
    es: {
      dev: "En desarrollo",
      released: "Publicada",
      missing: "Esta versión todavía no tiene changelog en español.",
      failed: "No se pudo cargar la lista de versiones. Recarga la página."
    }
  };
  const LOCALES = { pt: "pt-BR", en: "en-US", es: "es-ES" };

  let versions;
  try {
    versions = await (await fetch("changelog/versions.json", { cache: "no-cache" })).json();
  } catch {
    entry.innerHTML = '<p class="notice-box"></p>';
    entry.firstChild.textContent = TEXT[site.lang].failed;
    return;
  }

  const labelOf = (v) => v.label || v.version;
  const nameOf = (v) => (typeof v.name === "string" ? v.name : v.name[site.fileLang()] || v.name.en || "");
  const anchorOf = (patch) => "v" + patch.replace(/\./g, "-");

  // A line, an old folder name or a single patch → the line, plus the patch to scroll to.
  function resolve(wanted) {
    if (!wanted) return null;
    for (const v of versions) {
      if (v.version === wanted || labelOf(v) === wanted) return { line: v, patch: null };
      if ((v.patches || []).includes(wanted)) return { line: v, patch: v.patches.length > 1 ? wanted : null };
    }
    return null;
  }

  const first = resolve(new URLSearchParams(location.search).get("v"));
  let current = first ? first.line : versions[0];
  let scrollTo = first ? first.patch : null;

  function formatDate(iso, lang) {
    if (!iso) return "";
    return new Date(iso + "T12:00:00").toLocaleDateString(LOCALES[lang], { day: "numeric", month: "short", year: "numeric" });
  }

  function range(v) {
    const p = v.patches || [];
    return p.length > 1 ? p[p.length - 1] + " – " + p[0] : "";
  }

  function renderList() {
    const lang = site.lang;
    list.replaceChildren();
    select.replaceChildren();
    for (const v of versions) {
      const status = v.status === "in-development" ? TEXT[lang].dev : TEXT[lang].released;
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "?v=" + encodeURIComponent(labelOf(v));
      a.dataset.v = v.version;
      if (v === current) a.setAttribute("aria-current", "true");
      const number = document.createElement("b");
      number.textContent = labelOf(v);
      const name = document.createElement("span");
      name.textContent = nameOf(v) + (v.date ? " · " + formatDate(v.date, lang) : "");
      a.append(number, name);
      if (range(v)) {
        const patches = document.createElement("span");
        patches.className = "patches";
        patches.textContent = range(v);
        a.append(patches);
      }
      const chip = document.createElement("span");
      chip.className = "status" + (v.status === "in-development" ? " dev" : "");
      chip.textContent = status;
      a.append(chip);
      li.append(a);
      list.append(li);

      const option = document.createElement("option");
      option.value = v.version;
      option.textContent = labelOf(v) + " · " + nameOf(v) + " (" + status + ")";
      option.selected = v === current;
      select.append(option);
    }
  }

  async function load(push) {
    const lang = site.lang;
    const file = site.fileLang();
    renderList();
    entry.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("changelog/" + encodeURIComponent(current.version) + "/" + file + ".html", { cache: "no-cache" });
      if (!response.ok) throw new Error(String(response.status));
      entry.innerHTML = await response.text();
    } catch {
      entry.innerHTML = '<p class="notice-box"></p>';
      entry.firstChild.textContent = TEXT[lang].missing;
    }
    entry.removeAttribute("aria-busy");

    const label = labelOf(current);
    const url = new URL(location.href);
    url.searchParams.set("v", scrollTo || label);
    url.searchParams.set("lang", lang);
    history[push ? "pushState" : "replaceState"]({ v: label }, "", url);
    document.title = "AliveNpcs " + label + " · Changelog";
    site.count("/changelog/" + label + "/" + file, "Changelog " + label + " (" + file + ")");

    const target = scrollTo ? anchorOf(scrollTo) : location.hash ? decodeURIComponent(location.hash.slice(1)) : null;
    if (target) document.getElementById(target)?.scrollIntoView();
  }

  function show(line, push) {
    current = line;
    scrollTo = null;
    history.replaceState(history.state, "", location.pathname + location.search);
    load(push);
    window.scrollTo(0, 0);
  }

  list.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-v]");
    if (!link) return;
    event.preventDefault();
    const line = versions.find((v) => v.version === link.dataset.v);
    if (line && line !== current) show(line, true);
  });
  select.addEventListener("change", () => {
    const line = versions.find((v) => v.version === select.value);
    if (line) show(line, true);
  });
  document.addEventListener("alive:lang", () => {
    scrollTo = null;
    load(false);
  });
  window.addEventListener("popstate", () => {
    const found = resolve(new URLSearchParams(location.search).get("v"));
    if (found) {
      current = found.line;
      scrollTo = found.patch;
      load(false);
    }
  });

  load(false);
})();
