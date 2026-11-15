// Aggregated statistics for a game, derived from computeGame() rows.

import { contractValue, isSpecialContract, otherTeam } from './scoring.js';

const blankTeam = () => ({
  taken: 0,
  made: 0,
  failed: 0,
  contractSum: 0,
  contractCount: 0,
  coinched: 0,
  belotes: 0,
  capots: 0,
  bestDeal: 0,
});

export function computeStats(game, computed) {
  const teams = { us: blankTeam(), them: blankTeam() };
  const players = [0, 1, 2, 3].map(() => ({ taken: 0, made: 0 }));
  const suits = {};

  for (const row of computed.rows) {
    const { deal, takerTeam } = row;
    const team = teams[takerTeam];

    team.taken += 1;
    players[deal.taker].taken += 1;
    if (row.made) {
      team.made += 1;
      players[deal.taker].made += 1;
    } else if (!row.litige) {
      team.failed += 1;
    }

    if (game.mode === 'coinche') {
      if (!isSpecialContract(deal.contract)) {
        team.contractSum += contractValue(deal.contract);
        team.contractCount += 1;
      }
      if (deal.multiplier > 1) team.coinched += 1;
      if (deal.suit) suits[deal.suit] = (suits[deal.suit] ?? 0) + 1;
    }

    if (deal.belote) teams[deal.belote].belotes += 1;
    if (deal.tricks === 'takerAll') team.capots += 1;
    if (deal.tricks === 'defenseAll') teams[otherTeam(takerTeam)].capots += 1;

    teams.us.bestDeal = Math.max(teams.us.bestDeal, row.score.us);
    teams.them.bestDeal = Math.max(teams.them.bestDeal, row.score.them);
  }

  for (const team of Object.values(teams)) {
    team.successRate = team.taken ? Math.round((team.made / team.taken) * 100) : null;
    team.averageContract = team.contractCount ? Math.round(team.contractSum / team.contractCount) : null;
  }
  for (const player of players) {
    player.successRate = player.taken ? Math.round((player.made / player.taken) * 100) : null;
  }

  return { teams, players, suits, deals: computed.rows.length };
}
