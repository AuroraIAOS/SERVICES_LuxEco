// Abre um .docx gerado (zip + XML) e confere a estrutura do POP: 11 seções (Título 1 “N. …”) na ordem, a 11 sendo
// “Observações para revisão jurídica”, sumário e a nota de propriedade intelectual no rodapé.
// Uso: node scripts/verificar_docx.mjs <arquivo.docx>   →   `OK: secoes=11` (exit 0) ou `ERRO: …` (exit 1)
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

const ESPERADO = 11;
const arquivo = process.argv[2];
if (!arquivo) {
  console.log('ERRO: informe o arquivo. Uso: node scripts/verificar_docx.mjs <arquivo.docx>');
  process.exit(1);
}

const arrayDe = (x) => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const textoDe = (p) => arrayDe(p['w:r']).flatMap((r) => arrayDe(r['w:t']).map((t) => (typeof t === 'object' ? (t['#text'] ?? '') : String(t)))).join('');

try {
  const zip = unzipSync(new Uint8Array(readFileSync(arquivo)));
  const documento = zip['word/document.xml'];
  if (!documento) throw new Error('não é um .docx (falta word/document.xml)');
  const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', preserveOrder: false, parseTagValue: false }).parse(strFromU8(documento));
  const paragrafos = arrayDe(xml['w:document']?.['w:body']?.['w:p']);
  const titulos1 = paragrafos.filter((p) => p['w:pPr']?.['w:pStyle']?.['@_w:val'] === 'Heading1').map(textoDe);

  const erros = [];
  if (titulos1.length !== ESPERADO) erros.push(`${titulos1.length} seções (Título 1), o POP tem ${ESPERADO}`);
  titulos1.forEach((t, i) => {
    if (!t.startsWith(`${i + 1}. `)) erros.push(`a seção ${i + 1} está como “${t}”`);
  });
  if (titulos1.length && !/^11\. Observações para revisão jurídica$/.test(titulos1[titulos1.length - 1])) erros.push('a última seção deve ser “11. Observações para revisão jurídica”');
  const todoTexto = paragrafos.map(textoDe).join('\n');
  if (!todoTexto.includes('Sumário')) erros.push('falta o sumário');
  const rodape = zip['word/footer1.xml'] ? strFromU8(zip['word/footer1.xml']) : '';
  if (!rodape.includes('Metodologia de propriedade intelectual')) erros.push('falta a nota de propriedade intelectual no rodapé');

  if (erros.length) {
    erros.forEach((e) => console.log(`ERRO: ${e}`));
    process.exit(1);
  }
  console.log(`OK: secoes=${titulos1.length}`);
} catch (e) {
  console.log(`ERRO: ${e.message}`);
  process.exit(1);
}
