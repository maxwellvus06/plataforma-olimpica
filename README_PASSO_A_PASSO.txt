VERSÃO CORRIGIDA: LOGIN PRIMEIRO, FIRESTORE DEPOIS

O que foi corrigido:
1. A tela de login não tenta mais carregar/gravar todas as coleções antes de ativar o formulário.
2. Ao clicar em Entrar, o sistema busca apenas sistema_usuarios no Cloud Firestore.
3. Se o login for aceito, aí sim o sistema carrega cidades, escolas, olimpíadas, cronograma, premiados e plataforma.
4. Sem localStorage e sem sessionStorage.
5. Dados administrativos no Cloud Firestore.

Passos:
1. Substitua index.html, database.js e app.js no GitHub.
2. No Firebase Console, vá em Firestore Database > Rules.
3. Para testar, cole o conteúdo de firestore.rules e clique em Publicar.
4. Abra o site em aba anônima ou dê Ctrl + F5.
5. Login de teste: admin / 123.

Se não entrar:
- Abra F12 > Console e veja o erro vermelho.
- Confirme que você está em Firestore Database, não Realtime Database.
- Confirme se as coleções sistema_usuarios etc. aparecem no Firestore.
