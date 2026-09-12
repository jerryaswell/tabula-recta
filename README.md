# Tabula recta

One tabula recta, eight classical ciphers. Pick a cipher and the table marks every square the
message walks through — numbered in order, with the row and column headers coloured by the role
each letter plays. Hover a square to read off its working, or turn on composing and write a
message by clicking squares instead of typing.

**Live site:** https://jerryaswell.github.io/tabula-recta/

[![Deploy](https://github.com/jerryaswell/tabula-recta/actions/workflows/deploy.yml/badge.svg)](https://github.com/jerryaswell/tabula-recta/actions/workflows/deploy.yml)
[![CI](https://github.com/jerryaswell/tabula-recta/actions/workflows/ci.yml/badge.svg)](https://github.com/jerryaswell/tabula-recta/actions/workflows/ci.yml)

## The ciphers

Every square of the table holds row + column, so for each cipher one of the three letters —
message, key, ciphertext — is the sum of the other two. What changes between them is which letter
sits on which edge, and where the key comes from.

| Cipher                 |                                | Square is     |
| ---------------------- | ------------------------------ | ------------- |
| Trithemius progressive | Polygraphia, 1508 — no key     | message + key |
| Repeating keyword      | Bellaso, 1553 — the "Vigenère" | message + key |
| Plaintext autokey      | Vigenère, 1586                 | message + key |
| Ciphertext autokey     | weaker autokey variant         | message + key |
| Beaufort               | sold as a slide, 1850s         | key − message |
| Variant Beaufort       | message minus key              | message − key |
| Gronsfeld              | numeric key, 0–9               | message + key |
| Running key            | book or passage as key         | message + key |

## Working on it

Node 20 or newer (the version in `.nvmrc` is what CI uses).

```sh
npm install
npm run dev        # http://localhost:3000, reloads on save
npm run build      # writes dist/
npm run preview    # serves the built dist/ on http://localhost:4173
npm run check      # lint, formatting, unit tests, build — what CI runs
```

Tests:

```sh
npm run test:unit  # the cipher logic and the build output, via node --test
npm run test:e2e   # the built page driven in Chromium, via Playwright
npm run test:a11y  # just the axe-core audit, part of test:e2e
npm test           # both
```

The browser suite includes an axe-core audit of the page cold, with a cipher marked up, while
composing, and of the 404 — held to WCAG 2.2 A and AA.

`npm run test:e2e` builds the site and serves `dist/` itself, so it always runs against the real
output rather than the sources. First run needs a browser: `npx playwright install chromium`.

## Layout

```
src/index.html     the page, linking styles.css and main.js
src/styles.css     all of the styling
src/main.js        the DOM: drawing the table, marking it, hover, composing
src/lib/           the parts worth testing on their own
  alphabet.js      letters to indices and back
  ciphers.js       the eight cipher definitions and the square arithmetic
  run.js           working a message through a cipher
public/            copied into the site as-is (favicon, 404, robots.txt)
scripts/build.mjs  the build
scripts/dev.mjs    the development server
test/unit/         node --test suites
test/e2e/          Playwright suites
```

The build bundles `src/main.js` and `src/styles.css` with esbuild and inlines both into
`index.html`, so the published page is a single self-contained file: one request, no runtime
dependencies, and a file you can save and open offline. During development nothing is bundled —
`npm run dev` serves `src/` and `public/` directly and the browser loads the modules itself, so
what you edit is what you see.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, tests, builds, and publishes
`dist/` to GitHub Pages. Every other branch and every pull request runs `.github/workflows/ci.yml`
instead, which does everything but publish.

The repository needs Pages pointed at the workflow once, under **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

Asset paths in the page are relative, so it serves correctly from the project subpath
(`jerryaswell.github.io/tabula-recta/`) as well as from a domain root. To move it to a custom
domain, add a `CNAME` file containing the bare hostname to `public/` — it is copied into the site
like everything else there — and set the domain under **Settings → Pages → Custom domain**.
