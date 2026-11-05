import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mölkky Score',
        short_name: 'Mölkky',
        display: 'standalone',
        background_color: '#f4f1e8',
        theme_color: '#f4f1e8',
        icons: [
          { src: 'icons/home-256.png', sizes: '256x256', type: 'image/png' },
          { src: 'icons/home-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
