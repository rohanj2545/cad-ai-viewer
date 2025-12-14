import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This securely passes the Vercel Environment Variable to the frontend code
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});