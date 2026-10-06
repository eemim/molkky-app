<script lang="ts">
  import { view, undo, reset, showResults } from './gameStore.svelte';
  import { canShowResults } from './molkky';

  let resultsReady = $derived(view.state ? canShowResults(view.state) : false);

  function newGame() {
    if (confirm('Start a new game?')) reset();
  }
</script>

{#if view.state}
  <div class="controls">
    <button type="button" onclick={undo}>Undo</button>
    <button type="button" class="results" disabled={!resultsReady} onclick={showResults}>
      Results
    </button>
    <button type="button" onclick={newGame}>New game</button>
  </div>
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
</style>
