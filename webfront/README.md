# VaultLama public website

Run `python3 -m http.server 4320 --directory webfront` and open
`http://localhost:4320`. The site is plain HTML, CSS and JavaScript with no
build step, analytics, cookies or third-party requests. It is published at
`https://devmil.de/vaultlama/`.

## Content

The page follows the VaultLama brand of Meridian (light and dark from
`prefers-color-scheme`): midnight islands on a cool ground, one
midnight-violet accent for intent and the pale-brass key of the app icon.
Danger, warning and attention colours are not used for decoration. The
ivory Lama appears only on the brand ground (hero stage, privacy and status
islands); the footer carries the single-ink signature.

Copy stays honest: VaultLama is in its foundation phase, nothing is released,
no vault feature exists and there has been no security audit. Every feature
and platform is marked *Planned*, milestones are ordered by dependency with
no dates, and the page says plainly that it is not ready for real
credentials. VaultLama is independent and not affiliated with or endorsed by
Bitwarden, Inc. or the Vaultwarden project; the site never uses their marks.
Product facts come from `docs/VISION.md`, `docs/MISSION.md`,
`docs/REQUIREMENTS.md` and `docs/SECURITY_MODEL.md`; keep them in step.

`site.js` runs the hero scene. The Lama stands on its key, which runs into a
vault door. Every few seconds a masked vault item (a login, a note or a card,
shown only as dots or lines) slides along the key into the vault. The Lama
clears wide items with a jump and rears up to hurdle narrow ones, turns to
watch the item go in, and the door's wheel turns to lock it; a small counter
shows the items stored. Items start only while the Lama is free of a
visitor's tap gag; idle tricks and naps give way. The shared `hurdle()`
plays its keys under one ease-in-out curve, so `site.js` places the keys
through that curve to lift the legs while the item is under them. Reduced
motion stops autoplay and scene reactions; a tap then only changes the pose.
Nothing in the scene is a real or realistic secret.

## Languages and legal pages

English is the source text in the HTML. `language.js` swaps the main pages
(index, release notes) to German in place: an element with `data-de` holds
its German text (plain text only), and `data-de-<attribute>` a German
`aria-label`, `alt`, `title`, `content` or `href`. `--check` fails when a
visible string or label on those pages has no German text; names carry
`translate="no"`. Text that `site.js` and `releases.js` write picks its
language through `VaultLamaLanguage.pick(en, de)` and follows the
`vaultlama:language` event. The choice is stored in `localStorage` under
`preferred-language`, shared by every Devmil site on `devmil.de`; without
one, a German browser language picks German. German copy uses "du"
throughout, legal pages included.

The imprint and privacy policy are static files per language: `imprint.html`
and `privacy.html` in English, `de/imprint.html` and `de/privacy.html` in
German. Their switch links to the counterpart and stores the choice; they
never redirect. The contact address appears only as an obfuscated
`.contact-email` span that `language.js` turns into a link assembled on
click. Keep section 6 of the privacy policy in step with the app: it states
that the current builds make no internet connections and store no vault
data.

## Downloads

`releases.js` reads `_data/releases.json` in GitLama's release-index format
(`schema_version`, `product`, `latest`, `releases`; each asset has
`platform`, `format`, `file`, `architecture`, `minimum_system`, `bytes`,
`sha256`, `url`). The committed index lists no release, so the page says so.
Links are rendered only for unauthenticated `https://github.com/` URLs.
Supported formats: Android `apk`, macOS `dmg`, Windows `msi` or `exe`, Linux
`flatpak`, `AppImage`, `deb`, `rpm`, `tar.gz`.

## Assets

`python3 scripts/generate_website.py` copies brand-derived files (Lama poses,
`lama-antics.js/.css`, app icons, feature graphic) from `resources/brand`,
`assets/brand` and `resources/marketing`, and writes `?v=<digest>` on every
local asset reference in the pages and `style.css`. Never edit the copies or
the versions by hand. `--check` verifies them, the marketing pin, the
ownership markers, the release index, legal links, the sitemap, German text,
that every local reference resolves, that nothing loads from another origin
and that no internal host appears. Icons in `assets/icons/` are Lucide from
Meridian 1.10.0 (`lucide-static` 1.37.0, ISC, `assets/icons/LICENSE`).
`JetBrainsMono-Regular.woff2` is the Latin subset used by the other Lama
sites (OFL).

## Publication

Forgejo is authoritative and the public GitHub repository is a mirror.
`.forgejo/workflows/sync-website.yml` runs on pushes to `main` that touch
the site. It checks the site, then `scripts/sync_website.py publish` mirrors
`webfront/` into the `webfront/` directory of `GH_REPO_URL` (owner/name)
with `GH_SYNC_TOKEN`, together with `.github/workflows/vaultlama-pages.yml`,
which deploys it with GitHub Pages. The mirror owns only the files recorded
in `.vaultlama-managed-files.json` in a directory carrying the exact
`.vaultlama-site-owner` marker, and a Pages workflow carrying its ownership
line. It never force-pushes. GitHub Pages must deploy from GitHub Actions in
the mirror's settings.
