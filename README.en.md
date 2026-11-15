# Dix de Der

**English** | [Français](README.fr.md)

Score counter for coinche, contree and classic belote. Installable web app (PWA) that works offline, with no account, no server, no build step and no dependencies. The interface is in French.

**Open the app: https://theochuilo.github.io/dix-de-der/**

## Install on a phone

The app runs in any recent browser. To get an icon on the home screen and full-screen display:

| Phone | Steps |
|---|---|
| Android (Chrome) | Open the link, menu ⋮, then "Installer l'application" or "Ajouter à l'écran d'accueil" |
| iPhone (Safari) | Open the link, Share button, then "Sur l'écran d'accueil" |

Updates are downloaded in the background: open the app, close it and reopen it to get the latest version.

## Features

- Four games on the home screen: Coinche (with announces), Contree (without announces), classic Belote, and "Mes règles", which restores the last set of variants tuned by hand.
- Guided deal entry: taker, contract, suit, then the result. One tap per team for the belote, Capot and Generale keys, coinche and surcoinche, announces.
- Rule variants, changeable before or during a game. Scores are recomputed at once.
- Rules recap generated from the active variants, with worked examples computed by the scoring engine.
- Player and team names, dealer rotation.
- Statistics per team and per player, with a score evolution chart.
- History of the last 50 games, each with its statistics and its deals.
- Score sharing as an image or as text.
- Six colour themes and an option to keep the screen on.
- The home screen, the settings and the deal entry fit a phone screen without scrolling, down to 360x640. Long lists (deals, history) and the statistics page scroll.

## Data and privacy

Everything is stored on the device, in the browser's local storage: current game, history and preferences. Nothing is sent anywhere. As a consequence, games are not synchronised between phones and clearing the site data erases them.

## Run locally

Requires a recent Node.js, only for the dev server and the tests.

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
| `index.html`, `css/styles.css` | Page shell, styles and colour themes |
| `js/scoring.js` | Pure scoring rules (classic belote, coinche, running totals) |
| `js/stats.js` | Per-team and per-player statistics |
| `js/app.js` | UI state, rendering, events |
| `js/chart.js` | SVG score evolution chart |
| `js/share.js` | Score card image (canvas) and sharing |
| `js/store.js` | localStorage persistence |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA: offline cache and install metadata |
| `scripts/` | Dev server and icon generator |
| `tests/` | Scoring and statistics tests |

The UI has no framework: `js/app.js` renders template strings into `#app` and handles clicks through `data-action` attributes. The home screen holds the game choice and the target score; everything else lives in bottom sheets (players, rules, display) or in dedicated views (statistics, history, rules recap).

Code, comments and commit messages are in English. Only the texts shown to players are in French.

## Games and rule variants

The games are declared in `GAMES` (`js/app.js`). Coinche and contree share the same scoring engine and only differ by their default rules: contree turns the announces off.

Every variant lives in `DEFAULT_RULES` (`js/scoring.js`):

| Variant | Choices |
|---|---|
| Counting | Points won + contract, or contract only |
| Rounding | Card points rounded to the nearest ten, or exact |
| Failed contract | The defense scores 160 + contract, or 160 only |
| Coinche | Multiplies the contract or the whole total; winner takes all or each side keeps its points; surcoinche on or off |
| Belote and announces | Count toward the contract or not; announces on or off |
| Bids | No-trump and all-trump, generale, 170 and 180 contracts |
| Classic belote | Tie rule ("litige") on or off |

Colour themes are CSS variable sets in `css/styles.css` (`[data-theme='...']`), listed in `THEMES` in `js/app.js`.

## Scoring rules

Default rules for coinche and contree:

- "Points + contract": a made contract scores the contract plus the points won, the defense scores its own points. A failed contract gives 160 plus the contract to the defense.
- "Contract only": the contract goes to the takers when made, to the defense when failed.
- Coinche (x2) and surcoinche (x4) multiply the contract; the winner of a coinched deal takes everything.
- Capot is a 250 contract, generale a 500 contract.
- An unannounced capot counts 250 card points. An unannounced generale is scored the same way and is labelled as a generale in the deal list.
- Belote (20) always stays with its holder and counts toward the contract, as do the takers' announces.
- With rounding on, the takers' points are rounded to the nearest ten and the defense gets the complement to 160.

Classic belote: the taker must score more than the defense, otherwise the defense scores 162 ("dedans"). A capot is worth 252. On a tie ("litige") the taker's points go to the winner of the next deal.

## Deploying

The site is served by GitHub Pages from the `main` branch: pushing to `main` publishes it. Any other static HTTPS host works too, the folder is served as is.

Bump `CACHE_VERSION` in `sw.js` on each release so installed apps refresh.
