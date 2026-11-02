<script lang="ts">
  import { view, throwPins } from './gameStore.svelte';
  import { pointsFor } from './molkky';

  const pinRows = [
    [7, 9, 8],
    [5, 11, 12, 6],
    [3, 10, 4],
    [1, 2],
  ];

  let selected = $state<number[]>([]);

  let points = $derived(pointsFor(selected));
  let finished = $derived(view.state?.ended ?? true);

  function toggle(pin: number) {
    selected = selected.includes(pin) ? selected.filter((p) => p !== pin) : [...selected, pin];
  }

  function confirm() {
    throwPins(selected);
    selected = [];
  }

  function miss() {
    throwPins([]);
    selected = [];
  }
</script>

{#if view.state}
  <section class="pad">
    <div class="pin-layout" aria-label="Select knocked-down pins">
      {#each pinRows as row (row)}
        <div class="pin-row">
          {#each row as pin (pin)}
            {@const isSelected = selected.includes(pin)}
            <button
              type="button"
              class:selected={isSelected}
              disabled={finished}
              aria-label={`Pin ${pin}${isSelected ? ', selected' : ''}`}
              aria-pressed={isSelected}
              onclick={() => toggle(pin)}
            >
              <img src={`/pins/${isSelected ? 'bw' : 'color'}-${pin}.svg`} alt="" />
            </button>
          {/each}
        </div>
      {/each}
    </div>

    <div class="actions">
      <button type="button" class="miss" disabled={finished} onclick={miss}>Miss</button>
      <button
        type="button"
        class="confirm"
        disabled={finished || selected.length === 0}
        onclick={confirm}
      >
        Score {points}
      </button>
    </div>
  </section>
{/if}

<style>
  .pad {
    margin-top: 1rem;
  }
  .pin-layout {
    display: grid;
    gap: 0.25rem;
    justify-items: center;
  }
  .pin-row {
    display: flex;
    justify-content: center;
    gap: clamp(0.15rem, 1vw, 0.5rem);
  }
  .pin-row button {
    display: block;
    width: clamp(2.8rem, 15vw, 5.25rem);
    padding: 0;
    border: 0;
    background: none;
    line-height: 0;
    transition: transform 150ms ease;
  }
  .pin-row button:hover:not(:disabled),
  .pin-row button.selected {
    transform: translateY(-0.2rem);
  }
  .pin-row img {
    width: 100%;
    height: auto;
  }
  .pin-row button:disabled {
    opacity: 0.45;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .miss {
    padding: 1rem 0;
    font-size: 1.25rem;
    border: 2px solid #c62828;
    border-radius: 0.5rem;
    background: #fff;
    border-color: #c62828;
    color: #c62828;
  }
  .confirm {
    padding: 1rem 0;
    font-size: 1.25rem;
    border: 2px solid #2e7d32;
    border-radius: 0.5rem;
    background: #2e7d32;
    border-color: #2e7d32;
    color: #fff;
  }
  .actions button:disabled {
    opacity: 0.4;
  }
</style>
