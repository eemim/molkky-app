import { Game } from '../src/lib/molkky';

// -----------------------------------------------------------------------------
// Test fixtures
// -----------------------------------------------------------------------------

export function gameWithOneFinisher(): Game {
  const game = new Game(['John', 'Jane']);
  // John: 12 + 12 + 12 + 12 + 2 = 50. Jane scores 1 each time.
  for (const pins of [[12], [1], [12], [1], [12], [1], [12], [1], [2, 5]]) {
    game.throw(pins);
  }
  return game;
}
