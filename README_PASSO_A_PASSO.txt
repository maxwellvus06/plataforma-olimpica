VERSÃO: Calendário avançado + tema claro/escuro

Substitua no GitHub estes arquivos:
- index.html
- database.js
- app.js

O que foi adicionado:
1) Bloqueio/controle de duplicidade no calendário:
   - A mesma olimpíada não pode ter a mesma etapa/fase duas vezes.
   - Ao tentar cadastrar ou editar duplicado, o sistema pergunta se deseja substituir o evento existente.
   - Na importação XLSX, duplicidades são substituídas automaticamente e o sistema informa quantas foram substituídas.

2) Modo de exibição do Calendário Oficial:
   - Por etapas / filtros: mantém o modo atual.
   - Por data: ordena por proximidade operacional:
     a) próximos 30 dias no topo;
     b) eventos futuros, com mais de 30 dias, no meio;
     c) eventos que já aconteceram no fim da lista.

3) Tema claro/escuro:
   - Botão no canto superior direito.
   - Não usa localStorage nem sessionStorage.
   - Ao recarregar a página, volta ao tema padrão escuro.
