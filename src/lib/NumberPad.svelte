<script lang="ts">
  import { view, throwPins } from './gameStore.svelte';
  import { pointsFor } from './molkky';

  const pinNumbers = Array.from({ length: 12 }, (_, i) => i + 1);

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
    <div class="grid">
      {#each pinNumbers as pin (pin)}
        <button
          type="button"
          class:on={selected.includes(pin)}
          disabled={finished}
          onclick={() => toggle(pin)}
        >
          {pin}
        </button>
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
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }
  button {
    padding: 1rem 0;
    font-size: 1.25rem;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
    background: #fff;
  }
  button.on {
    background: #2e7d32;
    border-color: #2e7d32;
    color: #fff;
  }
  button:disabled {
    opacity: 0.4;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .miss {
    border-color: #c62828;
    color: #c62828;
  }
  .confirm {
    background: #2e7d32;
    border-color: #2e7d32;
    color: #fff;
  }
</style>
