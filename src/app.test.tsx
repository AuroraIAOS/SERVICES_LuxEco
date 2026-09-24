import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppEmMemoria } from './app';

describe('rotas da fundação', () => {
  it.each([
    ['/mmo', 'MMO v02'],
    ['/fpe', 'FPE'],
    ['/pop', 'POP'],
    ['/versoes', 'Versões salvas'],
  ])('%s renderiza o título %s', (caminho, titulo) => {
    render(<AppEmMemoria inicial={caminho} />);
    expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
  });

  it('rota desconhecida cai no MMO', () => {
    render(<AppEmMemoria inicial="/nao-existe" />);
    expect(screen.getByRole('heading', { level: 1, name: 'MMO v02' })).toBeInTheDocument();
  });

  it('a navegação lista as 4 telas', () => {
    render(<AppEmMemoria inicial="/mmo" />);
    const nav = screen.getByRole('navigation', { name: 'Telas' });
    expect(nav.querySelectorAll('a')).toHaveLength(4);
  });
});
