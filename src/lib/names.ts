// Saved player names: pure list helpers, no Svelte imports.
// Names are kept exactly as typed (only trimmed), so "john" and "John" are different.
// The list is ordered most recently saved or played first.

export const MAX_SAVED_NAMES = 20;
export const MAX_NAME_LENGTH = 100;

// Whether `name` could be added: not blank, not too long, and the list has room.
// A name that is already saved can always be "added" (it just moves to the front).
export function canSave(names: string[], name: string): boolean {
  const trimmed = name.trim();
  if (trimmed === '' || trimmed.length > MAX_NAME_LENGTH) return false;
  return names.includes(trimmed) || names.length < MAX_SAVED_NAMES;
}

// Adds `name` to the front. An already saved name moves to the front instead.
// Returns the list unchanged (as a copy) if the name cannot be saved.
export function addName(names: string[], name: string): string[] {
  const trimmed = name.trim();
  if (!canSave(names, trimmed)) return [...names];
  return [trimmed, ...names.filter((n) => n !== trimmed)];
}

export function removeName(names: string[], name: string): string[] {
  return names.filter((n) => n !== name.trim());
}

// Saved names that were just played move to the front, in the order they were played.
// Names that are not saved are not added.
export function touchNames(names: string[], used: string[]): string[] {
  const played = [...new Set(used.map((n) => n.trim()))].filter((n) => names.includes(n));
  return [...played, ...names.filter((n) => !played.includes(n))];
}

// Strict check for the stored list. Anything unexpected makes the whole list invalid.
export function isValidNames(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_SAVED_NAMES &&
    value.every(
      (n) => typeof n === 'string' && n !== '' && n === n.trim() && n.length <= MAX_NAME_LENGTH,
    ) &&
    new Set(value).size === value.length
  );
}
