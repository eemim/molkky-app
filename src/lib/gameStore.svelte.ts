import { Game, type GameState, type SavedGame } from './molkky';

const STORAGE_KEY = 'molkky-game-v2';
const OLD_STORAGE_KEY = 'molkky-game-v1';

let game: Game | null = null;

// Reactive snapshot that components read from
export const view = $state<{ state: GameState | null }>({ state: null });

function save() {
  try {
    if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game.saved));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode, full); the game still works
  }
}

function isValidSaved(s: any): s is SavedGame {
  return (
    s &&
    Array.isArray(s.names) &&
    s.names.length > 0 &&
    s.names.every((n: unknown) => typeof n === 'string') &&
    Array.isArray(s.log) &&
    s.log.every(
      (e: any) =>
        e &&
        (e.type === 'results' ||
          (e.type === 'throw' && Number.isInteger(e.player) && Number.isInteger(e.points)))
    )
  );
}

function load() {
  try {
    localStorage.removeItem(OLD_STORAGE_KEY); // the old snapshot format is no longer read

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    if (!isValidSaved(saved)) return;

    const restored = Game.fromSaved(saved);
    if (!restored) return;

    game = restored;
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
