// Dix de Der: UI state, rendering and event handling.
// User-facing strings are in French (the app targets French-speaking players).

import {
  ANNOUNCE_POINTS,
  DEFAULT_RULES,
  EXTENDED_CONTRACTS,
  NUMERIC_CONTRACTS,
  TOTAL_POINTS,
  announceTotals,
  computeGame,
  dealerAt,
  isSpecialContract,
  scoreDeal,
  teamOf,
  withDefaults,
} from './scoring.js';
import { scoreChart } from './chart.js';
import { copyText, shareScoreCard } from './share.js';
import { computeStats } from './stats.js';
import { loadData, saveData } from './store.js';

const APP_NAME = 'Dix de Der';
const SEATS = ['Nord', 'Est', 'Sud', 'Ouest'];
const TEAMS = ['us', 'them'];
const TEAM_DEFAULTS = { us: 'Nous', them: 'Eux' };
const MODE_LABELS = { coinche: 'Coinche', classic: 'Belote classique' };
const TARGETS = [500, 1000, 1500, 2000];
const HISTORY_LIMIT = 50;
const DEFAULT_THEME = 'nuit';
const TEXT_GLYPH = '︎'; // forces text (not emoji) rendering of card suits

const THEMES = [
  { id: 'nuit', label: 'Nuit' },
  { id: 'clair', label: 'Clair' },
  { id: 'ocean', label: 'Océan' },
  { id: 'tapis', label: 'Tapis vert' },
  { id: 'bordeaux', label: 'Bordeaux' },
  { id: 'sable', label: 'Sable' },
];

const SUITS = {
  spades: { symbol: '♠' + TEXT_GLYPH, label: 'Pique', red: false },
  hearts: { symbol: '♥' + TEXT_GLYPH, label: 'Cœur', red: true },
  diamonds: { symbol: '♦' + TEXT_GLYPH, label: 'Carreau', red: true },
  clubs: { symbol: '♣' + TEXT_GLYPH, label: 'Trèfle', red: false },
  nt: { symbol: 'SA', label: 'Sans atout', red: false, text: true },
  at: { symbol: 'TA', label: 'Tout atout', red: false, text: true },
};

const ANNOUNCE_LABELS = {
  tierce: 'Tierce',
  cinquante: 'Cinquante',
  cent: 'Cent',
  carre: 'Carré',
  carreNeuf: 'Carré de 9',
  carreValets: 'Carré de valets',
};

const CARD_VALUES = {
  trump: [['Valet', 20], ['9', 14], ['As', 11], ['10', 10], ['Roi', 4], ['Dame', 3], ['8', 0], ['7', 0]],
  plain: [['As', 11], ['10', 10], ['Roi', 4], ['Dame', 3], ['Valet', 2], ['9', 0], ['8', 0], ['7', 0]],
};

const ICONS = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  rules: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2.5"/><circle cx="9" cy="12" r="2.5"/><circle cx="17" cy="18" r="2.5"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 20h8"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  cross: '<path d="M6 6l12 12M18 6 6 18"/>',
  replay: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.6-1-2 0-3h2.5A4.5 4.5 0 0 0 21 11.5C21 6.8 17 3 12 3z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
};

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const data = loadData();
if (data.current) data.current.rules = withDefaults(data.current.rules);

const ui = {
  view: data.current ? 'board' : 'setup', // 'setup' | 'board' | 'stats' | 'history' | 'rules'
  setup: null,
  sheet: null, // 'menu' | 'variants' | 'players' | 'theme' | 'deal' | 'end'
  sheetData: null,
  sheetScope: 'game', // which config a rules sheet edits: 'setup' or 'game'
  rulesScope: 'game', // which config the rules recap describes
  wizard: null,
  confirm: null,
  statsGame: null, // past game shown in the stats view, null for the current game
  customTarget: { setup: false, game: false },
};
ui.setup = newSetupDraft();

// ---------- helpers ----------

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const playerName = (game, i) => (game.players[i] || '').trim() || SEATS[i];
const teamName = (game, team) => (game.teams[team] || '').trim() || TEAM_DEFAULTS[team];
const teamPlayers = (team) => [0, 1, 2, 3].filter((p) => teamOf(p) === team);
const contractLabel = (c) => (c === 'capot' ? 'Capot' : c === 'generale' ? 'Générale' : String(c));
const multiplierLabel = (m) => (m === 2 ? 'Coinché ×2' : m === 4 ? 'Surcoinché ×4' : 'Non');
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const scopeObj = (scope) => (scope === 'game' && data.current ? data.current : ui.setup);

function suitHtml(key) {
  const suit = SUITS[key];
  if (!suit) return '';
  return `<span class="suit${suit.red ? ' red' : ''}${suit.text ? ' text' : ''}" title="${suit.label}">${suit.symbol}</span>`;
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((target, key) => target[key], obj)[last] = value;
}

function save() {
  saveData(data);
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function applyTheme() {
  const theme = THEMES.some((t) => t.id === data.prefs.theme) ? data.prefs.theme : DEFAULT_THEME;
  document.documentElement.dataset.theme = theme;
  const background = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
}

function newSetupDraft() {
  const base = {
    mode: 'coinche',
    rules: { ...DEFAULT_RULES },
    teams: { us: '', them: '' },
    players: ['', '', '', ''],
    firstDealer: 0,
  };
  const last = data.prefs.lastSetup;
  if (!last) return base;
  return {
    ...base,
    ...structuredClone(last),
    rules: { ...DEFAULT_RULES, ...last.rules },
  };
}

// ---------- game lifecycle ----------

function archiveCurrent() {
  const game = data.current;
  if (game && game.deals.length) {
    game.endedAt = Date.now();
    data.history.unshift(game);
    data.history = data.history.slice(0, HISTORY_LIMIT);
  }
  data.current = null;
}

function startGame(config) {
  archiveCurrent();
  const clean = structuredClone(config);
  data.current = { id: uid(), createdAt: Date.now(), ...clean, deals: [] };
  data.prefs.lastSetup = clean;
  save();
  ui.view = 'board';
  ui.sheet = null;
  ui.statsGame = null;
  ui.customTarget.game = false;
  syncWakeLock();
  render();
}

function rematch() {
  const game = data.current;
  if (!game) return;
  const { mode, rules, teams, players } = game;
  startGame({ mode, rules, teams, players, firstDealer: dealerAt(game.firstDealer, game.deals.length) });
  toast('Revanche lancée, bonne partie !');
}

// ---------- shared controls (setup screen and in-game sheets) ----------

function targetControl(scope, config) {
  const custom = ui.customTarget[scope] || !TARGETS.includes(config.rules.target);
  const chips = TARGETS.map(
    (target) =>
      `<button class="chip${!custom && config.rules.target === target ? ' active' : ''}" data-action="set-target" data-scope="${scope}" data-value="${target}">${fmt(target)}</button>`,
  ).join('');
  const field = custom
    ? `<label class="field"><span>Score à atteindre</span>
        <input type="number" inputmode="numeric" min="100" max="10000" step="10" data-scope="${scope}" data-field="rules.target" value="${config.rules.target}"></label>`
    : '';
  return `<div class="chips">${chips}
    <button class="chip${custom ? ' active' : ''}" data-action="custom-target" data-scope="${scope}">Autre</button></div>${field}`;
}

function switchRow(action, attrs, label, on, hint = '') {
  return `<button class="switch-row" role="switch" aria-checked="${Boolean(on)}" data-action="${action}" ${attrs}>
    <span class="switch-text"><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ''}</span>
    <span class="switch" aria-hidden="true"></span>
  </button>`;
}

function ruleSeg(scope, rules, key, options) {
  return `<div class="seg" role="group">${options
    .map(
      ([value, label]) =>
        `<button class="seg-btn${rules[key] === value ? ' active' : ''}" data-action="set-rule" data-scope="${scope}" data-key="${key}" data-value="${value}">${label}</button>`,
    )
    .join('')}</div>`;
}

const COUNTING_OPTIONS = [
  ['points', 'Points faits + contrat'],
  ['contract', 'Contrat seul'],
];

const countingHint = (rules) =>
  rules.counting === 'points'
    ? 'Réussi : les preneurs marquent le contrat plus leurs points. La défense garde les siens.'
    : 'Seul le contrat compte : il va aux preneurs s\'il est réussi, à la défense s\'il est chuté.';

// Short labels for every variant that differs from the default rules.
function variantSummary(config) {
  const rules = withDefaults(config.rules);
  const labels = [];
  if (config.mode === 'coinche') {
    if (rules.counting === 'contract') {
      labels.push('Contrat seul');
    } else {
      if (!rules.rounding) labels.push('Sans arrondi');
      if (rules.failedScore === 'points') labels.push('Chute à 160');
      if (rules.coincheScope === 'total') labels.push('Coinche double tout');
      if (!rules.coincheWinnerTakesAll) labels.push('Coinche : chacun ses points');
      if (!rules.beloteInContract) labels.push('Belote hors contrat');
      if (rules.announces && !rules.announcesInContract) labels.push('Annonces hors contrat');
    }
    if (!rules.surcoinche) labels.push('Sans surcoinche');
    if (!rules.noTrump) labels.push('Sans SA ni TA');
    if (!rules.generale) labels.push('Sans générale');
    if (rules.extendedContracts) labels.push('Contrats jusqu\'à 180');
  } else if (!rules.litige) {
    labels.push('Sans litige');
  }
  if (!rules.announces) labels.push('Sans annonces');
  return labels;
}

function variantPills(config) {
  const labels = variantSummary(config);
  return `<p class="pills">${
    labels.length ? labels.map((label) => `<span class="pill">${label}</span>`).join('') : '<span class="pill plain">Règles classiques</span>'
  }</p>`;
}

// Every rule variant, grouped. Used by the variants sheet for both scopes.
function variantsControl(scope, config) {
  const rules = withDefaults(config.rules);
  const sw = (key, label, hint) => switchRow('toggle-rule', `data-scope="${scope}" data-key="${key}"`, label, rules[key], hint);
  const group = (title, body) => `<section class="group"><h3>${title}</h3>${body}</section>`;
  const groups = [];

  if (config.mode === 'coinche') {
    const points = rules.counting === 'points';
    groups.push(
      group(
        'Comptage',
        ruleSeg(scope, rules, 'counting', COUNTING_OPTIONS) +
          `<p class="hint">${countingHint(rules)}</p>` +
          (points ? sw('rounding', 'Arrondir à la dizaine', '86 points comptent 90') : ''),
      ),
    );
    if (points) {
      groups.push(
        group(
          'Contrat chuté',
          ruleSeg(scope, rules, 'failedScore', [
            ['both', '160 + contrat'],
            ['points', '160 seulement'],
          ]) + `<p class="hint">Ce que marque la défense quand les preneurs chutent.</p>`,
        ),
      );
    }
    groups.push(
      group(
        'Coinche',
        (points
          ? ruleSeg(scope, rules, 'coincheScope', [
              ['contract', 'Double le contrat'],
              ['total', 'Double tout'],
            ]) +
            `<p class="hint">${
              rules.coincheScope === 'contract'
                ? 'La coinche multiplie le contrat, pas les points de plis.'
                : 'La coinche multiplie le contrat et les points de plis.'
            }</p>` +
            sw('coincheWinnerTakesAll', 'Le gagnant prend tout', 'Donne coinchée : tous les points de plis au vainqueur')
          : '') + sw('surcoinche', 'Surcoinche autorisée', 'Coinche sur coinche : contrat ×4'),
      ),
    );
    groups.push(
      group(
        'Belote et annonces',
        (points ? sw('beloteInContract', 'La belote aide au contrat', 'Ses 20 points comptent pour l\'atteindre') : '') +
          sw('announces', 'Compter les annonces', 'Tierce, cinquante, cent, carré') +
          (points && rules.announces ? sw('announcesInContract', 'Les annonces aident au contrat', 'Celles des preneurs comptent pour l\'atteindre') : ''),
      ),
    );
    groups.push(
      group(
        'Enchères proposées',
        sw('noTrump', 'Sans atout et tout atout') +
          sw('generale', 'Générale', 'Un seul joueur fait tous les plis : contrat de 500') +
          sw('extendedContracts', 'Contrats de 170 et 180', 'Atteignables avec la belote ou les annonces'),
      ),
    );
  } else {
    groups.push(
      group(
        'Belote classique',
        sw('announces', 'Compter les annonces', 'Tierce, cinquante, cent, carré') +
          sw('litige', 'Litige en cas d\'égalité', 'Les points du preneur vont au vainqueur de la donne suivante'),
      ),
    );
  }

  return `${groups.join('')}
    <button class="btn ghost wide" data-action="reset-rules" data-scope="${scope}">${icon('replay')} Rétablir les règles classiques</button>`;
}

function namesControl(scope, config) {
  const input = (field, placeholder, value, cls = '') =>
    `<input class="${cls}" type="text" maxlength="14" autocomplete="off" autocapitalize="words" data-scope="${scope}" data-field="${field}" placeholder="${placeholder}" aria-label="${placeholder}" value="${esc(value || '')}">`;
  return TEAMS.map(
    (team) => `
    <div class="team-card ${team}">
      ${input(`teams.${team}`, TEAM_DEFAULTS[team], config.teams[team], 'team-name')}
      <div class="team-players">
        ${teamPlayers(team).map((p) => input(`players.${p}`, SEATS[p], config.players[p])).join('')}
      </div>
    </div>`,
  ).join('');
}

function dealerControl(scope, config) {
  const current = scope === 'game' ? dealerAt(config.firstDealer, config.deals.length) : config.firstDealer;
  return `<div class="chips four">${[0, 1, 2, 3]
    .map(
      (p) =>
        `<button class="chip ${teamOf(p)}${current === p ? ' active' : ''}" data-action="set-dealer" data-scope="${scope}" data-value="${p}" data-name-of="${p}">${esc(playerName(config, p))}</button>`,
    )
    .join('')}</div>`;
}

function themeControl() {
  const current = document.documentElement.dataset.theme;
  return `<div class="theme-grid">${THEMES.map(
    (theme) => `
    <button class="theme-swatch${theme.id === current ? ' active' : ''}" data-theme="${theme.id}" data-action="set-theme" data-value="${theme.id}" aria-pressed="${theme.id === current}">
      <span class="swatch-preview" aria-hidden="true"><i class="us">12</i><i class="them">8</i><b></b></span>
      <span class="swatch-name">${theme.label}</span>
    </button>`,
  ).join('')}</div>`;
}

// ---------- views ----------

function viewSetup() {
  const config = ui.setup;
  const modeTile = (mode, title, text) => `
    <button class="mode-tile${config.mode === mode ? ' active' : ''}" data-action="set-mode" data-value="${mode}" aria-pressed="${config.mode === mode}">
      <strong>${title}</strong><small>${text}</small>
    </button>`;

  return `
  <main class="shell setup">
    <header class="hero">
      <div class="logo" aria-hidden="true">
        <span>${SUITS.spades.symbol}</span><span class="red">${SUITS.hearts.symbol}</span><span class="red">${SUITS.diamonds.symbol}</span><span>${SUITS.clubs.symbol}</span>
      </div>
      <h1>${APP_NAME}</h1>
      <p>Compteur de belote, coinche et contrée</p>
    </header>

    ${data.current ? `<button class="btn wide" data-action="resume">${icon('back')} Reprendre la partie en cours</button>` : ''}

    <section class="panel">
      <h2>À quoi joue-t-on ?</h2>
      <div class="mode-grid">
        ${modeTile('coinche', 'Coinche / Contrée', 'Enchères de 80 à 160, capot, coinche et surcoinche')}
        ${modeTile('classic', 'Belote classique', 'Sans enchères : le preneur doit faire plus que la défense')}
      </div>
    </section>

    <section class="panel">
      <h2>Partie en</h2>
      ${targetControl('setup', config)}
    </section>

    <section class="panel">
      <h2>Règles</h2>
      ${
        config.mode === 'coinche'
          ? `${ruleSeg('setup', withDefaults(config.rules), 'counting', COUNTING_OPTIONS)}<p class="hint">${countingHint(withDefaults(config.rules))}</p>`
          : `<p class="hint">Le preneur doit faire plus de points que la défense, sinon il est dedans.</p>`
      }
      ${variantPills(config)}
      <div class="row-2">
        <button class="btn" data-action="open-sheet" data-sheet="variants" data-scope="setup">${icon('rules')} Variantes</button>
        <button class="btn" data-action="show-rules" data-scope="setup">${icon('book')} Récap</button>
      </div>
    </section>

    <section class="panel">
      <h2>Équipes</h2>
      <p class="hint">Facultatif. Les partenaires sont face à face : Nord avec Sud, Est avec Ouest.</p>
      ${namesControl('setup', config)}
    </section>

    <section class="panel">
      <h2>Premier donneur</h2>
      ${dealerControl('setup', config)}
    </section>

    <div class="row-2">
      <button class="btn ghost" data-action="open-sheet" data-sheet="theme" data-scope="setup">${icon('palette')} Couleurs</button>
      <button class="btn ghost" data-action="show-history" ${data.history.length ? '' : 'disabled'}>${icon('history')} Historique</button>
    </div>

    <footer class="actionbar single">
      <div class="actionbar-inner">
        <button class="btn primary big" data-action="start-game">Commencer la partie</button>
      </div>
    </footer>
  </main>`;
}

function scoreCard(game, computed, team, lead) {
  const total = computed.totals[team];
  const target = game.rules.target;
  const percent = Math.min(100, Math.round((total / target) * 100));
  const remaining = Math.max(0, target - total);
  const players = teamPlayers(team)
    .map(
      (p) =>
        `<span>${esc(playerName(game, p))}${p === computed.nextDealer && !computed.winner ? '<b class="dealer-chip" title="Donneur">D</b>' : ''}</span>`,
    )
    .join('');
  return `
  <article class="score-card ${team}${lead === team ? ' leading' : ''}${computed.winner === team ? ' winner' : ''}">
    <h2>${esc(teamName(game, team))}</h2>
    <div class="score-value" aria-label="${total} points">${total}</div>
    <div class="progress" aria-hidden="true"><span style="width:${percent}%"></span></div>
    <p class="score-sub">${computed.winner === team ? 'Vainqueur' : remaining ? `encore ${fmt(remaining)}` : 'objectif atteint'}</p>
    <p class="score-players">${players}</p>
  </article>`;
}

function dealTitleHtml(game, deal) {
  if (game.mode !== 'coinche') return `${esc(playerName(game, deal.taker))} prend`;
  const multiplier = deal.multiplier > 1 ? ` <span class="mult">×${deal.multiplier}</span>` : '';
  return `${contractLabel(deal.contract)} ${suitHtml(deal.suit)}${multiplier}`;
}

function dealStatus(game, row) {
  if (row.litige) return 'Litige';
  if (row.made) return 'Réussi';
  return game.mode === 'coinche' ? 'Chuté' : 'Dedans';
}

function dealRow(game, row) {
  const { deal } = row;
  const details = [];
  if (game.mode === 'coinche') details.push(esc(playerName(game, deal.taker)));
  details.push(dealStatus(game, row));
  if (deal.tricks && deal.tricks !== 'normal' && !isSpecialContract(deal.contract)) details.push('Capot');
  if (deal.belote) details.push('Belote');
  const points = (team) => `<span class="deal-pts ${team}">${row.score[team] ? `+${row.score[team]}` : '0'}</span>`;
  return `
  <button class="deal-row${row.made || row.litige ? '' : ' failed'}" data-action="open-deal" data-id="${deal.id}">
    <span class="deal-num">${row.index + 1}</span>
    <span class="deal-desc"><strong>${dealTitleHtml(game, deal)}</strong><small class="${row.takerTeam}">${details.join(' · ')}</small></span>
    ${points('us')}${points('them')}
  </button>`;
}

function viewBoard(game) {
  const computed = computeGame(game);
  const { totals } = computed;
  const lead = totals.us === totals.them ? null : totals.us > totals.them ? 'us' : 'them';
  const rows = [...computed.rows].reverse();

  return `
  <main class="shell board">
    <header class="topbar">
      <div class="topbar-title">
        <strong>${MODE_LABELS[game.mode]}</strong>
        <span>Partie en ${fmt(game.rules.target)} points</span>
      </div>
      <button class="btn small" data-action="open-sheet" data-sheet="menu">${icon('menu')} Menu</button>
    </header>

    ${
      computed.winner
        ? `<section class="winner-banner ${computed.winner}">
            ${icon('trophy')}
            <p>Victoire de <strong>${esc(teamName(game, computed.winner))}</strong></p>
            <button class="btn primary small" data-action="rematch">${icon('replay')} Revanche</button>
          </section>`
        : ''
    }

    <section class="scores">
      ${scoreCard(game, computed, 'us', lead)}
      ${scoreCard(game, computed, 'them', lead)}
    </section>

    ${
      computed.winner
        ? ''
        : `<p class="dealer-line"><b class="dealer-chip">D</b> ${esc(playerName(game, computed.nextDealer))} donne${
            computed.pot ? ` · <strong>${computed.pot} points en litige</strong> pour le vainqueur de la donne` : ''
          }</p>`
    }

    <section class="deals">
      ${
        rows.length
          ? `<div class="deals-head"><h3>${plural(rows.length, 'donne')}</h3><span class="us">${esc(teamName(game, 'us'))}</span><span class="them">${esc(teamName(game, 'them'))}</span></div>
             <div class="deal-list">${rows.map((row) => dealRow(game, row)).join('')}</div>`
          : `<div class="empty">
              <p><strong>La partie commence.</strong></p>
              <p>À la fin de chaque donne, touchez « Nouvelle donne » pour entrer le résultat.</p>
            </div>`
      }
    </section>

    <footer class="actionbar">
      <div class="actionbar-inner">
        <button class="btn square" data-action="undo" ${game.deals.length ? '' : 'disabled'}>${icon('undo')}<span>Annuler</span></button>
        <button class="btn primary big" data-action="new-deal">Nouvelle donne</button>
        <button class="btn square" data-action="show-stats">${icon('chart')}<span>Stats</span></button>
      </div>
    </footer>
  </main>`;
}

function viewStats(game) {
  const computed = computeGame(game);
  const stats = computeStats(game, computed);
  const coinche = game.mode === 'coinche';
  const rate = (value) => (value == null ? '·' : `${value} %`);
  const line = (label, pick) => `<tr><th scope="row">${label}</th><td class="us">${pick(stats.teams.us)}</td><td class="them">${pick(stats.teams.them)}</td></tr>`;
  const suitCounts = Object.entries(stats.suits).sort((a, b) => b[1] - a[1]);

  return `
  <main class="shell page">
    <header class="topbar">
      <button class="btn small" data-action="stats-back">${icon('back')} Retour</button>
      <h1>Statistiques</h1>
    </header>

    <section class="panel scoreline">
      <div class="us"><span>${esc(teamName(game, 'us'))}</span><strong>${computed.totals.us}</strong></div>
      <div class="them"><span>${esc(teamName(game, 'them'))}</span><strong>${computed.totals.them}</strong></div>
    </section>

    ${
      stats.deals
        ? `
    <section class="panel">
      <h2>Évolution du score</h2>
      ${scoreChart(computed.rows, game.rules.target)}
      <p class="legend"><span class="us">${esc(teamName(game, 'us'))}</span><span class="them">${esc(teamName(game, 'them'))}</span><span class="target">Objectif ${fmt(game.rules.target)}</span></p>
    </section>

    <section class="panel">
      <h2>Par équipe</h2>
      <table class="stat-table">
        <thead><tr><td></td><th scope="col" class="us">${esc(teamName(game, 'us'))}</th><th scope="col" class="them">${esc(teamName(game, 'them'))}</th></tr></thead>
        <tbody>
          ${line('Donnes prises', (t) => t.taken)}
          ${line(coinche ? 'Contrats réussis' : 'Prises réussies', (t) => t.made)}
          ${line(coinche ? 'Contrats chutés' : 'Dedans', (t) => t.failed)}
          ${line('Réussite', (t) => rate(t.successRate))}
          ${coinche ? line('Contrat moyen', (t) => t.averageContract ?? '·') : ''}
          ${coinche ? line('Contrats coinchés', (t) => t.coinched) : ''}
          ${line('Belotes', (t) => t.belotes)}
          ${line('Capots', (t) => t.capots)}
          ${line('Meilleure donne', (t) => t.bestDeal)}
        </tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Par joueur</h2>
      <table class="stat-table">
        <thead><tr><td></td><th scope="col">Prises</th><th scope="col">Réussies</th><th scope="col">Réussite</th></tr></thead>
        <tbody>
          ${stats.players
            .map(
              (player, p) =>
                `<tr><th scope="row" class="${teamOf(p)}">${esc(playerName(game, p))}</th><td>${player.taken}</td><td>${player.made}</td><td>${rate(player.successRate)}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </section>

    ${
      coinche && suitCounts.length
        ? `<section class="panel">
            <h2>Couleurs demandées</h2>
            <div class="suit-counts">${suitCounts.map(([key, count]) => `<span>${suitHtml(key)}<strong>${count}</strong></span>`).join('')}</div>
          </section>`
        : ''
    }`
        : `<section class="panel empty"><p>Les statistiques apparaîtront après la première donne.</p></section>`
    }

    <button class="btn primary wide" data-action="share">${icon('share')} Partager le score</button>
    <button class="btn wide" data-action="copy-score">${icon('copy')} Copier le score en texte</button>
  </main>`;
}

function viewHistory() {
  const items = data.history
    .map((game) => {
      const computed = computeGame(game);
      const date = new Date(game.endedAt ?? game.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      const side = (team) =>
        `<span class="${team}${computed.winner === team ? ' won' : ''}">${esc(teamName(game, team))} <strong>${computed.totals[team]}</strong></span>`;
      return `
      <div class="past-game">
        <button class="past-main" data-action="open-past" data-id="${game.id}">
          <small>${MODE_LABELS[game.mode]} · ${date} · ${plural(game.deals.length, 'donne')}</small>
          <span class="past-score">${side('us')}${side('them')}</span>
        </button>
        <button class="btn ghost icon-only" data-action="delete-past" data-id="${game.id}" aria-label="Supprimer cette partie">${icon('trash')}</button>
      </div>`;
    })
    .join('');

  return `
  <main class="shell page">
    <header class="topbar">
      <button class="btn small" data-action="history-back">${icon('back')} Retour</button>
      <h1>Historique</h1>
    </header>
    ${items || `<section class="panel empty"><p>Aucune partie terminée pour l'instant.</p></section>`}
  </main>`;
}

// ---------- rules recap ----------

// Plain-language summary of the active rules, with examples computed by the scoring engine.
function rulesRecap(config) {
  const rules = withDefaults(config.rules);
  const coinche = config.mode === 'coinche';
  const example = (deal) => {
    const result = scoreDeal(
      { taker: 0, suit: 'hearts', multiplier: 1, belote: null, announces: [], takerPoints: null, tricks: 'normal', forcedOutcome: null, ...deal },
      config.mode,
      rules,
    );
    return `preneurs <strong>+${result.us}</strong>, défense <strong>+${result.them}</strong>`;
  };
  const items = [];
  const add = (title, text, sample = '') => items.push({ title, text, sample });

  if (coinche) {
    const points = rules.counting === 'points';
    const all = rules.rounding ? 160 : 162;
    const surcoinche = rules.surcoinche
      ? ' La surcoinche (coinche sur coinche) multiplie par 4.'
      : ' La surcoinche n\'est pas jouée.';

    if (points) {
      add(
        'Contrat réussi',
        'Les preneurs marquent le contrat plus leurs points de plis. La défense marque ses propres points.',
        `Contrat de 100, 112 points faits : ${example({ contract: 100, takerPoints: 112 })}.`,
      );
      add(
        'Contrat chuté',
        rules.failedScore === 'both'
          ? `Les preneurs ne marquent rien. La défense marque ${all} plus le contrat.`
          : `Les preneurs ne marquent rien. La défense marque ${all} points, sans le contrat.`,
        `Contrat de 100, 92 points faits : ${example({ contract: 100, takerPoints: 92 })}.`,
      );
      add(
        'Coinche',
        `${
          rules.coincheScope === 'contract'
            ? 'La coinche double le contrat, pas les points de plis.'
            : 'La coinche double le contrat et les points de plis.'
        }${surcoinche} ${
          rules.coincheWinnerTakesAll
            ? 'Le vainqueur d\'une donne coinchée prend tous les points de plis et les annonces.'
            : 'Si le contrat coinché est réussi, chaque équipe garde ses points de plis.'
        }`,
        `Contrat de 100 coinché, 112 points faits : ${example({ contract: 100, takerPoints: 112, multiplier: 2 })}.<br>Le même, chuté avec 92 points : ${example({ contract: 100, takerPoints: 92, multiplier: 2 })}.`,
      );
      add(
        'Capot',
        `Une équipe qui fait tous les plis compte 250 points de plis au lieu de 162. Le capot annoncé est un contrat de 250${
          rules.generale ? ', la générale (un seul joueur fait tous les plis) un contrat de 500' : ''
        }.`,
        `Capot annoncé et réussi : ${example({ contract: 'capot', tricks: 'takerAll' })}.`,
      );
      add(
        'Arrondi',
        rules.rounding
          ? 'Les points des preneurs sont arrondis à la dizaine la plus proche (5 arrondit au-dessus). La défense reçoit le complément à 160.'
          : 'Les points sont comptés au point près, sur 162.',
      );
    } else {
      add('Contrat réussi', 'Les preneurs marquent la valeur du contrat. La défense ne marque rien.', `Contrat de 100 réussi : ${example({ contract: 100, forcedOutcome: 'made' })}.`);
      add('Contrat chuté', 'La défense marque la valeur du contrat. Les preneurs ne marquent rien.', `Contrat de 100 chuté : ${example({ contract: 100, forcedOutcome: 'failed' })}.`);
      add('Coinche', `La coinche double le contrat.${surcoinche}`, `Contrat de 100 coinché et réussi : ${example({ contract: 100, forcedOutcome: 'made', multiplier: 2 })}.`);
      add('Capot', `Le capot annoncé vaut 250${rules.generale ? ', la générale (un seul joueur fait tous les plis) 500' : ''}.`);
    }

    add(
      'Belote',
      `20 points pour l'équipe qui détient le roi et la dame d'atout. Elle les garde même si elle chute.${
        points ? (rules.beloteInContract ? ' Ils comptent pour atteindre le contrat.' : ' Ils ne comptent pas pour atteindre le contrat.') : ''
      }`,
    );
    add(
      'Annonces',
      rules.announces
        ? `Seule l'équipe qui a la plus forte annonce compte les siennes.${
            points ? (rules.announcesInContract ? ' Celles des preneurs comptent pour atteindre le contrat.' : ' Elles ne comptent pas pour atteindre le contrat.') : ''
          } En cas de chute, elles vont à la défense.`
        : 'Les annonces ne sont pas comptées.',
    );
    add(
      'Enchères',
      `Contrats de 80 à ${rules.extendedContracts ? 180 : 160}, capot${rules.generale ? ' et générale' : ''}. Couleurs : pique, cœur, carreau, trèfle${
        rules.noTrump ? ', sans atout et tout atout (comptés sur 162 points)' : ''
      }.`,
    );
  } else {
    add('Prise réussie', 'Le preneur doit faire plus de points que la défense. Chaque équipe marque alors ses points.', `90 points faits : ${example({ takerPoints: 90 })}.`);
    add('Dedans', 'Si le preneur fait moins que la défense, il ne marque rien et la défense marque 162.', `70 points faits : ${example({ takerPoints: 70 })}.`);
    add(
      'Égalité',
      rules.litige
        ? 'À égalité, la défense marque ses points. Ceux du preneur sont en litige : ils vont au vainqueur de la donne suivante.'
        : 'À égalité, le preneur est dedans.',
    );
    add('Capot', 'Une équipe qui fait tous les plis marque 252.');
    add('Belote', '20 points pour l\'équipe qui détient le roi et la dame d\'atout. Ils comptent dans son total et elle les garde même dedans.');
    add(
      'Annonces',
      rules.announces
        ? 'Seule l\'équipe qui a la plus forte annonce compte les siennes. Si le preneur est dedans, elles vont à la défense.'
        : 'Les annonces ne sont pas comptées.',
    );
  }

  add('Fin de partie', `La première équipe à ${fmt(rules.target)} points gagne. Si les deux dépassent, le plus haut score l'emporte.`);
  return items;
}

function viewRules() {
  const scope = ui.rulesScope === 'game' && data.current ? 'game' : 'setup';
  const config = scopeObj(scope);
  const rules = withDefaults(config.rules);
  const valueRows = CARD_VALUES.trump
    .map(([card, value], i) => `<tr><th scope="row">${card}</th><td>${value}</td><th scope="row">${CARD_VALUES.plain[i][0]}</th><td>${CARD_VALUES.plain[i][1]}</td></tr>`)
    .join('');

  return `
  <main class="shell page">
    <header class="topbar">
      <button class="btn small" data-action="rules-back">${icon('back')} Retour</button>
      <h1>Récap des règles</h1>
    </header>

    <section class="panel">
      <h2>${MODE_LABELS[config.mode]} · variantes actives</h2>
      ${variantPills(config)}
      <button class="btn wide" data-action="open-sheet" data-sheet="variants" data-scope="${scope}">${icon('rules')} Modifier les variantes</button>
    </section>

    ${rulesRecap(config)
      .map(
        (item) => `
      <section class="panel rule-card">
        <h2>${item.title}</h2>
        <p>${item.text}</p>
        ${item.sample ? `<p class="example">${item.sample}</p>` : ''}
      </section>`,
      )
      .join('')}

    ${
      rules.announces
        ? `<section class="panel">
            <h2>Valeur des annonces</h2>
            <table class="stat-table">
              <tbody>${Object.keys(ANNOUNCE_POINTS)
                .map((kind) => `<tr><th scope="row">${ANNOUNCE_LABELS[kind]}</th><td>${ANNOUNCE_POINTS[kind]}</td></tr>`)
                .join('')}</tbody>
            </table>
          </section>`
        : ''
    }

    <section class="panel">
      <h2>Valeur des cartes</h2>
      <table class="stat-table card-values">
        <thead><tr><th scope="col" colspan="2">À l'atout</th><th scope="col" colspan="2">Hors atout</th></tr></thead>
        <tbody>${valueRows}</tbody>
      </table>
      <p class="hint">Le dernier pli rapporte 10 points de plus (le dix de der). Une donne compte 162 points en tout.</p>
    </section>
  </main>`;
}

// ---------- deal wizard ----------

const wizardSteps = (game) => (game.mode === 'coinche' ? ['taker', 'contract', 'suit', 'result'] : ['taker', 'result']);

// Contracts where only "made" or "failed" is asked instead of the card points.
const outcomeOnly = (game, draft) =>
  game.mode === 'coinche' && (game.rules.counting === 'contract' || isSpecialContract(draft.contract));

function openWizard(editId = null) {
  const game = data.current;
  const steps = wizardSteps(game);
  const existing = editId ? game.deals.find((deal) => deal.id === editId) : null;
  const draft = existing
    ? structuredClone(existing)
    : {
        id: uid(),
        taker: null,
        contract: null,
        suit: null,
        multiplier: 1,
        belote: null,
        announces: [],
        takerPoints: null,
        tricks: 'normal',
        forcedOutcome: null,
      };
  ui.wizard = {
    draft,
    editing: Boolean(existing),
    step: existing ? steps.length - 1 : 0,
    side: 'taker',
    digits: draft.takerPoints != null ? String(draft.takerPoints) : '',
    picker: null, // 'coinche' | 'belote' | 'announces'
    announceTeam: 'us',
  };
  render();
}

function saveDraft() {
  const game = data.current;
  const before = computeGame(game).winner;
  const deal = structuredClone(ui.wizard.draft);
  const index = game.deals.findIndex((existing) => existing.id === deal.id);
  if (index >= 0) game.deals[index] = deal;
  else game.deals.push(deal);
  ui.wizard = null;
  save();
  const after = computeGame(game).winner;
  if (after && !before) ui.sheet = 'end';
  render();
}

function stepTaker(game, w) {
  const dealer = w.editing
    ? dealerAt(game.firstDealer, game.deals.findIndex((deal) => deal.id === w.draft.id))
    : dealerAt(game.firstDealer, game.deals.length);
  const seat = (p, area) => `
    <button class="seat seat-${area} ${teamOf(p)}${w.draft.taker === p ? ' selected' : ''}" data-action="pick-taker" data-value="${p}">
      <strong>${esc(playerName(game, p))}</strong>
      <small>${esc(teamName(game, teamOf(p)))}</small>
      ${p === dealer ? '<b class="dealer-chip" title="Donneur">D</b>' : ''}
    </button>`;
  return `
    <div class="table-layout">
      ${seat(0, 'n')}${seat(3, 'w')}${seat(1, 'e')}${seat(2, 's')}
    </div>
    <p class="hint center"><b class="dealer-chip">D</b> indique le donneur de cette donne.</p>`;
}

function stepContract(game, w) {
  const tile = (value, label, cls = '') =>
    `<button class="tile${cls}${w.draft.contract === value ? ' selected' : ''}" data-action="pick-contract" data-value="${value}">${label}</button>`;
  const numeric = game.rules.extendedContracts ? [...NUMERIC_CONTRACTS, ...EXTENDED_CONTRACTS] : NUMERIC_CONTRACTS;
  const specials = [tile('capot', 'Capot', ' word')];
  if (game.rules.generale) specials.push(tile('generale', 'Générale', ' word'));
  return `
    <div class="tile-grid three">${numeric.map((value) => tile(value, value)).join('')}</div>
    <div class="tile-grid ${specials.length > 1 ? 'two' : 'one'}">${specials.join('')}</div>`;
}

function stepSuit(game, w) {
  const tile = (key) => {
    const suit = SUITS[key];
    return `<button class="tile suit-tile${suit.red ? ' red' : ''}${suit.text ? ' text' : ''}${w.draft.suit === key ? ' selected' : ''}" data-action="pick-suit" data-value="${key}">
      <span class="suit-symbol">${suit.symbol}</span><small>${suit.label}</small></button>`;
  };
  return `
    <div class="tile-grid two suits">${['spades', 'hearts', 'diamonds', 'clubs'].map(tile).join('')}</div>
    ${game.rules.noTrump ? `<div class="tile-grid two">${['nt', 'at'].map(tile).join('')}</div>` : ''}`;
}

function optionChip(picker, label, value, active) {
  return `<button class="option-chip${active ? ' active' : ''}" data-action="open-picker" data-picker="${picker}">
    <small>${label} ${icon('chevron')}</small><strong>${value}</strong></button>`;
}

function previewText(game, draft) {
  const result = scoreDeal(draft, game.mode, game.rules);
  return `${esc(teamName(game, 'us'))} +${result.us} · ${esc(teamName(game, 'them'))} +${result.them}`;
}

function pointsBox(game, w, team) {
  const draft = w.draft;
  const side = team === teamOf(draft.taker) ? 'taker' : 'defense';
  let value = null;
  if (draft.tricks === 'takerAll') value = side === 'taker' ? 'Capot' : 0;
  else if (draft.tricks === 'defenseAll') value = side === 'defense' ? 'Capot' : 0;
  else if (draft.takerPoints != null) value = side === 'taker' ? draft.takerPoints : TOTAL_POINTS - draft.takerPoints;
  return `
    <button class="points-box ${team}${w.side === side ? ' active' : ''}" data-action="pick-side" data-side="${side}" aria-pressed="${w.side === side}">
      <span class="points-label">${esc(teamName(game, team))}<em>${side === 'taker' ? 'preneurs' : 'défense'}</em></span>
      <span class="points-value${value == null ? ' placeholder' : ''}${value === 'Capot' ? ' word' : ''}">${value ?? '?'}</span>
    </button>`;
}

function verdictHtml(game, draft) {
  const complete = draft.tricks !== 'normal' || draft.takerPoints != null;
  if (!complete) {
    return `<p class="verdict idle">Tapez les points des plis, dix de der inclus. L'autre équipe se calcule toute seule.</p>`;
  }
  const result = scoreDeal(draft, game.mode, game.rules);
  const coinche = game.mode === 'coinche';
  const label = result.litige ? 'Litige' : result.made ? (coinche ? 'Contrat réussi' : 'Réussi') : coinche ? 'Contrat chuté' : 'Dedans';
  const state = result.litige ? 'tie' : result.made ? 'ok' : 'ko';
  return `<p class="verdict ${state}">${icon(result.made ? 'check' : 'cross')}<strong>${label}</strong>
    <span class="us">+${result.us}</span><span class="them">+${result.them}</span></p>`;
}

function stepResult(game, w) {
  const draft = w.draft;
  const coinche = game.mode === 'coinche';
  const chips = [];
  if (coinche) chips.push(optionChip('coinche', 'Coinche', multiplierLabel(draft.multiplier), draft.multiplier > 1));
  chips.push(optionChip('belote', 'Belote', draft.belote ? esc(teamName(game, draft.belote)) : 'Non', Boolean(draft.belote)));
  if (game.rules.announces) {
    const totals = announceTotals(draft);
    const parts = TEAMS.filter((team) => totals[team]).map((team) => `${esc(teamName(game, team))} ${totals[team]}`);
    chips.push(optionChip('announces', 'Annonces', parts.join(' · ') || 'Aucune', parts.length > 0));
  }
  const options = `<div class="option-chips">${chips.join('')}</div>`;

  if (outcomeOnly(game, draft)) {
    const special = isSpecialContract(draft.contract);
    const made = { ...draft, takerPoints: null, tricks: special ? 'takerAll' : 'normal', forcedOutcome: 'made' };
    const failed = { ...draft, takerPoints: null, tricks: 'normal', forcedOutcome: 'failed' };
    return `
      ${options}
      <div class="outcome-grid">
        <button class="outcome made" data-action="save-outcome" data-value="made">
          ${icon('check')}<strong>Réussi</strong><small>${previewText(game, made)}</small>
        </button>
        <button class="outcome failed" data-action="save-outcome" data-value="failed">
          ${icon('cross')}<strong>Chuté</strong><small>${previewText(game, failed)}</small>
        </button>
      </div>`;
  }

  const complete = draft.tricks !== 'normal' || draft.takerPoints != null;
  const key = (digit) => `<button class="key" data-action="key" data-value="${digit}">${digit}</button>`;
  return `
    ${options}
    <div class="points-pair">${pointsBox(game, w, 'us')}${pointsBox(game, w, 'them')}</div>
    ${verdictHtml(game, draft)}
    <div class="keypad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(key).join('')}
      <button class="key word${draft.tricks !== 'normal' ? ' active' : ''}" data-action="key-capot">Capot</button>
      ${key(0)}
      <button class="key word" data-action="key-back" aria-label="Effacer">⌫</button>
    </div>
    <button class="btn primary big wide" data-action="save-deal" ${complete ? '' : 'disabled'}>${icon('check')} Valider la donne</button>`;
}

// Bottom sheets opened from the result step: coinche level, belote holder, announces.
function pickerSheet(game, w) {
  const draft = w.draft;
  const choice = (action, value, selected, title, text = '', cls = '') => `
    <button class="choice ${cls}${selected ? ' selected' : ''}" data-action="${action}" data-value="${value}">
      <span><strong>${title}</strong>${text ? `<small>${text}</small>` : ''}</span>${selected ? icon('check') : ''}
    </button>`;
  let content;

  if (w.picker === 'coinche') {
    const preview = (multiplier) => {
      const value = isSpecialContract(draft.contract) ? contractLabel(draft.contract) : `Contrat de ${draft.contract}`;
      if (multiplier === 1) return `${value}, sans multiplicateur`;
      const doublesAll = game.rules.counting === 'points' && game.rules.coincheScope === 'total';
      return doublesAll ? `${value} et points de plis multipliés par ${multiplier}` : `${value} multiplié par ${multiplier}`;
    };
    content = `
      <h2>La donne est-elle coinchée ?</h2>
      <div class="choice-list">
        ${choice('set-multiplier', 1, draft.multiplier === 1, 'Pas de coinche', preview(1))}
        ${choice('set-multiplier', 2, draft.multiplier === 2, 'Coinché ×2', preview(2))}
        ${game.rules.surcoinche || draft.multiplier === 4 ? choice('set-multiplier', 4, draft.multiplier === 4, 'Surcoinché ×4', `Coinche sur coinche. ${preview(4)}`) : ''}
      </div>`;
  } else if (w.picker === 'belote') {
    content = `
      <h2>Qui a la belote ?</h2>
      <p class="hint">Le roi et la dame d'atout dans la même main : 20 points.</p>
      <div class="choice-list">
        ${choice('set-belote', '', draft.belote === null, 'Personne')}
        ${TEAMS.map((team) => choice('set-belote', team, draft.belote === team, esc(teamName(game, team)), '+20 points', team)).join('')}
      </div>`;
  } else {
    const list = draft.announces;
    const seg = (team) =>
      `<button class="seg-btn ${team}${w.announceTeam === team ? ' active' : ''}" data-action="announce-team" data-value="${team}">${esc(teamName(game, team))}</button>`;
    content = `
      <h2>Annonces</h2>
      <p class="hint">Choisissez l'équipe, puis touchez ses annonces.</p>
      <div class="seg">${seg('us')}${seg('them')}</div>
      <div class="tile-grid two announce-grid">
        ${Object.keys(ANNOUNCE_POINTS)
          .map(
            (kind) =>
              `<button class="tile announce" data-action="add-announce" data-kind="${kind}"><span>${ANNOUNCE_LABELS[kind]}</span><small>+${ANNOUNCE_POINTS[kind]}</small></button>`,
          )
          .join('')}
      </div>
      ${
        list.length
          ? `<ul class="announce-list">${list
              .map(
                (item, i) =>
                  `<li class="${item.team}"><span>${esc(teamName(game, item.team))} · ${ANNOUNCE_LABELS[item.kind]} <strong>+${ANNOUNCE_POINTS[item.kind]}</strong></span>
                   <button class="btn ghost icon-only" data-action="remove-announce" data-index="${i}" aria-label="Retirer cette annonce">${icon('close')}</button></li>`,
              )
              .join('')}</ul>`
          : ''
      }
      <button class="btn primary wide" data-action="close-picker">Terminé</button>`;
  }

  return `
  <div class="backdrop" data-action="close-picker" data-self="1">
    <div class="sheet" role="dialog" aria-modal="true" data-scroll="picker">${content}</div>
  </div>`;
}

function viewWizard(game) {
  const w = ui.wizard;
  const steps = wizardSteps(game);
  const step = steps[w.step];
  const titles = {
    taker: 'Qui prend ?',
    contract: 'Quel contrat ?',
    suit: 'À quelle couleur ?',
    result: game.mode === 'coinche' ? 'Résultat de la donne' : 'Points de la donne',
  };
  const body = { taker: stepTaker, contract: stepContract, suit: stepSuit, result: stepResult }[step](game, w);

  const recap = [];
  if (w.step > 0 && w.draft.taker != null) {
    recap.push(`<span class="${teamOf(w.draft.taker)}">${esc(playerName(game, w.draft.taker))}</span>`);
    if (game.mode === 'coinche' && w.draft.contract != null && w.step > 1) {
      recap.push(`${contractLabel(w.draft.contract)}${w.step > 2 && w.draft.suit ? ` ${suitHtml(w.draft.suit)}` : ''}`);
    }
  }

  return `
  <div class="wizard" role="dialog" aria-modal="true" aria-label="${w.editing ? 'Modifier la donne' : 'Nouvelle donne'}">
    <div class="wizard-inner">
      <header class="wizard-head">
        <button class="btn small${w.step === 0 ? ' invisible' : ''}" data-action="wizard-back">${icon('back')} Retour</button>
        <div class="dots" aria-hidden="true">${steps.map((_, i) => `<i class="${i === w.step ? 'on' : i < w.step ? 'done' : ''}"></i>`).join('')}</div>
        <button class="btn small icon-only" data-action="wizard-close" aria-label="Fermer">${icon('close')}</button>
      </header>
      <div class="wizard-heading">
        <h2>${titles[step]}</h2>
        ${recap.length ? `<p class="recap">${recap.join(' · ')}</p>` : ''}
      </div>
      <div class="wizard-body step-${step}" data-scroll="wizard">${body}</div>
    </div>
    ${w.picker ? pickerSheet(game, w) : ''}
  </div>`;
}

// ---------- sheets ----------

function sheetMenu() {
  const game = data.current;
  const tile = (action, iconName, label, attrs = '') =>
    `<button class="menu-tile" data-action="${action}" ${attrs}>${icon(iconName)}<span>${label}</span></button>`;
  return `
    <h2>Menu</h2>
    <div class="menu-grid">
      ${tile('show-stats', 'chart', 'Statistiques')}
      ${tile('show-rules', 'book', 'Récap des règles', 'data-scope="game"')}
      ${tile('open-sheet', 'rules', 'Variantes de comptage', 'data-sheet="variants" data-scope="game"')}
      ${tile('open-sheet', 'users', 'Joueurs et partie', 'data-sheet="players" data-scope="game"')}
      ${tile('open-sheet', 'palette', 'Couleurs', 'data-sheet="theme" data-scope="game"')}
      ${tile('share', 'share', 'Partager le score')}
      ${tile('show-history', 'history', 'Historique')}
      ${game.deals.length ? tile('rematch-ask', 'replay', 'Revanche') : ''}
      ${tile('new-game', 'plus', 'Nouvelle partie')}
    </div>
    <button class="btn ghost wide" data-action="close-sheet">Fermer</button>`;
}

function sheetVariants() {
  const scope = ui.sheetScope === 'game' && data.current ? 'game' : 'setup';
  const config = scopeObj(scope);
  return `
    <h2>Variantes de comptage</h2>
    <p class="hint">${
      scope === 'game' ? 'Les scores de la partie en cours sont recalculés tout de suite.' : 'Elles sont retenues pour vos prochaines parties.'
    }</p>
    ${variantsControl(scope, config)}
    <button class="btn wide" data-action="show-rules" data-scope="${scope}">${icon('book')} Voir le récap des règles</button>
    <button class="btn primary wide" data-action="close-sheet">Terminé</button>`;
}

function sheetPlayers() {
  const game = data.current;
  return `
    <h2>Joueurs et partie</h2>
    <section class="group"><h3>Partie en</h3>${targetControl('game', game)}</section>
    <section class="group"><h3>Équipes</h3>${namesControl('game', game)}</section>
    <section class="group"><h3>Donneur de la prochaine donne</h3>${dealerControl('game', game)}</section>
    <section class="group"><h3>Écran</h3>${switchRow('toggle-wakelock', '', 'Garder l\'écran allumé', data.prefs.wakeLock, 'Pendant la partie')}</section>
    <button class="btn primary wide" data-action="close-sheet">Terminé</button>`;
}

function sheetTheme() {
  return `
    <h2>Couleurs</h2>
    <p class="hint">Choisissez l'ambiance de l'appli.</p>
    ${themeControl()}
    <button class="btn primary wide" data-action="close-sheet">Terminé</button>`;
}

function sheetDeal() {
  const game = data.current;
  const computed = computeGame(game);
  const row = computed.rows.find((r) => r.deal.id === ui.sheetData);
  if (!row) return '';
  const { deal } = row;
  const totals = announceTotals(deal);
  const facts = [`Preneur : ${esc(playerName(game, deal.taker))} (${esc(teamName(game, row.takerTeam))})`, `Donneur : ${esc(playerName(game, row.dealer))}`];
  if (deal.tricks === 'takerAll' || deal.tricks === 'defenseAll') facts.push('Capot');
  else if (deal.takerPoints != null) facts.push(`Plis : ${deal.takerPoints} à ${TOTAL_POINTS - deal.takerPoints}`);
  if (deal.belote) facts.push(`Belote : ${esc(teamName(game, deal.belote))}`);
  if (game.rules.announces && (totals.us || totals.them)) {
    facts.push(`Annonces : ${TEAMS.filter((t) => totals[t]).map((t) => `${esc(teamName(game, t))} ${totals[t]}`).join(', ')}`);
  }
  if (row.potAwarded) facts.push(`Litige précédent : +${row.potAwarded.points} pour ${esc(teamName(game, row.potAwarded.team))}`);

  return `
    <h2>Donne ${row.index + 1} · ${dealTitleHtml(game, deal)}</h2>
    <p class="deal-result ${row.made ? 'ok' : 'ko'}">${dealStatus(game, row)}</p>
    <div class="scoreline compact">
      <div class="us"><span>${esc(teamName(game, 'us'))}</span><strong>+${row.score.us}</strong></div>
      <div class="them"><span>${esc(teamName(game, 'them'))}</span><strong>+${row.score.them}</strong></div>
    </div>
    <ul class="facts">${facts.map((fact) => `<li>${fact}</li>`).join('')}</ul>
    <button class="btn primary wide" data-action="edit-deal">${icon('edit')} Modifier</button>
    <button class="btn ghost wide danger" data-action="delete-deal">${icon('trash')} Supprimer cette donne</button>
    <button class="btn ghost wide" data-action="close-sheet">Fermer</button>`;
}

function sheetEnd() {
  const game = data.current;
  const computed = computeGame(game);
  if (!computed.winner) return '';
  const loser = computed.winner === 'us' ? 'them' : 'us';
  return `
    <div class="end ${computed.winner}">
      <div class="trophy">${icon('trophy')}</div>
      <p class="end-label">Victoire de</p>
      <h2>${esc(teamName(game, computed.winner))}</h2>
      <p class="end-score"><strong>${computed.totals[computed.winner]}</strong> à ${computed.totals[loser]}</p>
    </div>
    <button class="btn primary wide" data-action="share">${icon('share')} Partager le score</button>
    <button class="btn wide" data-action="rematch">${icon('replay')} Revanche</button>
    <button class="btn wide" data-action="show-stats">${icon('chart')} Voir les statistiques</button>
    <button class="btn ghost wide" data-action="close-sheet">Fermer</button>`;
}

function viewSheet() {
  const needsGame = ['menu', 'players', 'deal', 'end'].includes(ui.sheet);
  if (needsGame && !data.current) return '';
  const content = { menu: sheetMenu, variants: sheetVariants, players: sheetPlayers, theme: sheetTheme, deal: sheetDeal, end: sheetEnd }[ui.sheet]?.();
  if (!content) return '';
  return `
  <div class="backdrop${ui.sheet === 'end' ? ' centered' : ''}" data-action="close-sheet" data-self="1">
    <div class="sheet sheet-${ui.sheet}" role="dialog" aria-modal="true" data-scroll="sheet">${content}</div>
  </div>`;
}

function viewConfirm() {
  const { title, text, yes, danger } = ui.confirm;
  return `
  <div class="backdrop centered top" data-action="confirm-no" data-self="1">
    <div class="sheet sheet-confirm" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
      <h2>${esc(title)}</h2>
      ${text ? `<p>${esc(text)}</p>` : ''}
      <button class="btn ${danger ? 'danger-solid' : 'primary'} wide" data-action="confirm-yes">${esc(yes)}</button>
      <button class="btn ghost wide" data-action="confirm-no">Non, revenir</button>
    </div>
  </div>`;
}

function askConfirm(options, run) {
  ui.confirm = { ...options, run };
  render();
}

// ---------- rendering ----------

function render() {
  const game = data.current;
  if (!game && (ui.view === 'board' || (ui.view === 'stats' && !ui.statsGame))) ui.view = 'setup';

  let html;
  if (ui.view === 'board') html = viewBoard(game);
  else if (ui.view === 'stats') html = viewStats(ui.statsGame ?? game);
  else if (ui.view === 'history') html = viewHistory();
  else if (ui.view === 'rules') html = viewRules();
  else html = viewSetup();

  if (ui.wizard && game) html += viewWizard(game);
  if (ui.sheet) html += viewSheet();
  if (ui.confirm) html += viewConfirm();

  const scrolls = [...app.querySelectorAll('[data-scroll]')].map((el) => [el.dataset.scroll, el.scrollTop]);
  app.innerHTML = html;
  for (const [key, top] of scrolls) {
    const el = app.querySelector(`[data-scroll="${key}"]`);
    if (el) el.scrollTop = top;
  }
  document.documentElement.classList.toggle('locked', Boolean(ui.wizard || ui.sheet || ui.confirm));
}

function switchView(view) {
  ui.view = view;
  ui.sheet = null;
  ui.sheetData = null;
  render();
  window.scrollTo(0, 0);
}

function commit(scope) {
  if (scope === 'game' && data.current) save();
  render();
}

// ---------- sharing ----------

function themeColors() {
  const style = getComputedStyle(document.documentElement);
  const read = (name) => style.getPropertyValue(name).trim();
  return {
    bg: read('--bg'),
    surface: read('--surface'),
    text: read('--text'),
    muted: read('--muted'),
    accent: read('--accent'),
    accentInk: read('--accent-ink'),
    us: read('--us'),
    them: read('--them'),
  };
}

function sharePayload(game) {
  const computed = computeGame(game);
  const date = new Date(game.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const side = (team) => ({
    name: teamName(game, team),
    score: computed.totals[team],
    players: teamPlayers(team)
      .map((p) => playerName(game, p))
      .join(' et '),
  });
  const card = {
    title: APP_NAME,
    subtitle: `${MODE_LABELS[game.mode]} · ${date}`,
    footer: `${plural(game.deals.length, 'donne')} · partie en ${fmt(game.rules.target)} points`,
    winner: computed.winner,
    us: side('us'),
    them: side('them'),
    colors: themeColors(),
  };
  let text = `${MODE_LABELS[game.mode]} : ${card.us.name} ${card.us.score} - ${card.them.score} ${card.them.name} (${plural(game.deals.length, 'donne')}).`;
  if (computed.winner) text += ` Victoire de ${teamName(game, computed.winner)} !`;
  return { card, text };
}

// ---------- actions ----------

const actions = {
  // Setup, rules and appearance
  'set-mode'(d) {
    ui.setup.mode = d.value;
    render();
  },
  'set-target'(d) {
    scopeObj(d.scope).rules.target = Number(d.value);
    ui.customTarget[d.scope] = false;
    commit(d.scope);
  },
  'custom-target'(d) {
    ui.customTarget[d.scope] = true;
    render();
  },
  'set-rule'(d) {
    scopeObj(d.scope).rules[d.key] = d.value;
    commit(d.scope);
  },
  'toggle-rule'(d) {
    const { rules } = scopeObj(d.scope);
    rules[d.key] = !rules[d.key];
    commit(d.scope);
  },
  'reset-rules'(d) {
    const config = scopeObj(d.scope);
    config.rules = { ...DEFAULT_RULES, target: config.rules.target };
    commit(d.scope);
    toast('Règles classiques rétablies');
  },
  'set-dealer'(d) {
    const config = scopeObj(d.scope);
    const played = d.scope === 'game' ? config.deals.length : 0;
    config.firstDealer = (((Number(d.value) - 3 * played) % 4) + 4) % 4;
    commit(d.scope);
  },
  'set-theme'(d) {
    data.prefs.theme = d.value;
    save();
    applyTheme();
    render();
  },
  'toggle-wakelock'() {
    data.prefs.wakeLock = !data.prefs.wakeLock;
    save();
    syncWakeLock();
    render();
  },
  'start-game'() {
    startGame(ui.setup);
    window.scrollTo(0, 0);
  },
  resume() {
    switchView('board');
  },
  'show-rules'(d) {
    ui.rulesScope = d.scope === 'game' && data.current ? 'game' : 'setup';
    switchView('rules');
  },
  'rules-back'() {
    switchView(ui.rulesScope === 'game' && data.current ? 'board' : 'setup');
  },

  // Board
  'open-sheet'(d) {
    ui.sheet = d.sheet;
    ui.sheetScope = d.scope ?? 'game';
    render();
  },
  'close-sheet'() {
    ui.sheet = null;
    ui.sheetData = null;
    render();
  },
  'new-deal'() {
    openWizard();
  },
  undo() {
    const game = data.current;
    if (!game.deals.length) return;
    askConfirm({ title: 'Annuler la dernière donne ?', text: `La donne ${game.deals.length} sera effacée.`, yes: 'Oui, annuler la donne', danger: true }, () => {
      game.deals.pop();
      save();
      toast('Dernière donne annulée');
    });
  },
  'open-deal'(d) {
    ui.sheet = 'deal';
    ui.sheetData = d.id;
    render();
  },
  'edit-deal'() {
    const id = ui.sheetData;
    ui.sheet = null;
    ui.sheetData = null;
    openWizard(id);
  },
  'delete-deal'() {
    const id = ui.sheetData;
    askConfirm({ title: 'Supprimer cette donne ?', text: 'Les scores seront recalculés.', yes: 'Oui, supprimer', danger: true }, () => {
      const game = data.current;
      game.deals = game.deals.filter((deal) => deal.id !== id);
      ui.sheet = null;
      ui.sheetData = null;
      save();
      toast('Donne supprimée');
    });
  },
  'show-stats'() {
    ui.statsGame = null;
    switchView('stats');
  },
  'stats-back'() {
    if (ui.statsGame) {
      ui.statsGame = null;
      switchView('history');
    } else {
      switchView(data.current ? 'board' : 'setup');
    }
  },
  'show-history'() {
    switchView('history');
  },
  'history-back'() {
    switchView(data.current ? 'board' : 'setup');
  },
  'open-past'(d) {
    ui.statsGame = data.history.find((game) => game.id === d.id) ?? null;
    if (ui.statsGame) switchView('stats');
  },
  'delete-past'(d) {
    askConfirm({ title: 'Supprimer cette partie ?', text: 'Elle sera retirée de l\'historique.', yes: 'Oui, supprimer', danger: true }, () => {
      data.history = data.history.filter((game) => game.id !== d.id);
      save();
    });
  },
  'new-game'() {
    ui.setup = newSetupDraft();
    ui.customTarget.setup = false;
    switchView('setup');
  },
  'rematch-ask'() {
    const game = data.current;
    if (computeGame(game).winner) {
      rematch();
      return;
    }
    askConfirm({ title: 'Lancer une revanche ?', text: 'La partie en cours sera rangée dans l\'historique.', yes: 'Oui, revanche' }, rematch);
  },
  rematch() {
    rematch();
  },
  async share() {
    const game = ui.view === 'stats' && ui.statsGame ? ui.statsGame : data.current;
    if (!game) return;
    const { card, text } = sharePayload(game);
    const outcome = await shareScoreCard(card, text);
    if (outcome === 'downloaded') toast('Image du score enregistrée');
  },
  async 'copy-score'() {
    const game = ui.statsGame ?? data.current;
    if (!game) return;
    const ok = await copyText(sharePayload(game).text);
    toast(ok ? 'Score copié' : 'Copie impossible sur cet appareil');
  },
  'confirm-yes'() {
    const { run } = ui.confirm;
    ui.confirm = null;
    run();
    render();
  },
  'confirm-no'() {
    ui.confirm = null;
    render();
  },

  // Wizard
  'wizard-back'() {
    const w = ui.wizard;
    if (w.step === 0) ui.wizard = null;
    else w.step -= 1;
    render();
  },
  'wizard-close'() {
    ui.wizard = null;
    render();
  },
  'pick-taker'(d) {
    const w = ui.wizard;
    w.draft.taker = Number(d.value);
    w.side = 'taker';
    w.digits = w.draft.takerPoints != null ? String(w.draft.takerPoints) : '';
    w.step += 1;
    render();
  },
  'pick-contract'(d) {
    const w = ui.wizard;
    const contract = isSpecialContract(d.value) ? d.value : Number(d.value);
    if (contract !== w.draft.contract) {
      w.draft.tricks = 'normal';
      w.draft.forcedOutcome = null;
    }
    w.draft.contract = contract;
    w.step += 1;
    render();
  },
  'pick-suit'(d) {
    const w = ui.wizard;
    w.draft.suit = d.value;
    w.step += 1;
    render();
  },
  'open-picker'(d) {
    ui.wizard.picker = d.picker;
    render();
  },
  'close-picker'() {
    ui.wizard.picker = null;
    render();
  },
  'set-multiplier'(d) {
    ui.wizard.draft.multiplier = Number(d.value);
    ui.wizard.picker = null;
    render();
  },
  'set-belote'(d) {
    ui.wizard.draft.belote = d.value || null;
    ui.wizard.picker = null;
    render();
  },
  'announce-team'(d) {
    ui.wizard.announceTeam = d.value;
    render();
  },
  'add-announce'(d) {
    const w = ui.wizard;
    w.draft.announces.push({ team: w.announceTeam, kind: d.kind });
    render();
  },
  'remove-announce'(d) {
    ui.wizard.draft.announces.splice(Number(d.index), 1);
    render();
  },
  'pick-side'(d) {
    const w = ui.wizard;
    w.side = d.side;
    const points = w.draft.takerPoints;
    w.digits = points == null ? '' : String(w.side === 'taker' ? points : TOTAL_POINTS - points);
    render();
  },
  key(d) {
    const w = ui.wizard;
    const next = (w.digits + d.value).replace(/^0+(?=\d)/, '');
    if (Number(next) > TOTAL_POINTS) {
      toast(`Une donne compte ${TOTAL_POINTS} points au maximum`);
      return;
    }
    w.digits = next;
    w.draft.tricks = 'normal';
    applyDigits(w);
    render();
  },
  'key-back'() {
    const w = ui.wizard;
    if (w.draft.tricks !== 'normal') w.draft.tricks = 'normal';
    else w.digits = w.digits.slice(0, -1);
    applyDigits(w);
    render();
  },
  'key-capot'() {
    const w = ui.wizard;
    const target = w.side === 'taker' ? 'takerAll' : 'defenseAll';
    w.draft.tricks = w.draft.tricks === target ? 'normal' : target;
    w.digits = '';
    w.draft.takerPoints = null;
    render();
  },
  'save-deal'() {
    const { draft } = ui.wizard;
    if (draft.tricks === 'normal' && draft.takerPoints == null) return;
    draft.forcedOutcome = null;
    saveDraft();
  },
  'save-outcome'(d) {
    const { draft } = ui.wizard;
    draft.takerPoints = null;
    draft.forcedOutcome = d.value;
    draft.tricks = d.value === 'made' && isSpecialContract(draft.contract) ? 'takerAll' : 'normal';
    saveDraft();
  },
};

function applyDigits(w) {
  if (w.digits === '') {
    w.draft.takerPoints = null;
    return;
  }
  const typed = Number(w.digits);
  w.draft.takerPoints = w.side === 'taker' ? typed : TOTAL_POINTS - typed;
}

// ---------- events ----------

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  if (el.dataset.self && event.target !== el) return; // backdrops only react to direct clicks
  const handler = actions[el.dataset.action];
  if (handler) handler(el.dataset, el);
});

document.addEventListener('input', (event) => {
  const el = event.target.closest('[data-field]');
  if (!el) return;
  const config = scopeObj(el.dataset.scope);
  if (el.type === 'number') {
    const value = Math.round(Number(el.value));
    if (value >= 100 && value <= 10000) setPath(config, el.dataset.field, value);
  } else {
    setPath(config, el.dataset.field, el.value);
    // Keep the dealer chips in sync without re-rendering (which would drop focus).
    const match = el.dataset.field.match(/^players\.(\d)$/);
    if (match) {
      for (const chip of document.querySelectorAll(`[data-name-of="${match[1]}"]`)) {
        chip.textContent = playerName(config, Number(match[1]));
      }
    }
  }
  if (el.dataset.scope === 'game') save();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (ui.confirm) actions['confirm-no']();
  else if (ui.wizard?.picker) actions['close-picker']();
  else if (ui.sheet) actions['close-sheet']();
  else if (ui.wizard) actions['wizard-close']();
});

// ---------- screen wake lock ----------

let wakeLock = null;

async function syncWakeLock() {
  if (!('wakeLock' in navigator)) return;
  const wanted = data.prefs.wakeLock && Boolean(data.current) && document.visibilityState === 'visible';
  try {
    if (wanted && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } else if (!wanted && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    // Wake lock refused (battery saver, unsupported): not critical.
  }
}

document.addEventListener('visibilitychange', syncWakeLock);

// ---------- startup ----------

applyTheme();
render();
syncWakeLock();

const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator && (!isLocalhost || new URLSearchParams(location.search).has('sw'))) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
