// Textos e ids fixos da marca. Um só lugar: telas, exports (PDF/docx/backup) e rodapé usam as mesmas constantes.

export const NOME_MARCA = 'LUX ECO SOLUTIONS';
export const NOME_MARCA_DESTAQUE = 'SOLUTIONS';
export const NOME_MARCA_INICIO = 'LUX ECO';
export const NOME_APP = 'Lux Ferramentas Operacionais';

/**
 * Nota de propriedade intelectual sugerida em docs/05 (Max pode ajustar aqui e vale para telas e exports).
 * Rodapé das telas, dos exports (POP, PDF) e do cabeçalho dos backups.
 */
export const NOTA_PROPRIEDADE =
  'Uso interno da Lux Eco Solutions & Energy. Metodologia de propriedade intelectual do consultor — ver contrato (Cláusulas 9, 10, 13 e 14).';

/** Junta classes ignorando valores falsos. */
export const cls = (...partes: (string | false | null | undefined)[]): string => partes.filter(Boolean).join(' ');
