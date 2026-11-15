import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeGame, dealerAt, roundToTen, scoreDeal } from '../js/scoring.js';
import { computeStats } from '../js/stats.js';

const pointsRules = { target: 1000, counting: 'points', rounding: true, announces: true };
const contractRules = { ...pointsRules, counting: 'contract' };
const classicRules = { target: 1000, announces: true };

const coinche = (overrides) => ({
  taker: 0,
  contract: 100,
  suit: 'hearts',
  multiplier: 1,
  belote: null,
  announces: [],
  takerPoints: null,
  tricks: 'normal',
  forcedOutcome: null,
  ...overrides,
});

const classic = (overrides) => ({
  taker: 0,
  belote: null,
  announces: [],
  takerPoints: null,
  tricks: 'normal',
  ...overrides,
});

test('rounds to the nearest ten, five rounds up', () => {
  assert.equal(roundToTen(84), 80);
  assert.equal(roundToTen(85), 90);
  assert.equal(roundToTen(162), 160);
});

test('dealer rotates counter-clockwise', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => dealerAt(0, i)), [0, 3, 2, 1, 0]);
});

test('coinche: contract made scores contract plus rounded points', () => {
  const result = scoreDeal(coinche({ takerPoints: 112 }), 'coinche', pointsRules);
  assert.equal(result.made, true);
  assert.equal(result.us, 100 + 110);
  assert.equal(result.them, 50);
});

test('coinche: exact points when rounding is off', () => {
  const result = scoreDeal(coinche({ takerPoints: 112 }), 'coinche', { ...pointsRules, rounding: false });
  assert.equal(result.us, 212);
  assert.equal(result.them, 50);
});

test('coinche: failed contract gives 160 plus contract to the defense', () => {
  const result = scoreDeal(coinche({ takerPoints: 92 }), 'coinche', pointsRules);
  assert.equal(result.made, false);
  assert.equal(result.us, 0);
  assert.equal(result.them, 260);
});

test('coinche: taker on the other team', () => {
  const result = scoreDeal(coinche({ taker: 1, contract: 80, takerPoints: 81 }), 'coinche', pointsRules);
  assert.equal(result.takerTeam, 'them');
  assert.equal(result.them, 80 + 80);
  assert.equal(result.us, 80);
});

test('coinche: belote counts toward the contract and stays with its holder', () => {
  const made = scoreDeal(coinche({ takerPoints: 82, belote: 'us' }), 'coinche', pointsRules);
  assert.equal(made.made, true);
  assert.equal(made.us, 100 + 80 + 20);
  assert.equal(made.them, 80);

  const failed = scoreDeal(coinche({ takerPoints: 70, belote: 'us' }), 'coinche', pointsRules);
  assert.equal(failed.made, false);
  assert.equal(failed.us, 20);
  assert.equal(failed.them, 260);
});

test('coinche: coinched contracts are winner takes all', () => {
  const made = scoreDeal(coinche({ takerPoints: 120, multiplier: 2 }), 'coinche', pointsRules);
  assert.equal(made.us, 200 + 160);
  assert.equal(made.them, 0);

  const failed = scoreDeal(coinche({ takerPoints: 60, multiplier: 4 }), 'coinche', pointsRules);
  assert.equal(failed.us, 0);
  assert.equal(failed.them, 400 + 160);
});

test('coinche: announced capot', () => {
  const made = scoreDeal(coinche({ contract: 'capot', tricks: 'takerAll' }), 'coinche', pointsRules);
  assert.equal(made.made, true);
  assert.equal(made.us, 500);
  assert.equal(made.them, 0);

  const failed = scoreDeal(coinche({ contract: 'capot', forcedOutcome: 'failed' }), 'coinche', pointsRules);
  assert.equal(failed.made, false);
  assert.equal(failed.them, 250 + 160);
});

test('coinche: unannounced capot scores 250 card points', () => {
  const result = scoreDeal(coinche({ contract: 120, tricks: 'takerAll' }), 'coinche', pointsRules);
  assert.equal(result.us, 120 + 250);
  assert.equal(result.them, 0);
});

test('coinche: announces go to their team, or to the winner on a failed contract', () => {
  const announces = [
    { team: 'us', kind: 'tierce' },
    { team: 'them', kind: 'cinquante' },
  ];
  const made = scoreDeal(coinche({ takerPoints: 100, announces }), 'coinche', pointsRules);
  assert.equal(made.us, 100 + 100 + 20);
  assert.equal(made.them, 60 + 50);

  const failed = scoreDeal(coinche({ takerPoints: 60, announces }), 'coinche', pointsRules);
  assert.equal(failed.us, 0);
  assert.equal(failed.them, 100 + 160 + 70);

  const ignored = scoreDeal(coinche({ takerPoints: 100, announces }), 'coinche', { ...pointsRules, announces: false });
  assert.equal(ignored.us, 200);
});

test('coinche: contract-only counting', () => {
  const made = scoreDeal(coinche({ forcedOutcome: 'made', multiplier: 2 }), 'coinche', contractRules);
  assert.equal(made.us, 200);
  assert.equal(made.them, 0);

  const failed = scoreDeal(coinche({ forcedOutcome: 'failed', belote: 'us' }), 'coinche', contractRules);
  assert.equal(failed.us, 20);
  assert.equal(failed.them, 100);
});

test('classic: made, failed and capot', () => {
  const made = scoreDeal(classic({ takerPoints: 90 }), 'classic', classicRules);
  assert.deepEqual([made.made, made.us, made.them], [true, 90, 72]);

  const failed = scoreDeal(classic({ takerPoints: 70 }), 'classic', classicRules);
  assert.deepEqual([failed.made, failed.us, failed.them], [false, 0, 162]);

  const capot = scoreDeal(classic({ taker: 1, tricks: 'takerAll', belote: 'them' }), 'classic', classicRules);
  assert.deepEqual([capot.made, capot.us, capot.them], [true, 0, 272]);
});

test('classic: belote can save the taker', () => {
  const result = scoreDeal(classic({ takerPoints: 75, belote: 'us' }), 'classic', classicRules);
  assert.deepEqual([result.made, result.us, result.them], [true, 95, 87]);
});

test('classic: a tie puts the taker points in a pot for the next winner', () => {
  const game = {
    mode: 'classic',
    rules: classicRules,
    firstDealer: 0,
    deals: [classic({ takerPoints: 81 }), classic({ taker: 1, takerPoints: 100 })],
  };
  const computed = computeGame(game);
  assert.equal(computed.rows[0].litige, true);
  assert.deepEqual(computed.rows[0].score, { us: 0, them: 81 });
  assert.deepEqual(computed.rows[1].potAwarded, { team: 'them', points: 81 });
  assert.deepEqual(computed.totals, { us: 62, them: 81 + 100 + 81 });
  assert.equal(computed.pot, 0);
});

test('game: winner once the target is reached, next dealer and stats', () => {
  const game = {
    mode: 'coinche',
    rules: { ...pointsRules, target: 500 },
    firstDealer: 2,
    deals: [
      coinche({ takerPoints: 112 }),
      coinche({ taker: 1, contract: 90, takerPoints: 50, suit: 'spades' }),
      coinche({ contract: 130, takerPoints: 140, belote: 'us' }),
    ],
  };
  const computed = computeGame(game);
  assert.deepEqual(computed.totals, { us: 210 + 250 + 290, them: 50 + 0 + 20 });
  assert.equal(computed.winner, 'us');
  assert.equal(computed.nextDealer, dealerAt(2, 3));

  const stats = computeStats(game, computed);
  assert.equal(stats.teams.us.taken, 2);
  assert.equal(stats.teams.us.successRate, 100);
  assert.equal(stats.teams.them.failed, 1);
  assert.equal(stats.teams.us.averageContract, 115);
  assert.equal(stats.teams.us.belotes, 1);
  assert.deepEqual(stats.suits, { hearts: 2, spades: 1 });
  assert.equal(stats.players[0].taken, 2);
});
