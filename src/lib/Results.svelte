<script lang="ts">
  import { view, undo, rematch, reset } from './gameStore.svelte';
  import { ranking } from './molkky';

  let rows = $derived(view.state ? ranking(view.state) : []);
</script>

{#if view.state && rows.length > 0}
  <section class="results">
    <h1>{rows[0].player.name} wins!</h1>

    <ol>
      {#each rows as { player, rank }}
        <li class:finished={player.finishedAt !== null} class:eliminated={player.eliminated}>
          <span class="rank">{rank}</span>
          <span class="name">{player.name}</span>
          <span class="status">
            {player.finishedAt !== null ? 'reached 50' : player.eliminated ? 'out' : ''}
          </span>
          <span class="score">{player.score}</span>
        </li>
      {/each}
    </ol>

    <div class="actions">
      <button type="button" onclick={undo}>Back to game</button>
      <button type="button" onclick={rematch}>Rematch</button>
      <button type="button" onclick={reset}>New game</button>
    </div>
  </section>
{/if}

<style>
  ol {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
    display: grid;
    gap: 0.5rem;
  }
  li {
    display: grid;
    grid-template-columns: 2ch 1fr auto auto;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background: #f3f3f3;
  }
  li.finished {
    background: #c8e6c9;
  }
  li.eliminated {
    opacity: 0.5;
  }
  .rank,
  .score {
    font-weight: 700;
  }
  .status {
    font-size: 0.85rem;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
  }
  button {
    padding: 0.75rem 0;
    font-size: 1rem;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
    background: #fff;
  }
</style>
