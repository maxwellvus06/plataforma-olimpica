VERSÃO — HOMOLOGAÇÃO COM INSTAGRAM + VISUALIZAÇÃO/EDIÇÃO COMPLETA

1. Substitua no GitHub os arquivos:
   - index.html
   - database.js
   - app.js
   - firestore.rules, se desejar manter as regras alinhadas

2. O que foi adicionado:
   - Campo Instagram oficial no cadastro manual de olimpíadas.
   - Campo Instagram oficial na planilha modelo de homologação em lote.
   - Importação XLSX agora lê a coluna "Instagram oficial".
   - Botão da tabela de Olimpíadas agora abre "Ver / editar".
   - A edição de olimpíadas agora mostra todos os campos do cadastro completo, não apenas nome/sigla/séries.
   - Campos condicionais continuam funcionando no modal de edição:
     * Idade máxima só aparece se houver restrição de idade.
     * Descrição das modalidades só aparece se houver modalidades/níveis internos.

3. Não foi adicionado localStorage/sessionStorage.
   A plataforma continua usando Firestore como base externa dos dados.
