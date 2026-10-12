// molkky.ts: pure scoring logic, no UI dependencies

// copilot --resume=1c414ee2-32e2-4811-9c5d-f9f0eba83964

export const TARGET = 50;
export const RESET_TO = 25;
export const MAX_MISSES = 3;

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

export function applyThrow(state: GameState, pins: number[]): GameState {
  if (state.ended) return state;

  const pts = pointsFor(pins);
  const players = state.players.map((p) => ({ ...p }));
  const p = players[state.current];
  let { finishCount, dropCount } = state;

  if (pts === 0) {
    p.misses += 1;
    if (p.misses >= MAX_MISSES) {
      p.eliminated = true;
      dropCount += 1;
      p.eliminatedAt = dropCount;
    }
  } else {
    p.misses = 0;
    p.score += pts;
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

// Undo: keep a stack of past states. Since applyThrow is pure, this is trivial.
export class Game {
  private stack: GameState[];

  constructor(names: string[]) {
    this.stack = [newGame(names)];
  }

  static fromStack(stack: GameState[]): Game {
    const game = new Game([]);
    game.stack = stack;
    return game;
  }

  get history(): GameState[] {
    return this.stack;
  }

  get state(): GameState {
    return this.stack[this.stack.length - 1];
  }

  throw(pins: number[]): void {
    this.stack.push(applyThrow(this.state, pins));
  }

  showResults(): void {
    this.stack.push(endGame(this.state));
  }

  undo(): void {
    if (this.stack.length > 1) this.stack.pop();
  }
}
