<script lang="ts">
  import { view } from './gameStore.svelte';
  import { currentThrower } from './molkky';
  import ThrowTable from './ThrowTable.svelte';
  import Icon from './Icon.svelte';
  import PlaceBadge from './PlaceBadge.svelte';

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
        class:finished={player.finishedAt !== null}
        class:current={index === game.current && !game.ended}
        class:eliminated={player.eliminated}
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
            {#if index === game.current && !game.ended}
              <!-- The active card is also tinted green; the label means colour is not the only cue -->
              {#if thrower}
                <span class="thrower"><span class="truncate">{thrower}</span> is up</span>
              {:else}
                <span class="thrower">Throwing</span>
              {/if}
            {/if}
          </div>
          <span class="place">
            {#if player.finishedAt !== null}
              <PlaceBadge place={player.finishedAt} />
            {/if}
          </span>
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
    border: 2px solid var(--card-border, var(--line));
    border-radius: 0.625rem;
    background: var(--card-bg, var(--surface));
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
  /* Whose turn it is: light green with the olive border (text 11.8:1 on it) */
  .current {
    --card-bg: var(--success-bg);
    --card-border: var(--primary);
  }
  /* Reached 50: the card sinks into the page (page colour, dashed border, muted text) so it
     reads as done, while staying tappable. The coloured badge carries the place. */
  .finished {
    --card-bg: var(--bg);
    --card-border: var(--border);
    border-style: dashed;
    color: var(--text-muted);
  }
  .eliminated .row {
    color: var(--text-muted);
    text-decoration: line-through;
  }
</style>
