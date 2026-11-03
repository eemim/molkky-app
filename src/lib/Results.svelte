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
      <button type="button" onclick={undo}>Back to game</button>
      <button type="button" onclick={openRematchDialog}>Rematch</button>
      <button type="button" onclick={reset}>New game</button>
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
        <button type="button" onclick={() => startRematch(false)}>Keep order</button>
        <button type="button" class="primary" onclick={() => startRematch(true)}>
          Change turns
        </button>
        {#if isTeamGame}
          <button type="button" class="wide" onclick={startEditTeams}>Edit teams</button>
        {/if}
      {/snippet}
    </Modal>
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
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background: #f3f3f3;
  }
  li.finished {
    background: #c8e6c9;
  }
  li.eliminated .row {
    opacity: 0.5;
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
  }
  .name {
    text-align: left;
    font: inherit;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
  }
  .actions button {
    padding: 0.75rem 0;
    font-size: 1rem;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
    background: #fff;
  }
</style>
