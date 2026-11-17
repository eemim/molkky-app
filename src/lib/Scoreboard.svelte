<script lang="ts">
  import { view } from './gameStore.svelte';
  import { currentThrower } from './molkky';
  import ThrowTable from './ThrowTable.svelte';
  import Icon from './Icon.svelte';

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
              <!-- Down: the card can be opened. Up: it can be closed. -->
              <Icon name={open === index ? 'chevron-up' : 'chevron-down'} />
              <span class="truncate">{player.name}</span>
            </button>
            {#if thrower && index === game.current}
              <span class="thrower"><span class="truncate">{thrower}</span> is up</span>
            {/if}
          </div>
          <span class="place">{player.finishedAt !== null ? `#${player.finishedAt}` : ''}</span>
          <span class="misses">
            {#each Array.from({ length: player.misses }, (_, i) => i) as i (i)}
              <Icon name="x" size={18} />
            {/each}
            {#if player.misses > 0}
              <span class="visually-hidden">
                {player.misses === 1 ? '1 miss' : `${player.misses} misses`}
              </span>
            {/if}
          </span>
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
    /* minmax(0, …): a plain 1fr column never shrinks below its longest unbroken name */
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }
  li {
    padding: 0.25rem 1rem;
    border: 2px solid var(--line);
    border-radius: 0.625rem;
    background: var(--surface);
  }
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 1rem;
  }
  .who {
    display: grid;
    justify-items: start;
    min-width: 0; /* lets a long name shrink instead of pushing the score off-screen */
  }
  .name,
  .thrower {
    display: flex;
    align-items: center;
    gap: 0.3em;
    min-width: 0; /* buttons keep their text width as a minimum unless told otherwise */
    max-width: 100%;
    white-space: nowrap;
  }
  .name {
    min-height: 44px;
    padding: 0.5rem 0;
    text-align: left;
    border: none;
    background: none;
  }
  .thrower {
    margin: -0.25rem 0 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--primary);
  }
  .score {
    font-size: 1.5rem;
    font-weight: 700;
    min-width: 2ch;
    text-align: right;
  }
  .misses {
    display: flex;
    color: var(--danger);
  }
  .current {
    border-color: var(--primary);
  }
  .eliminated .row {
    color: var(--text-muted);
    text-decoration: line-through;
  }
  .finished {
    border-color: var(--primary);
    background: var(--success-bg);
  }
</style>
