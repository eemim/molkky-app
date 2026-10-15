<script lang="ts">
  import { view, undo, rematch, reset, editTeams } from './gameStore.svelte';
  import { ranking, rotateTurnOrder } from './molkky';
  import ThrowTable from './ThrowTable.svelte';

  let rows = $derived(view.state ? ranking(view.state) : []);

  let isTeamGame = $derived(view.state?.players.some((player) => player.members.length > 0) ?? false);

  // Who would throw first if the turn order changes for the rematch
  let nextStarter = $derived(
    view.state ? rotateTurnOrder(view.state.players.map((player) => player.name))[0] : ''
  );

  let open = $state<number | null>(null);
  let rematchDialog = $state<HTMLDialogElement | undefined>(undefined);

  function toggle(index: number) {
    open = open === index ? null : index;
  }

  function openRematchDialog() {
    rematchDialog?.showModal();
  }

  function closeRematchDialog() {
    rematchDialog?.close();
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
      {#each rows as { player, rank }}
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
              {open === index ? '▾' : '▸'} {player.name}
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

    <dialog bind:this={rematchDialog} aria-labelledby="rematch-title">
      <button type="button" class="close" aria-label="Close" onclick={closeRematchDialog}>✕</button>
      <h2 id="rematch-title">Change turn order?</h2>
      <p>
        {nextStarter} would throw first, and {isTeamGame ? 'the other teams' : 'everyone else'}
        move one place later.
        {#if isTeamGame}
          Team members keep their own order.
        {/if}
      </p>
      <div class="dialog-actions">
        <button type="button" onclick={() => startRematch(false)}>Keep order</button>
        <button type="button" class="change-turns" onclick={() => startRematch(true)}>
          Change turns
        </button>
      </div>
      {#if isTeamGame}
        <button type="button" class="edit-teams" onclick={startEditTeams}>Edit teams</button>
      {/if}
    </dialog>
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
  dialog {
    width: min(calc(100% - 2rem), 28rem);
    padding: 1.5rem;
    border: 0;
    border-radius: 0.75rem;
    box-shadow: 0 1rem 3rem rgb(0 0 0 / 20%);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 45%);
  }
  dialog h2 {
    margin: 0;
    padding-right: 2rem;
  }
  dialog p {
    margin: 0.75rem 0 1.25rem;
  }
  .close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    min-width: 2.5rem;
    padding: 0.4rem;
    font: inherit;
    border: none;
    border-radius: 0.5rem;
    background: none;
    cursor: pointer;
  }
  .dialog-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .dialog-actions button {
    padding: 0.75rem;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
    background: #fff;
  }
  .dialog-actions .change-turns {
    border-color: #2e7d32;
    background: #2e7d32;
    color: #fff;
  }
  .edit-teams {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.75rem;
    font: inherit;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
    background: #fff;
    cursor: pointer;
  }
</style>
