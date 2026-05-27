# Correção: criação de usuário não apaga sistema_usuarios

Esta versão corrige o problema em que, ao criar usuário, a coleção `sistema_usuarios` podia ser substituída por uma lista incompleta.

## O que mudou

- `sistema_usuarios` agora é salvo por **upsert**: cria/atualiza documentos sem apagar os outros.
- A função de carregar usuários não substitui mais a coleção inteira.
- ADM carrega `sistema_usuarios` após login para gerenciar usuários.
- Exclusão de usuário remove apenas o documento daquele usuário, sem tocar nos demais.
- O perfil do ADM logado é preservado se o cache estiver incompleto.

## Importante

O padrão correto continua sendo:

`Firebase Auth UID` = ID preferencial do documento em `sistema_usuarios`.

Exemplo:

`sistema_usuarios/aIor0B6uvzTvXF1ihXYYuUPlOV33`

com campo:

`authUid: "aIor0B6uvzTvXF1ihXYYuUPlOV33"`

## Substituir

Substitua pelo menos:

- `app.js`

Pode subir também:

- `index.html`
- `database.js`
- `firestore.rules`
- `storage.rules`
