// Guia de estilo VIVO da base de UI (02.7). Só existe no `npm run dev` (rota #/guia); o build de produção não o inclui.
import type { CSSProperties } from 'react';
import { Botao, BotaoExportar, Cartao, CampoAreaTexto, CampoSeletor, CampoTexto, EstadoVazio, Etiqueta, Numeros, Pilula, Ramo, Tela } from './index';
import type { FormatoExportacao } from './index';

const CORES = ['chumbo', 'chumbo-mid', 'chumbo-light', 'chumbo-lighter', 'amarelo', 'branco', 'erro', 'sucesso', 'whatsapp'];
const SETORES = ['marketing', 'vendas', 'administrativo', 'financeiro', 'contabilidade', 'ceo', 'engenharia', 'fornecedores', 'logistica', 'equipe-tecnica', 'cemig', 'cliente'];
const FORMATOS: FormatoExportacao[] = ['json', 'md', 'mermaid', 'pdf', 'docx', 'xlsx'];

const amostra = (cor: string): CSSProperties => ({ background: `var(--${cor})`, width: '4.5rem', height: '2.5rem', border: '1px solid var(--chumbo-lighter)' });
const grade: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' };
const bloco: CSSProperties = { marginBottom: '2.5rem' };

export function Guia() {
  return (
    <Tela titulo="Guia de estilo" subtitulo="Componentes da base de UI (só no ambiente de desenvolvimento)" resumo={<Numeros itens={[{ valor: 12, rotulo: 'componentes' }]} />}>
      <section style={bloco}>
        <h2>Cores e setores</h2>
        <div style={grade}>
          {CORES.map((c) => (
            <div key={c}>
              <div style={amostra(c)} />
              <small>{c}</small>
            </div>
          ))}
        </div>
        <div style={{ ...grade, marginTop: '1rem' }}>
          {SETORES.map((s) => (
            <div key={s}>
              <div style={amostra(`setor-${s}`)} />
              <small>{s}</small>
            </div>
          ))}
        </div>
      </section>

      <section style={bloco}>
        <h2>Tipografia</h2>
        <p className="hero__titulo">Título de tela (800)</p>
        <h2>Título de seção</h2>
        <h3>Título de cartão</h3>
        <p>Corpo em Cyntho Next Thin (300), 16px, contraste alto sobre o chumbo. Texto corrido não passa de 60 caracteres por linha nas telas de leitura.</p>
        <p style={{ color: 'var(--texto-suave)' }}>Texto suave (78%) para apoio e subtítulos.</p>
        <p style={{ color: 'var(--texto-fraco)' }}>Texto fraco (64%) para rodapé e resumos.</p>
      </section>

      <section style={bloco}>
        <h2>Botões</h2>
        <div style={grade}>
          <Botao variante="primario">Salvar versão</Botao>
          <Botao>Gerar fluxograma</Botao>
          <Botao variante="discreto">Restaurar padrão</Botao>
          <Botao disabled>Indisponível</Botao>
        </div>
        <h3 style={{ marginTop: '1.5rem' }}>Exportação</h3>
        <div style={grade}>
          {FORMATOS.map((f) => (
            <BotaoExportar key={f} formato={f} escopo="fluxo do setor Vendas" onExportar={() => undefined} />
          ))}
        </div>
      </section>

      <section style={bloco}>
        <h2>Cartão de setor</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: 'var(--vao)' }}>
          {['setor-vendas', 'setor-administrativo', 'setor-cemig'].map((s) => (
            <Cartao key={s} titulo={s.replace('setor-', '')} nivel={3} setor={s} acoes={<Etiqueta>12 ações</Etiqueta>}>
              <p style={{ margin: 0 }}>O setor aparece só como filete lateral; o texto segue branco.</p>
            </Cartao>
          ))}
        </div>
      </section>

      <section style={bloco}>
        <h2>Pílulas de estágio (com ramos IF/ELSE e WhatsApp)</h2>
        <Pilula numero="01" nome="Prospecção" resumo="9 ações">
          <div style={{ padding: '0.75rem 1rem' }}>
            <p>Realiza prospecção ativa</p>
          </div>
        </Pilula>
        <Pilula numero="02" nome="Atendimento" resumo="29 ações" aberta>
          <div style={{ padding: '0.75rem 1rem' }}>
            <p style={{ marginBottom: '0.25rem' }}>
              Verifica disponibilidade da conta de energia <Etiqueta variante="ifelse">IF/ELSE</Etiqueta>
            </p>
            <Ramo sim rotulo="Conta disponível" texto="segue para simulação" />
            <Ramo sim={false} rotulo="Conta indisponível" texto="solicita estimativa de consumo e projeta o dimensionamento" />
            <p style={{ marginTop: '1rem' }}>
              Cria o Grupo de Fluxo no WhatsApp com o cliente <Etiqueta variante="whatsapp">WhatsApp</Etiqueta>
            </p>
          </div>
        </Pilula>
        <Pilula numero="03" nome="Simulação" resumo="15 ações">
          <div style={{ padding: '0.75rem 1rem' }}>
            <p>Gera simulações de consumo e dimensionamento</p>
          </div>
        </Pilula>
      </section>

      <section style={bloco}>
        <h2>Formulário</h2>
        <div style={{ maxWidth: '36rem' }}>
          <CampoTexto rotulo="Quem" ajuda="Só função ou setor; sem nome de pessoa." defaultValue="Vendas (Vendedor)" obrigatorio />
          <CampoAreaTexto rotulo="Por quê" defaultValue="Iniciar o atendimento assim que o lead chega." />
          <CampoSeletor
            rotulo="Setor"
            opcoes={[
              { valor: 'v', rotulo: 'Vendas' },
              { valor: 'a', rotulo: 'Administrativo' },
            ]}
          />
          <CampoTexto rotulo="Quando" erro="Informe o estágio e o gatilho." defaultValue="" />
        </div>
      </section>

      <section style={bloco}>
        <h2>Estado vazio</h2>
        <EstadoVazio titulo="Nenhuma versão salva" texto="Salve a primeira versão para vê-la aqui." acao={<Botao variante="primario">Salvar versão</Botao>} />
      </section>
    </Tela>
  );
}
