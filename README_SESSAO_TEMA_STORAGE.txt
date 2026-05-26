ALTERAÇÕES DESTA VERSÃO

1) Correção do upload de layout/banner/logo
- O erro storage/unauthorized vem das regras do Firebase Storage.
- Publique o arquivo storage.rules em:
  Firebase Console > Build > Storage > Rules > Publicar
- Não cole isso em Firestore Rules. Firestore e Storage têm regras separadas.

2) Lembrar de mim
- Foi adicionado checkbox na tela de login.
- Se marcado, o navegador guarda apenas um identificador de sessão local com validade de 30 dias.
- A senha NÃO é salva no navegador.
- Ao recarregar a página, o sistema busca o usuário no Firestore e restaura a sessão.

3) Tema claro/escuro persistente
- O botão Tema claro/Tema escuro salva a preferência do usuário.
- A preferência fica no Firestore dentro do usuário, em preferencias.tema.
- Também fica uma cópia local mínima para aplicar o tema antes do login.

4) Editor de layout com tema claro e escuro
- O Editor de Layout agora permite configurar cores do tema escuro e do tema claro:
  Fundo escuro, card escuro, borda escura
  Fundo claro, card claro, borda clara

OBSERVAÇÃO
Esta versão volta a usar localStorage apenas para sessão lembrada e preferência visual.
Os dados do sistema continuam no Firestore/Storage.
