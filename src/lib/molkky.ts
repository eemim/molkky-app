// molkky.ts: pure scoring logic, no UI dependencies

export const TARGET = 50;
export const RESET_TO = 25;
export const MAX_MISSES = 3;
export const MAX_POINTS = 12;

export interface Player {
  name: string;
  score: number;
  misses: number; // consecutive misses
  eliminated: boolean;
  finishedAt: number | null; // 1 = first to reach 50, 2 = second, ...
  eliminatedAt: number | null; // 1 = first to drop out, 2 = second, ...
}

export interface GameState {
  players: Player[];
  current: number; // index of the player whose turn it is
  finishCount: number; // how many players have reached 50
  dropCount: number; // how many players have been eliminated
  ended: boolean; // true once the results should be shown
}

export interface RankedPlayer {
  player: Player;
  rank: number;
}

// Everything that happens in a game is one entry in the log.
// points: 0 = miss, 1-12 = what the throw scored.
export type LogEntry =
  { type: "throw"; player: number; points: number } | { type: "results" };

// What gets saved: the names and the log. The state is rebuilt by replaying.
export interface SavedGame {
  names: string[];
  log: LogEntry[];
}

export type ReplayResult =
  { ok: true; states: GameState[] } | { ok: false; conflictAt: number };

// pins = the numbers (1-12) of the pins knocked down. Empty array = miss.
export function pointsFor(pins: number[]): number {
  if (pins.length === 0) return 0;
  if (pins.length === 1) return pins[0]; // single pin: face value
  return pins.length; // 2+ pins: count of pins
}

export function newGame(names: string[]): GameState {
  return {
    players: names.map((name) => ({
      name,
      score: 0,
      misses: 0,
      eliminated: false,
      finishedAt: null,
      eliminatedAt: null,
    })),
    current: 0,
    finishCount: 0,
    dropCount: 0,
    ended: false,
  };
}

// A player still in play: not eliminated and has not reached 50.
export function isActive(p: Player): boolean {
  return !p.eliminated && p.finishedAt === null;
}

// The Results button is enabled once somebody has reached 50.
export function canShowResults(state: GameState): boolean {
  return state.finishCount > 0 && !state.ended;
}

function nextActive(players: Player[], from: number): number {
  for (let i = 1; i <= players.length; i++) {
    const idx = (from + i) % players.length;
    if (isActive(players[idx])) return idx;
  }
  return from;
}

// Core rule: apply a throw worth `points` for the current player.
export function applyPoints(state: GameState, points: number): GameState {
  if (state.ended) return state;

  const players = state.players.map((p) => ({ ...p }));
  const p = players[state.current];
  let { finishCount, dropCount } = state;

  if (points === 0) {
    p.misses += 1;
    if (p.misses >= MAX_MISSES) {
      p.eliminated = true;
      dropCount += 1;
      p.eliminatedAt = dropCount;
    }
  } else {
    p.misses = 0;
    p.score += points;
    if (p.score > TARGET) p.score = RESET_TO;
    if (p.score === TARGET) {
      finishCount += 1;
      p.finishedAt = finishCount;
    }
  }

  // Auto-end: nobody left to play, or one player left and nobody has won yet.
  const active = players.filter(isActive);
  const ended =
    active.length === 0 || (active.length === 1 && finishCount === 0);

  return {
    players,
    current: ended ? state.current : nextActive(players, state.current),
    finishCount,
    dropCount,
    ended,
  };
}

// Same as applyPoints, but takes the knocked-down pins.
export function applyThrow(state: GameState, pins: number[]): GameState {
  return applyPoints(state, pointsFor(pins));
}

// Manual "Results" button. Does nothing until somebody has reached 50.
export function endGame(state: GameState): GameState {
  if (state.finishCount === 0) return state;
  return { ...state, ended: true };
}

// Order: finishers by finishing order, then players still in play by score
// (ties share a rank), then eliminated players, last to drop ranked highest.
export function ranking(state: GameState): RankedPlayer[] {
  const finished = state.players
    .filter((p) => p.finishedAt !== null)
    .sort((a, b) => a.finishedAt! - b.finishedAt!);

  const stillIn = state.players
    .filter(isActive)
    .sort((a, b) => b.score - a.score);

  const dropped = state.players
    .filter((p) => p.eliminated)
    .sort((a, b) => b.eliminatedAt! - a.eliminatedAt!);

  const result: RankedPlayer[] = [];

  finished.forEach((player, i) => result.push({ player, rank: i + 1 }));

  stillIn.forEach((player, i) => {
    const position = finished.length + i + 1;
    const prev = result[result.length - 1];
    const tied = i > 0 && prev.player.score === player.score;
    result.push({ player, rank: tied ? prev.rank : position });
  });

  dropped.forEach((player, i) => {
    result.push({ player, rank: finished.length + stillIn.length + i + 1 });
  });

  return result;
}

function step(prev: GameState, entry: LogEntry): GameState | null {
  if (entry.type === "throw") {
    if (
      prev.ended ||
      prev.current !== entry.player ||
      !Number.isInteger(entry.points) ||
      entry.points < 0 ||
      entry.points > MAX_POINTS
    ) {
      return null;
    }
    return applyPoints(prev, entry.points);
  }

  if (entry.type === "results") {
    return canShowResults(prev) ? endGame(prev) : null;
  }

  return null; // unknown entry type
}

export function replay(names: string[], log: LogEntry[]): ReplayResult {
  const states: GameState[] = [newGame(names)];

  for (let i = 0; i < log.length; i++) {
    const next = step(states[i], log[i]);
    if (!next) return { ok: false, conflictAt: i };
    states.push(next);
  }

  return { ok: true, states };
}

export interface EditPreview {
  log: LogEntry[]; // the log after the edit, cut where entries stop fitting
  states: GameState[]; // states[i + 1] is the state after log[i]
  removed: number; // how many entries were cut off (0 = nothing is lost)
}

export function previewEdit(
  names: string[],
  log: LogEntry[],
  index: number,
  points: number,
): EditPreview | null {
  const entry = log[index];
  if (!entry || entry.type !== "throw") return null;
  if (!Number.isInteger(points) || points < 0 || points > MAX_POINTS)
    return null;

  const edited: LogEntry[] = log.map((e) => ({ ...e }));
  edited[index] = { type: "throw", player: entry.player, points };

  // Replay the edited log and stop at the first entry that no longer fits.
  const states: GameState[] = [newGame(names)];
  const kept: LogEntry[] = [];
  let removed = 0;

  for (let i = 0; i < edited.length; i++) {
    const prev = states[states.length - 1];
    const entry = edited[i];
    const next = step(prev, entry);

    if (next) {
      kept.push(entry);
      states.push(next);
      continue;
    }

    // A throw by a player who is now out or finished is simply dropped.
    // The other players keep throwing in the same order.
    const thrower =
      entry.type === "throw" ? prev.players[entry.player] : undefined;
    if (thrower && !prev.ended && !isActive(thrower)) {
      removed += 1;
      continue;
    }

    // Anything else doesn't fit (the game ended, or somebody who is still in
    // the game would have to throw where the log has no entry): cut the log here.
    removed += edited.length - i;
    break;
  }

  return { log: kept, states, removed };
}

// What a throw did to the player who threw it, when it matters.
export type ThrowEvent = "finished" | "eliminated" | "reset" | null;

export interface ThrowRow {
  index: number; // position in the log (needed later for editing)
  round: number; // this player's 1st, 2nd, 3rd ... throw
  points: number; // 0 = miss
  total: number; // the player's score after this throw
  event: ThrowEvent;
}

// One list of rows per player, in player order.
export function throwTable(
  names: string[],
  log: LogEntry[],
  states: GameState[],
): ThrowRow[][] {
  const table: ThrowRow[][] = names.map(() => []);

  log.forEach((entry, index) => {
    if (entry.type !== "throw") return;

    const before = states[index].players[entry.player];
    const after = states[index + 1].players[entry.player];

    let event: ThrowEvent = null;
    if (after.finishedAt !== null && before.finishedAt === null)
      event = "finished";
    else if (after.eliminated && !before.eliminated) event = "eliminated";
    else if (entry.points > 0 && after.score < before.score) event = "reset";

    const rows = table[entry.player];
    rows.push({
      index,
      round: rows.length + 1,
      points: entry.points,
      total: after.score,
      event,
    });
  });

  return table;
}

// A running game: the log is the truth, states are kept alongside it.
export class Game {
  private names: string[];
  private log: LogEntry[] = [];
  private states: GameState[];

  constructor(names: string[]) {
    this.names = names;
    this.states = [newGame(names)];
  }

  // Returns null if the saved log doesn't replay cleanly.
  static fromSaved(saved: SavedGame): Game | null {
    const result = replay(saved.names, saved.log);
    if (!result.ok) return null;

    const game = new Game([...saved.names]);
    game.log = saved.log.map((entry) => ({ ...entry }));
    game.states = result.states;
    return game;
  }

  get state(): GameState {
    return this.states[this.states.length - 1];
  }

  get saved(): SavedGame {
    return {
      names: [...this.names],
      log: this.log.map((entry) => ({ ...entry })),
    };
  }

  get throws(): ThrowRow[][] {
    return throwTable(this.names, this.log, this.states);
  }

  throw(pins: number[]): void {
    const prev = this.state;
    if (prev.ended) return;

    const points = pointsFor(pins);
    this.log.push({ type: "throw", player: prev.current, points });
    this.states.push(applyPoints(prev, points));
  }

  // What an edit would do, without changing the game.
  previewEdit(index: number, points: number): EditPreview | null {
    return previewEdit(this.names, this.log, index, points);
  }

  // Change one earlier throw. Later entries that no longer fit are removed.
  applyEdit(index: number, points: number): EditPreview | null {
    const preview = this.previewEdit(index, points);
    if (!preview) return null;

    this.log = preview.log;
    this.states = preview.states;
    return preview;
  }

  showResults(): void {
    const prev = this.state;
    if (!canShowResults(prev)) return;

    this.log.push({ type: "results" });
    this.states.push(endGame(prev));
  }

  undo(): void {
    if (this.log.length === 0) return;
    this.log.pop();
    this.states.pop();
  }
}
