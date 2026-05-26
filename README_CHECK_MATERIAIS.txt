IMPLEMENTAÇÃO — CHECK DE MATERIAIS FEITOS

O que foi adicionado:

1. Na aba Plataforma, cada material agora possui um checkbox/status:
   - Fazer
   - Feito

2. O status é salvo no Cloud Firestore, dentro do próprio documento do material, no campo:
   concluidos

3. Cada marcação salva:
   - usuarioId
   - usuarioNome
   - usuarioNivel
   - concluidoEm

4. O status é individual por usuário. Um aluno marcar como feito não marca para outro aluno.

5. Foi adicionado filtro por status:
   - Todos
   - Feitos
   - Não feitos

6. Não foi usado localStorage nem sessionStorage.

Arquivos alterados:
- index.html
- app.js

Substitua esses arquivos no GitHub e teste em aba anônima ou com Ctrl + F5.
