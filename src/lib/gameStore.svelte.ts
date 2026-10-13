import {
  Game,
  validNames,
  type GameState,
  type SavedGame,
  type ThrowRow,
} from "./molkky";

const STORAGE_KEY = "molkky-game-v2";
const OLD_STORAGE_KEY = "molkky-game-v1";

let game: Game | null = null;

// Reactive snapshot that components read from
export const view = $state<{ state: GameState | null; throws: ThrowRow[][] }>({
  state: null,
  throws: [],
});

// Copy the current game into the reactive snapshot
function sync() {
  view.state = game ? game.state : null;
  view.throws = game ? game.throws : [];
}

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
    validNames(s.names) &&
    Array.isArray(s.log) &&
    s.log.every(
      (e: any) =>
        e &&
        (e.type === "results" ||
          (e.type === "throw" &&
            Number.isInteger(e.player) &&
            Number.isInteger(e.points))),
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
    sync();
  } catch {
    // Corrupt save: ignore it and start fresh
  }
}

export function start(names: string[]) {
  if (!validNames(names)) return;
  game = new Game(names);
  sync();
  save();
}

export function throwPins(pins: number[]) {
  if (!game) return;
  game.throw(pins);
  sync();
  save();
}

export function undo() {
  if (!game) return;
  game.undo();
  sync();
  save();
}

// How many later entries an edit would remove (0 = none), or null if invalid.
export function previewEdit(index: number, points: number): number | null {
  if (!game) return null;
  const preview = game.previewEdit(index, points);
  return preview ? preview.removed : null;
}

export function editThrow(index: number, points: number) {
  if (!game) return;
  if (game.applyEdit(index, points)) {
    sync();
    save();
  }
}

export function showResults() {
  if (!game) return;
  game.showResults();
  sync();
  save();
}

export function rematch() {
  if (!view.state) return;
  start(view.state.players.map((p) => p.name));
}

export function reset() {
  game = null;
  sync();
  save();
}

load();
