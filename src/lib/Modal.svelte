<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, children, actions }: { title: string; children?: Snippet; actions: Snippet } =
    $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | undefined>(undefined);

  // A button marked data-autofocus gets the focus, so the safe choice is under the thumb
  export function open() {
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }

  export function close() {
    dialog?.close();
  }
</script>

<dialog bind:this={dialog} aria-labelledby={titleId}>
  <button type="button" class="close" aria-label="Close" onclick={close}>✕</button>
  <h2 id={titleId}>{title}</h2>
  {#if children}
    <div class="body">{@render children()}</div>
  {/if}
  <div class="actions">{@render actions()}</div>
</dialog>

<style>
  dialog {
    width: min(calc(100% - 2rem), 28rem);
    padding: 1.5rem;
    border: 0;
    background: var(--surface);
    color: var(--text);
    border-radius: 0.75rem;
    box-shadow: 0 1rem 3rem rgb(0 0 0 / 20%);
  }
  dialog::backdrop {
    background: rgb(31 43 32 / 55%);
  }
  h2 {
    margin: 0;
    padding-right: 2rem;
  }
  .body {
    margin: 0.75rem 0 1.25rem;
  }
  .body :global(p) {
    margin: 0;
  }
  .close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: 0.5rem;
    background: none;
    cursor: pointer;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .actions :global(.wide) {
    grid-column: 1 / -1;
  }
</style>
