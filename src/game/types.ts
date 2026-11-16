export type Outcome = 'destroy' | 'damage' | 'hold' | 'success' | 'great';
export const OUTCOMES: Outcome[] = ['destroy', 'damage', 'hold', 'success', 'great'];

export type Scene = 'title' | 'pick' | 'forge' | 'tax' | 'shop' | 'gameover' | 'clear';

export type RelicId =
  | 'temper_oil'
  | 'lucky_nail'
  | 'merchant_seal'
  | 'big_bellows'
  | 'scrap_magnet'
  | 'callus_glove'
  | 'waiting_stone'
  | 'iron_maul'
  | 'old_ledger'
  | 'ember_heart';

export type Probs = Record<Outcome, number>;

export interface GameState {
  seed: number;
  rng: number;
  scene: Scene;
  day: number;
  strikesLeft: number;
  /** 오늘 이미 친 횟수 */
  strikesToday: number;
  gold: number;
  swordLevel: number;
  relics: RelicId[];
  /** 유물 선택/상점에 놓인 유물 */
  offer: RelicId[];
  rerolls: number;
  /** 지금까지 낸 세금 횟수 */
  taxesPaid: number;
  /** 직전 타격이 '유지'였는가 (기다림의 숫돌) */
  heldLast: boolean;
  lastOutcome: Outcome | null;
  /** 납부 장면에서 보여줄 결과 */
  taxDue: number;
  taxOk: boolean;
}

export type Action =
  | { type: 'start' }
  | { type: 'pick'; index: number }
  | { type: 'strike' }
  | { type: 'sell' }
  | { type: 'endDay' }
  | { type: 'ack' }
  | { type: 'buy'; index: number }
  | { type: 'reroll' }
  | { type: 'leaveShop' }
  | { type: 'restart' };
