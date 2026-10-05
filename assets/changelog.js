// Changelog page: version list from changelog/versions.json, one HTML fragment per version and language
// (changelog/<version>/<pt-BR|en>.html). The URL keeps ?v=<version>&lang=<pt|en> so links can be shared.
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

  const wanted = new URLSearchParams(location.search).get("v");
  let current = versions.some((v) => v.version === wanted) ? wanted : versions[0].version;

  function formatDate(iso, lang) {
    if (!iso) return "";
    return new Date(iso + "T12:00:00").toLocaleDateString(LOCALES[lang], { day: "numeric", month: "short", year: "numeric" });
  }

  function renderList() {
    const lang = site.lang;
    list.replaceChildren();
    select.replaceChildren();
    for (const v of versions) {
      const status = v.status === "in-development" ? TEXT[lang].dev : TEXT[lang].released;
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "?v=" + encodeURIComponent(v.version);
      a.dataset.v = v.version;
      if (v.version === current) a.setAttribute("aria-current", "true");
      const number = document.createElement("b");
      number.textContent = v.version;
      const name = document.createElement("span");
      name.textContent = v.name + (v.date ? " · " + formatDate(v.date, lang) : "");
      const chip = document.createElement("span");
      chip.className = "status" + (v.status === "in-development" ? " dev" : "");
      chip.textContent = status;
      a.append(number, name, chip);
      li.append(a);
      list.append(li);

      const option = document.createElement("option");
      option.value = v.version;
      option.textContent = v.version + " · " + v.name + " (" + status + ")";
      option.selected = v.version === current;
      select.append(option);
    }
  }

  async function load(push) {
    const lang = site.lang;
    const file = site.fileLang();
    renderList();
    entry.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("changelog/" + encodeURIComponent(current) + "/" + file + ".html", { cache: "no-cache" });
      if (!response.ok) throw new Error(String(response.status));
      entry.innerHTML = await response.text();
    } catch {
      entry.innerHTML = '<p class="notice-box"></p>';
      entry.firstChild.textContent = TEXT[lang].missing;
    }
    entry.removeAttribute("aria-busy");

    const url = new URL(location.href);
    url.searchParams.set("v", current);
    url.searchParams.set("lang", lang);
    history[push ? "pushState" : "replaceState"]({ v: current }, "", url);
    document.title = "AliveNpcs " + current + " · Changelog";
    site.count("/changelog/" + current + "/" + file, "Changelog " + current + " (" + file + ")");

    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }

  list.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-v]");
    if (!link) return;
    event.preventDefault();
    if (link.dataset.v === current) return;
    current = link.dataset.v;
    history.replaceState(history.state, "", location.pathname + location.search);
    load(true);
    window.scrollTo(0, 0);
  });
  select.addEventListener("change", () => {
    current = select.value;
    load(true);
  });
  document.addEventListener("alive:lang", () => load(false));
  window.addEventListener("popstate", () => {
    const v = new URLSearchParams(location.search).get("v");
    if (v && versions.some((x) => x.version === v)) {
      current = v;
      load(false);
    }
  });

  load(false);
})();
