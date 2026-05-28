# Ajustes — módulo Resultados e exportação Excel

Base usada: última versão estável com calendário em ordem fixa e listas protegidas.

## Alterações

1. O menu “Importar Resultados” passa a aparecer como “Resultados”.
2. No módulo Resultados:
   - campo Observação no cadastro manual;
   - coluna Observação na tabela;
   - campo Observação na edição do resultado;
   - coluna Observacao no modelo XLSX;
   - importação XLSX lendo Observacao/Observação.
3. Exportação Excel das informações atualmente filtradas/exibidas:
   - Resultados;
   - Calendário Oficial.
4. Restrição de exportação:
   - ADM;
   - Staff;
   - Gestor;
   - Escola.

## Arquivos alterados

- index.html
- app.js
- database.js mantido alinhado com a base.

Não houve alteração em firestore.rules ou storage.rules.
