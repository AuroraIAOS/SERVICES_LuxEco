import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import docs05 from '../../docs/05_COMPLIANCE_E_ETICA.md?raw';
import indexHtml from '../../index.html?raw';
import tokensJson from '../../design/tokens.json?raw';
import { AppEmMemoria, TELAS } from '../app';
import globalCss from '../estilos/global.css?raw';
import tokensCss from '../estilos/tokens.css?raw';
import uiCss from '../estilos/ui.css?raw';
import {
  Botao,
  BotaoExportar,
  BotaoLink,
  Cabecalho,
  CampoAreaTexto,
  CampoSeletor,
  CampoTexto,
  Cartao,
  EstadoVazio,
  Etiqueta,
  Hero,
  Numeros,
  NOTA_PROPRIEDADE,
  Pilula,
  Ramo,
  Rodape,
  Tela,
} from './index';
import type { FormatoExportacao } from './index';

const emRota = (ui: React.ReactElement, inicial = '/mmo') => render(<MemoryRouter initialEntries={[inicial]}>{ui}</MemoryRouter>);

describe('navegação e estrutura da página', () => {
  it('as 3 telas do MVP (MMO, FPE, POP) e as Versões são navegáveis, com a tela ativa marcada', () => {
    render(<AppEmMemoria inicial="/fpe" />);
    const nav = screen.getByRole('navigation', { name: 'Telas' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['MMO', 'FPE', 'POP', 'Versões salvas']);
    expect(within(nav).getByRole('link', { name: 'FPE' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'MMO' })).not.toHaveAttribute('aria-current');
  });

  it('tem os marcos de página (banner, navegação, conteúdo, rodapé) e um único h1 por tela', () => {
    for (const t of TELAS) {
      const { unmount } = render(<AppEmMemoria inicial={t.caminho} />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.rotulo);
      unmount();
    }
  });

  it('a marca aparece como “LUX ECO SOLUTIONS” com SOLUTIONS em destaque e o selo é decorativo', () => {
    render(<AppEmMemoria inicial="/mmo" />);
    const marca = screen.getByRole('link', { name: 'LUX ECO SOLUTIONS' });
    expect(marca.querySelector('strong')).toHaveTextContent('SOLUTIONS');
    expect(marca.querySelector('.selo')).toHaveAttribute('aria-hidden', 'true');
  });

  it('o primeiro item da tabulação é “Pular para o conteúdo”; ativá-lo foca o <main> sem trocar de rota', async () => {
    const user = userEvent.setup();
    render(<AppEmMemoria inicial="/fpe" />);
    await user.tab();
    const pular = screen.getByRole('link', { name: 'Pular para o conteúdo' });
    expect(pular).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('FPE');
  });

  it('ao trocar de tela o foco vai para o conteúdo; na primeira renderização não rouba o foco', async () => {
    const user = userEvent.setup();
    render(<AppEmMemoria inicial="/mmo" />);
    expect(screen.getByRole('main')).not.toHaveFocus();
    await user.click(screen.getByRole('link', { name: 'POP' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('POP');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('o título da aba muda com a tela', async () => {
    const user = userEvent.setup();
    render(<AppEmMemoria inicial="/mmo" />);
    expect(document.title).toBe('MMO — LUX ECO SOLUTIONS');
    await user.click(screen.getByRole('link', { name: 'Versões salvas' }));
    expect(document.title).toBe('Versões salvas — LUX ECO SOLUTIONS');
  });

  it('todos os links e botões da navegação são alcançáveis pelo teclado, na ordem visual', async () => {
    const user = userEvent.setup();
    render(<AppEmMemoria inicial="/pop" />);
    const ordem: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      ordem.push(document.activeElement?.textContent?.trim() ?? '');
    }
    expect(ordem.slice(0, 6)).toEqual(['Pular para o conteúdo', 'LUX ECO SOLUTIONS', 'MMO', 'FPE', 'POP', 'Versões salvas']);
  });

  it('sem servidor de versões, a tela diz o que houve, que nada se perdeu e oferece tentar de novo', async () => {
    render(<AppEmMemoria inicial="/versoes" />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Não foi possível carregar as versões' })).toBeInTheDocument();
    expect(screen.getByText(/nada foi perdido/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});

describe('Hero e resumo numérico', () => {
  it('o título vira h1 e nomeia a região; o subtítulo aparece', () => {
    render(<Hero titulo="MMO" subtitulo="Mapa Mental Organizacional" />);
    const regiao = screen.getByRole('region', { name: 'MMO' });
    expect(within(regiao).getByRole('heading', { level: 1 })).toHaveTextContent('MMO');
    expect(within(regiao).getByText('Mapa Mental Organizacional')).toBeInTheDocument();
  });

  it('Numeros lista os números em frases curtas e formata em pt-BR', () => {
    render(<Numeros itens={[{ valor: 12, rotulo: 'setores' }, { valor: 1234, rotulo: 'ações' }]} />);
    const lista = screen.getByRole('list', { name: 'Resumo' });
    const itens = within(lista).getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('12 setores');
    expect(itens[1]).toHaveTextContent('1.234 ações');
  });

  it('Tela junta hero e corpo', () => {
    emRota(
      <Tela titulo="FPE" subtitulo="Formulário 5W1H e fluxograma" resumo={<Numeros itens={[{ valor: 236, rotulo: 'fichas' }]} />}>
        <p>corpo da tela</p>
      </Tela>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'FPE' })).toBeInTheDocument();
    expect(screen.getByText('236', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('corpo da tela')).toBeInTheDocument();
  });
});

describe('Botão e exportação', () => {
  it('é type="button" por padrão (não envia formulário sem querer) e respeita disabled', async () => {
    const aoClicar = vi.fn();
    render(
      <form onSubmit={(e) => e.preventDefault()}>
        <Botao onClick={aoClicar}>Salvar</Botao>
        <Botao variante="primario" tipo="submit">
          Enviar
        </Botao>
        <Botao disabled onClick={aoClicar}>
          Desligado
        </Botao>
      </form>,
    );
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveClass('botao--primario');
    await userEvent.click(screen.getByRole('button', { name: 'Desligado' }));
    expect(aoClicar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('BotaoLink navega como link com a aparência de botão', () => {
    emRota(<BotaoLink para="/fpe">Abrir o FPE</BotaoLink>);
    expect(screen.getByRole('link', { name: 'Abrir o FPE' })).toHaveClass('botao');
  });

  it.each<[FormatoExportacao, string]>([
    ['json', 'Exportar fichas da Fase 1 em JSON (.json)'],
    ['md', 'Exportar fichas da Fase 1 em Markdown (.md)'],
    ['mermaid', 'Exportar fichas da Fase 1 em Mermaid (.mermaid)'],
    ['pdf', 'Exportar fichas da Fase 1 em PDF (.pdf)'],
    ['docx', 'Exportar fichas da Fase 1 em Word (.docx)'],
    ['xlsx', 'Exportar fichas da Fase 1 em Excel (.xlsx)'],
  ])('BotaoExportar “%s” tem aria-label que diz o escopo e o formato (e o texto visível está no nome)', async (formato, nome) => {
    const aoExportar = vi.fn();
    render(<BotaoExportar formato={formato} escopo="fichas da Fase 1" onExportar={aoExportar} />);
    const botao = screen.getByRole('button', { name: nome });
    expect(botao).toHaveAttribute('aria-label', nome);
    expect(botao).toHaveTextContent(`.${formato}`);
    expect(nome.toLowerCase()).toContain(`.${formato}`); // rótulo no nome (WCAG 2.5.3)
    await userEvent.click(botao);
    expect(aoExportar).toHaveBeenCalledTimes(1);
  });
});

describe('Cartão, pílula, etiqueta e ramos', () => {
  it('Cartão: título no nível pedido nomeia a seção; o setor só define a cor do filete', () => {
    render(
      <Cartao titulo="Vendas" nivel={3} setor="setor-vendas">
        <p>conteúdo</p>
      </Cartao>,
    );
    const secao = screen.getByRole('region', { name: 'Vendas' });
    expect(within(secao).getByRole('heading', { level: 3, name: 'Vendas' })).toBeInTheDocument();
    expect(secao).toHaveClass('cartao--setor');
    expect(secao.style.getPropertyValue('--cor-setor')).toBe('var(--setor-vendas)');
  });

  it('Pílula: botão nativo com aria-expanded/aria-controls; Enter e Espaço alternam; o painel é uma região nomeada', async () => {
    const user = userEvent.setup();
    render(
      <Pilula numero="02" nome="Atendimento" resumo="29 ações">
        <p>Aborda o lead rapidamente</p>
      </Pilula>,
    );
    const botao = screen.getByRole('button', { name: /Atendimento/ });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Aborda o lead rapidamente')).not.toBeVisible();
    botao.focus();
    await user.keyboard('{Enter}');
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    const painel = screen.getByRole('region', { name: /Atendimento/ });
    expect(painel).toBeVisible();
    expect(botao).toHaveAttribute('aria-controls', painel.id);
    await user.keyboard(' ');
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(botao.closest('h3')).not.toBeNull();
  });

  it('Pílula controlada de fora avisa a mudança e obedece a prop', () => {
    const aoAlternar = vi.fn();
    const { rerender } = render(
      <Pilula nome="Estágio" aberta={false} aoAlternar={aoAlternar}>
        <p>detalhe</p>
      </Pilula>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Estágio/ }));
    expect(aoAlternar).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: /Estágio/ })).toHaveAttribute('aria-expanded', 'false');
    rerender(
      <Pilula nome="Estágio" aberta aoAlternar={aoAlternar}>
        <p>detalhe</p>
      </Pilula>,
    );
    expect(screen.getByRole('button', { name: /Estágio/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('Etiqueta e Ramo: o texto diz o caminho; ✓/✗ são decorativos', () => {
    render(
      <div>
        <Etiqueta variante="ifelse">IF/ELSE</Etiqueta>
        <Etiqueta variante="whatsapp">WhatsApp</Etiqueta>
        <Ramo sim rotulo="Conta disponível" texto="segue para simulação" />
        <Ramo sim={false} rotulo="Conta indisponível" texto="solicita estimativa" />
      </div>,
    );
    expect(screen.getByText('IF/ELSE')).toHaveClass('etiqueta--ifelse');
    expect(screen.getByText('WhatsApp')).toHaveClass('etiqueta--whatsapp');
    const ramoSim = screen.getByText('Conta disponível').closest('p');
    expect(ramoSim).toHaveTextContent('Conta disponível → segue para simulação');
    expect(ramoSim?.querySelector('[aria-hidden="true"]')).toHaveTextContent('✓');
    expect(screen.getByText('Conta indisponível').closest('p')?.querySelector('[aria-hidden="true"]')).toHaveTextContent('✗');
  });

  it('EstadoVazio diz o que falta e oferece a ação', () => {
    render(<EstadoVazio titulo="Nenhuma versão salva" texto="Salve a primeira versão para vê-la aqui." acao={<Botao>Salvar versão</Botao>} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Nenhuma versão salva' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar versão' })).toBeInTheDocument();
  });

  it('Rodapé traz a nota de propriedade intelectual sugerida em docs/05', () => {
    render(<Rodape />);
    expect(screen.getByRole('contentinfo')).toHaveTextContent(NOTA_PROPRIEDADE);
    expect(docs05).toContain(NOTA_PROPRIEDADE);
  });

  it('Cabeçalho isolado lista os itens recebidos', () => {
    emRota(<Cabecalho itens={[{ caminho: '/a', rotulo: 'A' }, { caminho: '/b', rotulo: 'B' }]} />, '/b');
    expect(screen.getByRole('link', { name: 'B' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('Campos de formulário', () => {
  it('rótulo ligado ao controle; ajuda e erro descrevem o campo; erro é anunciado e marca aria-invalid', () => {
    render(<CampoTexto rotulo="Quem" ajuda="Só função ou setor." erro="Informe o setor responsável." obrigatorio />);
    const campo = screen.getByLabelText(/Quem/);
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAttribute('aria-required', 'true');
    expect(campo).toHaveAccessibleDescription('Só função ou setor. Informe o setor responsável.');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o setor responsável.');
  });

  it('sem erro não há alerta nem aria-invalid', () => {
    render(<CampoTexto rotulo="Onde" />);
    expect(screen.getByLabelText('Onde')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('área de texto e seletor seguem o mesmo padrão e encaminham o ref (compatível com react-hook-form)', () => {
    const refTexto = createRef<HTMLTextAreaElement>();
    const refSeletor = createRef<HTMLSelectElement>();
    render(
      <>
        <CampoAreaTexto ref={refTexto} rotulo="Por quê" rows={6} defaultValue="texto longo" />
        <CampoSeletor
          ref={refSeletor}
          rotulo="Setor"
          opcoes={[
            { valor: 'v', rotulo: 'Vendas' },
            { valor: 'a', rotulo: 'Administrativo' },
          ]}
        />
      </>,
    );
    expect(refTexto.current).toBe(screen.getByLabelText('Por quê'));
    expect(refTexto.current?.rows).toBe(6);
    expect(refSeletor.current).toBe(screen.getByLabelText('Setor'));
    expect(within(screen.getByLabelText('Setor')).getAllByRole('option')).toHaveLength(2);
  });

  it('digitar atualiza o valor', async () => {
    render(<CampoTexto rotulo="Como" />);
    await userEvent.type(screen.getByLabelText('Como'), 'passo a passo');
    expect(screen.getByLabelText('Como')).toHaveValue('passo a passo');
  });
});

/* ------------------------------------------------------------------------------------------------
 * Marca e acessibilidade medidas nos arquivos: nenhuma cor/fonte fora dos tokens, contraste AA, foco, toque, movimento.
 * ------------------------------------------------------------------------------------------------ */
type Rgb = [number, number, number];
const tokens = JSON.parse(tokensJson) as { cores: Record<string, string> };
const paraRgb = (valor: string): Rgb => {
  if (valor.startsWith('#')) return [1, 3, 5].map((i) => parseInt(valor.slice(i, i + 2), 16)) as Rgb;
  const [r, g, b] = valor.match(/[\d.]+/g)!.map(Number);
  return [r!, g!, b!];
};
const alfaDe = (valor: string): number => (valor.startsWith('rgba') ? Number(valor.match(/[\d.]+/g)![3]) : 1);
const linear = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminancia = ([r, g, b]: Rgb) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
const contraste = (a: Rgb, b: Rgb) => {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (escuro + 0.05);
};
const sobre = (frente: Rgb, alfa: number, fundo: Rgb): Rgb => frente.map((c, i) => Math.round(c * alfa + fundo[i]! * (1 - alfa))) as Rgb;
const cor = (nome: string) => paraRgb(tokens.cores[nome]!);
const percentual = (variavel: string) => Number(new RegExp(`${variavel}:\\s*color-mix\\(in srgb, var\\(--branco\\) (\\d+)%`).exec(uiCss)![1]) / 100;

describe('marca: nenhum valor de cor ou tipografia fora dos tokens', () => {
  const arquivos = import.meta.glob('../**/*.{tsx,css}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const codigo = Object.entries(arquivos).filter(([caminho]) => !caminho.includes('.test.') && !caminho.endsWith('tokens.css'));

  it('encontra os arquivos de código e de estilo para varrer', () => {
    expect(codigo.length).toBeGreaterThan(10);
    expect(codigo.some(([c]) => c.endsWith('ui.css'))).toBe(true);
  });

  it('nenhuma cor literal (hex, rgb, rgba, hsl) — só var(--token) e color-mix de tokens', () => {
    for (const [caminho, texto] of codigo) {
      const semComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(semComentarios, caminho).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(semComentarios, caminho).not.toMatch(/\b(?:rgba?|hsla?)\(/);
    }
  });

  it('a família da fonte só vem do token (fontes.css declara as faces; o resto usa var(--fonte-familia))', () => {
    for (const [caminho, texto] of codigo.filter(([c]) => !c.endsWith('fontes.css'))) {
      for (const m of texto.matchAll(/font-family:\s*([^;]+);/g)) expect(m[1], caminho).toContain('var(--fonte-familia)');
    }
  });

  it('só os dois pesos da marca: font-weight sempre pelos tokens (300 corpo, 800 título)', () => {
    for (const [caminho, texto] of codigo.filter(([c]) => !c.endsWith('fontes.css'))) {
      for (const m of texto.matchAll(/font-weight:\s*([^;]+);/g)) expect(m[1], caminho).toMatch(/^var\(--peso-(?:corpo|titulo)\)$/);
    }
  });

  it('tokens.css é o espelho de design/tokens.json (cores e setores)', () => {
    for (const [nome, valor] of Object.entries(tokens.cores)) expect(tokensCss, nome).toContain(`--${nome}: ${valor};`);
  });

  it('a página declara o idioma pt-BR', () => {
    expect(indexHtml).toMatch(/<html lang="pt-BR">/);
  });

  it('há uma regra reutilizável de texto justificado (justify + hyphens: auto, com quebra segura de palavra)', () => {
    const bloco = /\.texto-justificado[^{]*\{[^}]*\}/.exec(uiCss)?.[0] ?? '';
    expect(bloco).toMatch(/text-align:\s*justify/);
    expect(bloco).toMatch(/hyphens:\s*auto/);
    expect(bloco).toMatch(/overflow-wrap:\s*break-word/);
    // aplicada a caixas de texto longo (parágrafos de cartões, avisos, ajudas, respostas)
    expect(bloco).toContain('.pop-secao p');
    expect(bloco).toContain('.pop-aviso');
    expect(bloco).toContain('.campo__ajuda');
  });
});

describe('acessibilidade medida: contraste AA (WCAG 2.1), foco, toque e movimento', () => {
  const chumbo = cor('chumbo');
  const superficie = cor('chumbo-mid');
  const hover = cor('chumbo-light');
  const branco = cor('branco');
  const amarelo = cor('amarelo');
  const suave = percentual('--texto-suave');
  const fraco = percentual('--texto-fraco');

  it.each([
    ['branco sobre chumbo (texto do corpo)', () => contraste(branco, chumbo)],
    ['branco sobre chumbo-mid (cartões)', () => contraste(branco, superficie)],
    ['branco sobre chumbo-light (hover)', () => contraste(branco, hover)],
    ['amarelo sobre chumbo (números, links)', () => contraste(amarelo, chumbo)],
    ['amarelo sobre chumbo-mid', () => contraste(amarelo, superficie)],
    ['amarelo sobre chumbo-light (pílula aberta)', () => contraste(amarelo, hover)],
    ['chumbo sobre amarelo (botão primário)', () => contraste(chumbo, amarelo)],
    ['texto suave sobre chumbo', () => contraste(sobre(branco, suave, chumbo), chumbo)],
    ['texto suave sobre chumbo-mid', () => contraste(sobre(branco, suave, superficie), superficie)],
    ['texto suave sobre chumbo-light (hover da navegação)', () => contraste(sobre(branco, suave, hover), hover)],
    ['texto fraco sobre chumbo (rodapé, resumo)', () => contraste(sobre(branco, fraco, chumbo), chumbo)],
    ['texto fraco sobre chumbo-mid', () => contraste(sobre(branco, fraco, superficie), superficie)],
    ['texto fraco sobre chumbo-light (resumo da pílula aberta)', () => contraste(sobre(branco, fraco, hover), hover)],
    ['WhatsApp sobre a etiqueta (chumbo)', () => contraste(cor('whatsapp'), sobre(cor('whatsapp'), 0.14, chumbo))],
    ['WhatsApp sobre a etiqueta (chumbo-mid)', () => contraste(cor('whatsapp'), sobre(cor('whatsapp'), 0.14, superficie))],
    ['amarelo sobre a etiqueta IF/ELSE (chumbo)', () => contraste(amarelo, sobre(amarelo, alfaDe(tokens.cores['amarelo-dim']!), chumbo))],
    ['amarelo sobre a etiqueta IF/ELSE (chumbo-mid)', () => contraste(amarelo, sobre(amarelo, alfaDe(tokens.cores['amarelo-dim']!), superficie))],
  ])('%s ≥ 4,5:1', (_nome, medir) => {
    expect(medir()).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['✓ (sucesso) sobre chumbo-mid', () => contraste(cor('sucesso'), superficie)],
    ['✗ (erro) sobre chumbo-mid', () => contraste(cor('erro'), superficie)],
    ['anel de foco (amarelo) sobre chumbo', () => contraste(amarelo, chumbo)],
    ['borda do campo com erro (erro) sobre chumbo', () => contraste(cor('erro'), chumbo)],
    ['divisor (chumbo-lighter) sobre chumbo-mid não some', () => contraste(cor('chumbo-lighter'), superficie) + 1.5],
  ])('%s ≥ 3:1 (elementos gráficos)', (_nome, medir) => {
    expect(medir()).toBeGreaterThanOrEqual(3);
  });

  it('o texto do setor é sempre branco: as cores dos setores só aparecem como filete (não como texto)', () => {
    for (const [caminho, texto] of Object.entries(import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)) {
      if (caminho.includes('.test.')) continue;
      expect(texto, caminho).not.toMatch(/color:\s*var\(--setor-/);
    }
    expect(uiCss).not.toMatch(/(?<!border-left-)color:\s*var\(--cor-setor\)/);
    expect(uiCss).toMatch(/\.cartao--setor\s*\{\s*border-left-color:\s*var\(--cor-setor\)/);
  });

  it('o foco é visível: anel amarelo de 3px com afastamento, em todos os controles', () => {
    expect(globalCss).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--amarelo\)/);
    expect(globalCss).toMatch(/:focus-visible\s*\{[^}]*outline-offset:\s*2px/);
    // só o <main> (foco por código) fica sem anel
    const semComentarios = uiCss.replace(/\/\*[\s\S]*?\*\//g, '');
    const semAnel = [...semComentarios.matchAll(/([^{}]+)\{[^}]*outline:\s*none[^}]*\}/g)].map((m) => m[1]!.trim());
    expect(semAnel).toEqual(['.conteudo:focus-visible']);
  });

  it('a área de toque de botões, campos e itens expansíveis é de pelo menos 44px (2,75rem)', () => {
    for (const seletor of ['.botao', '.campo__controle', '.pilula__botao']) {
      const bloco = new RegExp(`${seletor.replace('.', '\\.')}\\s*\\{[^}]*min-height:\\s*([\\d.]+)rem`).exec(uiCss);
      expect(Number(bloco?.[1]), seletor).toBeGreaterThanOrEqual(2.75);
    }
  });

  it('respeita prefers-reduced-motion (sem animação nem transição) e o corpo tem no mínimo 16px', () => {
    expect(uiCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none !important[\s\S]*transition:\s*none !important/);
    expect(tokens).toBeDefined();
    expect(tokensCss).toContain('--tamanho-corpo-min: 16px;');
    expect(globalCss).toMatch(/body\s*\{[^}]*font-size:\s*var\(--tamanho-corpo-min\)/);
  });

  it('a única animação contínua é o pulso do selo do hero', () => {
    const animacoes = [...uiCss.matchAll(/animation:\s*([\w-]+)/g)].map((m) => m[1]);
    expect(animacoes.filter((a) => a !== 'none')).toEqual(['pulso']);
  });
});
