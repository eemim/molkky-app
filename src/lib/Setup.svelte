<script lang="ts">
  import { untrack } from 'svelte';
  import { start, view, cancelEditTeams } from './gameStore.svelte';
  import { MAX_TEAM_SIZE, validRoster } from './molkky';
  import { moveItem } from './list';

  type Mode = 'individuals' | 'teams';
  type Team = { name: string; members: string[] };

  // `rematch`: edit the teams of the game that just finished, then play again
  let { rematch = false }: { rematch?: boolean } = $props();

  function finishedTeams(): Team[] {
    return (view.state?.players ?? []).map((player) => ({
      name: player.name,
      members: [...player.members],
    }));
  }

  // The screen is created fresh each time, so the forms only need the starting value
  const editingFinishedGame = untrack(() => rematch);

  let mode = $state<Mode>(editingFinishedGame ? 'teams' : 'individuals');

  // Each tab keeps its own form, so switching tabs loses nothing.
  let players = $state<string[]>(['Player 1', 'Player 2']);
  let teams = $state<Team[]>(
    editingFinishedGame
      ? finishedTeams()
      : [
          { name: 'Team 1', members: ['Player 1'] },
          { name: 'Team 2', members: ['Player 2'] },
        ]
  );

  let memberCount = $derived(teams.reduce((total, team) => total + team.members.length, 0));

  let individualNames = $derived(players.map((name) => name.trim()));
  let teamNames = $derived(teams.map((team) => team.name.trim()));
  let teamMembers = $derived(teams.map((team) => team.members.map((name) => name.trim())));

  let ready = $derived(
    mode === 'individuals'
      ? validRoster(individualNames)
      : validRoster(teamNames, teamMembers)
  );

  function startGame() {
    if (!ready) return;

    if (mode === 'individuals') start(individualNames);
    else start(teamNames, teamMembers);
  }

  function addPlayer() {
    players.push(`Player ${players.length + 1}`);
  }

  function removePlayer(index: number) {
    players.splice(index, 1);
  }

  function movePlayer(index: number, step: number) {
    players = moveItem(players, index, index + step);
  }

  function addTeam() {
    teams.push({ name: `Team ${teams.length + 1}`, members: [`Player ${memberCount + 1}`] });
  }

  function removeTeam(index: number) {
    teams.splice(index, 1);
  }

  function moveTeam(index: number, step: number) {
    teams = moveItem(teams, index, index + step);
  }

  function addMember(teamIndex: number) {
    const team = teams[teamIndex];
    if (team.members.length >= MAX_TEAM_SIZE) return;
    team.members.push(`Player ${memberCount + 1}`);
  }

  function removeMember(teamIndex: number, memberIndex: number) {
    teams[teamIndex].members.splice(memberIndex, 1);
  }

  function moveMember(teamIndex: number, memberIndex: number, step: number) {
    const team = teams[teamIndex];
    team.members = moveItem(team.members, memberIndex, memberIndex + step);
  }
</script>

<section class="setup-card" aria-labelledby="setup-title">
  <div class="eyebrow">Molkky</div>
  <h1 id="setup-title">{rematch ? 'Edit teams' : 'Set up your game'}</h1>

  {#if !rematch}
    <div class="tabs" role="tablist" aria-label="Game type">
      <button
        type="button"
        role="tab"
        id="tab-individuals"
        aria-selected={mode === 'individuals'}
        aria-controls="setup-panel"
        class:active={mode === 'individuals'}
        onclick={() => (mode = 'individuals')}
      >
        Individuals
      </button>
      <button
        type="button"
        role="tab"
        id="tab-teams"
        aria-selected={mode === 'teams'}
        aria-controls="setup-panel"
        class:active={mode === 'teams'}
        onclick={() => (mode = 'teams')}
      >
        Teams
      </button>
    </div>
  {/if}

  <form
    onsubmit={(event) => {
      event.preventDefault();
      startGame();
    }}
  >
    <div id="setup-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
      {#if mode === 'individuals'}
        <p class="intro">Add everyone playing, then start throwing.</p>

        <div class="list-heading">
          <span>Players</span>
          <span>{players.length}</span>
        </div>

        <div class="list">
          {#each players as player, index}
            <div class="row player-row">
              <span class="number" aria-hidden="true">{index + 1}</span>
              <input
                type="text"
                bind:value={players[index]}
                placeholder={`Player ${index + 1}`}
                aria-label={`Player ${index + 1} name`}
                aria-invalid={player.trim() === ''}
              />
              <button
                type="button"
                class="icon-button"
                onclick={() => movePlayer(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${player.trim() || `player ${index + 1}`} up`}
              >
                ↑
              </button>
              <button
                type="button"
                class="icon-button"
                onclick={() => movePlayer(index, 1)}
                disabled={index === players.length - 1}
                aria-label={`Move ${player.trim() || `player ${index + 1}`} down`}
              >
                ↓
              </button>
              <button
                type="button"
                class="icon-button"
                onclick={() => removePlayer(index)}
                disabled={players.length <= 2}
                aria-label={`Remove ${player.trim() || `player ${index + 1}`}`}
              >
                ✕
              </button>
            </div>
          {/each}
        </div>

        <button class="add" type="button" onclick={addPlayer}>+ Add player</button>
      {:else}
        <p class="intro">
          {#if rematch}
            Reorder the teams and their members, then press Play.
          {:else}
            Name the teams, then add their members in throwing order.
          {/if}
        </p>

        <div class="list-heading">
          <span>Teams</span>
          <span>{teams.length}</span>
        </div>

        {#each teams as team, teamIndex}
          <fieldset class="team">
            <legend class="visually-hidden">Team {teamIndex + 1}</legend>

            <div class="row team-row">
              <input
                type="text"
                class="team-name"
                bind:value={team.name}
                placeholder={`Team ${teamIndex + 1}`}
                aria-label={`Team ${teamIndex + 1} name`}
                aria-invalid={team.name.trim() === ''}
              />
              <button
                type="button"
                class="icon-button"
                onclick={() => moveTeam(teamIndex, -1)}
                disabled={teamIndex === 0}
                aria-label={`Move ${team.name.trim() || `team ${teamIndex + 1}`} up`}
              >
                ↑
              </button>
              <button
                type="button"
                class="icon-button"
                onclick={() => moveTeam(teamIndex, 1)}
                disabled={teamIndex === teams.length - 1}
                aria-label={`Move ${team.name.trim() || `team ${teamIndex + 1}`} down`}
              >
                ↓
              </button>
              <button
                type="button"
                class="icon-button"
                onclick={() => removeTeam(teamIndex)}
                disabled={teams.length <= 2}
                aria-label={`Remove ${team.name.trim() || `team ${teamIndex + 1}`}`}
              >
                ✕
              </button>
            </div>

            <ol class="members">
              {#each team.members as member, memberIndex}
                <li class="row member-row">
                  <span class="number" aria-hidden="true">{memberIndex + 1}</span>
                  <input
                    type="text"
                    bind:value={team.members[memberIndex]}
                    placeholder={`Member ${memberIndex + 1}`}
                    aria-label={`Team ${teamIndex + 1} member ${memberIndex + 1} name`}
                    aria-invalid={member.trim() === ''}
                  />
                  <button
                    type="button"
                    class="icon-button"
                    onclick={() => moveMember(teamIndex, memberIndex, -1)}
                    disabled={memberIndex === 0}
                    aria-label={`Move ${member.trim() || `member ${memberIndex + 1}`} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="icon-button"
                    onclick={() => moveMember(teamIndex, memberIndex, 1)}
                    disabled={memberIndex === team.members.length - 1}
                    aria-label={`Move ${member.trim() || `member ${memberIndex + 1}`} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="icon-button"
                    onclick={() => removeMember(teamIndex, memberIndex)}
                    disabled={team.members.length <= 1}
                    aria-label={`Remove ${member.trim() || `member ${memberIndex + 1}`}`}
                  >
                    ✕
                  </button>
                </li>
              {/each}
            </ol>

            <button
              class="add"
              type="button"
              onclick={() => addMember(teamIndex)}
              disabled={team.members.length >= MAX_TEAM_SIZE}
            >
              + Add member
            </button>
            {#if team.members.length >= MAX_TEAM_SIZE}
              <p class="note">A team can have up to {MAX_TEAM_SIZE} members.</p>
            {/if}
          </fieldset>
        {/each}

        <button class="add" type="button" onclick={addTeam}>+ Add team</button>
      {/if}
    </div>

    <div class="actions" class:with-cancel={rematch}>
      {#if rematch}
        <button class="cancel" type="button" onclick={cancelEditTeams}>Cancel</button>
      {/if}
      <button class="start" type="submit" disabled={!ready}>
        {rematch ? 'Play' : 'Start game'}
      </button>
    </div>
    {#if !ready}
      <p class="hint">
        {#if mode === 'individuals'}
          Give every player a name. You need at least two players.
        {:else}
          Give every team and member a name. You need at least two teams.
        {/if}
      </p>
    {/if}
  </form>
</section>

<style>
  .setup-card {
    display: grid;
    gap: 0.75rem;
  }
  .eyebrow {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #2e7d32;
  }
  h1 {
    margin: 0;
  }
  .intro {
    margin: 0 0 0.75rem;
  }
  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: 0.5rem;
    background: #eee;
  }
  .tabs button {
    padding: 0.6rem 0;
    font: inherit;
    border: none;
    border-radius: 0.4rem;
    background: none;
    cursor: pointer;
  }
  .tabs button.active {
    background: #fff;
    font-weight: 700;
    box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
  }
  .list-heading {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  .list {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .row {
    display: grid;
    align-items: center;
    gap: 0.5rem;
  }
  .player-row {
    grid-template-columns: 2ch 1fr auto auto auto;
  }
  .team-row {
    grid-template-columns: 1fr auto auto auto;
  }
  .member-row {
    grid-template-columns: 2ch 1fr auto auto auto;
  }
  .number {
    color: #666;
    text-align: right;
  }
  input {
    min-width: 0;
    padding: 0.6rem;
    font: inherit;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
  }
  input[aria-invalid='true'] {
    border-color: #c62828;
  }
  .team-name {
    font-weight: 700;
  }
  .team {
    display: grid;
    gap: 0.5rem;
    margin: 0 0 0.75rem;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 0.5rem;
  }
  .members {
    list-style: none;
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
  }
  .icon-button {
    min-width: 2.5rem;
    padding: 0.55rem 0;
    font: inherit;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
    background: #fff;
    cursor: pointer;
  }
  .add {
    padding: 0.6rem;
    font: inherit;
    border: 2px dashed #bbb;
    border-radius: 0.5rem;
    background: none;
    cursor: pointer;
  }
  .actions {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .actions.with-cancel {
    grid-template-columns: 1fr 2fr;
  }
  .start {
    padding: 0.9rem;
    font: inherit;
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    background: #2e7d32;
    cursor: pointer;
  }
  .cancel {
    padding: 0.9rem;
    font: inherit;
    border: 2px solid #bbb;
    border-radius: 0.5rem;
    background: #fff;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .hint,
  .note {
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
    color: #666;
  }
  .note {
    margin: 0;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
