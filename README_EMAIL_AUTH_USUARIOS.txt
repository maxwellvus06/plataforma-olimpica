VERSÃO: E-MAIL OBRIGATÓRIO + SENHA PADRÃO

Mudança principal:
- Todo usuário novo precisa ter e-mail válido.
- Esse e-mail vira o login real no Firebase Authentication.
- A senha inicial padrão é: avance@2026
- O usuário pode alterar a própria senha depois dentro da plataforma.

Usuário de aluno:
- O CPF continua salvo no cadastro e no perfil do aluno.
- O login real no Firebase Auth passa a ser o e-mail institucional; se não tiver, o e-mail pessoal.
- Se o aluno não tiver nenhum e-mail válido, o sistema bloqueia a criação do usuário.

Por que isso é melhor:
- Firebase Auth trabalha corretamente com e-mail/senha.
- Firestore e Storage conseguem aplicar regras seguras com request.auth.
- Não precisa deixar sistema_usuarios público.

Arquivos para subir:
- index.html
- app.js
- database.js
- firestore.rules
- storage.rules

Depois de subir:
1. Publique firestore.rules no Firestore Database > Rules.
2. Publique storage.rules no Storage > Rules.
3. Crie novos usuários usando e-mail real.
4. Oriente o primeiro acesso com senha: avance@2026
