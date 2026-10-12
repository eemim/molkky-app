import { Game, type GameState } from './molkky';

const STORAGE_KEY = 'molkky-game-v1';

let game: Game | null = null;

// Reactive snapshot that components read from
export const view = $state<{ state: GameState | null }>({ state: null });

function save() {
  try {
    if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game.history));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode, full); the game still works
  }
}

function isValidState(s: any): s is GameState {
  return (
    s &&
    Array.isArray(s.players) &&
    s.players.length > 0 &&
    typeof s.current === 'number' &&
    typeof s.finishCount === 'number' &&
    typeof s.dropCount === 'number' &&
    typeof s.ended === 'boolean'
  );
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stack = JSON.parse(raw);
    if (!Array.isArray(stack) || stack.length === 0 || !stack.every(isValidState)) return;
    game = Game.fromStack(stack);
    view.state = game.state;
  } catch {
    // Corrupt save: ignore it and start fresh
  }
}

export function start(names: string[]) {
  game = new Game(names);
  view.state = game.state;
  save();
}

export function throwPins(pins: number[]) {
  if (!game) return;
  game.throw(pins);
  view.state = game.state;
  save();
}

export function undo() {
  if (!game) return;
  game.undo();
  view.state = game.state;
  save();
}

export function showResults() {
  if (!game) return;
  game.showResults();
  view.state = game.state;
  save();
}

export function rematch() {
  if (!view.state) return;
  start(view.state.players.map((p) => p.name));
}

export function reset() {
  game = null;
  view.state = null;
  save();
}

load();
