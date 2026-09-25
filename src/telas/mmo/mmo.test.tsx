import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import v07Json from '../../../data/matriz_v07.json';
import type { Matriz, MatrizV08 } from '../../dados/tipos';
import { MAPA_SITUACOES, MATRIZ_V08 } from './dados';
import { formatarEstagios, montarMmo, textoDaAcao } from './modelo';
import { TelaMmo } from './TelaMmo';

const v07 = v07Json as unknown as Matriz;
const clone = <T,>(x: T): T => structuredClone(x);
const telaMmo = (dados: MatrizV08 = MATRIZ_V08) =>
  render(
    <MemoryRouter>
      <TelaMmo dados={dados} />
    </MemoryRouter>,
  );

const botaoEstagio = (nome: RegExp) => screen.getByRole('button', { name: new RegExp(`^\\d{2} ${nome.source}`) });
const painelDe = (botao: HTMLElement) => document.getElementById(botao.getAttribute('aria-controls')!)!;

describe('modelo de visão (montarMmo): tudo calculado da Matriz V08', () => {
  const mmo = montarMmo(MATRIZ_V08, MAPA_SITUACOES);
  const numero = (rotulo: string) => mmo.numeros.find((n) => n.rotulo === rotulo)?.valor;

  it('os números do hero vêm dos dados: setores, estágios, ações, decisões IF/ELSE, equipes técnicas e regiões', () => {
    expect(numero('setores')).toBe(MATRIZ_V08.setores.length);
    expect(numero('estágios')).toBe(MATRIZ_V08.estagios.length);
    expect(numero('ações')).toBe(MATRIZ_V08.acoes.length);
    expect(numero('decisões IF/ELSE')).toBe(MATRIZ_V08.condicionais.length);
    expect(numero('equipes técnicas')).toBe(4);
    expect(numero('regiões')).toBe(2);
    // valores esperados da V08 (docs/06 §3): 12 × 22, mais células e condicionais que a V07
    expect([numero('setores'), numero('estágios')]).toEqual([12, 22]);
    expect(numero('ações')).toBeGreaterThan(v07.acoes.length);
    expect(numero('decisões IF/ELSE')).toBeGreaterThan(v07.condicionais.length);
  });

  it('agrupa os 22 estágios nas 4 fases do plano (9, 5, 5 e 3) e não perde nenhuma ação', () => {
    expect(mmo.fases.map((f) => f.estagios.length)).toEqual([9, 5, 5, 3]);
    expect(mmo.fases.map((f) => f.fase.nome)).toEqual(['Comercial', 'Técnica/Projeto', 'Execução', 'Homologação e Encerramento']);
    expect(mmo.fases.reduce((s, f) => s + f.totalAcoes, 0)).toBe(MATRIZ_V08.acoes.length);
    for (const f of mmo.fases) for (const e of f.estagios) expect(e.blocos.reduce((s, b) => s + b.acoes.length, 0), e.estagio.nome).toBe(e.totalAcoes);
  });

  it('paridade com a V07 (e com o MMO_v01): todo par setor × estágio da V07 aparece, com todas as ações dele, e nenhum par novo surge', () => {
    const pares = (m: Matriz) => new Set(m.acoes.map((a) => `${a.setor_id}|${a.estagio_id}`));
    const doModelo = new Set(mmo.fases.flatMap((f) => f.estagios.flatMap((e) => e.blocos.map((b) => `${b.setor.id}|${e.estagio.id}`))));
    expect(doModelo).toEqual(pares(v07));
    const textosNoModelo = new Set(mmo.fases.flatMap((f) => f.estagios.flatMap((e) => e.blocos.flatMap((b) => b.acoes.map((a) => a.acao.id)))));
    for (const a of v07.acoes) expect(textosNoModelo.has(a.id), a.id).toBe(true);
  });

  it('as ações de cada setor aparecem na ordem da Matriz e as IF/ELSE trazem os dois ramos', () => {
    for (const f of mmo.fases) {
      for (const e of f.estagios) {
        for (const b of e.blocos) {
          const ordens = b.acoes.map((a) => a.acao.ordem);
          expect(ordens).toEqual([...ordens].sort((x, y) => x - y));
          for (const a of b.acoes) expect(Boolean(a.condicional), a.acao.id).toBe(a.acao.e_condicional);
        }
      }
    }
    expect(mmo.fases.flatMap((f) => f.estagios.flatMap((e) => e.blocos.flatMap((b) => b.acoes.filter((a) => a.condicional)))).length).toBe(MATRIZ_V08.condicionais.length);
  });

  it('o marcador “(GRUPO DE FLUXO)” da planilha sai do texto exibido e vira a etiqueta WhatsApp (4 ações)', () => {
    const zap = MATRIZ_V08.acoes.filter((a) => a.canal === 'whatsapp_grupo_fluxo');
    expect(zap).toHaveLength(4);
    for (const a of zap) {
      expect(a.texto).toMatch(/\(GRUPO DE FLUXO\)/);
      expect(textoDaAcao(a)).not.toMatch(/GRUPO DE FLUXO\)/i);
    }
    const outra = MATRIZ_V08.acoes.find((a) => !a.canal)!;
    expect(textoDaAcao(outra)).toBe(outra.texto);
    expect(mmo.fases.flatMap((f) => f.estagios.flatMap((e) => e.blocos.flatMap((b) => b.acoes.filter((a) => a.whatsapp))))).toHaveLength(4);
  });

  it('formatarEstagios: sequências de 3 ou mais viram “a”; o resto vai em lista', () => {
    expect(formatarEstagios([1, 2, 3, 22])).toBe('01 a 03 e 22');
    expect(formatarEstagios([15, 16, 17, 19, 22])).toBe('15 a 17, 19 e 22');
    expect(formatarEstagios([3, 4])).toBe('03 e 04');
    expect(formatarEstagios([3, 4, 7])).toBe('03, 04 e 07');
    expect(formatarEstagios([5])).toBe('05');
    expect(formatarEstagios(Array.from({ length: 22 }, (_, i) => i + 1))).toBe('01 a 22');
    expect(formatarEstagios([])).toBe('');
    expect(formatarEstagios([22, 1, 2, 3, 2])).toBe('01 a 03 e 22');
  });

  it('setores: estágios de atuação calculados da Matriz (Marketing 01 a 03 e 22; Administrativo e CEO 01 a 22) e equipes por região', () => {
    const porNome = (n: string) => mmo.setores.find((s) => s.setor.nome === n)!;
    expect(porNome('Marketing').estagiosTexto).toBe('01 a 03 e 22');
    expect(porNome('Administrativo').estagiosTexto).toBe('01 a 22');
    expect(porNome('CEO').estagiosTexto).toBe('01 a 22');
    expect(porNome('Logística').estagios).toEqual([14, 15]);
    expect(porNome('Equipe Técnica').equipesPorRegiao).toEqual([
      { regiao: 'Lavras', equipes: ['Tiago/Illumini', 'Vinícius'] },
      { regiao: 'Passos', equipes: ['Odirley/Lumines', 'João Paulo/C7'] },
    ]);
    expect(mmo.setores.reduce((s, x) => s + x.totalAcoes, 0)).toBe(MATRIZ_V08.acoes.length);
  });

  it('decisões: as 15 situações do Mapa (estágio da planilha) + as IF/ELSE novas do atendimento e do pós-venda = todas as condicionais', () => {
    expect(mmo.decisoes.situacoes).toHaveLength(15);
    expect(mmo.decisoes.atendimento).toHaveLength(6);
    const quinta = mmo.decisoes.situacoes[4]!;
    expect(quinta.pergunta).toBe('Renegociação dentro da margem?');
    expect(quinta.estagiosTexto).toBe('Est. 06'); // o Mapa dizia Est. 07; a Matriz vence (docs/06 §2)
    expect(mmo.decisoes.situacoes[8]!.estagiosTexto).toBe('Est. 15 e 17');
    expect(new Set(mmo.decisoes.atendimento.map((d) => d.estagiosTexto))).toEqual(new Set(['Est. 02', 'Est. 22']));
    for (const d of [...mmo.decisoes.situacoes, ...mmo.decisoes.atendimento]) {
      expect(d.sim.texto.length, d.chave).toBeGreaterThan(0);
      expect(d.nao.texto.length, d.chave).toBeGreaterThan(0);
      expect(d.setorCor, d.chave).toMatch(/^setor-/);
    }
  });

  it('ramificações da V08: perfis, classificação do lead e oportunidades no Est. 02; oportunidades de pós-venda no Est. 22', () => {
    const est = (n: number) => mmo.fases.flatMap((f) => f.estagios).find((e) => e.estagio.id === n)!;
    expect(est(2).perfis).toHaveLength(6);
    expect(est(2).leads.map((l) => l.nome)).toEqual(['Lead Quente', 'Lead Morno', 'Lead Frio']);
    expect(est(2).oportunidades.length).toBeGreaterThan(0);
    expect(est(22).oportunidades.length).toBeGreaterThan(est(2).oportunidades.length);
    expect(est(1).perfis).toHaveLength(0);
    expect(est(1).oportunidades).toHaveLength(0);
  });

  it('a jornada do cliente vem dos dados (10 fases)', () => {
    expect(mmo.jornada).toHaveLength(10);
    expect(mmo.jornada.map((j) => j.nome)).toContain('Homologação');
  });
});

describe('tela MMO renderizada', () => {
  it('abre com o título, o subtítulo e os números calculados (nenhum número aproximado digitado no código)', () => {
    telaMmo();
    expect(screen.getByRole('heading', { level: 1, name: 'MMO' })).toBeInTheDocument();
    expect(screen.getByText('Mapa Mental Organizacional')).toBeInTheDocument();
    const resumo = screen.getByRole('list', { name: 'Resumo' });
    expect(resumo).toHaveTextContent(`${MATRIZ_V08.setores.length} setores`);
    expect(resumo).toHaveTextContent(`${MATRIZ_V08.estagios.length} estágios`);
    expect(resumo).toHaveTextContent(`${MATRIZ_V08.acoes.length} ações`);
    expect(resumo).toHaveTextContent(`${MATRIZ_V08.condicionais.length} decisões IF/ELSE`);
    expect(resumo).toHaveTextContent('4 equipes técnicas');
    expect(resumo).toHaveTextContent('2 regiões');
    expect(document.body.textContent).not.toContain(['210', '+'].join(''));
  });

  it('tem as 4 seções (ciclo, setores, decisões, jornada) e as 4 fases com os 22 estágios em botões expansíveis', () => {
    telaMmo();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Ciclo de serviço em 22 estágios',
      'Os 12 setores',
      'Decisões IF/ELSE',
      'Jornada do cliente em 10 fases',
    ]);
    const fases = screen.getAllByRole('group');
    expect(fases).toHaveLength(4);
    expect(fases.map((g) => within(g).getAllByRole('button', { name: /^\d{2} / }).length)).toEqual([9, 5, 5, 3]);
    expect(screen.getAllByRole('button', { name: /^\d{2} / })).toHaveLength(22);
    for (const b of screen.getAllByRole('button', { name: /^\d{2} / })) expect(b).toHaveAttribute('aria-expanded', 'false');
  });

  it('Est. 02: abre com o clique e mostra Vendas, as ações, o IF/ELSE com ✓/✗ e as ações novas da V08', async () => {
    const user = userEvent.setup();
    telaMmo();
    const botao = botaoEstagio(/Atendimento/);
    await user.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    const painel = painelDe(botao);
    expect(painel).toBeVisible();
    const vendas = within(painel).getByRole('region', { name: /^Vendas,/ });
    expect(within(vendas).getByText('Aborda o lead rapidamente')).toBeInTheDocument();
    expect(within(vendas).getByText('Inicia o atendimento com pergunta aberta sobre como o cliente resolve hoje a questão da energia')).toBeInTheDocument();
    const ifelse = within(vendas).getByText('Verifica disponibilidade da conta de energia').closest('li')!;
    expect(within(ifelse).getByText('IF/ELSE')).toBeInTheDocument();
    expect(ifelse).toHaveTextContent('Conta disponível → segue para simulação');
    expect(ifelse).toHaveTextContent('Conta indisponível → solicita estimativa de consumo');
    expect([...ifelse.querySelectorAll('[aria-hidden="true"]')].map((s) => s.textContent)).toEqual(['✓', '✗']);
    // Energia por Assinatura da Lux como desfecho alternativo do funil
    expect(within(vendas).getByText('Avalia se o cliente quer e consegue instalar o sistema fotovoltaico').closest('li')).toHaveTextContent('oferece Energia por Assinatura da Lux');
    // o CEO decide nas situações não previstas
    expect(within(painel).getByRole('region', { name: /^CEO,/ })).toHaveTextContent('Decide sobre situação sem procedimento definido');
  });

  it('Est. 02: mostra a triagem por perfil, a classificação do lead e as oportunidades; Est. 22 mostra as de pós-venda', async () => {
    const user = userEvent.setup();
    telaMmo();
    const b2 = botaoEstagio(/Atendimento/);
    await user.click(b2);
    const p2 = painelDe(b2);
    const triagem = within(p2).getByRole('region', { name: 'Triagem por perfil do cliente' });
    expect(within(triagem).getAllByRole('listitem')).toHaveLength(6);
    expect(triagem).toHaveTextContent('Paga somente a distribuidora');
    expect(triagem).toHaveTextContent('Imóvel alugado');
    const lead = within(p2).getByRole('region', { name: 'Classificação do lead' });
    expect(lead).toHaveTextContent('Lead Quente');
    expect(lead).toHaveTextContent('Lead Frio');
    expect(within(p2).getByRole('region', { name: 'Oportunidades a identificar' })).toHaveTextContent('Energia por Assinatura da Lux');

    const b22 = botaoEstagio(/Pós-venda/);
    await user.click(b22);
    const p22 = painelDe(b22);
    expect(within(p22).getByText('Solicita indicações ao cliente')).toBeInTheDocument();
    const oport = within(p22).getByRole('region', { name: 'Oportunidades a identificar' });
    expect(oport).toHaveTextContent('Retrofit');
    expect(oport).toHaveTextContent('Limpeza técnica');
    expect(oport).toHaveTextContent('Indicações');
  });

  it('cada fase mantém um estágio aberto por vez; fases diferentes não se fecham entre si', async () => {
    const user = userEvent.setup();
    telaMmo();
    const b1 = botaoEstagio(/Prospecção/);
    const b2 = botaoEstagio(/Atendimento/);
    const b10 = botaoEstagio(/Projeto/);
    await user.click(b1);
    expect(b1).toHaveAttribute('aria-expanded', 'true');
    await user.click(b2);
    expect(b2).toHaveAttribute('aria-expanded', 'true');
    expect(b1).toHaveAttribute('aria-expanded', 'false'); // mesma fase (Comercial)
    await user.click(b10);
    expect(b10).toHaveAttribute('aria-expanded', 'true');
    expect(b2).toHaveAttribute('aria-expanded', 'true'); // outra fase (Técnica/Projeto)
    await user.click(b2);
    expect(b2).toHaveAttribute('aria-expanded', 'false');
  });

  it('a fase com um estágio aberto ganha o dobro da largura (as outras seguem em 1fr) e volta ao normal ao fechar', async () => {
    const user = userEvent.setup();
    const { container } = telaMmo();
    const grade = container.querySelector('.fases') as HTMLElement;
    const colunas = () => grade.style.getPropertyValue('--colunas');
    expect(colunas()).toBe('minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)');
    const b10 = botaoEstagio(/Projeto/); // fase 2
    await user.click(b10);
    expect(colunas()).toBe('minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)');
    await user.click(b10);
    expect(colunas()).toBe('minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)');
  });

  it('Est. 07: a ação do Grupo de Fluxo aparece sem o marcador da planilha e com a etiqueta WhatsApp', async () => {
    const user = userEvent.setup();
    telaMmo();
    const botao = botaoEstagio(/Aprovação do contrato/);
    await user.click(botao);
    const painel = painelDe(botao);
    const acao = within(painel).getByText('Cria o Grupo de Fluxo no WhatsApp com o cliente (canal temporário)').closest('li')!;
    expect(within(acao).getByText('WhatsApp')).toHaveClass('etiqueta--whatsapp');
    expect(painel.textContent).not.toMatch(/\(GRUPO DE FLUXO\)/);
  });

  it('funciona só pelo teclado: Tab até o botão e Enter/Espaço abrem e fecham o estágio', async () => {
    const user = userEvent.setup();
    telaMmo();
    const botao = botaoEstagio(/Prospecção/);
    botao.focus();
    await user.keyboard('{Enter}');
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(botao).toHaveAttribute('aria-expanded', 'false');
  });

  it('12 cartões de setor, um aberto por vez, com funções, estágios de atuação e equipes', async () => {
    const user = userEvent.setup();
    telaMmo();
    const botoes = screen.getAllByRole('button', { name: /^S\d{2} / });
    expect(botoes).toHaveLength(12);
    // o nome acessível leva número, nome e tipo separados por espaço (leitor de tela lê “S06 CEO Núcleo estratégico”)
    expect(screen.getByRole('button', { name: 'S06 CEO Núcleo estratégico' })).toBeInTheDocument();
    const marketing = screen.getByRole('button', { name: /^S01 Marketing/ });
    await user.click(marketing);
    const painel = painelDe(marketing);
    expect(within(painel).getByText('Opera campanhas de tráfego pago (Google Ads)')).toBeInTheDocument();
    expect(painel).toHaveTextContent('Atua em 4 de 22 estágios: 01 a 03 e 22.');
    const tecnica = screen.getByRole('button', { name: /^S10 Equipe Técnica/ });
    await user.click(tecnica);
    expect(marketing).toHaveAttribute('aria-expanded', 'false');
    expect(painelDe(tecnica)).toHaveTextContent('Equipes: Lavras: Tiago/Illumini e Vinícius; Passos: Odirley/Lumines e João Paulo/C7.');
    const engenharia = screen.getByRole('button', { name: /^S07 Engenharia/ });
    await user.click(engenharia);
    expect(painelDe(engenharia)).toHaveTextContent('Empresas: Galva Engenharia e Telar Engenharia.');
  });

  it('a cor do setor é só filete (a variável CSS), nunca texto', async () => {
    const user = userEvent.setup();
    telaMmo();
    const vendas = screen.getByRole('button', { name: /^S02 Vendas/ });
    expect(vendas.closest('.pilula')).toHaveStyle({ '--cor-setor': 'var(--setor-vendas)' });
    await user.click(botaoEstagio(/Atendimento/));
    const bloco = screen.getAllByRole('region', { name: /^Vendas,/ })[0]!;
    expect(bloco.style.getPropertyValue('--cor-setor')).toBe('var(--setor-vendas)');
  });

  it('decisões IF/ELSE: 15 situações do mapa + 6 do atendimento e do pós-venda, cada uma com ✓ e ✗', () => {
    telaMmo();
    const secao = screen.getByRole('region', { name: 'Decisões IF/ELSE' });
    const cartoes = within(secao).getAllByRole('article');
    expect(cartoes).toHaveLength(21);
    expect(secao).toHaveTextContent('21 decisões com dois caminhos cada: 15 situações do mapa e 6 do atendimento e do pós-venda.');
    for (const c of cartoes) expect([...c.querySelectorAll('[aria-hidden="true"]')].map((s) => s.textContent)).toEqual(['✓', '✗']);
    const quinta = within(secao).getByRole('heading', { name: 'Renegociação dentro da margem?' }).closest('article')!;
    expect(quinta).toHaveTextContent('Est. 06, CEO');
    expect(quinta).toHaveTextContent('Ajuste dentro da margem autorizada → assina e registra');
  });

  it('jornada do cliente: lista numerada com as 10 fases', () => {
    telaMmo();
    const secao = screen.getByRole('region', { name: 'Jornada do cliente em 10 fases' });
    const itens = within(within(secao).getByRole('list')).getAllByRole('listitem');
    expect(itens).toHaveLength(10);
    expect(itens[0]).toHaveTextContent('Primeiro contato');
    expect(itens[9]).toHaveTextContent('Pós-venda');
  });

  it('é orientada a dados: mudar a Matriz muda a tela (números, textos e setores), sem nada fixo no código', async () => {
    const user = userEvent.setup();
    const dados = clone(MATRIZ_V08);
    dados.setores[0]!.funcoes = ['Função inventada só para o teste'];
    dados.setores[0]!.nome = 'Marketing Digital';
    const primeira = dados.acoes.find((a) => a.setor_id === 'setor_02' && a.estagio_id === 2)!;
    primeira.texto = 'Texto alterado no dado';
    dados.acoes.push({ ...primeira, id: 'acao_02_02_999', ordem: 99, texto: 'Ação nova', celula: 'ZZ1' });
    telaMmo(dados);
    expect(screen.getByRole('list', { name: 'Resumo' })).toHaveTextContent(`${MATRIZ_V08.acoes.length + 1} ações`);
    const b = screen.getByRole('button', { name: /^S01 Marketing Digital/ });
    await user.click(b);
    expect(painelDe(b)).toHaveTextContent('Função inventada só para o teste');
    const est2 = botaoEstagio(/Atendimento/);
    await user.click(est2);
    expect(within(painelDe(est2)).getByText('Texto alterado no dado')).toBeInTheDocument();
    expect(within(painelDe(est2)).getByText('Ação nova')).toBeInTheDocument();
  });
});
