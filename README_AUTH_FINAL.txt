VERSÃO AUTH FINAL - FIREBASE AUTH PRIMEIRO, FIRESTORE DEPOIS

1. Substitua no GitHub:
   - index.html
   - app.js
   - database.js

2. No Firebase Console > Authentication > Sign-in method:
   - Ative E-mail/senha.

3. No Firebase Authentication, garanta que existe o usuário:
   - e-mail: maxwellvictor06@gmail.com
   - senha: a senha definida por você no Auth.

4. No Firestore, seu perfil em sistema_usuarios precisa ter:
   - authUid: aIor0B6uvzTvXF1ihXYYuUPlOV33
   - emailAuth: maxwellvictor06@gmail.com
   - nivel: ADM

5. Publique firestore.rules em:
   Firestore Database > Rules

6. Publique storage.rules em:
   Storage > Rules

7. Login recomendado:
   - usuário/e-mail: maxwellvictor06@gmail.com
   - senha: senha do Firebase Auth

Observação:
- O sistema não lê sistema_usuarios antes do Firebase Auth.
- Primeiro autentica no Firebase Auth.
- Depois busca o perfil pelo authUid ou emailAuth.
- Storage e Firestore não ficam públicos.
