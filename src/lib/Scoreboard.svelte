<script lang="ts">
  import { view } from './gameStore.svelte';
  import ThrowTable from './ThrowTable.svelte';
 
  let open = $state<number | null>(null);
 
  function toggle(index: number) {
    open = open === index ? null : index;
  }
</script>
 
{#if view.state}
  {@const game = view.state}
  <ul class="scoreboard">
    {#each game.players as player, index}
      <li
        class:current={index === game.current && !game.ended}
        class:eliminated={player.eliminated}
        class:finished={player.finishedAt !== null}
      >
        <div class="row">
          <button
            type="button"
            class="name"
            aria-expanded={open === index}
            onclick={() => toggle(index)}
          >
            {open === index ? '▾' : '▸'} {player.name}
          </button>
          <span class="place">{player.finishedAt !== null ? `#${player.finishedAt}` : ''}</span>
          <span class="misses">{'✕'.repeat(player.misses)}</span>
          <span class="score">{player.score}</span>
        </div>
 
        {#if open === index}
          <ThrowTable player={index} />
        {/if}
      </li>
    {/each}
  </ul>
{/if}
 
<style>
  .scoreboard {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }
  li {
    padding: 0.75rem 1rem;
    border: 2px solid transparent;
    border-radius: 0.5rem;
    background: #f3f3f3;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: center;
    gap: 1rem;
  }
  .name {
    text-align: left;
    font: inherit;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
  .score {
    font-size: 1.5rem;
    font-weight: 700;
    min-width: 2ch;
    text-align: right;
  }
  .misses {
    color: #c62828;
  }
  .current {
    border-color: #2e7d32;
  }
  .eliminated .row {
    opacity: 0.4;
    text-decoration: line-through;
  }
  .finished {
    background: #c8e6c9;
    border-color: #2e7d32;
  }
</style>
