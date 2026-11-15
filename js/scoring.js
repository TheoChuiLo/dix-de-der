// Pure scoring logic for classic belote and coinche/contree. No DOM access.

export const TOTAL_POINTS = 162;
export const ROUNDED_TOTAL = 160;
export const COINCHE_CAPOT_POINTS = 250;
export const CLASSIC_CAPOT_POINTS = 252;
export const BELOTE_BONUS = 20;

export const NUMERIC_CONTRACTS = [80, 90, 100, 110, 120, 130, 140, 150, 160];
export const EXTENDED_CONTRACTS = [170, 180];
export const SPECIAL_CONTRACTS = { capot: 250, generale: 500 };

// Every rule variant, with the most common table rules as defaults.
export const DEFAULT_RULES = {
  target: 1000,
  // Coinche
  counting: 'points', // 'points' = contract + points won, 'contract' = contract only
  rounding: true, // round card points to the nearest ten
  failedScore: 'both', // defense scores 'both' = 160 + contract, 'points' = 160 only
  coincheScope: 'contract', // multiplier applies to the 'contract' or to the 'total'
  coincheWinnerTakesAll: true, // coinched deal: the winner takes every card point
  surcoinche: true, // x4 offered
  beloteInContract: true, // belote counts toward making the contract
  announcesInContract: true, // takers' announces count toward making the contract
  noTrump: true, // "sans atout" and "tout atout" offered
  generale: true, // "generale" contract offered
  extendedContracts: false, // 170 and 180 offered
  // Both games
  announces: true,
  // Classic belote
  litige: true, // a tie holds the taker's points for the next deal's winner
};

export const withDefaults = (rules) => ({ ...DEFAULT_RULES, ...rules });

export const ANNOUNCE_POINTS = {
  tierce: 20,
  cinquante: 50,
  cent: 100,
  carre: 100,
  carreNeuf: 150,
  carreValets: 200,
};

// Players 0 and 2 (North/South) are "us", players 1 and 3 (East/West) are "them".
export const teamOf = (player) => (player % 2 === 0 ? 'us' : 'them');
export const otherTeam = (team) => (team === 'us' ? 'them' : 'us');

export const isSpecialContract = (contract) => Object.hasOwn(SPECIAL_CONTRACTS, contract);
export const contractValue = (contract) => SPECIAL_CONTRACTS[contract] ?? contract;
export const roundToTen = (n) => Math.floor((n + 5) / 10) * 10;

// The deal rotates counter-clockwise: North -> West -> South -> East.
export const dealerAt = (firstDealer, dealIndex) => (firstDealer + 3 * dealIndex) % 4;

export function announceTotals(deal) {
  const totals = { us: 0, them: 0 };
  for (const announce of deal.announces ?? []) {
    totals[announce.team] += ANNOUNCE_POINTS[announce.kind] ?? 0;
  }
  return totals;
}

// Card points won by each side, or null when only the outcome is known.
function resolveCards(deal, capotPoints) {
  if (deal.tricks === 'takerAll') return { taker: capotPoints, defense: 0 };
  if (deal.tricks === 'defenseAll') return { taker: 0, defense: capotPoints };
  if (typeof deal.takerPoints === 'number') {
    return { taker: deal.takerPoints, defense: TOTAL_POINTS - deal.takerPoints };
  }
  return null;
}

function scoreCoinche(deal, rules) {
  const takerTeam = teamOf(deal.taker);
  const defenseTeam = otherTeam(takerTeam);
  const value = contractValue(deal.contract);
  const multiplier = deal.multiplier || 1;
  const announces = rules.announces ? announceTotals(deal) : { us: 0, them: 0 };
  const takerAnnounces = announces[takerTeam];
  const defenseAnnounces = announces[defenseTeam];
  const takerBelote = deal.belote === takerTeam ? BELOTE_BONUS : 0;
  const defenseBelote = deal.belote === defenseTeam ? BELOTE_BONUS : 0;
  const cards = resolveCards(deal, COINCHE_CAPOT_POINTS);

  const contractHelp = (rules.beloteInContract ? takerBelote : 0) + (rules.announcesInContract ? takerAnnounces : 0);

  let made;
  if (isSpecialContract(deal.contract)) made = deal.tricks === 'takerAll';
  else if (cards) made = cards.taker + contractHelp >= value;
  else made = deal.forcedOutcome === 'made';

  let taker;
  let defense;

  if (rules.counting === 'contract') {
    // Only the contract counts: it goes to whoever wins the deal.
    if (made) {
      taker = value * multiplier + takerBelote + takerAnnounces + (multiplier > 1 ? defenseAnnounces : 0);
      defense = defenseBelote + (multiplier > 1 ? 0 : defenseAnnounces);
    } else {
      taker = takerBelote;
      defense = value * multiplier + defenseBelote + defenseAnnounces + takerAnnounces;
    }
  } else {
    const allPoints = rules.rounding ? ROUNDED_TOTAL : TOTAL_POINTS;
    let takerCards;
    let defenseCards;
    if (cards && deal.tricks !== 'normal' && deal.tricks) {
      takerCards = cards.taker;
      defenseCards = cards.defense;
    } else if (cards && rules.rounding) {
      takerCards = roundToTen(cards.taker);
      defenseCards = ROUNDED_TOTAL - takerCards;
    } else if (cards) {
      takerCards = cards.taker;
      defenseCards = cards.defense;
    } else {
      // Outcome known but not the points: assume the contract was made exactly.
      takerCards = made ? Math.min(value, allPoints) : 0;
      defenseCards = allPoints - takerCards;
    }

    if (made && multiplier === 1) {
      taker = value + takerCards + takerBelote + takerAnnounces;
      defense = defenseCards + defenseBelote + defenseAnnounces;
    } else if (made) {
      // Coinched and made: depending on the variant the taker collects every
      // card point, or each side keeps its own.
      const takesAll = rules.coincheWinnerTakesAll;
      const pot = deal.tricks === 'takerAll' ? COINCHE_CAPOT_POINTS : allPoints;
      const pointsPart = takesAll ? pot : takerCards;
      const base = rules.coincheScope === 'total' ? (value + pointsPart) * multiplier : value * multiplier + pointsPart;
      taker = base + takerBelote + takerAnnounces + (takesAll ? defenseAnnounces : 0);
      defense = defenseBelote + (takesAll ? 0 : defenseCards + defenseAnnounces);
    } else {
      const pot = deal.tricks === 'defenseAll' ? COINCHE_CAPOT_POINTS : allPoints;
      const contractPart = rules.failedScore === 'points' ? 0 : value;
      const base =
        rules.coincheScope === 'total' || contractPart === 0
          ? (contractPart + pot) * multiplier
          : contractPart * multiplier + pot;
      taker = takerBelote;
      defense = base + defenseBelote + defenseAnnounces + takerAnnounces;
    }
  }

  return {
    takerTeam,
    made,
    litige: false,
    pending: 0,
    [takerTeam]: taker,
    [defenseTeam]: defense,
  };
}

function scoreClassic(deal, rules) {
  const takerTeam = teamOf(deal.taker);
  const defenseTeam = otherTeam(takerTeam);
  const announces = rules.announces ? announceTotals(deal) : { us: 0, them: 0 };
  const takerAnnounces = announces[takerTeam];
  const defenseAnnounces = announces[defenseTeam];
  const takerBelote = deal.belote === takerTeam ? BELOTE_BONUS : 0;
  const defenseBelote = deal.belote === defenseTeam ? BELOTE_BONUS : 0;
  const cards = resolveCards(deal, CLASSIC_CAPOT_POINTS) ?? { taker: 0, defense: TOTAL_POINTS };

  const takerTotal = cards.taker + takerBelote + takerAnnounces;
  const defenseTotal = cards.defense + defenseBelote + defenseAnnounces;

  let taker;
  let defense;
  let made = false;
  let litige = false;
  let pending = 0;

  if (takerTotal > defenseTotal) {
    made = true;
    taker = takerTotal;
    defense = defenseTotal;
  } else if (takerTotal === defenseTotal && rules.litige) {
    // Tie: the defense scores, the taker's points go to the winner of the next deal.
    litige = true;
    pending = cards.taker + takerAnnounces;
    taker = takerBelote;
    defense = defenseTotal;
  } else {
    // "Dedans": the defense collects everything.
    const pot = deal.tricks === 'defenseAll' ? CLASSIC_CAPOT_POINTS : TOTAL_POINTS;
    taker = takerBelote;
    defense = pot + defenseBelote + defenseAnnounces + takerAnnounces;
  }

  return { takerTeam, made, litige, pending, [takerTeam]: taker, [defenseTeam]: defense };
}

export function scoreDeal(deal, mode, rules) {
  const fullRules = withDefaults(rules);
  return mode === 'coinche' ? scoreCoinche(deal, fullRules) : scoreClassic(deal, fullRules);
}

// Replays every deal of a game and returns per-deal rows plus running totals.
export function computeGame(game) {
  const totals = { us: 0, them: 0 };
  let pot = 0;

  const rows = game.deals.map((deal, index) => {
    const result = scoreDeal(deal, game.mode, game.rules);
    const score = { us: result.us, them: result.them };
    let potAwarded = null;

    if (result.litige) {
      pot += result.pending;
    } else if (pot > 0 && score.us !== score.them) {
      const winner = score.us > score.them ? 'us' : 'them';
      score[winner] += pot;
      potAwarded = { team: winner, points: pot };
      pot = 0;
    }

    totals.us += score.us;
    totals.them += score.them;

    return {
      index,
      deal,
      takerTeam: result.takerTeam,
      made: result.made,
      litige: result.litige,
      score,
      potAwarded,
      totals: { ...totals },
      dealer: dealerAt(game.firstDealer, index),
    };
  });

  const reached = Math.max(totals.us, totals.them) >= game.rules.target;
  const winner = reached && totals.us !== totals.them ? (totals.us > totals.them ? 'us' : 'them') : null;

  return { rows, totals, pot, winner, nextDealer: dealerAt(game.firstDealer, game.deals.length) };
}
