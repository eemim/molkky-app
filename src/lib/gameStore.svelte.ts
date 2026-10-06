import { Game, type GameState } from './molkky';

let game: Game | null = null;

// Reactive snapshot that components read from
export const view = $state<{ state: GameState | null }>({ state: null });

export function start(names: string[]) {
  game = new Game(names);
  view.state = game.state;
}

export function throwPins(pins: number[]) {
  if (!game) return;
  game.throw(pins);
  view.state = game.state;
}

export function undo() {
  if (!game) return;
  game.undo();
  view.state = game.state;
}

export function showResults() {
  if (!game) return;
  game.showResults();
  view.state = game.state;
}

export function rematch() {
  if (!view.state) return;
  start(view.state.players.map((p) => p.name));
}

export function reset() {
  game = null;
  view.state = null;
}
