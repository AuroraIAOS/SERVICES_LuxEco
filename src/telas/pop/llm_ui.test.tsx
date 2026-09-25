import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PERGUNTAS_POP } from '../../dados/pop';
import type { ArmazenamentoTexto } from '../../estado/armazenamento';
import { CHAVE_POP } from '../../estado/pop';
import type { Ambiente } from '../../llm/ambiente';
import { CHAVE_LLM_CONFIG, CHAVE_LLM_CONSENTIMENTO, CHAVE_LLM_USO } from '../../llm/armazenamento';
import { TelaPop } from './TelaPop';

const CHAVE = 'sk-or-v1-chave-da-ferramenta';
const MODELOS = ['google/gemma-4-31b-it:free', 'qwen/qwen3.8-27b:free', 'nvidia/nemotron-3-super-120b-a12b:free'];
const AMBIENTE: Ambiente = { chave: CHAVE, titulo: 'Teste', llmDisponivel: true, padroes: { tetoMensalBrl: 0, alertaPercentual: 95, limiteDiario: 50, modelos: MODELOS } };

function falsoStorage(inicial: Record<string, string> = {}): ArmazenamentoTexto & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial));
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) };
}

type Roteiro = (modelo: string) => Response;
const ok = (texto: string) => new Response(JSON.stringify({ choices: [{ message: { content: texto } }], usage: { prompt_tokens: 100, completion_tokens: 30 } }), { status: 200 });
const erro = (codigo: number) => new Response(JSON.stringify({ error: { code: codigo } }), { status: codigo });
function fetchFalso(roteiro: Roteiro) {
  const modelos: string[] = [];
  const fn = (async (_url: string, init?: RequestInit) => {
    const m = (JSON.parse(String(init?.body)) as { model: string }).model;
    modelos.push(m);
    return roteiro(m);
  }) as unknown as typeof fetch;
  return { fn, modelos };
}

const pergunta = PERGUNTAS_POP.perguntas.find((p) => p.setor_id === 'setor_01')!;
const campo = () => screen.getByRole('textbox', { name: pergunta.pergunta }) as HTMLTextAreaElement;
const REDIGIDO = 'Gerar e encaminhar leads ao setor de Vendas e cuidar da propaganda e da publicidade da marca.';

/** o servidor de backups de mentira: sem PHP por perto (404), como no `npm run dev`. */
const SEM_SERVIDOR = (async () => new Response('não existe', { status: 404 })) as unknown as typeof fetch;

function tela(f: ReturnType<typeof fetchFalso> | null, storage = falsoStorage(), ambiente = AMBIENTE, servidor: typeof fetch = SEM_SERVIDOR) {
  render(
    <MemoryRouter>
      <TelaPop armazenamento={storage} ambienteLlm={ambiente} fetchLlm={f?.fn} fetchServidor={servidor} />
    </MemoryRouter>,
  );
  return storage;
}
const abrir = async (user: ReturnType<typeof userEvent.setup>, nome: RegExp) => user.click(screen.getByRole('button', { name: nome }));
/** a IA vive num único acordeão “IA (opcional)” (redação + limite de gasto no mesmo quadro). */
const abrirIa = async (user: ReturnType<typeof userEvent.setup>) => abrir(user, /IA \(opcional\)/);
const ciente = async (user: ReturnType<typeof userEvent.setup>) => {
  await abrirIa(user);
  await user.click(screen.getByRole('checkbox', { name: /Entendo que o texto será enviado a um provedor externo/ }));
};
const redigir = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: `Redigir com IA: ${pergunta.pergunta}` }));

describe('redação com IA na tela POP', () => {
  it('as duas seções da IA (redação e limite de gasto) existem no mesmo quadro, com o aviso de provedor externo e o checkbox de ciência', async () => {
    const user = userEvent.setup();
    tela(null);
    await abrirIa(user);
    expect(screen.getByRole('note')).toHaveTextContent('enviado a um provedor externo');
    expect(screen.getByRole('checkbox', { name: /Entendo que o texto será enviado/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /LLM padrão/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /LLM particular/ })).not.toBeChecked();
    expect(screen.getByRole('heading', { name: /Redação com IA/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Limite de gasto da IA/ })).toBeInTheDocument();
  });

  it('sem a ciência marcada NENHUMA chamada sai e a resposta não muda', async () => {
    const user = userEvent.setup();
    const f = fetchFalso(() => ok(REDIGIDO));
    tela(f);
    const antes = campo().value;
    await redigir(user);
    expect(await screen.findByText(/Marque a ciência de envio ao provedor externo/)).toBeInTheDocument();
    expect(f.modelos).toHaveLength(0);
    expect(campo().value).toBe(antes);
  });

  it('com a ciência, mostra a sugestão como texto e só aplica quando a pessoa aceita', async () => {
    const user = userEvent.setup();
    const f = fetchFalso(() => ok(REDIGIDO));
    const s = tela(f);
    await ciente(user);
    expect(s.dados.get(CHAVE_LLM_CONSENTIMENTO)).toContain('"aceito":true');
    await redigir(user);
    const sugestao = await screen.findByRole('group', { name: `Sugestão da IA: ${pergunta.pergunta}` });
    expect(sugestao).toHaveTextContent(REDIGIDO);
    expect(sugestao).toHaveTextContent(MODELOS[0]!);
    expect(campo().value).toBe(pergunta.resposta_padrao); // ainda não aplicou
    await user.click(within(sugestao).getByRole('button', { name: 'Usar esta redação' }));
    expect(campo().value).toBe(REDIGIDO);
    expect(JSON.parse(s.dados.get(CHAVE_POP)!).pop_respostas[pergunta.id].texto).toBe(REDIGIDO);
    expect(screen.queryByRole('group', { name: /Sugestão da IA/ })).not.toBeInTheDocument();
    expect(JSON.parse(s.dados.get(CHAVE_LLM_USO)!)).toMatchObject({ requisicoes_dia: 1, tokens_entrada: 100, tokens_saida: 30 });
  });

  it('“Descartar” não muda a resposta', async () => {
    const user = userEvent.setup();
    tela(fetchFalso(() => ok(REDIGIDO)));
    await ciente(user);
    await redigir(user);
    await user.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(campo().value).toBe(pergunta.resposta_padrao);
  });

  it('HTML devolvido pelo modelo não é interpretado (a sugestão é recusada; nada de elemento novo)', async () => {
    const user = userEvent.setup();
    tela(fetchFalso(() => ok('<img src=x onerror=alert(1)> Gerar leads.')));
    await ciente(user);
    await redigir(user);
    expect(await screen.findByText(/Os modelos de IA não responderam agora/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(campo().value).toBe(pergunta.resposta_padrao);
  });

  it('modelo 1 falha (404): a sugestão vem do modelo 2', async () => {
    const user = userEvent.setup();
    const f = fetchFalso((m) => (m === MODELOS[0] ? erro(404) : ok(REDIGIDO)));
    tela(f);
    await ciente(user);
    await redigir(user);
    expect(await screen.findByRole('group', { name: /Sugestão da IA/ })).toHaveTextContent(MODELOS[1]!);
    expect(f.modelos).toEqual([MODELOS[0], MODELOS[1]]);
  });

  it.each([
    [402, /falta de crédito/],
    [429, /não responderam agora/],
    [404, /não responderam agora/],
  ])('erro %i: aviso claro, texto original mantido', async (codigo, aviso) => {
    const user = userEvent.setup();
    tela(fetchFalso(() => erro(codigo)));
    await ciente(user);
    await redigir(user);
    expect(await screen.findByText(aviso)).toBeInTheDocument();
    expect(campo().value).toBe(pergunta.resposta_padrao);
  });

  it('sem chave da IA padrão: avisa e não chama', async () => {
    const user = userEvent.setup();
    const f = fetchFalso(() => ok(REDIGIDO));
    tela(f, falsoStorage(), { ...AMBIENTE, chave: '' });
    await abrirIa(user);
    expect(screen.getByText(/Não há chave da IA padrão configurada/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Entendo que o texto será enviado/ }));
    await redigir(user);
    expect(await screen.findByText(/Não há chave de IA configurada/)).toBeInTheDocument();
    expect(f.modelos).toHaveLength(0);
  });

  it('limite diário atingido bloqueia antes de chamar', async () => {
    const user = userEvent.setup();
    const hoje = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const dia = `${hoje.getFullYear()}-${p2(hoje.getMonth() + 1)}-${p2(hoje.getDate())}`;
    const uso = { mes: dia.slice(0, 7), dia, tokens_entrada: 0, tokens_saida: 0, gasto_estimado_brl: 0, requisicoes_dia: 50 };
    const f = fetchFalso(() => ok(REDIGIDO));
    tela(f, falsoStorage({ [CHAVE_LLM_USO]: JSON.stringify(uso) }));
    await ciente(user);
    await redigir(user);
    expect(await screen.findByText(/limite diário de chamadas da IA foi atingido/)).toBeInTheDocument();
    expect(f.modelos).toHaveLength(0);
  });

  it('modo indisponível (arquivo único): sem botão de IA e sem o quadro da IA', () => {
    tela(null, falsoStorage(), { ...AMBIENTE, llmDisponivel: false });
    expect(screen.queryByRole('button', { name: /Redigir com IA/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /IA \(opcional\)/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Limite de gasto da IA/ })).not.toBeInTheDocument();
  });
});

describe('IA particular', () => {
  it('a chave só existe na memória: nada do que ela é vai para o storage', async () => {
    const user = userEvent.setup();
    const f = fetchFalso(() => ok(REDIGIDO));
    const s = tela(f);
    await abrirIa(user);
    await user.click(screen.getByRole('radio', { name: /LLM particular/ }));
    await user.type(screen.getByLabelText(/Chave da API/), 'sk-particular-super-secreta');
    await user.type(screen.getByLabelText(/^Modelo/), 'provedor/meu-modelo');
    await user.click(screen.getByRole('checkbox', { name: /Entendo que o texto será enviado/ }));
    expect(screen.getByLabelText(/Chave da API/)).toHaveAttribute('type', 'password');
    // redação e limite de gasto vivem no mesmo quadro: “Salvar limite de gasto” já está visível.
    await user.click(screen.getByRole('button', { name: 'Salvar limite de gasto' }));
    for (const valor of s.dados.values()) {
      expect(valor).not.toContain('sk-particular-super-secreta');
      expect(valor).not.toContain(CHAVE);
    }
  });

  it('com teto R$ 0 a chave particular não chama (nenhuma chamada paga)', async () => {
    const user = userEvent.setup();
    const f = fetchFalso(() => ok(REDIGIDO));
    tela(f);
    await abrirIa(user);
    await user.click(screen.getByRole('radio', { name: /LLM particular/ }));
    await user.type(screen.getByLabelText(/Chave da API/), 'chave');
    await user.type(screen.getByLabelText(/^Modelo/), 'provedor/meu-modelo');
    await user.click(screen.getByRole('checkbox', { name: /Entendo que o texto será enviado/ }));
    await redigir(user);
    expect(await screen.findByText(/teto de gasto da IA foi atingido/)).toBeInTheDocument();
    expect(f.modelos).toHaveLength(0);
  });
});

describe('painel “Limite de gasto da IA”', () => {
  const abrirPainel = async (user: ReturnType<typeof userEvent.setup>) => abrirIa(user);
  const digitar = async (user: ReturnType<typeof userEvent.setup>, rotulo: string | RegExp, valor: string) => {
    const c = screen.getByLabelText(rotulo);
    await user.clear(c);
    if (valor !== '') await user.type(c, valor);
  };

  it('mostra o padrão do .env (R$ 0,00, alerta 95%, 50 chamadas) e os 3 modelos em ordem', async () => {
    const user = userEvent.setup();
    tela(null);
    await abrirPainel(user);
    expect(screen.getByLabelText('Teto mensal (R$)')).toHaveValue('0');
    expect(screen.getByLabelText('Alerta em (%)')).toHaveValue('95');
    expect(screen.getByLabelText('Limite diário de chamadas')).toHaveValue('50');
    expect(screen.getByLabelText('Principal')).toHaveValue(MODELOS[0]);
    expect(screen.getByLabelText('Reserva 1')).toHaveValue(MODELOS[1]);
    expect(screen.getByLabelText('Reserva 2')).toHaveValue(MODELOS[2]);
    expect(screen.getByText(/Teto R\$ 0,00: nenhuma chamada paga/)).toBeInTheDocument();
  });

  it('aumentar o teto pede ciência de custo e o valor digitado duas vezes; sem isso é recusado', async () => {
    const user = userEvent.setup();
    const s = tela(null);
    await abrirPainel(user);
    await digitar(user, 'Teto mensal (R$)', '25');
    expect(screen.getByRole('checkbox', { name: /gasto é cobrado na minha conta/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar limite de gasto' }));
    expect(await screen.findByText(/Marque que você entende que o gasto é cobrado/)).toBeInTheDocument();
    expect(screen.getByText('Digite o novo teto de novo, igual ao de cima, para confirmar.')).toBeInTheDocument();
    expect(s.dados.get(CHAVE_LLM_CONFIG)).toBeUndefined();
  });

  it('com ciência e confirmação, salva; a config gravada não tem chave e o novo teto vale', async () => {
    const user = userEvent.setup();
    const s = tela(null);
    await abrirPainel(user);
    await digitar(user, 'Teto mensal (R$)', '25');
    await user.click(screen.getByRole('checkbox', { name: /gasto é cobrado na minha conta/ }));
    await digitar(user, /Digite o novo teto de novo/, '25');
    await user.click(screen.getByRole('button', { name: 'Salvar limite de gasto' }));
    expect(await screen.findByText('Limite de gasto salvo neste navegador.')).toBeInTheDocument();
    const salvo = JSON.parse(s.dados.get(CHAVE_LLM_CONFIG)!);
    expect(salvo).toMatchObject({ teto_mensal_brl: 25, alerta_percentual: 95, limite_diario_requisicoes: 50, modelos: MODELOS });
    expect(Object.keys(salvo).join()).not.toMatch(/chave|key/i);
    expect(screen.getByText(/de R\$\s25,00/)).toBeInTheDocument();
  });

  it.each([['-3', /negativo/], ['abc', /só números/], ['20000', /máximo aceito/]])('teto %j é recusado', async (valor, msg) => {
    const user = userEvent.setup();
    tela(null);
    await abrirPainel(user);
    await digitar(user, 'Teto mensal (R$)', valor);
    await user.click(screen.getByRole('button', { name: 'Salvar limite de gasto' }));
    expect(await screen.findByText(msg)).toBeInTheDocument();
  });

  it('reduzir o teto é livre', async () => {
    const user = userEvent.setup();
    const inicial = { schema_versao: 1, teto_mensal_brl: 50, alerta_percentual: 90, limite_diario_requisicoes: 50, modelos: MODELOS, atualizado_em: '2026-09-25T10:00:00.000Z' };
    const s = tela(null, falsoStorage({ [CHAVE_LLM_CONFIG]: JSON.stringify(inicial) }));
    await abrirPainel(user);
    expect(screen.getByLabelText('Teto mensal (R$)')).toHaveValue('50');
    await digitar(user, 'Teto mensal (R$)', '10');
    expect(screen.queryByRole('checkbox', { name: /gasto é cobrado/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar limite de gasto' }));
    await waitFor(() => expect(JSON.parse(s.dados.get(CHAVE_LLM_CONFIG)!).teto_mensal_brl).toBe(10));
  });

  it('modelos: pelo menos um; id pago, repetido ou inválido é recusado', async () => {
    const user = userEvent.setup();
    tela(null);
    await abrirPainel(user);
    await digitar(user, 'Reserva 1', 'openai/gpt-4o');
    await user.click(screen.getByRole('button', { name: 'Salvar limite de gasto' }));
    expect(await screen.findByText(/modelos inválidos, repetidos ou pagos/)).toBeInTheDocument();
    await digitar(user, 'Reserva 1', '');
    await digitar(user, 'Principal', '');
    await user.click(screen.getByRole('button', { name: 'Salvar limite de gasto' }));
    // reserva 2 continua válida: a lista passa a ter 1 modelo e é aceita
    expect(await screen.findByText('Limite de gasto salvo neste navegador.')).toBeInTheDocument();
    expect(screen.getByLabelText('Principal')).toHaveValue(MODELOS[2]);
  });

  it('“Zerar contador do mês” zera o gasto e os tokens guardados', async () => {
    const user = userEvent.setup();
    const hoje = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const dia = `${hoje.getFullYear()}-${p2(hoje.getMonth() + 1)}-${p2(hoje.getDate())}`;
    const uso = { mes: dia.slice(0, 7), dia, tokens_entrada: 900, tokens_saida: 300, gasto_estimado_brl: 3.5, requisicoes_dia: 4 };
    const s = tela(null, falsoStorage({ [CHAVE_LLM_USO]: JSON.stringify(uso) }));
    await abrirPainel(user);
    expect(screen.getByText(/Gasto estimado do mês/)).toHaveTextContent('R$ 3,50');
    await user.click(screen.getByRole('button', { name: 'Zerar contador do mês' }));
    expect(screen.getByText(/Gasto estimado do mês/)).toHaveTextContent('R$ 0,00');
    expect(JSON.parse(s.dados.get(CHAVE_LLM_USO)!)).toMatchObject({ gasto_estimado_brl: 0, tokens_entrada: 0, tokens_saida: 0, requisicoes_dia: 4 });
  });
});

describe('config_llm no servidor (03.5)', () => {
  const doServidor = { schema_versao: 1, teto_mensal_brl: 40, alerta_percentual: 80, limite_diario_requisicoes: 20, modelos: ['x/novo:free'], atualizado_em: '2999-01-01T00:00:00.000Z' };
  const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

  it('a config do servidor, se mais recente, vale e é copiada para o navegador', async () => {
    const user = userEvent.setup();
    const servidor = (async (url: string) => (String(url).includes('config_ler') ? json({ existe: true, config: doServidor }) : json({}, 404))) as unknown as typeof fetch;
    const s = tela(null, falsoStorage(), AMBIENTE, servidor);
    await user.click(screen.getByRole('button', { name: /IA \(opcional\)/ }));
    await waitFor(() => expect(screen.getByLabelText('Teto mensal (R$)')).toHaveValue('40'));
    expect(JSON.parse(s.dados.get(CHAVE_LLM_CONFIG)!)).toMatchObject({ teto_mensal_brl: 40, modelos: ['x/novo:free'] });
  });

  it('config do servidor mais antiga que a local não a substitui', async () => {
    const user = userEvent.setup();
    const local = { schema_versao: 1, teto_mensal_brl: 7, alerta_percentual: 90, limite_diario_requisicoes: 50, modelos: MODELOS, atualizado_em: '2026-09-26T00:00:00.000Z' };
    const antiga = { ...doServidor, atualizado_em: '2026-01-01T00:00:00.000Z' };
    const servidor = (async () => json({ existe: true, config: antiga })) as unknown as typeof fetch;
    tela(null, falsoStorage({ [CHAVE_LLM_CONFIG]: JSON.stringify(local) }), AMBIENTE, servidor);
    await user.click(screen.getByRole('button', { name: /IA \(opcional\)/ }));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByLabelText('Teto mensal (R$)')).toHaveValue('7');
  });

  it('salvar grava no navegador e no servidor (com X-Lux-Requisicao e sem chave) e avisa', async () => {
    const user = userEvent.setup();
    const posts: RequestInit[] = [];
    const servidor = (async (url: string, init?: RequestInit) => {
      if (String(url).includes('config_gravar')) {
        posts.push(init ?? {});
        return json({ config: JSON.parse(String(init?.body)) });
      }
      return json({ existe: false, config: null });
    }) as unknown as typeof fetch;
    tela(null, falsoStorage(), AMBIENTE, servidor);
    await user.click(screen.getByRole('button', { name: /IA \(opcional\)/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar limite de gasto' }));
    expect(await screen.findByText('Limite de gasto salvo neste navegador e no servidor.')).toBeInTheDocument();
    expect(posts).toHaveLength(1);
    expect(posts[0]!.headers).toMatchObject({ 'X-Lux-Requisicao': '1' });
    expect(String(posts[0]!.body)).not.toMatch(/chave|api_key|sk-/i);
  });

  it('sem servidor, salvar continua funcionando só no navegador', async () => {
    const user = userEvent.setup();
    tela(null);
    await user.click(screen.getByRole('button', { name: /IA \(opcional\)/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar limite de gasto' }));
    expect(await screen.findByText('Limite de gasto salvo neste navegador.')).toBeInTheDocument();
  });
});
