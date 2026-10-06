<script lang="ts">
  import { start, view } from './lib/gameStore.svelte';
  import Scoreboard from './lib/Scoreboard.svelte';
  import NumberPad from './lib/NumberPad.svelte';
  import Controls from './lib/Controls.svelte';
  import Results from './lib/Results.svelte';

  let players = ['Player 1', 'Player 2'];

  function addPlayer() {
    players = [...players, `Player ${players.length + 1}`];
  }

  function removePlayer(index: number) {
    players = players.filter((_, playerIndex) => playerIndex !== index);
  }

  function updatePlayer(index: number, name: string) {
    players = players.map((player, playerIndex) => (playerIndex === index ? name : player));
  }

  function startGame() {
    const names = players.map((player) => player.trim()).filter(Boolean);

    if (names.length < 2) return;

    start(names);
  }

  $: readyToStart = players.filter((player) => player.trim()).length >= 2;
</script>

<svelte:head>
  <title>Molkky</title>
  <meta
    name="description"
    content="Set up a Molkky game by adding the players who are ready to throw."
  />
</svelte:head>

<main>
  {#if !view.state}
    <section class="setup-card" aria-labelledby="setup-title">
      <div class="eyebrow">Molkky</div>
      <h1 id="setup-title">Set up your game</h1>
      <p class="intro">Add everyone playing, then start throwing.</p>

      <form on:submit|preventDefault={startGame}>
        <div class="players-heading">
          <label for="player-0">Players</label>
          <span>{players.length}</span>
        </div>

        <div class="player-list">
          {#each players as player, index}
            <div class="player-row">
              <label class="visually-hidden" for={`player-${index}`}>Player {index + 1} name</label>
              <span class="player-number" aria-hidden="true">{index + 1}</span>
              <input
                id={`player-${index}`}
                type="text"
                value={player}
                placeholder={`Player ${index + 1}`}
                on:input={(event) => updatePlayer(index, event.currentTarget.value)}
              />
              <button
                class="remove-player"
                type="button"
                on:click={() => removePlayer(index)}
                disabled={players.length <= 2}
                aria-label={`Remove ${player || `player ${index + 1}`}`}
              >
                Remove
              </button>
            </div>
          {/each}
        </div>

        <button class="add-player" type="button" on:click={addPlayer}>+ Add player</button>

        <button class="start-game" type="submit" disabled={!readyToStart}>Start game</button>
        {#if !readyToStart}
          <p class="hint">Add names for at least two players to start.</p>
        {/if}
      </form>
    </section>
  {:else if view.state.ended}
    <Results />
  {:else}
    <Scoreboard />
    <NumberPad />
    <Controls />
  {/if}
</main>
