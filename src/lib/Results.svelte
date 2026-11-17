<script lang="ts">
  import { view, undo, rematch, reset, editTeams } from './gameStore.svelte';
  import { ranking, rotateTurnOrder } from './molkky';
  import ThrowTable from './ThrowTable.svelte';
  import Icon from './Icon.svelte';
  import PlaceBadge from './PlaceBadge.svelte';
  import Modal from './Modal.svelte';

  let rows = $derived(view.state ? ranking(view.state) : []);

  let isTeamGame = $derived(
    view.state?.players.some((player) => player.members.length > 0) ?? false,
  );

  // Who would throw first if the turn order changes for the rematch
  let nextStarter = $derived(
    view.state ? rotateTurnOrder(view.state.players.map((player) => player.name))[0] : '',
  );

  let open = $state<number | null>(null);
  let rematchDialog = $state<ReturnType<typeof Modal> | undefined>(undefined);

  function toggle(index: number) {
    open = open === index ? null : index;
  }

  function openRematchDialog() {
    rematchDialog?.open();
  }

  function startRematch(changeTurns: boolean) {
    rematchDialog?.close();
    rematch(changeTurns);
  }

  function startEditTeams() {
    rematchDialog?.close();
    editTeams();
  }
</script>

{#if view.state && rows.length > 0}
  <section class="results">
    <h1 class="winner"><span class="truncate">{rows[0].player.name}</span> wins!</h1>

    <ol>
      {#each rows as { player, rank }, position (position)}
        {@const index = view.state.players.indexOf(player)}
        <!-- Badges follow the finish order, like on the game screen: only players who reached 50 -->
        <li class:first={player.finishedAt === 1} class:eliminated={player.eliminated}>
          <div class="row">
            <span class="rank">{rank}</span>
            <button
              type="button"
              class="name"
              aria-expanded={open === index}
              onclick={() => toggle(index)}
            >
              <!-- Down: the row can be opened. Up: it can be closed. -->
              <Icon name={open === index ? 'chevron-up' : 'chevron-down'} />
              <span class="truncate">{player.name}</span>
            </button>
            <span class="status">
              {#if player.finishedAt !== null}
                <PlaceBadge place={player.finishedAt} label="reached 50" />
              {:else if player.eliminated}
                <span class="visually-hidden">out</span>
              {/if}
            </span>
            <span class="score">{player.score}</span>
          </div>

          {#if open === index}
            <ThrowTable player={index} />
          {/if}
        </li>
      {/each}
    </ol>

    <div class="actions">
      <button type="button" class="btn btn-primary wide" onclick={openRematchDialog}>Rematch</button
      >
      <button type="button" class="btn" onclick={undo}>Back to game</button>
      <button type="button" class="btn" onclick={reset}>New game</button>
    </div>

    <Modal bind:this={rematchDialog} title="Change turn order?">
      <p>
        {nextStarter} would throw first, and {isTeamGame ? 'the other teams' : 'everyone else'}
        move one place later.
        {#if isTeamGame}
          Team members keep their own order.
        {/if}
      </p>
      {#snippet actions()}
        <button type="button" class="btn" onclick={() => startRematch(false)}>Keep order</button>
        <button type="button" class="btn btn-primary" onclick={() => startRematch(true)}>
          Change turns
        </button>
        {#if isTeamGame}
          <button type="button" class="btn wide" onclick={startEditTeams}>Edit teams</button>
        {/if}
      {/snippet}
    </Modal>
  </section>
{/if}

<style>
  .results {
    width: min(100%, 32rem);
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }
  li {
    padding: 0.25rem 1rem;
    border: 1px solid var(--card-border, var(--line));
    border-radius: 0.625rem;
    background: var(--card-bg, var(--surface));
  }
  /* The winner's card: gold border, so first place stands out at a glance */
  li.first {
    --card-border: var(--gold-border);
    border-width: 2px;
  }
  /* Same "out" look as on the game screen */
  li.eliminated {
    --card-bg: var(--surface-muted);
    --card-border: var(--border);
  }
  li.eliminated .row {
    color: var(--text-muted);
    position: relative;
  }
  /* One continuous strike line across the row (not per word); decorative, so it ignores taps */
  li.eliminated .row::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    top: 50%;
    height: 2px;
    background: var(--text-muted);
    pointer-events: none;
  }
  .row {
    display: grid;
    grid-template-columns: 2ch minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 1rem;
  }
  .rank,
  .score {
    font-weight: 700;
  }
  .status {
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .winner {
    display: flex;
    gap: 0.25em;
    white-space: nowrap;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 0.3em;
    min-width: 0;
    max-width: 100%;
    min-height: 44px;
    padding: 0.5rem 0;
    text-align: left;
    border: none;
    background: none;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .wide {
    grid-column: 1 / -1;
  }
</style>
