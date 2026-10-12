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

// Rebuild every state of a game from its log. states[0] is the start,
// states[i + 1] is the state after log[i]. If an entry doesn't fit (a throw
// by the wrong player, a throw after the end, results too early), the replay
// stops and reports which entry broke.
export function replay(names: string[], log: LogEntry[]): ReplayResult {
  const states: GameState[] = [newGame(names)];

  for (let i = 0; i < log.length; i++) {
    const prev = states[i];
    const entry = log[i];

    if (entry.type === "throw") {
      if (
        prev.ended ||
        prev.current !== entry.player ||
        !Number.isInteger(entry.points) ||
        entry.points < 0 ||
        entry.points > MAX_POINTS
      ) {
        return { ok: false, conflictAt: i };
      }
      states.push(applyPoints(prev, entry.points));
    } else if (entry.type === "results") {
      if (!canShowResults(prev)) return { ok: false, conflictAt: i };
      states.push(endGame(prev));
    } else {
      // Anything that is neither a throw nor a results entry
      return { ok: false, conflictAt: i };
    }
  }

  return { ok: true, states };
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

  throw(pins: number[]): void {
    const prev = this.state;
    if (prev.ended) return;

    const points = pointsFor(pins);
    this.log.push({ type: "throw", player: prev.current, points });
    this.states.push(applyPoints(prev, points));
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
