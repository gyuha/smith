import { describe, expect, it } from 'vitest';
import {
  BASE_STRIKES, TAXES, TOTAL_DAYS, isTaxDay, newGame, nextTax, reduce, relicPrice, rerollCost,
  rollOutcome, sellPrice, strikeProbs, strikesPerDay, swordValue,
} from '../src/game/engine';
import { nextRandom } from '../src/game/rng';
import { RELICS } from '../src/game/relics';
import { OUTCOMES } from '../src/game/types';
import type { Action, GameState, Outcome, RelicId } from '../src/game/types';
import { playOut } from './sim';

const forge = (over: Partial<GameState> = {}): GameState => ({ ...newGame(1), scene: 'forge', ...over });
const run = (s: GameState, ...as: Action[]) => as.reduce(reduce, s);
/** 원하는 결과가 나오는 난수 상태를 찾아 그 상태에서 한 번 친다. */
function strikeWith(s: GameState, want: Outcome): GameState {
  for (let rng = 1; rng < 100000; rng++) {
    if (rollOutcome(strikeProbs(s), nextRandom(rng).value) === want) return reduce({ ...s, rng }, { type: 'strike' });
  }
  throw new Error(`no rng for ${want}`);
}
const sum = (s: GameState) => OUTCOMES.reduce((a, o) => a + strikeProbs(s)[o], 0);

describe('난수와 초기 상태', () => {
  it('같은 시드는 같은 난수열을 만든다', () => {
    const seq = (seed: number) => {
      const out: number[] = [];
      let st = seed;
      for (let i = 0; i < 5; i++) { const r = nextRandom(st); out.push(r.value); st = r.state; }
      return out;
    };
    expect(seq(42)).toEqual(seq(42));
    expect(seq(42)).not.toEqual(seq(43));
    expect(seq(42).every((v) => v >= 0 && v < 1)).toBe(true);
  });
  it('초기 상태는 타이틀, 1일차, 0골드이고 직렬화할 수 있다', () => {
    const s = newGame(7);
    expect(s).toMatchObject({ scene: 'title', day: 1, gold: 0, swordLevel: 0, strikesLeft: BASE_STRIKES });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
  it('같은 시드와 같은 행동열은 같은 상태에 도달한다', () => {
    expect(playOut(5)).toEqual(playOut(5));
  });
});

describe('확률', () => {
  it('단계 0..40에서 확률 합은 1이고 음수가 없다', () => {
    for (let L = 0; L <= 40; L++) {
      const s = forge({ swordLevel: L });
      expect(sum(s)).toBeCloseTo(1, 9);
      for (const o of OUTCOMES) expect(strikeProbs(s)[o]).toBeGreaterThanOrEqual(0);
    }
  });
  it('유물을 하나씩, 그리고 전부 적용해도 확률 합은 1이다', () => {
    const all = RELICS.map((r) => r.id);
    for (const relics of [...all.map((id) => [id]), all]) {
      for (let L = 0; L <= 40; L++) {
        for (const heldLast of [false, true]) {
          for (const strikesToday of [0, 1]) expect(sum(forge({ swordLevel: L, relics, heldLast, strikesToday }))).toBeCloseTo(1, 9);
        }
      }
    }
  });
  it('+0 검은 파괴되지 않고 단계가 오를수록 파괴 확률이 커진다', () => {
    expect(strikeProbs(forge()).destroy).toBe(0);
    expect(strikeProbs(forge({ swordLevel: 12 })).destroy).toBeGreaterThan(strikeProbs(forge({ swordLevel: 6 })).destroy);
  });
  it('검 가치는 단계마다 1.5배로 오른다', () => {
    expect(swordValue(0)).toBe(100);
    expect(swordValue(1)).toBe(150);
    expect(swordValue(10)).toBeGreaterThan(swordValue(9));
  });
});

describe('타격 결과 5가지', () => {
  const base = forge({ swordLevel: 8, strikesToday: 1 });
  it('성공은 +1', () => expect(strikeWith(base, 'success').swordLevel).toBe(9));
  it('대성공은 +2', () => expect(strikeWith(base, 'great').swordLevel).toBe(10));
  it('유지는 단계를 그대로 둔다', () => expect(strikeWith(base, 'hold')).toMatchObject({ swordLevel: 8, heldLast: true }));
  it('손상은 -1', () => expect(strikeWith(base, 'damage').swordLevel).toBe(7));
  it('파괴는 검을 +0으로 되돌리고 골드를 주지 않는다', () => {
    expect(strikeWith(base, 'destroy')).toMatchObject({ swordLevel: 0, gold: 0, lastOutcome: 'destroy' });
  });
  it('타격은 남은 횟수를 1 줄이고, 0이면 더 칠 수 없다', () => {
    expect(reduce(base, { type: 'strike' }).strikesLeft).toBe(base.strikesLeft - 1);
    const empty = { ...base, strikesLeft: 0 };
    expect(reduce(empty, { type: 'strike' })).toBe(empty);
  });
});

describe('판매와 하루 진행', () => {
  it('판매하면 가치만큼 골드를 얻고 +0 검을 받는다', () => {
    expect(reduce(forge({ swordLevel: 5 }), { type: 'sell' })).toMatchObject({ gold: swordValue(5), swordLevel: 0 });
  });
  it('+0 검은 팔 수 없다', () => {
    const s = forge();
    expect(reduce(s, { type: 'sell' })).toBe(s);
  });
  it('납부일이 아니면 다음 날로 넘어가고 타격 횟수가 채워지며 검은 유지된다', () => {
    expect(reduce(forge({ swordLevel: 4, strikesLeft: 0 }), { type: 'endDay' })).toMatchObject({ day: 2, strikesLeft: BASE_STRIKES, swordLevel: 4, scene: 'forge' });
  });
  it('납부일은 3일마다 7번이고 세금은 계속 오른다', () => {
    const days = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).filter(isTaxDay);
    expect(days).toEqual([3, 6, 9, 12, 15, 18, 21]);
    expect(TAXES).toHaveLength(7);
    for (let i = 1; i < TAXES.length; i++) expect(TAXES[i]).toBeGreaterThan(TAXES[i - 1]);
  });
});

describe('세금, 게임오버, 클리어', () => {
  it('골드가 충분하면 세금이 빠지고 상점으로 간다', () => {
    const s = run(forge({ day: 3, gold: 1000 }), { type: 'endDay' });
    expect(s).toMatchObject({ scene: 'tax', taxOk: true, gold: 1000 - TAXES[0], taxesPaid: 1 });
    const shop = reduce(s, { type: 'ack' });
    expect(shop.scene).toBe('shop');
    expect(shop.offer).toHaveLength(3);
  });
  it('골드가 모자라면 게임오버가 된다', () => {
    const s = run(forge({ day: 3, gold: TAXES[0] - 1 }), { type: 'endDay' }, { type: 'ack' });
    expect(s.scene).toBe('gameover');
  });
  it('21일차 납부를 통과하면 클리어한다', () => {
    const s = run(forge({ day: 21, taxesPaid: 6, gold: TAXES[6] }), { type: 'endDay' }, { type: 'ack' });
    expect(s).toMatchObject({ scene: 'clear', gold: 0 });
  });
  it('재시작하면 1일차 0골드 타이틀로 돌아간다', () => {
    const over = run(forge({ day: 3, gold: 0, relics: ['temper_oil'] }), { type: 'endDay' }, { type: 'ack' });
    expect(reduce(over, { type: 'restart' })).toMatchObject({ scene: 'title', day: 1, gold: 0, relics: [], swordLevel: 0 });
  });
});

describe('유물 효과', () => {
  const at = (relics: RelicId[], over: Partial<GameState> = {}) => forge({ swordLevel: 10, strikesToday: 1, relics, ...over });
  it('담금질 기름: 파괴 확률 감소', () => expect(strikeProbs(at(['temper_oil'])).destroy).toBeLessThan(strikeProbs(at([])).destroy));
  it('행운의 못: 대성공 확률 증가', () => expect(strikeProbs(at(['lucky_nail'])).great).toBeGreaterThan(strikeProbs(at([])).great));
  it('상인의 인장: 판매가 25% 증가', () => expect(sellPrice(at(['merchant_seal']))).toBe(Math.round(swordValue(10) * 1.25)));
  it('큰 풀무: 하루 타격 +2', () => {
    expect(strikesPerDay(at(['big_bellows']))).toBe(BASE_STRIKES + 2);
    expect(reduce(at(['big_bellows'], { day: 1 }), { type: 'endDay' }).strikesLeft).toBe(BASE_STRIKES + 2);
  });
  it('고철 자석: 파괴 시 가치의 30% 환급', () => expect(strikeWith(at(['scrap_magnet']), 'destroy').gold).toBe(Math.round(swordValue(10) * 0.3)));
  it('굳은살 장갑: 손상 확률 절반', () => expect(strikeProbs(at(['callus_glove'])).damage).toBeLessThan(strikeProbs(at([])).damage * 0.6));
  it('기다림의 숫돌: 유지 다음 타격의 성공 확률 증가', () => {
    expect(strikeProbs(at(['waiting_stone'], { heldLast: true })).success).toBeCloseTo(strikeProbs(at(['waiting_stone'])).success + 0.15, 9);
  });
  it('무쇠 메: 대성공이 +3', () => expect(strikeWith(at(['iron_maul']), 'great').swordLevel).toBe(13));
  it('낡은 장부: 세금 15% 감소', () => expect(nextTax(at(['old_ledger']))).toBe(Math.round(TAXES[0] * 0.85)));
  it('불씨 심장: 그날 첫 타격은 파괴 확률 0', () => {
    expect(strikeProbs(at(['ember_heart'], { strikesToday: 0 })).destroy).toBe(0);
    expect(strikeProbs(at(['ember_heart'], { strikesToday: 1 })).destroy).toBeGreaterThan(0);
  });
});

describe('유물 선택과 상점', () => {
  it('시작하면 서로 다른 유물 3개 중 하나를 무료로 고른다', () => {
    const pick = reduce(newGame(3), { type: 'start' });
    expect(pick.scene).toBe('pick');
    expect(new Set(pick.offer).size).toBe(3);
    const s = reduce(pick, { type: 'pick', index: 1 });
    expect(s).toMatchObject({ scene: 'forge', day: 1, gold: 0, relics: [pick.offer[1]] });
  });
  const shop = () => run(forge({ day: 3, gold: 5000, relics: ['temper_oil'] }), { type: 'endDay' }, { type: 'ack' });
  it('구매하면 골드가 줄고 유물이 늘며 진열에서 빠진다', () => {
    const s = shop();
    const b = reduce(s, { type: 'buy', index: 0 });
    expect(b.gold).toBe(s.gold - relicPrice(s));
    expect(b.relics).toEqual(['temper_oil', s.offer[0]]);
    expect(b.offer).toHaveLength(2);
    expect(s.offer).not.toContain('temper_oil');
  });
  it('골드가 모자라면 살 수 없다', () => {
    const poor = { ...shop(), gold: 0 };
    expect(reduce(poor, { type: 'buy', index: 0 })).toBe(poor);
  });
  it('새로고침은 골드를 쓰고 비용이 두 배가 된다', () => {
    const s = shop();
    const r = reduce(s, { type: 'reroll' });
    expect(r.gold).toBe(s.gold - rerollCost(s));
    expect(rerollCost(r)).toBe(rerollCost(s) * 2);
    expect(r.offer).toHaveLength(3);
  });
  it('상점을 나가면 다음 날 대장간이다', () => expect(reduce(shop(), { type: 'leaveShop' })).toMatchObject({ scene: 'forge', day: 4 }));
});

describe('밸런스', () => {
  it('단순 정책 봇은 시드 1..20에서 일부만 클리어한다(2 이상 18 이하)', () => {
    let wins = 0;
    for (let seed = 1; seed <= 20; seed++) if (playOut(seed).scene === 'clear') wins++;
    expect(wins).toBeGreaterThanOrEqual(2);
    expect(wins).toBeLessThanOrEqual(18);
  });
});
