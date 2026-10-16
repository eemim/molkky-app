import {
  Game,
  rotateTurnOrder,
  validRoster,
  type GameState,
  type LogEntry,
  type SavedGame,
  type ThrowRow,
} from './molkky';

const STORAGE_KEY = 'molkky-game-v2';
const OLD_STORAGE_KEY = 'molkky-game-v1';

let game: Game | null = null;

// Reactive snapshot that components read from
export const view = $state<{
  state: GameState | null;
  throws: ThrowRow[][];
  editingTeams: boolean; // the "Edit teams" screen is open after a team game
}>({
  state: null,
  throws: [],
  editingTeams: false,
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

// For lintershit
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLogEntry(entry: unknown): entry is LogEntry {
  if (!isRecord(entry)) return false;
  if (entry.type === 'results') return true;

  return entry.type === 'throw' && Number.isInteger(entry.player) && Number.isInteger(entry.points);
}

function isValidSaved(saved: unknown): saved is SavedGame {
  return (
    isRecord(saved) &&
    validRoster(saved.names, saved.members) &&
    Array.isArray(saved.log) &&
    saved.log.every(isLogEntry)
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
  view.editingTeams = false;
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

// Open the "Edit teams" screen, pre-filled with the finished game's teams.
// The finished game stays as it is until a new one is started.
export function editTeams() {
  if (view.state?.ended) view.editingTeams = true;
}

export function cancelEditTeams() {
  view.editingTeams = false;
}

export function reset() {
  game = null;
  view.editingTeams = false;
  sync();
  save();
}

load();
