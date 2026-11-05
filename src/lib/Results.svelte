<script lang="ts">
  import { view, undo, rematch, reset, editTeams } from './gameStore.svelte';
  import { ranking, rotateTurnOrder } from './molkky';
  import ThrowTable from './ThrowTable.svelte';
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
    <h1>{rows[0].player.name} wins!</h1>

    <ol>
      {#each rows as { player, rank }, position (position)}
        {@const index = view.state.players.indexOf(player)}
        <li class:finished={player.finishedAt !== null} class:eliminated={player.eliminated}>
          <div class="row">
            <span class="rank">{rank}</span>
            <button
              type="button"
              class="name"
              aria-expanded={open === index}
              onclick={() => toggle(index)}
            >
              {open === index ? '▾' : '▸'}
              {player.name}
            </button>
            <span class="status">
              {player.finishedAt !== null ? 'reached 50' : player.eliminated ? 'out' : ''}
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
    gap: 0.5rem;
  }
  li {
    padding: 0.25rem 1rem;
    border: 1px solid var(--line);
    border-radius: 0.625rem;
    background: var(--surface);
  }
  li.finished {
    border-color: var(--primary);
    background: var(--success-bg);
  }
  li.eliminated .row {
    color: var(--text-muted);
    text-decoration: line-through;
  }
  .row {
    display: grid;
    grid-template-columns: 2ch 1fr auto auto;
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
  .name {
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
