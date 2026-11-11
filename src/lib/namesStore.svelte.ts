import { addName, isValidNames, removeName, touchNames } from './names';

const STORAGE_KEY = 'molkky-names-v1';

// Reactive list of saved player names that components read from. It is an object so the
// exported binding stays the same while `list` is replaced (never mutated) on every change.
export const savedNames = $state<{ list: string[] }>({ list: [] });

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedNames.list));
  } catch {
    // Storage can be unavailable (private mode, full); names just are not remembered
  }
}

// Reads the stored list. A missing or bad value gives an empty list and never throws.
export function loadSavedNames() {
  savedNames.list = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const stored: unknown = JSON.parse(raw);
    if (isValidNames(stored)) savedNames.list = stored;
  } catch {
    // Corrupt value: ignore it, the next save overwrites it
  }
}

export function saveName(name: string) {
  savedNames.list = addName(savedNames.list, name);
  save();
}

export function forgetName(name: string) {
  savedNames.list = removeName(savedNames.list, name);
  save();
}

export function toggleSavedName(name: string) {
  if (savedNames.list.includes(name.trim())) forgetName(name);
  else saveName(name);
}

// Call when a game starts: saved names that are playing move to the front.
export function markPlayed(names: string[]) {
  const next = touchNames(savedNames.list, names);
  if (next.join('\n') === savedNames.list.join('\n')) return;
  savedNames.list = next;
  save();
}

loadSavedNames();
