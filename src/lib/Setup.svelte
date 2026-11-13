<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { start, view, cancelEditTeams } from './gameStore.svelte';
  import { MAX_TEAM_SIZE, validRoster } from './molkky';
  import { moveItem } from './list';
  import { MAX_SAVED_NAMES, canSave } from './names';
  import { savedNames, forgetName, markPlayed, toggleSavedName } from './namesStore.svelte';

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
  // Names start empty: the italic placeholders only hint at what goes there.
  let players = $state<string[]>(['', '']);
  let teams = $state<Team[]>(
    editingFinishedGame
      ? finishedTeams()
      : [
          { name: '', members: [''] },
          { name: '', members: [''] },
        ],
  );

  let individualNames = $derived(players.map((name) => name.trim()));
  let teamNames = $derived(teams.map((team) => team.name.trim()));
  let teamMembers = $derived(teams.map((team) => team.members.map((name) => name.trim())));

  let ready = $derived(
    mode === 'individuals' ? validRoster(individualNames) : validRoster(teamNames, teamMembers),
  );

  // Errors only show after the first attempt to start, so an empty form is not shouted at
  let submitted = $state(false);
  let form = $state<HTMLFormElement | undefined>(undefined);
  const errorId = $props.id();

  const missing = (name: string) => submitted && name.trim() === '';

  let errorMessage = $derived(
    mode === 'individuals'
      ? 'Every player needs a name. Fill in the highlighted fields.'
      : 'Every team and every member needs a name. Fill in the highlighted fields.',
  );

  // Saved names: tapping a chip fills a name field. In team mode it goes to the active team,
  // which is a plain index (not input focus), because tapping a chip takes focus away.
  let activeTeam = $state(0);
  let managingNames = $state(false);
  let showAllNames = $state(false);

  // The newest names are always visible; the rest wait behind "Show more"
  const VISIBLE_NAMES = 5;
  let visibleNames = $derived(
    managingNames || showAllNames ? savedNames.list : savedNames.list.slice(0, VISIBLE_NAMES),
  );
  let hiddenCount = $derived(savedNames.list.length - VISIBLE_NAMES);

  // A chip is selected while its exact name is in the form
  let usedNames = $derived(new Set(mode === 'individuals' ? individualNames : teamMembers.flat()));
  let namesFull = $derived(savedNames.list.length >= MAX_SAVED_NAMES);
  let activeTeamLabel = $derived(teamNames[activeTeam] || `Team ${activeTeam + 1}`);
  let activeTeamFull = $derived(
    mode === 'teams' &&
      teams[activeTeam] !== undefined &&
      teams[activeTeam].members.length >= MAX_TEAM_SIZE &&
      teams[activeTeam].members.every((name) => name.trim() !== ''),
  );

  const isSaved = (name: string) => savedNames.list.includes(name.trim());

  // Chips toggle: a selected name is taken out of the form, otherwise it is added
  function toggleName(name: string) {
    if (usedNames.has(name)) unpickName(name);
    else pickName(name);
  }

  // Removes the last field holding exactly `name`, in any team (not just the active one)
  function unpickName(name: string) {
    if (mode === 'individuals') {
      const index = players.findLastIndex((player) => player.trim() === name);
      if (index >= 0) removePlayer(index);
      return;
    }

    for (let t = teams.length - 1; t >= 0; t--) {
      const m = teams[t].members.findLastIndex((member) => member.trim() === name);
      if (m >= 0) {
        removeMember(t, m);
        return;
      }
    }
  }

  function pickName(name: string) {
    if (mode === 'individuals') {
      const empty = players.findIndex((player) => player.trim() === '');
      if (empty >= 0) players[empty] = name;
      else players.push(name);
      return;
    }

    const team = teams[activeTeam];
    if (!team) return;
    const empty = team.members.findIndex((member) => member.trim() === '');
    if (empty >= 0) team.members[empty] = name;
    else if (team.members.length < MAX_TEAM_SIZE) team.members.push(name);
  }

  function removeSavedName(name: string) {
    forgetName(name);
    if (savedNames.list.length === 0) managingNames = false;
  }

  function selectMode(next: Mode) {
    mode = next;
    submitted = false;
  }

  async function startGame() {
    if (!ready) {
      submitted = true;
      // Wait for the error styling to render, then take the person to the first gap
      await tick();
      form?.querySelector<HTMLElement>('input[aria-invalid="true"]')?.focus();
      return;
    }

    markPlayed(mode === 'individuals' ? individualNames : teamMembers.flat());
    if (mode === 'individuals') start(individualNames);
    else start(teamNames, teamMembers);
  }

  // Removing below the minimum is allowed: an empty field takes the removed one's place
  const MIN_PLAYERS = 2;
  const MIN_TEAMS = 2;
  const emptyTeam = (): Team => ({ name: '', members: [''] });
  const isBlank = (name: string) => name.trim() === '';
  const isEmptyTeam = (team: Team) => isBlank(team.name) && team.members.every(isBlank);

  function addPlayer() {
    players.push('');
  }

  function removePlayer(index: number) {
    players.splice(index, 1);
    while (players.length < MIN_PLAYERS) players.push('');
  }

  function movePlayer(index: number, step: number) {
    players = moveItem(players, index, index + step);
  }

  // A new team becomes the active one, since it is the one you are about to fill
  function addTeam() {
    teams.push(emptyTeam());
    activeTeam = teams.length - 1;
  }

  // The active team stays the same team when others are removed or moved
  function removeTeam(index: number) {
    teams.splice(index, 1);
    if (index < activeTeam) activeTeam -= 1;
    while (teams.length < MIN_TEAMS) teams.push(emptyTeam());
    activeTeam = Math.min(activeTeam, teams.length - 1);
  }

  function moveTeam(index: number, step: number) {
    const to = index + step;
    if (to < 0 || to >= teams.length) return;
    teams = moveItem(teams, index, to);
    if (activeTeam === index) activeTeam = to;
    else if (activeTeam === to) activeTeam = index;
  }

  function addMember(teamIndex: number) {
    const team = teams[teamIndex];
    if (team.members.length >= MAX_TEAM_SIZE) return;
    team.members.push('');
  }

  function removeMember(teamIndex: number, memberIndex: number) {
    const members = teams[teamIndex].members;
    members.splice(memberIndex, 1);
    if (members.length === 0) members.push('');
  }

  function moveMember(teamIndex: number, memberIndex: number, step: number) {
    const team = teams[teamIndex];
    team.members = moveItem(team.members, memberIndex, memberIndex + step);
  }
</script>

{#snippet star(name: string)}
  {@const saved = isSaved(name)}
  <button
    type="button"
    class="star"
    aria-pressed={saved}
    aria-label={name.trim() === ''
      ? 'Save name'
      : saved
        ? `Remove ${name.trim()} from saved players`
        : `Save ${name.trim()}`}
    disabled={!saved && !canSave(savedNames.list, name)}
    onclick={() => toggleSavedName(name)}
  >
    <span aria-hidden="true">{saved ? '★' : '☆'}</span>
  </button>
{/snippet}

{#snippet savedBar()}
  {#if savedNames.list.length > 0}
    <div class="saved">
      <div class="saved-heading">
        <span>
          Saved players
          {#if mode === 'teams'}
            <span class="target">· Adding to <strong>{activeTeamLabel}</strong></span>
          {/if}
        </span>
        <button type="button" class="manage" onclick={() => (managingNames = !managingNames)}>
          {managingNames ? 'Done' : 'Edit'}
        </button>
      </div>
      <div class="chips">
        {#each visibleNames as name (name)}
          {#if managingNames}
            <button
              type="button"
              class="chip removing"
              aria-label={`Remove ${name} from saved players`}
              onclick={() => removeSavedName(name)}
            >
              {name} <span aria-hidden="true">✕</span>
            </button>
          {:else}
            {@const selected = usedNames.has(name)}
            <button
              type="button"
              class="chip"
              class:selected
              aria-pressed={selected}
              disabled={activeTeamFull && !selected}
              onclick={() => toggleName(name)}
            >
              {name}
            </button>
          {/if}
        {/each}
        {#if hiddenCount > 0 && !managingNames}
          <button
            type="button"
            class="more"
            aria-expanded={showAllNames}
            onclick={() => (showAllNames = !showAllNames)}
          >
            {showAllNames ? 'Show less' : `Show ${hiddenCount} more`}
          </button>
        {/if}
      </div>
      {#if activeTeamFull && !managingNames}
        <p class="note">{activeTeamLabel} is full.</p>
      {/if}
      {#if namesFull}
        <p class="note">{MAX_SAVED_NAMES} names saved. Remove a name to save more.</p>
      {/if}
    </div>
  {/if}
{/snippet}

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
        onclick={() => selectMode('individuals')}
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
        onclick={() => selectMode('teams')}
      >
        Teams
      </button>
    </div>
  {/if}

  <form
    bind:this={form}
    novalidate
    onsubmit={(event) => {
      event.preventDefault();
      startGame();
    }}
  >
    <div id="setup-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
      {#if mode === 'individuals'}
        <p class="intro">Add everyone playing, then start throwing.</p>

        {@render savedBar()}

        <div class="list-heading">
          <span>Players: {players.length}</span>
          <span class="order-label" aria-hidden="true">Order</span>
        </div>

        <div class="list">
          {#each players as player, index (index)}
            <div class="row player-row">
              <span class="number" aria-hidden="true">{index + 1}</span>
              <div class="field">
                <input
                  type="text"
                  bind:value={players[index]}
                  placeholder="Player"
                  aria-label={`Player ${index + 1} name`}
                  aria-invalid={missing(player)}
                  aria-describedby={missing(player) ? errorId : undefined}
                />
                {@render star(player)}
              </div>
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
                disabled={players.length <= MIN_PLAYERS && isBlank(player)}
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

        {@render savedBar()}

        <div class="list-heading in-teams">
          <span>Teams: {teams.length}</span>
          <span class="order-label" aria-hidden="true">Order</span>
        </div>

        {#each teams as team, teamIndex (teamIndex)}
          <!-- Tapping anywhere in a team makes it the target for saved-name chips.
               Keyboard users get the same through focusin. -->
          <fieldset
            class="team"
            class:active={teamIndex === activeTeam}
            onfocusin={() => (activeTeam = teamIndex)}
            onpointerdown={() => (activeTeam = teamIndex)}
          >
            <legend class="visually-hidden">Team {teamIndex + 1}</legend>

            <div class="row team-row">
              <input
                type="text"
                class="team-name"
                bind:value={team.name}
                placeholder="Team"
                aria-label={`Team ${teamIndex + 1} name`}
                aria-invalid={missing(team.name)}
                aria-describedby={missing(team.name) ? errorId : undefined}
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
                disabled={teams.length <= MIN_TEAMS && isEmptyTeam(team)}
                aria-label={`Remove ${team.name.trim() || `team ${teamIndex + 1}`}`}
              >
                ✕
              </button>
            </div>

            <ol class="members">
              {#each team.members as member, memberIndex (memberIndex)}
                <li class="row member-row">
                  <span class="number" aria-hidden="true">{memberIndex + 1}</span>
                  <div class="field">
                    <input
                      type="text"
                      bind:value={team.members[memberIndex]}
                      placeholder="Player"
                      aria-label={`Team ${teamIndex + 1} member ${memberIndex + 1} name`}
                      aria-invalid={missing(member)}
                      aria-describedby={missing(member) ? errorId : undefined}
                    />
                    {@render star(member)}
                  </div>
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
                    disabled={team.members.length <= 1 && isBlank(member)}
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

    {#if submitted && !ready}
      <p id={errorId} class="error" role="alert">{errorMessage}</p>
    {/if}

    <div class="actions" class:with-cancel={rematch}>
      {#if rematch}
        <button class="btn cancel" type="button" onclick={cancelEditTeams}>Cancel</button>
      {/if}
      <button class="btn btn-primary start" type="submit">{rematch ? 'Play' : 'Start game'}</button>
    </div>
  </form>
</section>

<style>
  .setup-card {
    display: grid;
    gap: 0.75rem;
    width: min(100%, 560px);
    padding: clamp(20px, 6vw, 44px);
    border: 1px solid var(--line);
    border-radius: clamp(18px, 4vw, 24px);
    background: var(--surface);
    box-shadow: 0 20px 50px rgb(55 45 25 / 12%);
  }
  .eyebrow {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--primary);
  }
  h1 {
    margin: 0;
  }
  form {
    margin-top: 1.5rem;
  }
  .intro {
    margin: 0 0 0.75rem;
    color: var(--text-muted);
  }
  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem;
    padding: 0.25rem;
    border: 1px solid var(--line);
    border-radius: 0.625rem;
    background: var(--surface-muted);
  }
  .tabs button {
    min-height: 44px;
    padding: 0.5rem;
    border: none;
    border-radius: 0.45rem;
    background: none;
    color: var(--text-muted);
  }
  .tabs button.active {
    background: var(--surface);
    color: var(--text);
    font-weight: 700;
    box-shadow: 0 1px 3px rgb(31 43 32 / 25%);
  }
  /* Columns line up with the rows below: label, the two order arrows, the remove button */
  .list-heading {
    display: grid;
    grid-template-columns: 1fr calc(88px + 0.5rem) 44px;
    align-items: end;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  /* Team rows sit inside the team box: match its padding (0.75rem) and border (2px) */
  .list-heading.in-teams {
    padding-inline: calc(0.75rem + 2px);
  }
  .order-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
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
    color: var(--text-muted);
    text-align: right;
  }
  input {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 0.6rem;
    border: 2px solid var(--border);
    border-radius: 0.5rem;
    outline: none;
    background: var(--surface);
  }
  input::placeholder {
    font-style: italic;
    color: var(--text-muted);
  }
  input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgb(74 107 49 / 25%);
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
  }
  .error {
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--danger);
  }
  .team-name {
    font-weight: 700;
  }
  .team.active {
    border-color: var(--primary);
  }
  .field {
    position: relative;
    min-width: 0;
  }
  .field input {
    padding-right: 44px;
  }
  .star {
    position: absolute;
    top: 0;
    right: 0;
    width: 44px;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: 0 0.5rem 0.5rem 0;
    background: none;
    color: var(--text-muted);
    font-size: 1.25rem;
  }
  .star[aria-pressed='true'] {
    color: var(--primary);
  }
  .star:disabled {
    opacity: 0.35;
  }
  .saved {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--line);
    border-radius: 0.625rem;
    background: var(--surface);
    /* Stays in reach while scrolling a long list, in both modes */
    position: sticky;
    top: 0.5rem;
    z-index: 1;
    box-shadow: 0 4px 12px rgb(55 45 25 / 10%);
  }
  .saved-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-weight: 600;
  }
  .target {
    font-weight: 400;
    color: var(--text-muted);
  }
  .target strong {
    color: var(--primary);
  }
  .manage {
    min-height: 44px;
    padding: 0 0.5rem;
    border: none;
    background: none;
    color: var(--primary);
    font-weight: 600;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .chip {
    min-height: 44px;
    padding: 0 0.9rem;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    font-weight: 600;
    transition:
      background-color 120ms ease,
      transform 80ms ease;
  }
  .chip:active:not(:disabled) {
    transform: scale(0.95);
  }
  .chip.selected {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--on-primary);
  }
  .more {
    min-height: 44px;
    padding: 0 0.5rem;
    border: none;
    background: none;
    color: var(--primary);
    font-weight: 600;
    text-decoration: underline;
  }
  .chip.removing {
    border-color: var(--danger);
    color: var(--danger);
  }
  .chip:disabled {
    opacity: 0.45;
  }
  @media (prefers-reduced-motion: reduce) {
    .chip {
      transition: none;
    }
    .chip:active:not(:disabled) {
      transform: none;
    }
  }
  .team {
    display: grid;
    gap: 0.5rem;
    margin: 0 0 0.75rem;
    padding: 0.75rem;
    border: 2px solid var(--line);
    border-radius: 0.625rem;
  }
  .members {
    list-style: none;
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
  }
  .icon-button {
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border: 2px solid var(--border);
    border-radius: 0.5rem;
    background: var(--surface);
  }
  .add {
    min-height: 44px;
    padding: 0.6rem;
    border: 2px dashed var(--border);
    border-radius: 0.5rem;
    background: none;
    color: var(--primary);
    font-weight: 600;
  }
  .actions {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .actions.with-cancel {
    grid-template-columns: 1fr 2fr;
  }
  .start,
  .cancel {
    min-height: 52px;
  }
  .start {
    font-size: 1.1rem;
    font-weight: 700;
  }
  .icon-button:disabled,
  .add:disabled {
    opacity: 0.45;
  }
  .note {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-muted);
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
