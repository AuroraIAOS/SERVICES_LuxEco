// Barra de exportação e importação da tela FPE (02.10): botões com nome acessível, downloads, impressão e ida e volta pelo JSON.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOCUMENTO_FICHAS } from '../../dados/fichas';
import { MATRIZ_V08 } from '../../dados/matriz';
import { CHAVE_FPE, CHAVE_FPE_ANTES_IMPORTAR } from '../../estado/armazenamento';
import type { ArmazenamentoTexto, EstadoFpe } from '../../estado/armazenamento';
import { ID_AREA_IMPRESSAO } from '../../exportar/pdf';
import { TelaFpe } from './TelaFpe';

function falso(): ArmazenamentoTexto & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) };
}
const guardado = (s: { dados: Map<string, string> }): EstadoFpe => JSON.parse(s.dados.get(CHAVE_FPE) ?? '{"schema_versao":1,"fpe_edicoes":{}}') as EstadoFpe;

const tela = (armazenamento: ArmazenamentoTexto) =>
  render(
    <MemoryRouter>
      <TelaFpe armazenamento={armazenamento} dados={MATRIZ_V08} fichas={DOCUMENTO_FICHAS} />
    </MemoryRouter>,
  );

const primeiroSetor = MATRIZ_V08.setores.find((s) => s.id === DOCUMENTO_FICHAS.fichas[0]!.setor_id)!;
const botao = (nome: string) => screen.getByRole('button', { name: nome });

describe('exportar e importar na tela FPE', () => {
  let baixados: { nome: string; blob: Blob }[];
  let impressoes: { papel: string; html: string; titulo: string }[];

  beforeEach(() => {
    baixados = [];
    impressoes = [];
    let ultimoBlob: Blob | null = null;
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      ultimoBlob = b as Blob;
      return 'blob:lux';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      baixados.push({ nome: this.download, blob: ultimoBlob! });
    });
    window.print = vi.fn(() => {
      const area = document.getElementById(ID_AREA_IMPRESSAO)!;
      impressoes.push({ papel: area.className, html: area.innerHTML, titulo: document.title });
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById(ID_AREA_IMPRESSAO)?.remove();
    document.documentElement.classList.remove('imprimindo');
  });

  it('todo botão de exportação diz o escopo e o formato no nome acessível (Exportar <escopo> em <formato>)', () => {
    tela(falso());
    const n = primeiroSetor.nome;
    for (const nome of [
      `Exportar fichas do setor ${n} em Markdown (.md)`,
      `Exportar fichas do setor ${n} em PDF (.pdf)`,
      'Exportar fichas de todos os setores em Markdown (.md)',
      'Exportar fichas de todos os setores em PDF (.pdf)',
      'Exportar as edições do FPE em JSON (.json)',
      `Exportar fluxo do setor ${n} em Mermaid (.mermaid)`,
      `Exportar fluxo do setor ${n} em PDF (.pdf)`,
      'Exportar fluxo geral da Fase 1 em Mermaid (.mermaid)',
      'Exportar fluxo geral da Fase 1 em PDF (.pdf)',
    ]) {
      expect(botao(nome), nome).toBeInTheDocument();
    }
  });

  it('o fluxo geral segue a fase escolhida (nome do botão e nome do arquivo)', async () => {
    const user = userEvent.setup();
    tela(falso());
    await user.selectOptions(screen.getByLabelText('Fase do fluxograma geral'), '3');
    await user.click(botao('Exportar fluxo geral da Fase 3 em Mermaid (.mermaid)'));
    expect(baixados[0]!.nome).toMatch(/^fpe_geral-fase3_\d{4}-\d{2}-\d{2}\.mermaid$/);
    expect(await baixados[0]!.blob.text()).toMatch(/^%% Fluxo geral — Fase 3: /);
  });

  it('.md do setor e .md geral baixam com o nome padrão e o conteúdo em vigor', async () => {
    const user = userEvent.setup();
    tela(falso());
    await user.type(screen.getByLabelText(/^Quem/), ' (edição de teste)');
    await user.click(botao(`Exportar fichas do setor ${primeiroSetor.nome} em Markdown (.md)`));
    await user.click(botao('Exportar fichas de todos os setores em Markdown (.md)'));
    expect(baixados.map((b) => b.nome)).toEqual([expect.stringMatching(/^fpe_[a-z-]+_\d{4}-\d{2}-\d{2}\.md$/), expect.stringMatching(/^fpe_geral_\d{4}-\d{2}-\d{2}\.md$/)]);
    const setor = await baixados[0]!.blob.text();
    expect(setor).toContain(`# FPE — fichas 5W1H do setor ${primeiroSetor.nome}`);
    expect(setor).toContain('(edição de teste)');
    expect(await baixados[1]!.blob.text()).toContain('# FPE — fichas 5W1H de todos os setores');
  });

  it('.mermaid do setor sai com a edição do “O quê”', async () => {
    const user = userEvent.setup();
    tela(falso());
    const campo = screen.getByLabelText(/^O quê/);
    await user.clear(campo);
    await user.type(campo, 'Texto editado para o Mermaid');
    await user.click(botao(`Exportar fluxo do setor ${primeiroSetor.nome} em Mermaid (.mermaid)`));
    expect(baixados[0]!.nome).toMatch(/\.mermaid$/);
    const m = await baixados[0]!.blob.text();
    expect(m).toContain('flowchart LR');
    expect(m).toContain('Texto editado para o Mermaid');
  });

  it('PDF das fichas: impressão em A4 com o nome do arquivo como título; PDF do fluxo: A3 em tema claro (fundo branco)', async () => {
    const user = userEvent.setup();
    tela(falso());
    await user.click(botao(`Exportar fichas do setor ${primeiroSetor.nome} em PDF (.pdf)`));
    expect(impressoes[0]!.papel).toBe('impressao impressao--texto');
    expect(impressoes[0]!.titulo).toMatch(/^fpe_[a-z-]+_\d{4}-\d{2}-\d{2}$/);
    expect(impressoes[0]!.html).toContain('<h4>');
    window.dispatchEvent(new Event('afterprint'));

    await user.click(botao(`Exportar fluxo do setor ${primeiroSetor.nome} em PDF (.pdf)`));
    expect(impressoes[1]!.papel).toBe('impressao impressao--fluxo');
    expect(impressoes[1]!.html).toContain('<svg');
    expect(impressoes[1]!.html).toMatch(/<rect width="\d+" height="\d+" fill="#FEFEFE">/); // tema claro: fundo branco
    window.dispatchEvent(new Event('afterprint'));
    expect(document.getElementById(ID_AREA_IMPRESSAO)).toBeNull();
  });

  it('ida e volta pela tela: edita → baixa o JSON → restaura a ficha → importa → a edição volta, igual', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    await user.type(screen.getByLabelText(/^Por quê/), ' — complemento');
    const antes = guardado(s);
    expect(Object.keys(antes.fpe_edicoes)).toHaveLength(1);

    await user.click(botao('Exportar as edições do FPE em JSON (.json)'));
    expect(baixados[0]!.nome).toMatch(/^fpe_geral_\d{4}-\d{2}-\d{2}\.json$/);
    const texto = await baixados[0]!.blob.text();

    await user.click(screen.getByRole('button', { name: /^Restaurar o padrão da ficha/ }));
    expect(guardado(s).fpe_edicoes).toEqual({});

    await user.upload(screen.getByLabelText(/^Importar edições/), new File([texto], 'fpe_geral.json', { type: 'application/json' }));
    expect(await screen.findByRole('group', { name: 'Confirmar importação' })).toHaveTextContent('fpe_geral.json: 1 ficha editada');
    expect(screen.getByRole('group', { name: 'Confirmar importação' })).toHaveTextContent('nada será perdido');
    await user.click(screen.getByRole('button', { name: 'Substituir as minhas edições' }));

    expect(guardado(s)).toEqual(antes);
    expect((screen.getByLabelText(/^Por quê/) as HTMLTextAreaElement).value.endsWith(' — complemento')).toBe(true); // o formulário mostra a edição importada
    expect(screen.getByRole('list', { name: 'Resumo' })).toHaveTextContent('1 editada');
    expect(screen.getByRole('status')).toHaveTextContent('Importado: 1 ficha editada.');
  });

  it('importar substitui as edições atuais só depois de confirmar, e guarda cópia do que havia', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    await user.type(screen.getByLabelText(/^Quem/), ' A');
    const edicaoA = guardado(s);
    const outro: EstadoFpe = {
      schema_versao: 1,
      fpe_edicoes: { [DOCUMENTO_FICHAS.fichas[3]!.id]: { campos: { how: 'Outro passo a passo' }, origem: 'manual', atualizado_em: '2026-09-25T10:00:00.000Z' } },
    };
    const arquivo = JSON.stringify({ formato: 'lux_fpe_exportacao', formato_versao: 1, exportado_em: '2026-09-20T12:00:00.000Z', versao_matriz: 'V08', estado: outro });
    await user.upload(screen.getByLabelText(/^Importar edições/), new File([arquivo], 'outro.json', { type: 'application/json' }));

    const painel = await screen.findByRole('group', { name: 'Confirmar importação' });
    expect(painel).toHaveTextContent('substitui as suas 1 edição atuais');
    expect(guardado(s)).toEqual(edicaoA); // ainda nada mudou

    await user.click(screen.getByRole('button', { name: 'Substituir as minhas edições' }));
    expect(guardado(s)).toEqual(outro);
    expect(JSON.parse(s.dados.get(CHAVE_FPE_ANTES_IMPORTAR)!)).toEqual(edicaoA);
    expect(screen.getByRole('status')).toHaveTextContent('As edições que você tinha antes ficaram guardadas neste navegador');
  });

  it('cancelar não muda nada', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    await user.type(screen.getByLabelText(/^Quem/), ' A');
    const antes = guardado(s);
    const vazio = JSON.stringify({ formato: 'lux_fpe_exportacao', formato_versao: 1, estado: { schema_versao: 1, fpe_edicoes: {} } });
    await user.upload(screen.getByLabelText(/^Importar edições/), new File([vazio], 'vazio.json', { type: 'application/json' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('group', { name: 'Confirmar importação' })).not.toBeInTheDocument();
    expect(guardado(s)).toEqual(antes);
    expect(s.dados.has(CHAVE_FPE_ANTES_IMPORTAR)).toBe(false);
  });

  it('arquivo que não é do FPE mostra o motivo e não mexe no estado', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    await user.type(screen.getByLabelText(/^Quem/), ' A');
    const antes = guardado(s);
    await user.upload(screen.getByLabelText(/^Importar edições/), new File(['{"a":1}'], 'qualquer.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Este arquivo não é uma exportação do FPE da Lux.');
    expect(screen.queryByRole('button', { name: 'Substituir as minhas edições' })).not.toBeInTheDocument();
    expect(guardado(s)).toEqual(antes);
  });
});
