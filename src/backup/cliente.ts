// Cliente da API de backups (03.6): listar, criar, baixar, zip, excluir, renomear, proteger. Contrato em docs/07.
// Nunca lança: toda falha vira `{ ok: false, falha, mensagem }` com texto simples em português. Sem servidor (dev sem PHP, arquivo
// aberto do disco, rede fora) a falha é `sem_servidor` e a tela oferece “Baixar arquivo”. Mutações levam X-Lux-Requisicao: 1.
import type { EscopoBackup } from './estado';
import { URL_API_BACKUPS } from './servidor';

export interface Versao {
  id: string;
  rotulo: string;
  escopo: EscopoBackup;
  criado_em: string;
  tamanho_bytes: number;
  sha256: string;
  versao_app: string;
  protegido: boolean;
}

export interface ListaDeVersoes {
  limite: number;
  total: number;
  itens: Versao[];
}

export type Falha = 'sem_servidor' | 'sem_acesso' | 'limite' | 'grande_demais' | 'invalido' | 'nao_encontrado' | 'zip_indisponivel' | 'erro';

export type Resultado<T> = { ok: true; dados: T } | { ok: false; falha: Falha; mensagem: string; status?: number; extra?: Record<string, unknown> };

export const MENSAGEM_LIMITE = 'Limite de 10 versões atingido. Exclua versões antigas ou substitua a mais antiga não protegida.';

const MENSAGENS: Record<Falha, string> = {
  sem_servidor: 'O servidor de versões não respondeu. Se você abriu o arquivo do disco ou está sem internet, use “Baixar arquivo”.',
  sem_acesso: 'Acesso negado pelo servidor. Entre de novo com o usuário e a senha da ferramenta.',
  limite: MENSAGEM_LIMITE,
  grande_demais: 'A versão passa de 5 MB e não foi guardada.',
  invalido: 'O servidor recusou o conteúdo desta versão.',
  nao_encontrado: 'Essa versão não existe mais no servidor.',
  zip_indisponivel: 'Este servidor não monta arquivos .zip. Baixe as versões uma a uma.',
  erro: 'O servidor não conseguiu concluir. Nada foi apagado. Tente de novo.',
};

const falha = <T,>(f: Falha, status?: number, extra?: Record<string, unknown>, mensagem?: string): Resultado<T> => ({ ok: false, falha: f, mensagem: mensagem ?? MENSAGENS[f], status, extra });

function falhaDoStatus<T>(status: number, json: Record<string, unknown> | null): Resultado<T> {
  const codigo = typeof json?.erro === 'string' ? json.erro : '';
  if (status === 401) return falha('sem_acesso', status);
  if (status === 409) return falha('limite', status, json ?? undefined);
  if (status === 413) return falha('grande_demais', status);
  if (status === 422) return falha('invalido', status, undefined, typeof json?.mensagem === 'string' ? json.mensagem : undefined);
  if (status === 404 && codigo === 'nao_encontrado') return falha('nao_encontrado', status);
  if (status === 501) return falha('zip_indisponivel', status);
  // 404 sem JSON da API (dev sem PHP), 406/403 do WAF etc.: para a pessoa, é “sem servidor”
  if (!codigo) return falha('sem_servidor', status);
  return falha('erro', status);
}

export interface ClienteBackups {
  listar: () => Promise<Resultado<ListaDeVersoes>>;
  criar: (dados: { html: string; rotulo: string; escopo: EscopoBackup; versao_app: string }) => Promise<Resultado<{ id: string; item: Versao; limite: number; total: number }>>;
  excluir: (ids: string[]) => Promise<Resultado<{ excluidos: string[]; ignorados_protegidos: string[]; inexistentes: string[] }>>;
  renomear: (id: string, rotulo: string) => Promise<Resultado<Versao>>;
  proteger: (id: string, valor: boolean) => Promise<Resultado<Versao>>;
  baixarTexto: (id: string) => Promise<Resultado<string>>;
  baixarZip: (ids: string[]) => Promise<Resultado<Blob>>;
  urlBaixar: (id: string) => string;
  urlVer: (id: string) => string;
}

export function criarCliente(fetchFn: typeof fetch = (...a) => fetch(...a), base: string = URL_API_BACKUPS): ClienteBackups {
  const url = (acao: string, extra = '') => `${base}?acao=${acao}${extra}`;

  async function json<T>(acao: string, init: RequestInit, extrair: (j: Record<string, unknown>) => T): Promise<Resultado<T>> {
    if (typeof location !== 'undefined' && location.protocol === 'file:') return falha('sem_servidor');
    let r: Response;
    try {
      r = await fetchFn(url(acao), { credentials: 'same-origin', cache: 'no-store', ...init });
    } catch {
      return falha('sem_servidor');
    }
    let corpo: Record<string, unknown> | null = null;
    if ((r.headers.get('content-type') ?? '').includes('application/json')) {
      try {
        const j: unknown = await r.json();
        corpo = j !== null && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : null;
      } catch {
        corpo = null;
      }
    }
    if (!r.ok) return falhaDoStatus(r.status, corpo);
    if (!corpo) return falha('sem_servidor', r.status); // 200 sem JSON = a página do app no lugar da API
    return { ok: true, dados: extrair(corpo) };
  }

  const post = (_acao: string, corpo: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lux-Requisicao': '1' }, body: JSON.stringify(corpo) });

  /** `veioDaApi`: só a API manda estes cabeçalhos; a página do app (200 em HTML) no lugar dela NÃO pode passar por backup ou .zip. */
  async function arquivo<T>(acao: string, init: RequestInit, veioDaApi: (r: Response) => boolean, ler: (r: Response) => Promise<T>, extra = ''): Promise<Resultado<T>> {
    let r: Response;
    try {
      r = await fetchFn(url(acao, extra), { credentials: 'same-origin', cache: 'no-store', ...init });
    } catch {
      return falha('sem_servidor');
    }
    if (!r.ok) {
      let corpo: Record<string, unknown> | null = null;
      if ((r.headers.get('content-type') ?? '').includes('application/json')) corpo = (await r.json().catch(() => null)) as Record<string, unknown> | null;
      return falhaDoStatus(r.status, corpo);
    }
    if (!veioDaApi(r)) return falha('sem_servidor', r.status);
    return { ok: true, dados: await ler(r) };
  }

  const anexo = (r: Response) => (r.headers.get('content-disposition') ?? '').startsWith('attachment');

  return {
    listar: () => json('listar', { method: 'GET' }, (j) => ({ limite: Number(j.limite), total: Number(j.total), itens: (j.itens as Versao[]) ?? [] })),
    criar: (d) => json('criar', post('criar', d), (j) => ({ id: String(j.id), item: j.item as Versao, limite: Number(j.limite), total: Number(j.total) })),
    excluir: (ids) => json('excluir', post('excluir', { ids }), (j) => ({ excluidos: (j.excluidos as string[]) ?? [], ignorados_protegidos: (j.ignorados_protegidos as string[]) ?? [], inexistentes: (j.inexistentes as string[]) ?? [] })),
    renomear: (id, rotulo) => json('renomear', post('renomear', { id, rotulo }), (j) => j.item as Versao),
    proteger: (id, valor) => json('proteger', post('proteger', { id, valor }), (j) => j.item as Versao),
    baixarTexto: (id) => arquivo('baixar', { method: 'GET' }, anexo, (r) => r.text(), `&id=${encodeURIComponent(id)}`),
    baixarZip: (ids) => arquivo('baixar_zip', post('baixar_zip', { ids }), (r) => anexo(r) && (r.headers.get('content-type') ?? '') === 'application/zip', (r) => r.blob()),
    urlBaixar: (id) => url('baixar', `&id=${encodeURIComponent(id)}`),
    urlVer: (id) => url('ver', `&id=${encodeURIComponent(id)}`),
  };
}
