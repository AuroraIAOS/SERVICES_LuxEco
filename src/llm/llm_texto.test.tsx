// Saída do LLM é sempre TEXTO (03.3): nada que o modelo devolva é interpretado como HTML, e a saída passa por validação de conteúdo.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { chamarModelo } from './cliente';
import { montarMensagens, PROMPT_SISTEMA, TAMANHO_MAXIMO_SAIDA, validarSaida } from './prompt';

const entrada = { pergunta: 'Como medir Vendas?', resposta: 'Pelos indicadores Atendimentos realizados e Contratos fechados. A meta é definida pela Lux.' };

describe('validarSaida', () => {
  it('aceita texto simples reescrito com os mesmos números', () => {
    expect(validarSaida(entrada, ' Usa os indicadores Atendimentos realizados e Contratos fechados; a Lux define a meta.\n')).toEqual({ ok: true, texto: 'Usa os indicadores Atendimentos realizados e Contratos fechados; a Lux define a meta.' });
    expect(validarSaida({ pergunta: 'x', resposta: 'Cartão em até 21 vezes.' }, 'Aceita cartão em até 21 vezes.').ok).toBe(true);
  });

  it.each([
    ['vazia', '   ', 'vazia'],
    ['HTML', 'Veja <b>isto</b>', 'marcacao'],
    ['script', 'ok <script>alert(1)</script>', 'marcacao'],
    ['imagem com evento', '<img src=x onerror=alert(1)>', 'marcacao'],
    ['bloco de código', '```js\nalert(1)\n```', 'marcacao'],
    ['valor em reais', 'A parcela custa R$ 300 por mês.', 'cifra'],
    ['prazo numérico', 'Responde em 3 dias.', 'prazo'],
    ['número inventado', 'Usa os indicadores Atendimentos realizados e 5 metas.', 'numero_novo'],
    ['texto grande demais', 'a'.repeat(TAMANHO_MAXIMO_SAIDA + 1), 'longa'],
  ])('recusa %s', (_nome, saida, motivo) => {
    expect(validarSaida(entrada, saida)).toEqual({ ok: false, motivo });
  });
});

describe('a saída é renderizada como texto', () => {
  it('HTML hostil vindo do modelo aparece como caracteres, sem criar elementos', () => {
    const hostil = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script><b>negrito</b>';
    const { container } = render(<p data-testid="saida">{hostil}</p>);
    expect(container.querySelector('img, script, b')).toBeNull();
    expect(screen.getByTestId('saida').textContent).toBe(hostil);
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('o cliente só entrega string: conteúdo que não é texto vira “vazio”', async () => {
    const resposta = (conteudo: unknown) => (async () => new Response(JSON.stringify({ choices: [{ message: { content: conteudo } }] }), { status: 200 })) as unknown as typeof fetch;
    for (const c of [{ html: '<b>x</b>' }, ['a'], 42, null]) {
      const r = await chamarModelo({ chave: 'k', modelo: 'a/b:free', mensagens: [], fetchFn: resposta(c) });
      expect(r).toEqual({ ok: false, erro: 'vazio' });
    }
    const ok = await chamarModelo({ chave: 'k', modelo: 'a/b:free', mensagens: [], fetchFn: resposta('<b>texto</b>') });
    expect(ok.ok && typeof ok.texto).toBe('string');
  });
});

describe('prompt fixo', () => {
  it('manda usar só o conteúdo fornecido, sem fatos, números, prazos ou nomes novos', () => {
    for (const trecho of ['SOMENTE o conteúdo fornecido', 'números', 'prazos', 'valores em reais', 'nomes de pessoas', 'sem título, lista, tabela, HTML ou marcação']) expect(PROMPT_SISTEMA).toContain(trecho);
  });

  it('a mensagem leva a pergunta e a resposta, e nada mais (sem chave nem dados pessoais)', () => {
    const m = montarMensagens(entrada);
    expect(m.map((x) => x.role)).toEqual(['system', 'user']);
    expect(m[1]!.content).toContain(entrada.pergunta);
    expect(m[1]!.content).toContain(entrada.resposta);
  });
});
