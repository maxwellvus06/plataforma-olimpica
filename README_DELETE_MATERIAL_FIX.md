# Correção — exclusão de material da Plataforma

Esta versão parte da base estável enviada pelo Maxwell.

## O que foi corrigido

- A exclusão de material não chama mais diretamente uma função legada de Google Drive.
- A plataforma continua usando Firebase Storage.
- Campos antigos como `driveFileId` são tratados apenas como compatibilidade.
- Se um material antigo tiver URL externa/Google Drive, o sistema apaga o registro do Firestore e apenas ignora a exclusão física do arquivo legado.
- Se o arquivo já não existir no Storage, o sistema não trava a exclusão do material.

## Arquivo principal alterado

- `app.js`

Substitua `app.js` primeiro. `index.html` e `database.js` foram incluídos apenas para manter a base estável completa.
