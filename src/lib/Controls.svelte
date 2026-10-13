<script lang="ts">
  import { view, undo, reset, showResults } from './gameStore.svelte';
  import { canShowResults } from './molkky';

  let resultsReady = $derived(view.state ? canShowResults(view.state) : false);
  let newGameDialog = $state<HTMLDialogElement | undefined>(undefined);

  function openNewGameDialog() {
    newGameDialog?.showModal();
  }

  function startNewGame() {
    newGameDialog?.close();
    reset();
  }
</script>

{#if view.state}
  <div class="controls">
    <button type="button" onclick={undo}>Undo</button>
    <button type="button" class="results" disabled={!resultsReady} onclick={showResults}>
      Results
    </button>
    <button type="button" onclick={openNewGameDialog}>New game</button>
  </div>

  <dialog bind:this={newGameDialog} aria-labelledby="new-game-title">
    <h2 id="new-game-title">Start a new game?</h2>
    <p>Are you sure you want to start a new game? The current game will be lost.</p>
    <div class="dialog-actions">
      <button type="button" onclick={() => newGameDialog?.close()}>Cancel</button>
      <button type="button" class="confirm-new-game" onclick={startNewGame}>Start new game</button>
    </div>
  </dialog>
{/if}

<style>
  .controls {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  button {
    padding: 0.75rem 0;
    font-size: 1rem;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
    background: #fff;
  }
  button:disabled {
    opacity: 0.4;
  }
  .results:not(:disabled) {
    background: #2e7d32;
    border-color: #2e7d32;
    color: #fff;
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
  }
  dialog p {
    margin: 0.75rem 0 1.25rem;
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
  .dialog-actions .confirm-new-game {
    border-color: #c62828;
    background: #c62828;
    color: #fff;
  }
</style>
