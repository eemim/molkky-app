import {
  Game,
  rotateTurnOrder,
  validRoster,
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
    validRoster(s.names, s.members) &&
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

// `members` is only given for a team game: one list of members per team name.
export function start(names: string[], members?: string[][]) {
  if (!validRoster(names, members)) return;
  game = new Game(names, members);
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

// Start again with the same players or teams. With `changeTurns`, the last
// player or team goes first and everyone else moves one place later. Team
// members keep their own order.
export function rematch(changeTurns = false) {
  if (!view.state) return;

  const names = view.state.players.map((player) => player.name);
  const members = view.state.players.map((player) => [...player.members]);
  const isTeamGame = members.some((team) => team.length > 0);

  if (changeTurns) {
    start(rotateTurnOrder(names), isTeamGame ? rotateTurnOrder(members) : undefined);
  } else {
    start(names, isTeamGame ? members : undefined);
  }
}

export function reset() {
  game = null;
  sync();
  save();
}

load();
