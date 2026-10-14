// Returns a copy of `items` with the item at `from` moved to position `to`.
// Positions outside the list leave the order unchanged.
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length) {
    return copy;
  }

  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
