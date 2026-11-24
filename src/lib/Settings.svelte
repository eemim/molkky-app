<script lang="ts">
  import Icon from './Icon.svelte';
  import { settings, setDarkMode } from './settingsStore.svelte';

  let { onBack }: { onBack: () => void } = $props();
</script>

<section class="settings-card" aria-labelledby="settings-title">
  <header class="header">
    <button type="button" class="back-btn" aria-label="Back" onclick={onBack}>
      <Icon name="chevron-left" size={24} />
    </button>
    <h1 id="settings-title">Settings</h1>
  </header>

  <!-- The whole row is the switch, so the label is part of the 44px+ target. -->
  <button
    type="button"
    class="switch-row"
    role="switch"
    aria-checked={settings.darkMode}
    onclick={() => setDarkMode(!settings.darkMode)}
  >
    <span class="label">Dark mode</span>
    <span class="track" aria-hidden="true"><span class="thumb"></span></span>
  </button>
</section>

<style>
  .settings-card {
    display: grid;
    gap: var(--space-6);
    width: min(100%, 560px);
    padding: var(--space-8);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-card);
  }
  .header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  h1 {
    margin: 0;
  }
  .back-btn {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    margin-left: calc(-1 * var(--space-2));
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-muted);
    transition: background-color 120ms ease;
  }
  .back-btn:active {
    background: var(--surface-muted);
  }
  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    width: 100%;
    min-height: 56px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    text-align: left;
    transition: background-color 120ms ease;
  }
  .switch-row:active {
    background: var(--surface-muted);
  }
  .label {
    font-weight: 600;
  }
  /* Off: outlined track, --border thumb (3:1+ on the track). On: --primary track, light thumb. */
  .track {
    position: relative;
    flex-shrink: 0;
    width: 52px;
    height: 32px;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--surface-muted);
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }
  .thumb {
    position: absolute;
    top: 50%;
    left: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--border);
    transform: translateY(-50%);
    transition:
      transform 150ms ease,
      background-color 150ms ease;
  }
  [aria-checked='true'] .track {
    border-color: var(--primary);
    background: var(--primary);
  }
  [aria-checked='true'] .thumb {
    background: var(--on-primary);
    transform: translate(20px, -50%);
  }
  @media (prefers-reduced-motion: reduce) {
    .back-btn,
    .switch-row,
    .track,
    .thumb {
      transition: none;
    }
  }
</style>
