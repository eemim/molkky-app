<script lang="ts">
  import { view, throwPins } from './gameStore.svelte';
  import { pointsFor } from './molkky';

  // Official starting formation, back row first; 1 and 2 face the thrower.
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
    <div class="stack">
      {#each pinRows as row, i (i)}
        <div class="row">
          {#each row as pin (pin)}
            <button
              type="button"
              class="pin"
              class:on={selected.includes(pin)}
              aria-pressed={selected.includes(pin)}
              disabled={finished}
              onclick={() => toggle(pin)}
            >
              {pin}
            </button>
          {/each}
        </div>
      {/each}
    </div>

    <div class="actions">
      <button type="button" class="btn miss" disabled={finished} onclick={miss}>Miss</button>
      <button
        type="button"
        class="btn btn-primary"
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
    display: flex;
    flex-direction: column;
  }
  .stack {
    --pin: clamp(52px, 18vw, 64px);
    --gap: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap);
    /* Same gap above (to the scoreboard) and below (to Miss/Score), a bit larger on tall screens. */
    margin-block: clamp(1.25rem, 4svh, 2rem);
  }
  .row {
    display: flex;
    justify-content: center;
    gap: var(--gap);
  }
  .pin {
    width: var(--pin);
    height: var(--pin);
    padding: 0;
    font-size: 1.25rem;
    font-weight: 600;
    border: 2px solid var(--border);
    border-radius: 50%;
    background: var(--surface);
    color: var(--text);
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease,
      transform 80ms ease;
  }
  .pin:active:not(:disabled) {
    transform: scale(0.94);
  }
  @media (prefers-reduced-motion: reduce) {
    .pin {
      transition: none;
    }
    .pin:active:not(:disabled) {
      transform: none;
    }
  }
  .pin.on {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--on-primary);
  }
  .pin:disabled {
    opacity: 0.45;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.5rem;
  }
  .actions .btn {
    font-size: 1.125rem;
  }
  .miss {
    border-color: var(--danger);
    color: var(--danger);
  }
</style>
