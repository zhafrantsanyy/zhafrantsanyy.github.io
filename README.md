# zhafrantsanyy.github.io

Personal portfolio site for **Muhammad Zhafran Tsany** — SEO strategist and automation builder based in Bekasi, Indonesia.

Live at **https://zhafrantsanyy.github.io**

## What's here

| Section | Content |
| --- | --- |
| Hero | Intro, rotating role line, live stat card |
| About | Bio and grouped skills |
| Experience | Interactive timeline — Adna Group, Traveloka, SIMAKARA, DMB.SG, HashMicro |
| Projects | Four public repositories, filterable by stack |
| Impact | Animated SEO result counters + CV and portfolio downloads |
| Contact | Email, WhatsApp, LinkedIn, GitHub |

## Stack

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies — the whole site is three files plus assets, so GitHub Pages serves it exactly as committed.

- **Fonts** — Inter and JetBrains Mono, self-hosted as `.woff2` in `assets/fonts/` (no Google Fonts request at runtime)
- **Photo** — served as WebP with a JPEG fallback via `<picture>`, preloaded so the hero card paints without a flash
- **Background** — canvas constellation that reacts to the pointer, plus CSS aurora blobs
- **Interactions** — scroll progress, scroll-spy nav, reveal-on-scroll, animated counters, card spotlight and tilt, magnetic buttons, project filters, copy-to-clipboard email
- **Accessibility** — skip link, visible focus rings, `aria-expanded` on the accordion and mobile menu, full `prefers-reduced-motion` fallback (animations and canvas are disabled)
- **SEO** — semantic headings, Open Graph and Twitter cards, JSON-LD `Person` schema, `robots.txt`, `sitemap.xml`

## Structure

```
.
├── index.html
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   ├── fonts/           Inter 400–700, JetBrains Mono 400–500 (woff2)
│   ├── img/             photo (jpg + webp), favicon.svg, og.jpg
│   └── docs/            CV and portfolio PDFs
├── .nojekyll            serve files as-is, skip Jekyll processing
├── robots.txt
└── sitemap.xml
```

## Running it locally

No build step. Open `index.html` directly, or serve the folder so the font files load over HTTP:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Publishing

Push to the `main` branch of `zhafrantsanyy/zhafrantsanyy.github.io`, then in **Settings → Pages** set the source to *Deploy from a branch* → `main` → `/ (root)`. The site is live at the repository URL within a minute or two.

## Updating content

- **Text and sections** — `index.html`; every section is a plain `<section>` block
- **Colours and spacing** — the CSS custom properties at the top of `assets/css/style.css`
- **Rotating hero words** — the `words` array in `assets/js/main.js`
- **Documents** — replace the PDFs in `assets/docs/`, keeping the same filenames so the links stay valid
- **Photo** — replace `assets/img/zhafran.jpg` / `.webp` (4:3) and regenerate `assets/img/og.jpg` (1200×630) if the social preview should match

## License

Code is MIT. Written content, CV and portfolio documents are © Muhammad Zhafran Tsany.
