PLATAFORMA — RELATÓRIOS COMPARATIVOS POR ANO

O que esta versão adiciona:

1. Nova aba: Relatórios
   - Compara medalhas por ano.
   - Mostra total no período, melhor ano, crescimento final e quantidade de anos analisados.
   - Mostra evolução anual com Ouro, Prata, Bronze e Menção Honrosa.
   - Mostra ranking por cidade.
   - Mostra ranking por escola.

2. Estrutura por ano mantida no Firestore
   - Os dados continuam separados em:
     anos/2022/sistema_premiados
     anos/2023/sistema_premiados
     anos/2024/sistema_premiados
     anos/2025/sistema_premiados
     anos/2026/sistema_premiados
     etc.

3. Usuários continuam globais
   - sistema_usuarios fica fora dos anos para não travar login.

4. Nada é salvo no navegador
   - Sem localStorage.
   - Sem sessionStorage.
   - Apenas memória temporária da aba enquanto o site está aberto.

Como usar:
1. Substitua index.html, database.js e app.js no GitHub.
2. Abra o site com Ctrl + F5 ou aba anônima.
3. Faça login.
4. Vá na aba Relatórios.
5. Escolha ano inicial, ano final, cidade e/ou escola.
6. Clique em Atualizar relatório.

Observação:
Se um ano não tiver resultados importados/cadastrados, ele aparecerá com zero medalhas. Isso é esperado e ajuda a comparar crescimento real entre ciclos.
