# Correção - Importação em lote de alunos

## Ajustes feitos

1. O e-mail deixou de ser obrigatório também na importação por planilha.
   - O aluno pode ser cadastrado sem e-mail.
   - A conta de acesso continua sendo criada depois pelo botão “Inscreva-se”, usando CPF + e-mail + senha.

2. A data de nascimento agora aceita melhor o padrão brasileiro.
   - Preferencial: DD/MM/AAAA
   - Também aceita DD-MM-AAAA e DD.MM.AAAA
   - Continua aceitando AAAA-MM-DD para não quebrar planilhas antigas.
   - Continua aceitando datas reais do Excel.

3. A planilha modelo foi ajustada.
   - Exemplo de nascimento: 20/05/2010
   - Formatação da coluna: dd/mm/yyyy
   - Campos de e-mail ficam em branco no exemplo para deixar claro que são opcionais.

## Arquivo principal alterado

- app.js

## Regras Firebase

Não houve mudança necessária em firestore.rules nem storage.rules.
