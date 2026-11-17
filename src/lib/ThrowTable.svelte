<script lang="ts">
  import { view, previewEdit, editThrow } from './gameStore.svelte';
  import { memberStats, type ThrowRow } from './molkky';

  let { player, editable = false }: { player: number; editable?: boolean } = $props();

  let rows = $derived(view.throws[player] ?? []);

  // Team games: the team's members, in throwing order (empty for individuals)
  let members = $derived(view.state?.players[player]?.members ?? []);
  let isTeam = $derived(members.length > 0);
  let summary = $derived(memberStats(rows, members));

  // 0 = miss, 1 to 12 = points
  const options = Array.from({ length: 13 }, (_, i) => i);

  function change(row: ThrowRow, select: HTMLSelectElement) {
    const points = Number(select.value);
    if (points === row.points) return;

    const removed = previewEdit(row.index, points);
    if (removed === null) {
      select.value = String(row.points);
      return;
    }

    if (removed > 0) {
      const throws =
        removed === 1 ? '1 later throw no longer fits' : `${removed} later throws no longer fit`;
      const ok = confirm(
        `This changes the game from this throw onward, and ${throws}. They will be removed. Continue?`,
      );
      if (!ok) {
        select.value = String(row.points);
        return;
      }
    }

    editThrow(row.index, points);
  }
</script>

{#if rows.length === 0}
  <p class="empty">No throws yet.</p>
{:else}
  {#if isTeam}
    <table class="summary">
      <thead>
        <tr>
          <th>Member</th>
          <th>Throws</th>
          <th>Points</th>
          <th>Misses</th>
        </tr>
      </thead>
      <tbody>
        {#each summary as stat (stat)}
          <tr>
            <td><span class="truncate cell-name">{stat.name}</span></td>
            <td>{stat.throws}</td>
            <td>{stat.points}</td>
            <td>{stat.misses}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <table class="throws">
    <thead>
      <tr>
        <th>Round</th>
        {#if isTeam}
          <th>Thrower</th>
        {/if}
        <th>Points</th>
        <th>Total</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.index)}
        <tr class:miss={row.points === 0}>
          <td>{row.round}</td>
          {#if isTeam}
            <td class="thrower"><span class="truncate cell-name">{row.member}</span></td>
          {/if}
          <td class="points">
            {#if editable}
              <select
                aria-label={isTeam
                  ? `Round ${row.round}, ${row.member}, points`
                  : `Round ${row.round} points`}
                onchange={(event) => change(row, event.currentTarget)}
              >
                {#each options as option (option)}
                  <option value={option} selected={option === row.points}>
                    {option === 0 ? 'miss' : option}
                  </option>
                {/each}
              </select>
            {:else}
              {row.points === 0 ? 'miss' : row.points}
            {/if}
          </td>
          <td>{row.total}</td>
          <td class="note">
            {#if row.event === 'finished'}
              reached 50
            {:else if row.event === 'eliminated'}
              out
            {:else if row.event === 'reset'}
              over 50, back to 25
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  table {
    width: 100%;
    margin-top: 0.5rem;
    border-collapse: collapse;
    font-size: 0.95rem;
  }
  /* Table cells grow with their content, so names get a fixed cap before the "…" */
  .cell-name {
    display: block;
    max-width: 7rem;
  }
  .summary,
  .throws {
    margin-bottom: 0.75rem;
  }
  th {
    text-align: left;
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--text-muted);
    padding: 0.25rem 0.5rem;
  }
  td {
    padding: 0.35rem 0.5rem;
    border-top: 1px solid var(--line);
  }
  select {
    min-height: 44px;
    padding: 0.5rem;
    border: 2px solid var(--border);
    border-radius: 0.5rem;
    background: var(--surface);
  }
  .miss .points,
  .miss select {
    color: var(--danger);
  }
  .note {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  .empty {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    color: var(--text-muted);
  }
</style>
