IMPLEMENTAÇÃO — PROFESSOR/ORIENTADOR

1. Novo nível de acesso
Foi adicionado o nível Professor/Orientador.

Acessos:
- Plataforma: pode publicar materiais, como Monitor.
- Monitoria: pode atuar como monitor/orientador em salas comuns.
- Resultados: pode visualizar resultados apenas das escolas vinculadas ao seu escopo.

2. Escopo do Professor/Orientador
Na criação de usuário, ao selecionar Professor/Orientador, aparece o bloco “Escopo do Professor/Orientador”.

O ADM pode escolher:
- Todas as escolas cadastradas; ou
- Uma ou várias escolas específicas; ou
- Nenhuma escola, caso o professor deva apenas postar materiais/atuar na monitoria sem visualizar resultados.

3. Monitoria
O ADM agora também atua como monitor dentro da aba Monitoria.

Função de orientador/monitor nas salas comuns:
- ADM
- Monitor
- Professor/Orientador

Foram adicionadas duas salas exclusivas:
- Sala do Orientador — 1
- Sala do Orientador — 2

Essas salas são visíveis/acessíveis apenas para:
- ADM
- Professor/Orientador

Monitor comum e Aluno não têm acesso às salas do orientador.

4. Firestore Rules
As regras foram ajustadas para permitir que Professor/Orientador publique na coleção da Plataforma, mas sem liberar edição de resultados.

Suba também o arquivo firestore.rules no Firebase Console > Firestore Database > Rules.
