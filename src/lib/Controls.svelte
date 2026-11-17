<script lang="ts">
  import { view, undo, reset, showResults } from './gameStore.svelte';
  import { canShowResults } from './molkky';
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';

  let resultsReady = $derived(view.state ? canShowResults(view.state) : false);

  let confirmDialog = $state<ReturnType<typeof Modal> | undefined>(undefined);

  function startNewGame() {
    confirmDialog?.close();
    reset();
  }
</script>

{#if view.state}
  <!-- Secondary actions, kept light so Miss / Score stay the main buttons. Results only appears
       once someone has reached 50, in the middle of this row, so nothing above it moves. -->
  <div class="controls">
    <button type="button" class="text-button undo" onclick={undo}>
      <Icon name="undo" />
      Undo
    </button>
    {#if resultsReady}
      <button type="button" class="btn results" onclick={showResults}>
        <Icon name="crown" size={18} />
        Results
      </button>
    {/if}
    <button type="button" class="text-button new-game" onclick={() => confirmDialog?.open()}>
      <Icon name="plus" />
      New game
    </button>
  </div>

  <Modal bind:this={confirmDialog} title="Start a new game?">
    <p>The game in progress will be lost.</p>
    {#snippet actions()}
      <button
        type="button"
        class="btn btn-primary"
        data-autofocus
        onclick={() => confirmDialog?.close()}
      >
        Keep playing
      </button>
      <button type="button" class="btn btn-danger" onclick={startNewGame}>New game</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .controls {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .text-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 44px;
    padding: 0 var(--space-2);
    border: none;
    border-radius: 999px;
    white-space: nowrap;
    background: none;
    color: var(--text);
    font-weight: 600;
    transition: background-color 120ms ease;
  }
  .text-button:active {
    background: var(--surface-muted);
  }
  .undo {
    grid-column: 1;
    justify-self: start;
  }
  .results {
    grid-column: 2;
    display: inline-flex;
    white-space: nowrap;
    align-items: center;
    gap: var(--space-2);
    border-color: var(--primary);
    color: var(--primary);
  }
  .new-game {
    grid-column: 3;
    justify-self: end;
  }
  /* Below 360px all three no longer fit on one line: wrap instead of overflowing */
  @media (max-width: 359px) {
    .text-button,
    .results {
      white-space: normal;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .text-button {
      transition: none;
    }
  }
</style>
