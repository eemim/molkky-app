<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { start, view, cancelEditTeams } from './gameStore.svelte';
  import { MAX_TEAM_SIZE, validRoster } from './molkky';
  import { moveItem } from './list';
  import Icon from './Icon.svelte';
  import { MAX_SAVED_NAMES, canSave } from './names';
  import { savedNames, forgetName, markPlayed, toggleSavedName } from './namesStore.svelte';

  type Mode = 'individuals' | 'teams';
  type Team = { name: string; members: string[] };

  // `rematch`: edit the teams of the game that just finished, then play again
  let { rematch = false, onOpenSettings }: { rematch?: boolean; onOpenSettings?: () => void } =
    $props();

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

  // The saved card only sticks while it is compact; expanded or in Edit mode it could cover
  // most of a phone screen. While it sticks, the page reserves its height as scroll padding,
  // so a focused field is never scrolled in behind it.
  let savedSticky = $derived(savedNames.list.length > 0 && !showAllNames && !managingNames);
  let savedHeight = $state(0);

  // Syncing to <html> (outside this component) is what $effect is for
  $effect(() => {
    const root = document.documentElement;
    // sticky offset (--space-2) + card + breathing room (--space-2)
    root.style.scrollPaddingTop = savedSticky ? `${savedHeight + 16}px` : '';
    return () => {
      root.style.scrollPaddingTop = '';
    };
  });

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

  // The mode description sits with the mode picker, so it is chosen here instead of in the panel
  let introText = $derived(
    rematch
      ? 'Reorder the teams and their members, then press Play.'
      : mode === 'individuals'
        ? 'Add everyone playing, then start throwing.'
        : 'Name the teams, then add their members in throwing order.',
  );
  const introId = `${errorId}-intro`;
  const pickerId = `${errorId}-picker`;

  function selectMode(next: Mode) {
    mode = next;
    submitted = false;
  }

  async function startGame() {
    if (!ready) {
      submitted = true;
      // Wait for the error styling to render, then take the person to the first gap
      await tick();
      const firstGap = form?.querySelector<HTMLElement>('input[aria-invalid="true"]');
      firstGap?.focus({ preventScroll: true });
      // scrollIntoView respects the scroll padding above (jsdom has no scrollIntoView)
      firstGap?.scrollIntoView?.({ block: 'center' });
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
    activeTeam = teamIndex;
  }

  // Enter (RET on a phone keyboard) only confirms the field and closes the keyboard.
  // Without this the browser submits the form: it would jump to a gap or start the game.
  function confirmField(event: KeyboardEvent) {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    event.target.blur();
  }

  // A tap on a team box selects it. `click` (unlike `pointerdown`) does not fire when the
  // touch turns into a scroll. Buttons inside the box do their own thing: a move or remove
  // must not re-select the team by its old position afterwards.
  function selectTeam(event: MouseEvent, teamIndex: number) {
    if (event.target instanceof Element && event.target.closest('button')) return;
    activeTeam = teamIndex;
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
    <Icon name="star" filled={saved} />
  </button>
{/snippet}

{#snippet savedBar()}
  {#if savedNames.list.length > 0}
    <div class="saved" class:sticky={savedSticky} bind:offsetHeight={savedHeight}>
      <div class="saved-heading">
        <span>Saved players</span>
        <button type="button" class="manage" onclick={() => (managingNames = !managingNames)}>
          {managingNames ? 'Done' : 'Edit'}
        </button>
      </div>
      {#if mode === 'teams' && !managingNames}
        <!-- Which team the chips add to. Native radios give arrow keys and announcements for free;
             the labels are the 44px pills. Tapping a team box still selects it too. -->
        <div class="picker" role="radiogroup" aria-labelledby={`${pickerId}-label`}>
          <span class="picker-label" id={`${pickerId}-label`}>Add to:</span>
          {#each teams as team, teamIndex (teamIndex)}
            <label class="pill" class:on={teamIndex === activeTeam}>
              <input
                type="radio"
                class="visually-hidden"
                name={pickerId}
                checked={teamIndex === activeTeam}
                onchange={() => (activeTeam = teamIndex)}
              />
              {#if teamIndex === activeTeam}
                <Icon name="check" size={16} />
              {/if}
              <span class="truncate">{team.name.trim() || `Team ${teamIndex + 1}`}</span>
            </label>
          {/each}
        </div>
      {/if}
      <div class="chips">
        {#each visibleNames as name (name)}
          {#if managingNames}
            <button
              type="button"
              class="chip removing"
              aria-label={`Remove ${name} from saved players`}
              onclick={() => removeSavedName(name)}
            >
              <span class="truncate">{name}</span> <span aria-hidden="true">✕</span>
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
              <span class="truncate">{name}</span>
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

<!-- Groups, top to bottom: header, mode picker, saved players, players/teams, start.
     The card and the form space groups with one gap (--space-6); inside a group, --space-2. -->
<section class="setup-card" aria-labelledby="setup-title">
  <header class="header">
    <div class="group">
      <div class="eyebrow">Molkky</div>
      <h1 id="setup-title">{rematch ? 'Edit teams' : 'Set up your game'}</h1>
    </div>
    {#if onOpenSettings}
      <button type="button" class="settings-btn" aria-label="Settings" onclick={onOpenSettings}>
        <Icon name="settings" size={24} />
      </button>
    {/if}
  </header>

  <div class="group">
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
    <p class="intro" id={introId}>{introText}</p>
  </div>

  <form
    bind:this={form}
    novalidate
    onsubmit={(event) => {
      event.preventDefault();
      startGame();
    }}
  >
    <div
      id="setup-panel"
      class="panel"
      role="tabpanel"
      aria-labelledby={`tab-${mode}`}
      aria-describedby={introId}
    >
      {@render savedBar()}

      {#if mode === 'individuals'}
        <div class="group">
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
                    enterkeyhint="done"
                    onkeydown={confirmField}
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
                  <Icon name="chevron-up" />
                </button>
                <button
                  type="button"
                  class="icon-button"
                  onclick={() => movePlayer(index, 1)}
                  disabled={index === players.length - 1}
                  aria-label={`Move ${player.trim() || `player ${index + 1}`} down`}
                >
                  <Icon name="chevron-down" />
                </button>
                <button
                  type="button"
                  class="icon-button"
                  onclick={() => removePlayer(index)}
                  disabled={players.length <= MIN_PLAYERS && isBlank(player)}
                  aria-label={`Remove ${player.trim() || `player ${index + 1}`}`}
                >
                  <Icon name="trash" />
                </button>
              </div>
            {/each}
          </div>

          <button class="add" type="button" onclick={addPlayer}>+ Add player</button>
        </div>
      {:else}
        <div class="group">
          <div class="list-heading in-teams">
            <span>Teams: {teams.length}</span>
            <span class="order-label" aria-hidden="true">Order</span>
          </div>

          <div class="team-list">
            {#each teams as team, teamIndex (teamIndex)}
              <!-- Tapping anywhere in a team makes it the target for saved-name chips. This is a
                   pointer shortcut: keyboard and screen reader users have the "Add to" radios,
                   and focusing a field in the team selects it too. -->
              <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
              <fieldset
                class="team"
                class:active={teamIndex === activeTeam}
                onfocusin={() => (activeTeam = teamIndex)}
                onclick={(event) => selectTeam(event, teamIndex)}
              >
                <legend class="visually-hidden">Team {teamIndex + 1}</legend>

                <div class="row team-row">
                  <input
                    type="text"
                    enterkeyhint="done"
                    onkeydown={confirmField}
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
                    <Icon name="chevron-up" />
                  </button>
                  <button
                    type="button"
                    class="icon-button"
                    onclick={() => moveTeam(teamIndex, 1)}
                    disabled={teamIndex === teams.length - 1}
                    aria-label={`Move ${team.name.trim() || `team ${teamIndex + 1}`} down`}
                  >
                    <Icon name="chevron-down" />
                  </button>
                  <button
                    type="button"
                    class="icon-button"
                    onclick={() => removeTeam(teamIndex)}
                    disabled={teams.length <= MIN_TEAMS && isEmptyTeam(team)}
                    aria-label={`Remove ${team.name.trim() || `team ${teamIndex + 1}`}`}
                  >
                    <Icon name="trash" />
                  </button>
                </div>

                <ol class="members">
                  {#each team.members as member, memberIndex (memberIndex)}
                    <li class="row member-row">
                      <span class="number" aria-hidden="true">{memberIndex + 1}</span>
                      <div class="field">
                        <input
                          type="text"
                          enterkeyhint="done"
                          onkeydown={confirmField}
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
                        <Icon name="chevron-up" />
                      </button>
                      <button
                        type="button"
                        class="icon-button"
                        onclick={() => moveMember(teamIndex, memberIndex, 1)}
                        disabled={memberIndex === team.members.length - 1}
                        aria-label={`Move ${member.trim() || `member ${memberIndex + 1}`} down`}
                      >
                        <Icon name="chevron-down" />
                      </button>
                      <button
                        type="button"
                        class="icon-button"
                        onclick={() => removeMember(teamIndex, memberIndex)}
                        disabled={team.members.length <= 1 && isBlank(member)}
                        aria-label={`Remove ${member.trim() || `member ${memberIndex + 1}`}`}
                      >
                        <Icon name="trash" />
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

            <!-- Inside the team list, so it sits as far from the last team as teams from each other -->
            <button class="add" type="button" onclick={addTeam}>+ Add team</button>
          </div>
        </div>
      {/if}
    </div>

    <div class="group">
      {#if submitted && !ready}
        <p id={errorId} class="error" role="alert">{errorMessage}</p>
      {/if}

      <div class="actions" class:with-cancel={rematch}>
        {#if rematch}
          <button class="btn cancel" type="button" onclick={cancelEditTeams}>Cancel</button>
        {/if}
        <button class="btn btn-primary start" type="submit"
          >{rematch ? 'Play' : 'Start game'}</button
        >
      </div>
    </div>
  </form>
</section>

<style>
  .setup-card,
  form,
  .panel {
    display: grid;
    gap: var(--space-6);
  }
  .group {
    display: grid;
    gap: var(--space-2);
  }
  .team-list {
    display: grid;
    gap: var(--space-4);
  }
  .setup-card {
    width: min(100%, 560px);
    padding: var(--space-8);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-card);
  }
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }
  /* Borderless icon button, 44px target, pulled into the card's corner padding. */
  .settings-btn {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-2)) 0 0;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-muted);
    transition: background-color 120ms ease;
  }
  .settings-btn:active {
    background: var(--surface-muted);
  }
  @media (prefers-reduced-motion: reduce) {
    .settings-btn {
      transition: none;
    }
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
  .intro {
    margin: 0;
    color: var(--text-muted);
  }
  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
    padding: var(--space-1);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-muted);
  }
  .tabs button {
    min-height: 44px;
    padding: var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-muted);
  }
  .tabs button.active {
    background: var(--surface);
    color: var(--text);
    font-weight: 700;
    box-shadow: var(--shadow-raised);
  }
  /* Columns line up with the rows below: label, the two order arrows, the remove button */
  .list-heading {
    display: grid;
    grid-template-columns: 1fr calc(88px + 0.5rem) 44px;
    align-items: end;
    gap: var(--space-2);
    font-weight: 600;
  }
  /* Team rows sit inside the team box: match its padding (--space-3) and border (2px) */
  .list-heading.in-teams {
    padding-inline: calc(var(--space-3) + 2px);
  }
  .order-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
  }
  .list {
    display: grid;
    gap: var(--space-2);
  }
  .row {
    display: grid;
    align-items: center;
    gap: var(--space-2);
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
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    outline: none;
    background: var(--surface);
  }
  input::placeholder {
    font-style: italic;
    color: var(--text-muted);
  }
  input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--focus-glow);
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
  }
  .error {
    margin: 0;
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
    display: grid;
    place-items: center;
    width: 44px;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    background: none;
    color: var(--text-muted);
  }
  .star[aria-pressed='true'] {
    color: var(--primary);
  }
  .star:disabled {
    opacity: 0.45;
  }
  .saved {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
  }
  /* Stays in reach while scrolling a long list, in both modes (only while compact) */
  .saved.sticky {
    position: sticky;
    top: var(--space-2);
    z-index: 1;
    box-shadow: var(--shadow-sticky);
  }
  .saved-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    font-weight: 600;
  }
  .picker {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }
  .picker-label {
    color: var(--text-muted);
  }
  /* Distinct from the name chips: a selected chip is solid green, the selected team is tinted */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    max-width: var(--name-max);
    min-height: 44px;
    padding: 0 var(--space-3);
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease;
  }
  .pill.on {
    border-color: var(--primary);
    background: var(--success-bg);
    color: var(--primary);
  }
  .pill:has(input:focus-visible) {
    outline: 3px solid var(--primary);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .pill {
      transition: none;
    }
  }
  .manage {
    min-height: 44px;
    padding: 0 var(--space-2);
    border: none;
    background: none;
    color: var(--primary);
    font-weight: 600;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    max-width: var(--name-max);
    min-height: 44px;
    padding: 0 var(--space-3);
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
    padding: 0 var(--space-2);
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
    gap: var(--space-2);
    margin: 0;
    padding: var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-md);
  }
  .members {
    list-style: none;
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
  }
  /* Borderless icon buttons: the icon is 20px, the tap area stays 44px. A round highlight
     shows the press, so the row stays calm without boxes. */
  .icon-button {
    display: grid;
    place-items: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: none;
    color: var(--text-muted);
    transition: background-color 120ms ease;
  }
  .icon-button:active:not(:disabled) {
    background: var(--surface-muted);
    color: var(--text);
  }
  @media (prefers-reduced-motion: reduce) {
    .icon-button {
      transition: none;
    }
  }
  .add {
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--primary);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--primary);
    font-weight: 600;
    transition:
      background-color 120ms ease,
      transform 80ms ease;
  }
  .add:active:not(:disabled) {
    background: var(--success-bg);
    transform: scale(0.98);
  }
  @media (prefers-reduced-motion: reduce) {
    .add {
      transition: none;
    }
    .add:active:not(:disabled) {
      transform: none;
    }
  }
  .actions {
    display: grid;
    gap: var(--space-2);
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
    overflow-wrap: anywhere; /* a long team name in "X is full." wraps */
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  @media (max-width: 440px) {
    .setup-card {
      padding: var(--space-4);
    }
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
