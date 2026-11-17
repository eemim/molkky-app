<script lang="ts" module>
  // 1 → "1st", 2 → "2nd", 11 → "11th", 22 → "22nd"
  export function ordinal(place: number): string {
    const tens = place % 100;
    if (tens >= 11 && tens <= 13) return `${place}th`;
    const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[place % 10] ?? 'th';
    return `${place}${suffix}`;
  }
</script>

<script lang="ts">
  import Icon from './Icon.svelte';

  // Badge for a player or team that reached 50: solid gold, silver or bronze for the first
  // three, plain after that. The place is always written out, and the winner gets a crown,
  // so colour is never the only cue. `label` replaces "1st" where the rank is shown elsewhere.
  let { place, label }: { place: number; label?: string } = $props();

  let kind = $derived(['gold', 'silver', 'bronze'][place - 1] ?? 'plain');
</script>

<span class={['badge', kind]}>
  {#if place === 1}
    <Icon name="crown" size={16} />
  {/if}
  {label ?? ordinal(place)}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 2px var(--space-2);
    border-radius: 999px;
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .gold {
    background: var(--gold);
  }
  .silver {
    background: var(--silver);
  }
  .bronze {
    background: var(--bronze);
  }
  .plain {
    border: 1px solid var(--border);
    color: var(--text-muted);
  }
</style>
