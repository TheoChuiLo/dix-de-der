# Dix de Der

Score counter for classic belote and coinche/contree. Installable web app (PWA), works offline, no build step and no dependencies. The interface is in French.

## Run locally

```bash
npm start
```

Then open http://localhost:8795. The service worker is disabled on localhost to avoid stale files during development; append `?sw` to the URL to test offline mode.

## Tests

```bash
npm test
```

Covers the scoring engine (`js/scoring.js`) and the statistics (`js/stats.js`).

## Structure

| Path | Role |
|---|---|
| `index.html`, `css/styles.css` | Page shell and card-table theme |
| `js/scoring.js` | Pure scoring rules (classic belote, coinche, running totals) |
| `js/stats.js` | Per-team and per-player statistics |
| `js/app.js` | UI state, rendering, events |
| `js/chart.js` | SVG score evolution chart |
| `js/share.js` | Score card image (canvas) and sharing |
| `js/store.js` | localStorage persistence |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA: offline cache and install metadata |
| `scripts/` | Dev server and icon generator |

## Scoring rules

Coinche / contree (options are chosen when starting a game and can be changed from the menu):

- "Points + contract": a made contract scores the contract plus the points won, the defense scores its own points. A failed contract gives 160 plus the contract to the defense.
- "Contract only": the contract goes to the takers when made, to the defense when failed.
- Coinche (x2) and surcoinche (x4) multiply the contract; the winner of a coinched deal takes everything.
- Capot is a 250 contract, generale a 500 contract. An unannounced capot counts 250 card points.
- Belote (20) always stays with its holder and counts toward the contract, as do the takers' announces.
- With rounding on, the takers' points are rounded to the nearest ten and the defense gets the complement to 160.

Classic belote: the taker must score more than the defense, otherwise the defense scores 162 ("dedans"). A capot is worth 252. On a tie ("litige") the taker's points go to the winner of the next deal.

## Deploying

Any static HTTPS host works (the folder is served as is). Bump `CACHE_VERSION` in `sw.js` on each release so installed apps refresh.
