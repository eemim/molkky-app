<script lang="ts">
  import { view } from './lib/gameStore.svelte';
  import Setup from './lib/Setup.svelte';
  import Scoreboard from './lib/Scoreboard.svelte';
  import NumberPad from './lib/NumberPad.svelte';
  import Controls from './lib/Controls.svelte';
  import Results from './lib/Results.svelte';
</script>

<svelte:head>
  <title>Molkky</title>
  <meta name="description" content="Keep score for Molkky, for individual players or for teams." />
</svelte:head>

<main>
  {#if !view.state}
    <Setup />
  {:else if view.state.ended}
    {#if view.editingTeams}
      <Setup rematch />
    {:else}
      <Results />
    {/if}
  {:else}
    <div class="game">
      <Scoreboard />
      <NumberPad />
      <Controls />
    </div>
  {/if}
</main>

<style>
  /* One block, so main centers the whole game screen instead of spreading space between its parts. */
  .game {
    display: flex;
    flex-direction: column;
    width: min(100%, 32rem);
  }
</style>
