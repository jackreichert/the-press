import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // VITE_BASE is set to /thepress/ in the GitHub Actions deploy workflow.
  // Falls back to / for local dev so the dev server is unaffected.
  base: process.env.VITE_BASE ?? '/',
});
