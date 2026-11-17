<script lang="ts" module>
  // Icon paths from Lucide (https://lucide.dev), ISC License,
  // Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
  // All other copyright (c) for Lucide are held by Lucide Contributors 2022.
  const paths = {
    'chevron-up': ['m18 15-6-6-6 6'],
    check: ['M20 6 9 17l-5-5'],
    x: ['M18 6 6 18', 'm6 6 12 12'],
    crown: [
      'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z',
      'M5 21h14',
    ],
    'chevron-down': ['m6 9 6 6 6-6'],
    trash: [
      'M3 6h18',
      'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6',
      'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
      'M10 11v6',
      'M14 11v6',
    ],
    star: [
      'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
    ],
  } as const;

  export type IconName = keyof typeof paths;
</script>

<script lang="ts">
  // Decorative only: the button around the icon carries the accessible name.
  let {
    name,
    size = 20,
    filled = false,
  }: { name: IconName; size?: number; filled?: boolean } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={filled ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {#each paths[name] as d (d)}
    <path {d} />
  {/each}
</svg>

<style>
  svg {
    display: block;
    flex-shrink: 0;
  }
</style>
