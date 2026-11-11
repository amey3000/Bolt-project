import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const runtimeEnv = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const env = runtimeEnv.process?.env ?? {};
  const supabaseUrl = fileEnv.SUPABASE_URL ?? env.SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const supabaseAnonKey = fileEnv.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? fileEnv.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;

  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
  },
  };
});
