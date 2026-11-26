<script lang="ts">
  // Points entry for the "Number pad" setting: pick 1-12, then Score. The alternative to
  // the pin stack in NumberPad.svelte; App shows one or the other.
  import { view, throwPins } from './gameStore.svelte';

  const values = Array.from({ length: 12 }, (_, i) => i + 1);

  let selected = $state<number | null>(null);

  let finished = $derived(view.state?.ended ?? true);

  function pick(value: number) {
    selected = selected === value ? null : value;
  }

  // One pin scores its face value, so [n] logs exactly n points.
  function confirm() {
    if (selected === null) return;
    throwPins([selected]);
    selected = null;
  }

  function miss() {
    throwPins([]);
    selected = null;
  }
</script>

{#if view.state}
  <section class="pad">
    <div class="grid" role="group" aria-label="Points">
      {#each values as value (value)}
        <button
          type="button"
          class="key"
          class:on={selected === value}
          aria-pressed={selected === value}
          disabled={finished}
          onclick={() => pick(value)}
        >
          {value}
        </button>
      {/each}
    </div>

    <div class="actions">
      <button type="button" class="btn miss" disabled={finished} onclick={miss}>Miss</button>
      <button
        type="button"
        class="btn btn-primary"
        disabled={finished || selected === null}
        onclick={confirm}
      >
        Score {selected ?? 0}
      </button>
    </div>
  </section>
{/if}

<style>
  .pad {
    display: flex;
    flex-direction: column;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    /* Same outer spacing as the pin stack, so the screen does not jump between modes. */
    margin-block: clamp(1.25rem, 4svh, 2rem);
  }
  .key {
    min-height: clamp(52px, 8svh, 64px);
    padding: 0;
    font-size: 1.375rem;
    font-weight: 600;
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text);
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease,
      transform 80ms ease;
  }
  .key:active:not(:disabled) {
    transform: scale(0.96);
  }
  @media (prefers-reduced-motion: reduce) {
    .key {
      transition: none;
    }
    .key:active:not(:disabled) {
      transform: none;
    }
  }
  .key.on {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--on-primary);
  }
  .key:disabled {
    opacity: 0.45;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--space-2);
  }
  .actions .btn {
    font-size: 1.125rem;
  }
  .miss {
    border-color: var(--danger);
    color: var(--danger);
  }
</style>
