import { newGame, reduce } from '../src/game/engine';
import { botAction } from '../src/game/bot';
import type { GameState } from '../src/game/types';

export function playOut(seed: number): GameState {
  let s = newGame(seed);
  for (let i = 0; i < 5000 && s.scene !== 'gameover' && s.scene !== 'clear'; i++) s = reduce(s, botAction(s));
  return s;
}
