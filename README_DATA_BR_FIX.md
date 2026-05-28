# Correção da importação de alunos — data brasileira

## Ajuste feito

Corrigida a leitura da coluna **Data de nascimento** na importação em lote de alunos.

Agora o sistema aceita melhor:

- DD/MM/AAAA
- D/M/AAAA
- DD-MM-AAAA
- DD.MM.AAAA
- DD/MM/AA
- AAAA-MM-DD
- data real do Excel
- número serial do Excel
- data colada com horário, como 20/05/2010 00:00:00
- cabeçalhos com pequenas variações, como Data nascimento, Nascimento, Data Nasc., Dt nascimento

## Arquivos principais

Substitua principalmente:

- app.js

Os arquivos index.html, database.js e firestore.rules foram mantidos junto no pacote para consistência da versão.
