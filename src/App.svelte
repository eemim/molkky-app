<script lang="ts">
  import { view } from './lib/gameStore.svelte';
  import Setup from './lib/Setup.svelte';
  import Scoreboard from './lib/Scoreboard.svelte';
  import NumberPad from './lib/NumberPad.svelte';
  import PointsPad from './lib/PointsPad.svelte';
  import { settings } from './lib/settingsStore.svelte';
  import { keepScreenOn } from './lib/keepAwake';
  import Controls from './lib/Controls.svelte';
  import Results from './lib/Results.svelte';
  import Settings from './lib/Settings.svelte';

  // UI navigation only, not game state, so it lives here rather than in gameStore.
  let settingsOpen = $state(false);

  // Screen stays on only while a game is being played. The effect re-runs when the setting or
  // the game state changes; the cleanup lets the screen sleep again if App goes away.
  $effect(() => {
    keepScreenOn(settings.keepAwake && !!view.state && !view.state.ended);
    return () => keepScreenOn(false);
  });
</script>

<svelte:head>
  <title>Molkky</title>
  <meta name="description" content="Keep score for Molkky, for individual players or for teams." />
</svelte:head>

<main>
  {#if !view.state}
    {#if settingsOpen}
      <Settings onBack={() => (settingsOpen = false)} />
    {/if}
    <!-- Hidden, not unmounted, so names typed in Setup survive a visit to Settings. -->
    <div class="screen" hidden={settingsOpen}>
      <Setup onOpenSettings={() => (settingsOpen = true)} />
    </div>
  {:else if view.state.ended}
    {#if view.editingTeams}
      <Setup rematch />
    {:else}
      <Results />
    {/if}
  {:else}
    <div class="game">
      <Scoreboard />
      {#if settings.numberPad}
        <PointsPad />
      {:else}
        <NumberPad />
      {/if}
      <Controls />
    </div>
  {/if}
</main>

<style>
  /* Lets Setup's card size and centre itself in main's grid as if this wrapper weren't there. */
  .screen {
    display: contents;
  }
  .screen[hidden] {
    display: none;
  }
  /* One block, so main centers the whole game screen instead of spreading space between its parts. */
  .game {
    display: flex;
    flex-direction: column;
    width: min(100%, 32rem);
  }
</style>
