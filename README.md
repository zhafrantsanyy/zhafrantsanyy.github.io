# zhafrantsanyy.github.io

Personal portfolio for **Muhammad Zhafran Tsany**, SEO strategist and automation builder based in Bekasi, Indonesia.

Live at **https://zhafrantsanyy.github.io**

> Organic growth, engineered.

## What's on the page

| # | Section | What it does |
| --- | --- | --- |
| 01 | Hero | Kinetic headline over a live **rank tracker**: every line is a keyword cluster from a case study. Hover a line to see the cluster, click it to open the case. |
| 02 | About | A statement that lights up word by word as you scroll, portrait with a clip reveal and parallax, facts and skills |
| 03 | Selected work | Eight case studies (nine brands). On desktop a preview card follows the cursor; every row opens a full case study with its own animated chart |
| 04 | The engine | A pinned, scroll-driven walkthrough of the programmatic content engine, with a live simulation: drafts flow through the quality gate, failures loop back for a rewrite |
| 05 | Shipped | The four public repositories as stacking cards, each with generative artwork |
| 06 | Experience | Expandable timeline with a scroll-linked progress rail |
| 07 | Capabilities | What I do, plus translation, localization and outreach work |
| 08 | Impact | Odometer counters and the CV / portfolio downloads |
| 09 | Contact | Email, WhatsApp, LinkedIn, GitHub, copy-to-clipboard |

Also: a **command palette** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> or <kbd>/</kbd>) that searches every case study, role and project and ranks the results like a SERP, a light and dark theme with a circular reveal, a pause-animations toggle, and a 404 page that doesn't rank.

## Stack

Plain HTML, CSS and JavaScript. No framework and no build step: GitHub Pages serves the files exactly as committed.

- **Motion**: a small in-house toolkit (`assets/js/motion.js`) with one `requestAnimationFrame` ticker, word-split reveals, scroll-lit text, odometers, a velocity-reactive marquee, parallax, stacking cards and a scroll-linked footer wordmark
- **Smooth scrolling**: [Lenis](https://github.com/darkroomengineering/lenis) 1.3 (MIT), vendored in `assets/js/vendor/`. Desktop with a mouse only; touch devices and reduced motion keep native scrolling
- **Visuals**: canvas for the hero rank tracker, generated SVG for the case-study charts, project artwork and the engine simulation (`assets/js/visuals.js`)
- **Type**: Bricolage Grotesque (display), Instrument Serif italic (accents), Inter (text) and Geist Mono (labels), all self-hosted woff2 under the SIL Open Font License (see `assets/fonts/OFL.txt`)
- **Theme**: colours are CSS custom properties at the top of `style.css`, with a dark and a light set. The choice follows the system setting until a visitor picks one

## Accessibility and performance

- Content lives in the HTML, so every case study is crawlable and readable without JavaScript
- `prefers-reduced-motion` is respected, and the header toggle pauses all motion for anyone (WCAG 2.2.2): no smooth scroll, no reveals, simulations freeze on a finished frame
- Native `<dialog>` for the case studies and palette (focus handling, <kbd>Esc</kbd>), `inert` page behind the mobile menu, keyboard navigation everywhere, visible focus rings
- Text and graphics meet WCAG AA contrast in both themes (checked with axe-core: zero violations)
- Canvas and simulations only run while on screen; animation is transform and opacity only
- Fonts preloaded, images sized to avoid layout shift, one stylesheet, four small scripts loaded with `defer`
- SEO: `ProfilePage` + `Person` JSON-LD, Open Graph and Twitter cards, `rel="me"` links, canonical URL, sitemap with image entry, `robots.txt`

## Structure

```
.
├── index.html
├── 404.html                 served by GitHub Pages for unknown URLs
├── site.webmanifest
├── assets/
│   ├── css/style.css
│   ├── js/
│   │   ├── vendor/lenis.min.js
│   │   ├── motion.js        motion toolkit (ticker, reveals, scroll scenes)
│   │   ├── visuals.js       rank tracker, charts, artwork, engine simulation
│   │   └── app.js           wires the page: theme, menu, cases, palette...
│   ├── fonts/               woff2 files + OFL.txt
│   ├── img/                 photos, icons, og.jpg
│   └── docs/                CV and portfolio PDFs
├── .nojekyll                serve files as-is, skip Jekyll processing
├── robots.txt
└── sitemap.xml
```

## Running it locally

Serve the folder (the fonts and scripts need HTTP, not `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publishing

Push to `main`, then in **Settings → Pages** choose *Deploy from a branch* → `main` → `/ (root)`. The site updates within a minute or two.

## Updating content

- **Text and sections**: `index.html`. Every section is a plain `<section>`.
- **A case study**: copy one `<li class="case">` block in `#cases`. The row is the summary; the `<article class="case-body">` inside it is what the dialog shows. Its chart is picked by `data-visual` (functions in `visuals.js`, under `V.<name>`).
- **Hero rank-tracker lines**: the `clusters` list in `app.js` (label, client, metric and which case it opens).
- **Numbers that roll**: any element with `data-odo`; write the final value as its text, for example `<span data-odo>432K</span>`.
- **Colours and spacing**: the custom properties at the top of `assets/css/style.css`.
- **Documents**: replace the PDFs in `assets/docs/` keeping the same filenames.
- **Photo**: replace `assets/img/zhafran-portrait.jpg` / `.webp` (4:5) and `zhafran-square.jpg` (1:1, used in the contact heading and structured data).
- **Social preview**: `assets/img/og.jpg` is 1200 × 630.

## License

Code is MIT. Written content, photos, CV and portfolio documents are © Muhammad Zhafran Tsany. Fonts are under the SIL Open Font License 1.1 and Lenis under MIT.
