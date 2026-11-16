import { isTaxDay, nextTax, relicPrice, sellPrice, swordValue } from './engine';
import type { Action, GameState } from './types';

/** 단순 정책: 세금의 일정 비율만큼 값이 나가면 팔고, 납부일 마지막에는 무조건 판다. */
export function botAction(s: GameState): Action {
  switch (s.scene) {
    case 'title':
      return { type: 'start' };
    case 'pick':
      return { type: 'pick', index: 0 };
    case 'forge': {
      const need = nextTax(s) - s.gold;
      const price = sellPrice(s);
      const lastChance = isTaxDay(s.day) && s.strikesLeft === 0;
      if (s.swordLevel > 0 && (lastChance || (need > 0 && price >= need) || price >= nextTax(s) * 0.6))
        return { type: 'sell' };
      if (s.strikesLeft > 0) {
        // 이미 세금을 채웠으면 낮은 단계에서만 더 두드린다.
        if (need <= 0 && swordValue(s.swordLevel) >= nextTax(s) * 0.3) return { type: 'endDay' };
        return { type: 'strike' };
      }
      return { type: 'endDay' };
    }
    case 'tax':
      return { type: 'ack' };
    case 'shop':
      if (s.offer.length > 0 && s.gold >= relicPrice(s)) return { type: 'buy', index: 0 };
      return { type: 'leaveShop' };
    default:
      return { type: 'restart' };
  }
}
