<script lang="ts">
  import { view, previewEdit, editThrow } from './gameStore.svelte';
  import type { ThrowRow } from './molkky';
 
  let { player, editable = false }: { player: number; editable?: boolean } = $props();
 
  let rows = $derived(view.throws[player] ?? []);
 
  // 0 = miss, 1 to 12 = points
  const options = Array.from({ length: 13 }, (_, i) => i);
 
  function change(row: ThrowRow, select: HTMLSelectElement) {
    const points = Number(select.value);
    if (points === row.points) return;
 
    const removed = previewEdit(row.index, points);
    if (removed === null) {
      select.value = String(row.points);
      return;
    }
 
    if (removed > 0) {
      const throws = removed === 1 ? '1 later throw no longer fits' : `${removed} later throws no longer fit`;
      const ok = confirm(`This changes the game from this throw onward, and ${throws}. They will be removed. Continue?`);
      if (!ok) {
        select.value = String(row.points);
        return;
      }
    }
 
    editThrow(row.index, points);
  }
</script>
 
{#if rows.length === 0}
  <p class="empty">No throws yet.</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>Round</th>
        <th>Points</th>
        <th>Total</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row}
        <tr class:miss={row.points === 0}>
          <td>{row.round}</td>
          <td>
            {#if editable}
              <select
                aria-label={`Round ${row.round} points`}
                onchange={(event) => change(row, event.currentTarget)}
              >
                {#each options as option}
                  <option value={option} selected={option === row.points}>
                    {option === 0 ? 'miss' : option}
                  </option>
                {/each}
              </select>
            {:else}
              {row.points === 0 ? 'miss' : row.points}
            {/if}
          </td>
          <td>{row.total}</td>
          <td class="note">
            {#if row.event === 'finished'}
              reached 50
            {:else if row.event === 'eliminated'}
              out
            {:else if row.event === 'reset'}
              over 50, back to 25
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
 
<style>
  table {
    width: 100%;
    margin-top: 0.5rem;
    border-collapse: collapse;
    font-size: 0.95rem;
  }
  th {
    text-align: left;
    font-weight: 600;
    font-size: 0.8rem;
    color: #666;
    padding: 0.25rem 0.5rem;
  }
  td {
    padding: 0.35rem 0.5rem;
    border-top: 1px solid #ddd;
  }
  select {
    font: inherit;
    padding: 0.15rem 0.25rem;
  }
  .miss td:nth-child(2) {
    color: #c62828;
  }
  .note {
    font-size: 0.8rem;
    color: #555;
  }
  .empty {
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
    color: #666;
  }
</style>
