# Migração para Firebase Authentication

Esta versão troca o login caseiro por Firebase Authentication.

## 1. Ativar E-mail/Senha no Firebase
Firebase Console → Build → Authentication → Sign-in method → E-mail/senha → Ativar.

## 2. Publicar regras
Publique os arquivos:

- firestore.rules em Firestore Database → Rules
- storage.rules em Storage → Rules

Essas regras não deixam mais o banco/arquivos totalmente públicos: exigem usuário autenticado.

## 3. Primeiro login / bootstrap
Use o login antigo do ADM:

login: admin
senha: 123

O sistema criará automaticamente uma conta Firebase Auth interna para o ADM:
admin@avance.local

Depois que o ADM entrar, o sistema tenta provisionar as contas Auth dos usuários já existentes.

## 4. Como ficam os logins
Para manter compatibilidade com o login antigo, o sistema cria e-mails internos:

admin → admin@avance.local
CPF 12345678900 → 12345678900@avance.local
gestor → gestor@avance.local

O e-mail real do usuário continua salvo no perfil.

## 5. Lembrar de mim
Agora o “lembrar de mim” usa persistência do próprio Firebase Auth.
A senha não fica salva no navegador.

## 6. Importante
Esta é uma migração prática para sair do modo público.
A próxima etapa profissional é endurecer regras por nível de acesso com Cloud Functions/custom claims.
