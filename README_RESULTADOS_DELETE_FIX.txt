Correção: resultados apagados voltando

Problema encontrado:
- app_premiados ainda usava DATABASE.premiados como semente automática.
- Quando todos os resultados eram apagados, a coleção ficava vazia.
- Ao recarregar, o sistema entendia coleção vazia como primeira carga e recriava Carlos/Ana.

Correção aplicada:
- app_premiados não é mais semeado automaticamente.
- carregarPremiados() retorna apenas o que veio do Firestore/memória.
- excluirResultado() agora aguarda salvar no Firestore antes de fechar/renderizar.

Arquivo principal alterado: app.js
