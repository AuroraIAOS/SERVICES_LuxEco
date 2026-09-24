# 05 — COMPLIANCE E ÉTICA

## Contrato (resumo operacional — o texto completo fica só em `referencias_privadas/contrato.md`, fora do Git)
- **Partes:** Maxwell Messias Ribeiro (consultor) e Lux Eco Solutions & Energy Ltda (contratante). Valor total R$ 3.500, pago por marcos: sinal, MMO, FPE, POP (Cl. 3–4).
- **Escopo (Cl. 1 e 7):** estruturação inicial dos processos, MMO, FPE e POPs. **Não inclui:** atualizações futuras, reestruturações, novos setores/fluxos, implantação/treinamento. Mudança de escopo = Termo Aditivo (Cl. 8).
- **Sigilo (Cl. 5.4 e 9):** informações da Lux não podem ser compartilhadas com terceiros sem autorização; vale após o término.
- **Propriedade intelectual (Cl. 9, 10, 13, 14):** metodologias, modelos e ferramentas de mapeamento são do consultor; a Lux recebe **licença de uso não exclusiva, intransferível, para operação interna**. Replicação em franquias/novas unidades exige licenciamento adicional (Cl. 14).
- **Portfólio (Cl. 15):** o consultor pode citar a experiência, nunca dados estratégicos, financeiros ou documentos internos.
- **Responsabilidade (Cl. 11):** implementação e resultados operacionais são da Lux.
- **Obrigação da Lux (Cl. 6):** fornecer informações e realizar as validações em tempo hábil. **A Etapa 04 (validação) não ocorreu** → o conteúdo sai sem validação formal (pendência vigiada).
- **Sugestão de rodapé** nos exports e nas telas (Max pode ajustar): “Uso interno da Lux Eco Solutions & Energy. Metodologia de propriedade intelectual do consultor — ver contrato (Cláusulas 9, 10, 13 e 14).”

## Inegociáveis do projeto
1. **Confidencialidade:** repositório privado; site **e API de backups** atrás de senha (cPanel); `contrato.md` e qualquer PII fora do Git; nenhum dado de cliente final ou lead armazenado, exportado ou incluído em backup pela ferramenta. Backups vivem só no servidor (nunca no Git, nunca em terceiros). Enquanto o sistema estiver na hospedagem de Max (homologação), os dados da Lux lá estão sob o sigilo das Cl. 5.4 e 9: senha sempre ativa e descomissionamento aprovado após a migração.
2. **Não inventar informação sobre a Lux:** conteúdo sem fonte é `origem: "sugerido"`; **zero valores em R$** inventados; **zero prazos/SLAs** inventados; metas de KPI vazias.
3. **LLM e dados:** antes do 1º envio ao LLM, exibir aviso (“o conteúdo será enviado a um provedor externo”) e exigir checkbox de ciência; nunca enviar dados de contato/PII; a saída do LLM é renderizada como **texto**, nunca como HTML (evita injeção).
4. **Diretrizes comerciais do CEO** (“boleto”, parcela ≈ conta, credenciamento IBS): reproduzidas fielmente no corpo do POP e listadas na seção final “Observações para revisão jurídica” (doc 06 §5). Não é parecer jurídico.
5. **Custo:** teto R$ 0 (doc 01).
6. **Escopo:** sem IA comercial, CRM ou integrações fora deste projeto.

## Checklist de segurança (adaptado — sem banco)
| Item | Prova executável | Saída esperada |
|---|---|---|
| `.env` fora do Git | `git ls-files \| grep -c "^\.env$"` | `0` |
| Contrato fora do Git | `git ls-files referencias_privadas \| wc -l` | `0` |
| Sem segredos no histórico | `gitleaks detect --no-banner` | `no leaks found` |
| Bundle sem segredos de deploy | `grep -rEl "FTP_PASS\|SMOKE_BASIC\|service_role" dist \| wc -l` | `0` |
| Site protegido | `curl -s -o /dev/null -w "%{http_code}" "$APP_URL"` | `401` |
| Site abre com credencial | `curl -s -o /dev/null -w "%{http_code}" -u "$SMOKE_BASIC_USER:$SMOKE_BASIC_PASS" "$APP_URL"` | `200` |
| Sem chaves de outros provedores no bundle | `grep -rEl "sk-ant\|sk-proj" dist \| wc -l` | `0` |
| Saída do LLM como texto | teste unitário `npm test -- llm_texto` | `0 failed` |
| API de backups protegida | `curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/backups.php?acao=listar"` | `401` |
| Sem path traversal na API | `curl -s -o /dev/null -w "%{http_code}" -u "$SMOKE_BASIC_USER:$SMOKE_BASIC_PASS" "$APP_URL/api/backups.php?acao=baixar&id=../../.env"` | `400` |
| Limite de 10 respeitado | `npm run backup:provar \| tail -1` | `... onze=409` |
| Pasta de backups não pública | `curl -s -o /dev/null -w "%{http_code}" -u "$SMOKE_BASIC_USER:$SMOKE_BASIC_PASS" "$APP_URL/lux_backups/"` | `403` ou `404` |
| Sem Google/Drive no código | `grep -rEin "gapi\|googleapis\|oauth" src \| wc -l` | `0` |
