<script lang="ts">
  import { view } from './gameStore.svelte';

  let { player }: { player: number } = $props();

  let rows = $derived(view.throws[player] ?? []);
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
          <td>{row.points === 0 ? 'miss' : row.points}</td>
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
