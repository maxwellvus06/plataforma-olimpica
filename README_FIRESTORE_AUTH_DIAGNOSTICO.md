# Correção Firestore Auth + Diagnóstico

Esta versão faz duas coisas:

1. Garante que leituras/escritas em coleções anuais só sejam feitas depois do Firebase Auth estar pronto.
2. Melhora a mensagem de erro mostrando:
   - chave interna, ex.: app_aulas
   - caminho real no Firestore, ex.: anos/2026/sistema_aulas
   - UID Auth atual
   - e-mail Auth atual
   - ano ativo

## Passo obrigatório

Publique o arquivo `firestore.rules` em:

Firebase Console → Firestore Database → Rules → Publicar

A regra desta versão não é pública: ela exige `request.auth != null`.
