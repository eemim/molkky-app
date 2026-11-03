<script lang="ts">
  import { view, undo, reset, showResults } from './gameStore.svelte';
  import { canShowResults } from './molkky';
  import Modal from './Modal.svelte';

  let resultsReady = $derived(view.state ? canShowResults(view.state) : false);

  let confirmDialog = $state<ReturnType<typeof Modal> | undefined>(undefined);

  function startNewGame() {
    confirmDialog?.close();
    reset();
  }
</script>

{#if view.state}
  <div class="controls">
    <button type="button" onclick={undo}>Undo</button>
    <button type="button" class="results" disabled={!resultsReady} onclick={showResults}>
      Results
    </button>
    <button type="button" onclick={() => confirmDialog?.open()}>New game</button>
  </div>

  <Modal bind:this={confirmDialog} title="Start a new game?">
    <p>The game in progress will be lost.</p>
    {#snippet actions()}
      <button type="button" class="primary" data-autofocus onclick={() => confirmDialog?.close()}>
        Keep playing
      </button>
      <button type="button" class="danger" onclick={startNewGame}>New game</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .controls {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .controls button {
    padding: 0.75rem 0;
    font-size: 1rem;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
    background: #fff;
  }
  .controls button:disabled {
    opacity: 0.4;
  }
  .results:not(:disabled) {
    background: #2e7d32;
    border-color: #2e7d32;
    color: #fff;
  }
</style>
