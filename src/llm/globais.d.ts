// Constantes embutidas no build por vite.config.ts (padrões do circuit breaker; vêm do .env sem prefixo VITE_).
// Em testes (Vitest) não existem: src/llm/ambiente.ts usa `typeof` antes de ler.
declare const __LLM_TETO_MENSAL_BRL__: string;
declare const __LLM_ALERTA_EM_PERCENTUAL__: string;
