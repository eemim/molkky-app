<script lang="ts">
  import { view } from './gameStore.svelte';
  import { currentThrower } from './molkky';
  import ThrowTable from './ThrowTable.svelte';

  let open = $state<number | null>(null);

  // In a team game: the member who throws next for the current team
  let thrower = $derived(view.state ? currentThrower(view.state, view.throws) : null);

  function toggle(index: number) {
    open = open === index ? null : index;
  }
</script>

{#if view.state}
  {@const game = view.state}
  <ul class="scoreboard">
    {#each game.players as player, index (index)}
      <li
        class:current={index === game.current && !game.ended}
        class:eliminated={player.eliminated}
        class:finished={player.finishedAt !== null}
      >
        <div class="row">
          <div class="who">
            <button
              type="button"
              class="name"
              aria-expanded={open === index}
              onclick={() => toggle(index)}
            >
              {open === index ? '▾' : '▸'}
              {player.name}
            </button>
            {#if thrower && index === game.current}
              <span class="thrower">{thrower} is up</span>
            {/if}
          </div>
          <span class="place">{player.finishedAt !== null ? `#${player.finishedAt}` : ''}</span>
          <span class="misses">{'✕'.repeat(player.misses)}</span>
          <span class="score">{player.score}</span>
        </div>

        {#if open === index}
          <ThrowTable player={index} editable />
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
  .who {
    display: grid;
    justify-items: start;
  }
  .name {
    text-align: left;
    font: inherit;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
  .thrower {
    font-size: 0.85rem;
    font-weight: 600;
    color: #2e7d32;
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
