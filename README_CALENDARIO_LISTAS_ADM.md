# Ajustes implementados

## Calendário Oficial
- A ordem da lista ficou fixa e automática por data.
- A interface não permite mais escolher modo de ordenação.
- A tabela do calendário não é mais ordenável pelos cabeçalhos.
- A regra de exibição fica: acontecendo agora → próximos 30 dias → futuro → já aconteceu.

## Listas suspensas editáveis pelo ADM
- Apenas usuário de nível ADM vê o botão "Editar lista" abaixo dos selects.
- O ADM pode adicionar novas opções ou ocultar opções existentes.
- As alterações ficam salvas no Firestore em `anos/{ano}/sistema_listas_suspensas`.
- Itens ocultos não apagam dados já cadastrados; apenas deixam de aparecer na lista.
- Para cidades, escolas, olimpíadas e alunos, o ideal continua sendo editar pelos módulos próprios.

## Arquivos alterados
- index.html
- app.js
- database.js
