import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './' → funciona em subpasta (ex.: /intelligence/) e como arquivo local (build:single).
// mode "single" → dist-single/index.html com tudo embutido (LLM e backup no servidor ficam desativados, sem a chave no arquivo).
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  // Só os padrões do circuit breaker do LLM vêm do .env (LLM_*); nada de FTP/SMOKE entra aqui. Ver src/llm/ambiente.ts.
  const env = loadEnv(mode, process.cwd(), 'LLM_');
  return {
    base: './',
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    define: {
      __LLM_TETO_MENSAL_BRL__: JSON.stringify(env.LLM_TETO_MENSAL_BRL ?? '0'),
      __LLM_ALERTA_EM_PERCENTUAL__: JSON.stringify(env.LLM_ALERTA_EM_PERCENTUAL ?? '95'),
      ...(single ? { 'import.meta.env.VITE_OPENROUTER_API_KEY': '""' } : {}),
    },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
  };
});
