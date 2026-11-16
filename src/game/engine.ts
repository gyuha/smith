import { nextRandom } from './rng';
import { RELICS } from './relics';
import { OUTCOMES } from './types';
import type { Action, GameState, Outcome, Probs, RelicId } from './types';

export const TOTAL_DAYS = 21;
export const TAX_EVERY = 3;
export const BASE_STRIKES = 10;
/** 납부 회차별 세금 */
export const TAXES = [300, 700, 1500, 2800, 4800, 7500, 11000];

export const SWORD_NAMES = ['무딘 쇠붙이', '벼린 단검', '쓸모 있는 장검', '이름난 명검', '전설이 될 검'];

export function swordName(level: number): string {
  return SWORD_NAMES[Math.min(SWORD_NAMES.length - 1, Math.floor(level / 5))];
}

export function swordValue(level: number): number {
  return Math.round(100 * Math.pow(1.5, level));
}

const has = (s: GameState, id: RelicId) => s.relics.includes(id);

export function sellPrice(s: GameState): number {
  return Math.round(swordValue(s.swordLevel) * (has(s, 'merchant_seal') ? 1.25 : 1));
}

export function strikesPerDay(s: GameState): number {
  return BASE_STRIKES + (has(s, 'big_bellows') ? 2 : 0);
}

export function isTaxDay(day: number): boolean {
  return day % TAX_EVERY === 0;
}

/** 다음에 낼 세금 */
export function nextTax(s: GameState): number {
  const base = TAXES[Math.min(s.taxesPaid, TAXES.length - 1)];
  return Math.round(base * (has(s, 'old_ledger') ? 0.85 : 1));
}

export function nextTaxDay(s: GameState): number {
  return Math.ceil(s.day / TAX_EVERY) * TAX_EVERY;
}

/** 현재 상태에서 다음 타격의 5가지 결과 확률. 합은 항상 1. */
export function strikeProbs(s: GameState): Probs {
  const L = s.swordLevel;
  let destroy = Math.min(0.6, 0.012 * Math.pow(L, 1.3));
  if (has(s, 'temper_oil')) destroy *= 0.75;
  if (has(s, 'ember_heart') && s.strikesToday === 0) destroy = 0;
  let damage = L === 0 ? 0 : 0.08;
  if (has(s, 'callus_glove')) damage /= 2;
  let great = 0.08 + (has(s, 'lucky_nail') ? 0.06 : 0);
  let hold = 0.22;
  let success = Math.max(0.05, 1 - destroy - damage - great - hold);
  if (has(s, 'waiting_stone') && s.heldLast) {
    const shift = Math.min(0.15, hold);
    hold -= shift;
    success += shift;
  }
  const sum = destroy + damage + hold + success + great;
  return {
    destroy: destroy / sum,
    damage: damage / sum,
    hold: hold / sum,
    success: success / sum,
    great: great / sum,
  };
}

export function rollOutcome(p: Probs, r: number): Outcome {
  let acc = 0;
  for (const o of OUTCOMES) {
    acc += p[o];
    if (r < acc) return o;
  }
  return 'great';
}

export function relicPrice(s: GameState): number {
  return Math.round(TAXES[Math.max(0, s.taxesPaid - 1)] * 0.3);
}

export function rerollCost(s: GameState): number {
  return Math.round(TAXES[Math.max(0, s.taxesPaid - 1)] * 0.05) * Math.pow(2, s.rerolls);
}

function drawOffer(s: GameState): GameState {
  const pool = RELICS.map((r) => r.id).filter((id) => !s.relics.includes(id));
  const offer: RelicId[] = [];
  let rng = s.rng;
  while (offer.length < 3 && pool.length > 0) {
    const r = nextRandom(rng);
    rng = r.state;
    offer.push(pool.splice(Math.floor(r.value * pool.length), 1)[0]);
  }
  return { ...s, rng, offer };
}

export function newGame(seed: number): GameState {
  return {
    seed,
    rng: seed | 0,
    scene: 'title',
    day: 1,
    strikesLeft: BASE_STRIKES,
    strikesToday: 0,
    gold: 0,
    swordLevel: 0,
    relics: [],
    offer: [],
    rerolls: 0,
    taxesPaid: 0,
    heldLast: false,
    lastOutcome: null,
    taxDue: 0,
    taxOk: false,
  };
}

function startDay(s: GameState, day: number): GameState {
  const next = { ...s, scene: 'forge' as const, day, strikesToday: 0, offer: [], rerolls: 0 };
  return { ...next, strikesLeft: strikesPerDay(next) };
}

function strike(s: GameState): GameState {
  if (s.strikesLeft <= 0) return s;
  const r = nextRandom(s.rng);
  const outcome = rollOutcome(strikeProbs(s), r.value);
  let { swordLevel, gold } = s;
  if (outcome === 'destroy') {
    if (has(s, 'scrap_magnet')) gold += Math.round(swordValue(swordLevel) * 0.3);
    swordLevel = 0;
  } else if (outcome === 'damage') swordLevel = Math.max(0, swordLevel - 1);
  else if (outcome === 'success') swordLevel += 1;
  else if (outcome === 'great') swordLevel += has(s, 'iron_maul') ? 3 : 2;
  return {
    ...s,
    rng: r.state,
    swordLevel,
    gold,
    strikesLeft: s.strikesLeft - 1,
    strikesToday: s.strikesToday + 1,
    heldLast: outcome === 'hold',
    lastOutcome: outcome,
  };
}

/** 모든 상태 변화는 이 함수 하나로만 일어난다. 난수 상태는 state.rng에 들어 있다. */
export function reduce(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'start':
      return s.scene === 'title' ? drawOffer({ ...s, scene: 'pick' }) : s;
    case 'pick': {
      const id = s.offer[a.index];
      if (s.scene !== 'pick' || !id) return s;
      return startDay({ ...s, relics: [...s.relics, id] }, 1);
    }
    case 'strike':
      return s.scene === 'forge' ? strike(s) : s;
    case 'sell':
      if (s.scene !== 'forge' || s.swordLevel === 0) return s;
      return { ...s, gold: s.gold + sellPrice(s), swordLevel: 0, heldLast: false, lastOutcome: null };
    case 'endDay': {
      if (s.scene !== 'forge') return s;
      if (!isTaxDay(s.day)) return startDay(s, s.day + 1);
      const due = nextTax(s);
      const ok = s.gold >= due;
      return {
        ...s,
        scene: 'tax',
        taxDue: due,
        taxOk: ok,
        gold: ok ? s.gold - due : s.gold,
        taxesPaid: ok ? s.taxesPaid + 1 : s.taxesPaid,
      };
    }
    case 'ack': {
      if (s.scene !== 'tax') return s;
      if (!s.taxOk) return { ...s, scene: 'gameover' };
      if (s.day >= TOTAL_DAYS) return { ...s, scene: 'clear' };
      return drawOffer({ ...s, scene: 'shop', rerolls: 0 });
    }
    case 'buy': {
      const id = s.offer[a.index];
      const price = relicPrice(s);
      if (s.scene !== 'shop' || !id || s.gold < price) return s;
      return {
        ...s,
        gold: s.gold - price,
        relics: [...s.relics, id],
        offer: s.offer.filter((_, i) => i !== a.index),
      };
    }
    case 'reroll': {
      const cost = rerollCost(s);
      if (s.scene !== 'shop' || s.gold < cost) return s;
      return drawOffer({ ...s, gold: s.gold - cost, rerolls: s.rerolls + 1 });
    }
    case 'leaveShop':
      return s.scene === 'shop' ? startDay(s, s.day + 1) : s;
    case 'restart':
      return s.scene === 'gameover' || s.scene === 'clear' ? newGame(s.seed + 1) : s;
  }
}
