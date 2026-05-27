# Atualização: Banco de Questões, ordenação e gabaritos ocultos

## Principais mudanças

1. **Listas suspensas em ordem alfabética**
   - Os selects são ordenados automaticamente.
   - Opções como “Todos”, “Todas”, “Selecione” e vazias ficam no topo.

2. **Tabelas ordenáveis**
   - Todas as tabelas com cabeçalho passam a aceitar clique nos títulos das colunas.
   - O clique alterna crescente/decrescente.

3. **Gabaritos e resoluções ocultos**
   - Materiais da Plataforma podem receber arquivo ou link de gabarito/resolução.
   - Simulados podem receber arquivo ou link de gabarito/resolução.
   - O aluno precisa clicar em “Ver gabarito / resolução” para abrir; não aparece de cara.

4. **Nova aba: Banco de Questões**
   - Cadastrar questões com metadados: disciplina, nível, tema, subtema, dificuldade, tipo, fonte, ano, alternativa correta e tags.
   - Questões podem ter arquivo/imagem.
   - ADM, Monitor e Professor/Orientador podem postar soluções.
   - Cada questão pode ter várias soluções.

## Arquivos alterados

- `index.html`
- `app.js`
- `database.js`

Também mantive `firestore.rules` e `storage.rules` no pacote para alinhamento.
