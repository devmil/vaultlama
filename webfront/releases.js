// Renders downloads and release notes from the release index in
// _data/releases.json, in the same format as GitLama's (schema_version,
// product, latest, releases; each asset has platform, format, file,
// architecture, minimum_system, bytes, sha256 and url). Until a release
// exists the index lists none, and the page keeps its "no release" state.
// Every value reaches the page through textContent, and a link is rendered
// only for an unauthenticated https://github.com/ URL. Labels follow the
// language switch (language.js); release notes are shown as the index
// carries them.
(function () {
  "use strict";

  const t = (en, de) => (window.VaultLamaLanguage ? window.VaultLamaLanguage.pick(en, de) : en);

  const status = document.getElementById("release-status");
  const downloads = document.getElementById("download-grid");
  const releaseBar = document.getElementById("release-bar");
  const releaseList = document.getElementById("release-list");

  const formats = {
    android: ["apk"],
    macos: ["dmg"],
    windows: ["msi", "exe"],
    linux: ["flatpak", "AppImage", "deb", "rpm", "tar.gz"],
  };
  const order = ["apk", "dmg", "msi", "exe", "flatpak", "AppImage", "deb", "rpm", "tar.gz"];
  const platforms = {
    android: { label: "Android", icon: "smartphone" },
    macos: { label: "macOS", icon: "monitor" },
    windows: { label: "Windows", icon: "monitor" },
    linux: { label: "Linux", icon: "monitor" },
  };
  const packages = {
    apk: ["Android package", "Android-Paket"],
    dmg: ["Disk image", "Disk-Image"],
    msi: ["Installer", "Installationsprogramm"],
    exe: ["Installer", "Installationsprogramm"],
    flatpak: ["Flatpak", "Flatpak"],
    AppImage: ["AppImage", "AppImage"],
    deb: ["DEB package", "DEB-Paket"],
    rpm: ["RPM package", "RPM-Paket"],
    "tar.gz": ["Tarball", "Tarball"],
  };

  function validAsset(a) {
    if (!a || typeof a !== "object" || !Object.hasOwn(formats, a.platform)
        || !formats[a.platform].includes(a.format) || typeof a.url !== "string"
        || typeof a.file !== "string") return false;
    try {
      const u = new URL(a.url);
      return u.protocol === "https:" && !u.username && !u.password && u.hostname === "github.com";
    } catch (_) {
      return false;
    }
  }

  function valid(d) {
    return d && d.schema_version === 1 && d.product === "VaultLama" && d.latest
      && Array.isArray(d.latest.assets) && d.latest.assets.length > 0
      && d.latest.assets.every(validAsset)
      && Array.isArray(d.releases) && d.releases.length > 0 && d.releases.length <= 10;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    const node = element("span", "icon");
    node.style.setProperty("--icon", `url(assets/icons/${name}.svg)`);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function megabytes(bytes) {
    return Number.isFinite(bytes) ? `${(bytes / 1048576).toFixed(1)} MB` : "";
  }

  function copyChecksum(button, asset) {
    const restore = () => { button.textContent = "SHA-256"; };
    const done = (text) => { button.textContent = text; setTimeout(restore, 1600); };
    if (!navigator.clipboard) { window.prompt("SHA-256", asset.sha256); return; }
    navigator.clipboard.writeText(asset.sha256).then(() => done(t("Copied", "Kopiert")), () => done(t("Failed", "Fehlgeschlagen")));
  }

  function assetRow(asset) {
    const row = element("li", "asset");
    const text = element("span");
    const name = element("a", "asset-name", t(...packages[asset.format]));
    name.href = asset.url;
    name.rel = "noopener";
    name.setAttribute("aria-label", t(`Download ${asset.file}`, `${asset.file} herunterladen`));
    text.append(name);
    const meta = element("span", "asset-meta",
      [`.${asset.format}`, asset.architecture, megabytes(asset.bytes)].filter(Boolean).join(" · "));
    const tail = element("span", "asset-tail");
    if (/^[0-9a-f]{64}$/.test(asset.sha256 || "")) {
      const sha = element("button", "sha", "SHA-256");
      sha.type = "button";
      sha.title = asset.sha256;
      sha.setAttribute("aria-label", t(`Copy the SHA-256 checksum of ${asset.file}`, `SHA-256-Prüfsumme von ${asset.file} kopieren`));
      sha.addEventListener("click", () => copyChecksum(sha, asset));
      tail.append(sha);
    }
    const get = element("span", "asset-get");
    get.append(icon("download"));
    tail.append(get);
    row.append(text, meta, tail);
    return row;
  }

  // German text from the static page is replaced by release text here.
  function own(node) {
    if (!node) return node;
    delete node.dataset.de;
    delete node.dataset.en;
    return node;
  }

  function renderDownloads(r) {
    releaseBar.textContent = "";
    downloads.textContent = "";
    status.hidden = true;

    const notes = element("a", "", t("Release notes", "Versionshinweise"));
    notes.href = "releases.html";
    releaseBar.append(element("span", "chip", r.version),
      element("span", "", t(`Build ${r.build} · ${r.channel} channel`, `Build ${r.build} · Kanal ${r.channel}`)), notes);
    releaseBar.hidden = false;

    downloads.hidden = false;
    for (const platform of Object.keys(platforms)) {
      const assets = r.assets.filter((a) => a.platform === platform);
      if (!assets.length) continue;
      const card = element("article", "platform");
      const head = element("div", "platform-head");
      const mark = element("span", "platform-mark");
      mark.append(icon(platforms[platform].icon));
      const title = element("div");
      title.append(element("h3", "", platforms[platform].label), element("p", "", assets[0].minimum_system || ""));
      head.append(mark, title);
      const list = element("ul", "assets");
      assets.slice().sort((a, b) => order.indexOf(a.format) - order.indexOf(b.format))
        .forEach((asset) => list.append(assetRow(asset)));
      card.append(head, list);
      downloads.append(card);
    }
    const headerRelease = document.getElementById("header-release");
    if (headerRelease) own(headerRelease.lastElementChild).textContent = r.version;
  }

  function renderNotes(releases) {
    releaseList.textContent = "";
    for (const r of releases) {
      const record = element("article", "release-record");
      record.append(element("h2", "", t(`${r.version} · build ${r.build}`, `${r.version} · Build ${r.build}`)),
        element("p", "", `${r.channel} · ${r.tag}`));
      if (Array.isArray(r.notes) && r.notes.length) {
        const list = element("ul");
        r.notes.forEach((note) => list.append(element("li", "", note)));
        record.append(list);
      }
      const assets = Array.isArray(r.assets) ? r.assets.filter(validAsset) : [];
      assets.sort((a, b) => order.indexOf(a.format) - order.indexOf(b.format));
      if (assets.length) {
        const links = element("div", "formats");
        assets.forEach((asset) => {
          const anchor = element("a", "", `${platforms[asset.platform].label} .${asset.format}`);
          anchor.href = asset.url;
          anchor.rel = "noopener";
          links.append(anchor);
        });
        record.append(links);
      }
      releaseList.append(record);
    }
  }

  let index = null;
  let settled = false;

  function render() {
    if (!settled) return;
    if (index) {
      if (downloads) renderDownloads(index.latest);
      if (releaseList) renderNotes(index.releases);
    } else if (releaseList) {
      releaseList.textContent = t("No public release yet. VaultLama is in early development.",
        "Noch keine öffentliche Version. VaultLama ist in früher Entwicklung.");
    }
  }

  document.addEventListener("vaultlama:language", render);

  fetch("_data/releases.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("unavailable");
      return response.json();
    })
    .then((data) => {
      if (!valid(data)) throw new Error("no release");
      index = data;
    })
    .catch(() => {
      index = null;
    })
    .finally(() => {
      settled = true;
      render();
    });
})();
