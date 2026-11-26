<script lang="ts">
  import Icon from './Icon.svelte';
  import { keepAwakeSupported } from './keepAwake';
  import {
    settings,
    setKeepAwake,
    setNumberPad,
    setTheme,
    THEMES,
    type Theme,
  } from './settingsStore.svelte';

  let { onBack }: { onBack: () => void } = $props();

  const themeLabels: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' };
  // Checked once: support does not change while the app is open.
  const canKeepAwake = keepAwakeSupported();
</script>

<section class="settings-card" aria-labelledby="settings-title">
  <header class="header">
    <button type="button" class="back-btn" aria-label="Back" onclick={onBack}>
      <Icon name="chevron-left" size={24} />
    </button>
    <h1 id="settings-title">Settings</h1>
  </header>

  <div class="rows">
    <!-- Native radios give arrow keys and announcements; the labels are the 44px segments. -->
    <fieldset class="theme-row">
      <legend class="label">Theme</legend>
      <div class="segments">
        {#each THEMES as theme (theme)}
          <label class="segment" class:on={settings.theme === theme}>
            <input
              type="radio"
              class="visually-hidden"
              name="theme"
              value={theme}
              checked={settings.theme === theme}
              onchange={() => setTheme(theme)}
            />
            {themeLabels[theme]}
          </label>
        {/each}
      </div>
    </fieldset>

    <!-- The whole row is the switch, so the label is part of the 44px+ target. Name from the
         label only; the hint is the description, not part of the name. -->
    <button
      type="button"
      class="switch-row"
      role="switch"
      aria-checked={settings.numberPad}
      aria-labelledby="number-pad-label"
      aria-describedby="number-pad-hint"
      onclick={() => setNumberPad(!settings.numberPad)}
    >
      <span class="text">
        <span class="label" id="number-pad-label">Number pad</span>
        <span class="hint" id="number-pad-hint">Enter points instead of tapping pins</span>
      </span>
      <span class="track" aria-hidden="true"><span class="thumb"></span></span>
    </button>

    <button
      type="button"
      class="switch-row"
      role="switch"
      aria-checked={canKeepAwake && settings.keepAwake}
      aria-labelledby="keep-awake-label"
      aria-describedby="keep-awake-hint"
      disabled={!canKeepAwake}
      onclick={() => setKeepAwake(!settings.keepAwake)}
    >
      <span class="text">
        <span class="label" id="keep-awake-label">Keep screen on</span>
        <span class="hint" id="keep-awake-hint">
          {canKeepAwake ? 'While a game is in progress' : 'Not supported on this device'}
        </span>
      </span>
      <span class="track" aria-hidden="true"><span class="thumb"></span></span>
    </button>
  </div>
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
  .rows {
    display: grid;
    gap: var(--space-3);
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
  .switch-row:active:not(:disabled) {
    background: var(--surface-muted);
  }
  .switch-row:disabled {
    opacity: 0.55;
  }
  .theme-row {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
  }
  .theme-row legend {
    float: left; /* keeps the legend inside the box instead of on its border */
    padding: 0;
  }
  .segments {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
  }
  .segment {
    display: grid;
    place-items: center;
    min-height: 44px;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease;
  }
  .segment.on {
    border-color: var(--primary);
    background: var(--success-bg);
    color: var(--primary);
  }
  .segment:has(input:focus-visible) {
    outline: 3px solid var(--primary);
    outline-offset: 2px;
  }
  .text {
    display: grid;
    gap: 2px;
  }
  .label {
    font-weight: 600;
  }
  .hint {
    color: var(--text-muted);
    font-size: 0.875rem;
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
    .segment,
    .track,
    .thumb {
      transition: none;
    }
  }
</style>
