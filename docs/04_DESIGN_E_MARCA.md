# 04 — DESIGN E MARCA

Todas as telas seguem **a mesma identidade visual da Lux** (unidade entre MMO, FPE e POP). Fonte de referência: `data/fontes/legado/MMO_v01.html` (tokens abaixo foram extraídos dele). O site https://luxecosolutions.com/ não pôde ser carregado no estágio criativo; se a marca mudou, Max avisa.

## Tokens
| Token | Valor | Uso |
|---|---|---|
| `--chumbo` | `#181F28` | fundo principal |
| `--chumbo-mid` | `#232D3A` | cards |
| `--chumbo-light` | `#2E3D4F` | bordas/hover |
| `--chumbo-lighter` | `#374A5E` | divisores |
| `--amarelo` | `#F3C51E` | destaque, CTA, títulos-chave |
| `--amarelo-dim` | `rgba(243,197,30,0.12)` | fundos de destaque |
| `--amarelo-glow` | `rgba(243,197,30,0.35)` | brilho/foco |
| `--branco` | `#FEFEFE` | texto |

Cores por setor (mantidas do MMO_v01): Marketing `#E67E22` · Vendas `#2980B9` · Administrativo `#8E44AD` · CEO `#F3C51E` · Engenharia `#C0392B` · Equipe Técnica `#E74C3C` · Cliente `#F39C12` · Financeiro `#27AE60` · Fornecedores `#7F8C8D` · Contabilidade `#16A085` · Logística `#1ABC9C` · Cemig `#3498DB`. WhatsApp/Grupo de Fluxo: `#25D366`.

## Tipografia
**Cyntho Next** — `design/fontes/CynthoNext-Thin.otf` (peso 300) e `CynthoNext-ExtraBold.otf` (peso 800), carregadas via `@font-face` local (nunca de CDN). Fallback: `sans-serif`. Só esses dois pesos: títulos em 800, corpo em 300; no corpo, garantir contraste (o Thin sobre chumbo precisa de tamanho ≥ 16px).

## Diretrizes
- Tema escuro (chumbo) com amarelo como acento. Dashboard, não radial (já decidido para lidar com 12 setores × 22 estágios).
- Hero com marca “LUX ECO **SOLUTIONS**” (SOLUTIONS em amarelo) como no MMO_v01.
- Componentes-chave: cards de setor, pills de estágio expansíveis, ramos IF/ELSE com ✓/✗, tags WhatsApp, formulário 5W1H, painel de fluxograma, botões de exportação, seletor “LLM padrão / LLM particular”.
- Estados: foco visível (amarelo), erro (vermelho `#ef5350`), sucesso (verde `#4CAF50`).
- Impressão/PDF: fundo branco, texto chumbo, amarelo só em filetes; `@page` A4 (POP) e A3 paisagem (fluxograma).
- Acessibilidade: contraste mínimo AA, navegação por teclado, `aria-label` nos botões de exportação.
- Tokens vivem em `design/tokens.json` (gerado pelo CODE na 01.3 a partir desta tabela) e em CSS variables.

## Base de UI (subetapa 02.7 — `src/ui/`, `src/estilos/ui.css`)
Decisões que refinam as diretrizes acima (registradas sem perguntar, conforme o regime de autonomia):
- **Marca fixa, estrutura própria.** Mesmos tokens, fonte e hero do MMO_v01, mas: superfícies planas, cantos retos, 2px entre elas e nenhuma sombra; o setor aparece **só como filete lateral de 3px**. O hero é **compacto e horizontal** (selo | título | números em frases curtas, “236 ações”) para o mapa chegar logo à tela — o hero alto e centralizado do v01 empurrava os dados para baixo.
- **Texto de setor é sempre branco.** No v01 o nome do setor era colorido; várias cores de setor reprovam AA como texto sobre chumbo-mid (ex.: Vendas ≈ 3,2:1). A cor do setor fica no filete (elemento gráfico).
- **Sem caixa-alta espaçada** em rótulos e subtítulos (só a marca “LUX ECO SOLUTIONS” e a etiqueta literal “IF/ELSE”). Numeração 01–22 só onde há sequência real (estágios).
- **Tons de texto derivados do token `branco`** por `color-mix` (78% suave, 64% fraco): mesma cor da marca com transparência, sem hex novo. Nenhuma cor, família ou peso literal fora dos tokens é verificado por teste (`src/ui/ui.test.tsx`).
- **Contraste medido, não presumido.** O teste calcula WCAG 2.1 a partir de `design/tokens.json` para cada par usado (≥ 4,5:1 texto; ≥ 3:1 gráficos). Erro de formulário = texto branco + marcador vermelho + `aria-invalid` (o vermelho sozinho reprova AA sobre chumbo-mid).
- **Um só movimento contínuo:** o pulso do selo do hero, desligado com `prefers-reduced-motion`. A seta da pílula gira só ao abrir (resposta à ação).
- **Teclado e leitor de tela:** “Pular para o conteúdo” (foca o `<main>` sem mexer no hash das rotas), foco por código no conteúdo a cada troca de tela, título da aba por tela, marcos de página, um `h1` por tela, área de toque ≥ 44px, acordeão com `aria-expanded`/`aria-controls`, botões de exportação com `aria-label` (“Exportar <escopo> em <formato> (.ext)”).
- **Guia de estilo vivo** em `#/guia`, só no `npm run dev` (não vai para o build).
