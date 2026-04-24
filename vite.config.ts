import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
      'process.env.CLAIM_VISION': JSON.stringify(env.CLAIM_VISION ?? ''),
      'process.env.GEMINI_CLAIM_MODEL': JSON.stringify(env.GEMINI_CLAIM_MODEL ?? ''),
      'process.env.OPENAI_CLAIM_MODEL': JSON.stringify(env.OPENAI_CLAIM_MODEL ?? ''),
      'process.env.GEMINI_POLICY_CHAT_MODEL': JSON.stringify(env.GEMINI_POLICY_CHAT_MODEL ?? ''),
      'process.env.GEMINI_POLICY_ANALYSIS_MODEL': JSON.stringify(env.GEMINI_POLICY_ANALYSIS_MODEL ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
