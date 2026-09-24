import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem `globals`, o Testing Library não se auto-limpa: desmontar entre os testes evita elementos duplicados.
afterEach(() => cleanup());
