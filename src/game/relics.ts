import type { RelicId } from './types';

export interface RelicInfo {
  id: RelicId;
  name: string;
  desc: string;
}

export const RELICS: RelicInfo[] = [
  { id: 'temper_oil', name: '담금질 기름', desc: '파괴 확률이 25% 줄어든다.' },
  { id: 'lucky_nail', name: '행운의 못', desc: '대성공 확률 +6%p.' },
  { id: 'merchant_seal', name: '상인의 인장', desc: '검을 25% 비싸게 판다.' },
  { id: 'big_bellows', name: '큰 풀무', desc: '하루 타격 횟수 +2.' },
  { id: 'scrap_magnet', name: '고철 자석', desc: '검이 파괴되면 가치의 30%를 돌려받는다.' },
  { id: 'callus_glove', name: '굳은살 장갑', desc: '손상 확률이 절반이 된다.' },
  { id: 'waiting_stone', name: '기다림의 숫돌', desc: '유지 다음 타격은 성공 확률 +15%p.' },
  { id: 'iron_maul', name: '무쇠 메', desc: '대성공이 +3단계가 된다.' },
  { id: 'old_ledger', name: '낡은 장부', desc: '세금이 15% 줄어든다.' },
  { id: 'ember_heart', name: '불씨 심장', desc: '매일 첫 타격은 파괴되지 않는다.' },
];

export function relicInfo(id: RelicId): RelicInfo {
  return RELICS.find((r) => r.id === id)!;
}
